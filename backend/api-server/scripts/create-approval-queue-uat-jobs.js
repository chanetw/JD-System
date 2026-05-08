import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.production') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const BATCH_PREFIX = '[TEST-UAT-AQ]';

const toSlug = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const makeDjId = (caseKey, index) => {
    const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    return `DJ-${toSlug(caseKey)}-${stamp}-${String(index).padStart(2, '0')}`;
};

const pickFirstUserByRoles = async (tenantId, roleNames) => {
    const userRole = await prisma.userRole.findFirst({
        where: {
            tenantId,
            isActive: true,
            roleName: { in: roleNames },
            user: { isActive: true }
        },
        include: { user: true },
        orderBy: { id: 'asc' }
    });

    return userRole?.user || null;
};

const getApproverSteps = (approver, admin) => ([
    {
        stepNumber: 1,
        level: 1,
        approvers: [
            {
                id: approver.id,
                userId: approver.id,
                name: `${approver.firstName || ''} ${approver.lastName || ''}`.trim() || approver.displayName || approver.email,
                role: 'approver',
            },
        ],
    },
    {
        stepNumber: 2,
        level: 2,
        approvers: [
            {
                id: admin.id,
                userId: admin.id,
                name: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || admin.displayName || admin.email,
                role: 'admin',
            },
        ],
    },
]);

const ensureContext = async () => {
    const tenant = await prisma.tenant.findFirst({ orderBy: { id: 'asc' } });
    if (!tenant) throw new Error('ไม่พบ tenant');

    const requester =
        await pickFirstUserByRoles(tenant.id, ['requester']) ||
        await pickFirstUserByRoles(tenant.id, ['admin', 'superadmin']) ||
        await prisma.user.findFirst({ where: { tenantId: tenant.id, isActive: true }, orderBy: { id: 'asc' } });

    const approver =
        await pickFirstUserByRoles(tenant.id, ['approver', 'teamlead']) ||
        await pickFirstUserByRoles(tenant.id, ['admin', 'superadmin']) ||
        requester;

    const admin =
        await pickFirstUserByRoles(tenant.id, ['admin', 'superadmin']) ||
        approver;

    const assignee =
        await pickFirstUserByRoles(tenant.id, ['assignee']) ||
        await prisma.user.findFirst({
            where: { tenantId: tenant.id, isActive: true, id: { notIn: [requester?.id || 0] } },
            orderBy: { id: 'asc' }
        }) || requester;

    if (!requester || !approver || !admin || !assignee) {
        throw new Error('ไม่พบ users ครบสำหรับ requester/approver/admin/assignee');
    }

    let jobType = await prisma.jobType.findFirst({
        where: { tenantId: tenant.id, name: 'UAT Approval Queue JobType' },
        orderBy: { id: 'asc' },
    });

    if (!jobType) {
        jobType = await prisma.jobType.create({
            data: {
                tenantId: tenant.id,
                name: 'UAT Approval Queue JobType',
                slaWorkingDays: 3,
                description: 'JobType สำหรับ UAT approval queue',
                isActive: true,
            },
        });
    }

    return { tenant, jobType, requester, approver, admin, assignee };
};

const ensureScopeForCase = async ({ tenantId, jobTypeId, caseKey, caseIndex, approver, admin }) => {
    const budCode = `AQB${String(caseIndex).padStart(2, '0')}`;
    const projectCode = `AQP${String(caseIndex).padStart(2, '0')}-${tenantId}`;

    const bud = await prisma.bud.upsert({
        where: { tenantId_code: { tenantId, code: budCode } },
        update: {
            name: `UAT AQ BUD ${caseIndex} (${caseKey})`,
            isActive: true,
        },
        create: {
            tenantId,
            name: `UAT AQ BUD ${caseIndex} (${caseKey})`,
            code: budCode,
            isActive: true,
        },
    });

    const project = await prisma.project.upsert({
        where: { tenantId_code: { tenantId, code: projectCode } },
        update: {
            name: `UAT AQ Project ${caseIndex} (${caseKey})`,
            budId: bud.id,
            isActive: true,
        },
        create: {
            tenantId,
            budId: bud.id,
            name: `UAT AQ Project ${caseIndex} (${caseKey})`,
            code: projectCode,
            isActive: true,
        },
    });

    await prisma.approvalFlow.upsert({
        where: { projectId_jobTypeId: { projectId: project.id, jobTypeId } },
        update: {
            tenantId,
            name: `UAT Approval Queue Flow ${caseIndex}`,
            description: `Flow สำหรับเคส ${caseKey}`,
            approverSteps: getApproverSteps(approver, admin),
            isActive: true,
            skipApproval: false,
        },
        create: {
            tenantId,
            projectId: project.id,
            jobTypeId,
            name: `UAT Approval Queue Flow ${caseIndex}`,
            description: `Flow สำหรับเคส ${caseKey}`,
            approverSteps: getApproverSteps(approver, admin),
            isActive: true,
            skipApproval: false,
        },
    });

    return { bud, project };
};

const createOrUpdateJob = async ({
    tenantId,
    projectId,
    jobTypeId,
    requesterId,
    assigneeId = null,
    predecessorId = null,
    djId,
    subject,
    status,
    priority = 'normal',
    dueDate,
}) => {
    return prisma.job.upsert({
        where: { djId },
        update: {
            tenantId,
            projectId,
            jobTypeId,
            requesterId,
            assigneeId,
            predecessorId,
            subject,
            status,
            priority,
            dueDate,
            isParent: false,
        },
        create: {
            tenantId,
            projectId,
            jobTypeId,
            requesterId,
            assigneeId,
            predecessorId,
            djId,
            subject,
            status,
            priority,
            dueDate,
            isParent: false,
        },
    });
};

const createCrossProjectDependencySamples = async ({
    tenant,
    jobType,
    requester,
    approver,
    admin,
    assignee,
    dueDate,
}) => {
    const parentScope = await ensureScopeForCase({
        tenantId: tenant.id,
        jobTypeId: jobType.id,
        caseKey: 'DJ_CHAIN_PARENT_SCOPE',
        caseIndex: 7,
        approver,
        admin,
    });

    const childScope = await ensureScopeForCase({
        tenantId: tenant.id,
        jobTypeId: jobType.id,
        caseKey: 'DJ_CHAIN_CHILD_SCOPE',
        caseIndex: 8,
        approver,
        admin,
    });

    const chainRows = [];

    for (let i = 1; i <= 3; i += 1) {
        const parentDjId = makeDjId('DJ-CHAIN-PARENT-XPROJ', i);
        const childDjId = makeDjId('DJ-CHAIN-CHILD-XPROJ', i);

        const parentJob = await prisma.job.upsert({
            where: { djId: parentDjId },
            update: {
                tenantId: tenant.id,
                projectId: parentScope.project.id,
                jobTypeId: jobType.id,
                requesterId: requester.id,
                assigneeId: assignee.id,
                predecessorId: null,
                subject: `${BATCH_PREFIX} CHAIN-PARENT-XPROJECT #${i}`,
                status: 'pending_approval',
                priority: i % 2 === 0 ? 'urgent' : 'normal',
                dueDate,
                isParent: true,
            },
            create: {
                tenantId: tenant.id,
                projectId: parentScope.project.id,
                jobTypeId: jobType.id,
                requesterId: requester.id,
                assigneeId: assignee.id,
                predecessorId: null,
                djId: parentDjId,
                subject: `${BATCH_PREFIX} CHAIN-PARENT-XPROJECT #${i}`,
                status: 'pending_approval',
                priority: i % 2 === 0 ? 'urgent' : 'normal',
                dueDate,
                isParent: true,
            },
        });

        const childJob = await createOrUpdateJob({
            tenantId: tenant.id,
            projectId: childScope.project.id,
            jobTypeId: jobType.id,
            requesterId: requester.id,
            assigneeId: assignee.id,
            predecessorId: parentJob.id,
            djId: childDjId,
            subject: `${BATCH_PREFIX} CHAIN-CHILD-XPROJECT #${i} (depends on ${parentDjId})`,
            status: 'pending_dependency',
            priority: i % 2 === 0 ? 'urgent' : 'normal',
            dueDate,
        });

        chainRows.push({
            caseKey: 'DJ_CHAIN_CROSS_PROJECT',
            parentDjId: parentJob.djId,
            childDjId: childJob.djId,
            parentStatus: parentJob.status,
            childStatus: childJob.status,
            parentProjectCode: parentScope.project.code,
            parentProjectName: parentScope.project.name,
            childProjectCode: childScope.project.code,
            childProjectName: childScope.project.name,
            parentBudCode: parentScope.bud.code,
            childBudCode: childScope.bud.code,
        });
    }

    return chainRows;
};

const attachHistoryApproval = async ({ tenantId, jobId, approverId, status, comment }) => {
    await prisma.approval.deleteMany({
        where: {
            jobId,
            approverId,
            comment: { contains: BATCH_PREFIX },
        },
    });

    await prisma.approval.create({
        data: {
            tenantId,
            jobId,
            stepNumber: 1,
            approverId,
            status,
            comment,
            approvedAt: new Date(),
        },
    });
};

async function main() {
    console.log('🚀 สร้าง UAT jobs สำหรับ Approvals Queue + DJList\n');

    const context = await ensureContext();
    const { tenant, jobType, requester, approver, admin, assignee } = context;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5);

    const cases = [
        {
            key: 'AQ_WAITING_ACTIONABLE',
            status: 'pending_approval',
            count: 3,
            role: 'approver',
            subjectPrefix: `${BATCH_PREFIX} APPROVAL-WAITING-ACTIONABLE`,
            withHistory: null,
            usePredecessor: false,
        },
        {
            key: 'AQ_WAITING_NON_ACTIONABLE',
            status: 'pending_dependency',
            count: 3,
            role: 'admin-visibility',
            subjectPrefix: `${BATCH_PREFIX} APPROVAL-WAITING-NON-ACTIONABLE`,
            withHistory: null,
            usePredecessor: true,
        },
        {
            key: 'AQ_HISTORY_APPROVED',
            status: 'approved',
            count: 3,
            role: 'history-approved',
            subjectPrefix: `${BATCH_PREFIX} APPROVAL-HISTORY-APPROVED`,
            withHistory: 'approved',
            usePredecessor: false,
        },
        {
            key: 'AQ_HISTORY_NOT_APPROVED',
            status: 'rejected',
            count: 3,
            role: 'history-not-approved',
            subjectPrefix: `${BATCH_PREFIX} APPROVAL-HISTORY-NOT-APPROVED`,
            withHistory: 'rejected',
            usePredecessor: false,
        },
        {
            key: 'DJ_REQUESTER_RELATED',
            status: 'submitted',
            count: 3,
            role: 'requester-visible',
            subjectPrefix: `${BATCH_PREFIX} DJLIST-REQUESTER-RELATED`,
            withHistory: null,
            usePredecessor: false,
        },
        {
            key: 'DJ_ASSIGNEE_RELATED',
            status: 'in_progress',
            count: 3,
            role: 'assignee-visible',
            subjectPrefix: `${BATCH_PREFIX} DJLIST-ASSIGNEE-RELATED`,
            withHistory: null,
            usePredecessor: false,
        },
    ];

    const summary = [];
    const scopeMap = new Map();
    const anchorByCase = new Map();

    for (let caseIndex = 0; caseIndex < cases.length; caseIndex += 1) {
        const testCase = cases[caseIndex];
        const scope = await ensureScopeForCase({
            tenantId: tenant.id,
            jobTypeId: jobType.id,
            caseKey: testCase.key,
            caseIndex: caseIndex + 1,
            approver,
            admin,
        });
        scopeMap.set(testCase.key, scope);

        if (testCase.usePredecessor) {
            const anchor = await createOrUpdateJob({
                tenantId: tenant.id,
                projectId: scope.project.id,
                jobTypeId: jobType.id,
                requesterId: requester.id,
                assigneeId: assignee.id,
                djId: makeDjId(`${testCase.key}-ANCHOR`, 0),
                subject: `${BATCH_PREFIX} AQ Anchor For ${testCase.key}`,
                status: 'pending_approval',
                priority: 'normal',
                dueDate,
            });
            anchorByCase.set(testCase.key, anchor.id);
        }

        for (let i = 1; i <= testCase.count; i += 1) {
            const djId = makeDjId(testCase.key, i);
            const subject = `${testCase.subjectPrefix} #${i} (${testCase.role})`;

            const requesterId = testCase.key === 'DJ_ASSIGNEE_RELATED' ? admin.id : requester.id;
            const assigneeId = ['DJ_ASSIGNEE_RELATED', 'AQ_WAITING_ACTIONABLE', 'AQ_WAITING_NON_ACTIONABLE'].includes(testCase.key)
                ? assignee.id
                : null;

            const job = await createOrUpdateJob({
                tenantId: tenant.id,
                projectId: scope.project.id,
                jobTypeId: jobType.id,
                requesterId,
                assigneeId,
                predecessorId: testCase.usePredecessor ? anchorByCase.get(testCase.key) : null,
                djId,
                subject,
                status: testCase.status,
                priority: i % 2 === 0 ? 'urgent' : 'normal',
                dueDate,
            });

            if (testCase.withHistory) {
                const historyComment = `${BATCH_PREFIX} ${testCase.key} #${i}`;
                await attachHistoryApproval({
                    tenantId: tenant.id,
                    jobId: job.id,
                    approverId: approver.id,
                    status: testCase.withHistory,
                    comment: historyComment,
                });
            }

            summary.push({
                caseKey: testCase.key,
                djId: job.djId,
                subject: job.subject,
                status: job.status,
                projectCode: scope.project.code,
                projectName: scope.project.name,
                budCode: scope.bud.code,
                budName: scope.bud.name,
            });
        }
    }

    const crossProjectChainSummary = await createCrossProjectDependencySamples({
        tenant,
        jobType,
        requester,
        approver,
        admin,
        assignee,
        dueDate,
    });

    console.log('✅ สร้าง test jobs สำเร็จ\n');
    console.log('Context');
    console.log(`- Tenant: ${tenant.id}`);
    console.log(`- JobType: ${jobType.id} (${jobType.name})`);
    console.log(`- Requester User: ${requester.id}`);
    console.log(`- Approver User: ${approver.id}`);
    console.log(`- Admin User: ${admin.id}`);
    console.log(`- Assignee User: ${assignee.id}`);
    console.log('');

    const grouped = summary.reduce((acc, row) => {
        if (!acc[row.caseKey]) acc[row.caseKey] = [];
        acc[row.caseKey].push(row);
        return acc;
    }, {});

    for (const [caseKey, rows] of Object.entries(grouped)) {
        console.log(`📌 ${caseKey}`);
        rows.forEach((row, index) => {
            console.log(`  ${index + 1}. ${row.djId} | ${row.status} | ${row.subject}`);
            console.log(`     BU: ${row.budCode} (${row.budName}) | Project: ${row.projectCode} (${row.projectName})`);
        });
        console.log('');
    }

    if (crossProjectChainSummary.length > 0) {
        console.log('📌 DJ_CHAIN_CROSS_PROJECT');
        crossProjectChainSummary.forEach((row, index) => {
            console.log(`  ${index + 1}. Parent: ${row.parentDjId} (${row.parentStatus}) -> Child: ${row.childDjId} (${row.childStatus})`);
            console.log(`     Parent BU/Project: ${row.parentBudCode} / ${row.parentProjectCode} (${row.parentProjectName})`);
            console.log(`     Child BU/Project: ${row.childBudCode} / ${row.childProjectCode} (${row.childProjectName})`);
        });
        console.log('');
    }
}

main()
    .catch((error) => {
        console.error('❌ สร้าง test jobs ไม่สำเร็จ:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
