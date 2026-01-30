
import { getDatabase } from '../config/database.js';
import ApprovalService from '../services/approvalService.js';

async function verify() {
    const prisma = getDatabase();
    const service = new ApprovalService();

    console.log('🚀 Starting Verification of V2 Approval Flow...');

    try {
        // 1. Setup Test Data
        // Find Tenant
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) throw new Error('No Tenant found');
        console.log('✅ Tenant:', tenant.name);

        // Find Project (Reuse existing to avoid schema issues)
        let project = await prisma.project.findFirst({ where: { name: 'V2 Test Project' } });
        if (!project) {
            // Try to find ANY project
            project = await prisma.project.findFirst();
            if (!project) {
                // Fallback: Create minimal (try without optional relations if failing)
                // Or better, just fail and ask user to seed
                throw new Error('No projects found in DB. Please seed database first.');
            }
            console.log('✅ Reusing existing Project:', project.name);
        } else {
            console.log('✅ Found Test Project:', project.name);
        }

        // Find JobType
        let jobType = await prisma.jobType.findFirst({ where: { name: 'V2 Test JobType' } });
        if (!jobType) {
            // Reuse any
            jobType = await prisma.jobType.findFirst();
            if (!jobType) {
                // Create minimal
                jobType = await prisma.jobType.create({
                    data: {
                        tenantId: tenant.id,
                        name: 'V2 Test JobType',
                        slaWorkingDays: 2,
                        isActive: true
                    }
                });
            }
            console.log('✅ Using JobType:', jobType.name);
        } else {
            console.log('✅ Found Test JobType:', jobType.name);
        }


        // Find/Create Template (Skip Approval)
        let template = await prisma.approvalFlowTemplate.findFirst({ where: { name: 'V2 Test Skip Template' } });
        if (!template) {
            template = await prisma.approvalFlowTemplate.create({
                data: {
                    tenantId: tenant.id,
                    name: 'V2 Test Skip Template',
                    totalLevels: 0,
                    autoAssignType: 'manual',
                    isActive: true
                }
            });
            console.log('✅ Created Skip Template');
        } else {
            console.log('✅ Found Skip Template');
        }

        // Create Assignment: Project + JobType -> Template
        const existingAssign = await prisma.projectFlowAssignment.findFirst({
            where: {
                projectId: project.id,
                jobTypeId: jobType.id
            }
        });

        if (existingAssign) {
            await prisma.projectFlowAssignment.update({
                where: { id: existingAssign.id },
                data: { templateId: template.id, isActive: true }
            });
            console.log('✅ Updated Assignment');
        } else {
            await prisma.projectFlowAssignment.create({
                data: {
                    tenantId: tenant.id,
                    projectId: project.id,
                    jobTypeId: jobType.id,
                    templateId: template.id,
                    isActive: true
                }
            });
            console.log('✅ Created Assignment');
        }

        // 2. Verify Logic
        console.log('\n🔍 Testing Service Logic:');

        // Case 1: Get Assignment (Specific)
        const assignment = await service.getFlowAssignmentV2(project.id, jobType.id);
        console.log('Test 1: getFlowAssignmentV2 (Specific JobType)');
        if (assignment && assignment.templateId === template.id) {
            console.log('  PASS ✅ - Found correct assignment');
        } else {
            console.log('  FAIL ❌ - Assignment not found or incorrect', assignment);
        }

        // Case 2: Check Skip
        const isSkip = service.isSkipApprovalV2(assignment);
        console.log('Test 2: isSkipApprovalV2');
        if (isSkip === true) {
            console.log('  PASS ✅ - Correctly identified as Skip Approval');
        } else {
            console.log('  FAIL ❌ - Should be true, got', isSkip);
        }

        // Case 3: Default Lookup (Project Default)
        // Ensure default template exists
        let defaultTemplate = await prisma.approvalFlowTemplate.findFirst({ where: { name: 'V2 Standard Template' } });
        if (!defaultTemplate) {
            defaultTemplate = await prisma.approvalFlowTemplate.create({
                data: {
                    tenantId: tenant.id,
                    name: 'V2 Standard Template',
                    totalLevels: 1,
                    isActive: true,
                    steps: {
                        create: { level: 1, name: 'Manager Check', approverType: 'dept_manager', requiredApprovals: 1 }
                    }
                }
            });
            console.log('✅ Created Standard Template');
        }

        // Ensure Project Default Assignment
        let defaultAssign = await prisma.projectFlowAssignment.findFirst({
            where: { projectId: project.id, jobTypeId: null }
        });

        if (!defaultAssign) {
            await prisma.projectFlowAssignment.create({
                data: {
                    tenantId: tenant.id,
                    projectId: project.id,
                    jobTypeId: null,
                    templateId: defaultTemplate.id,
                    isActive: true
                }
            });
            console.log('✅ Created Project Default Assignment');
        } else {
            await prisma.projectFlowAssignment.update({
                where: { id: defaultAssign.id },
                data: { templateId: defaultTemplate.id, isActive: true }
            });
            console.log('✅ Updated Project Default Assignment');
        }

        // Test with random job type ID
        const fakeJobTypeId = 999999;
        const defaultResult = await service.getFlowAssignmentV2(project.id, fakeJobTypeId);
        console.log('Test 3: Fallback to Project Default');

        // Note: Prisma returns null for jobTypeId in result if it matches default
        if (defaultResult && defaultResult.templateId === defaultTemplate.id) {
            console.log('  PASS ✅ - Fallback to Project Default working');
            console.log('     Matched Template:', defaultResult.template.name);
        } else {
            console.log('  FAIL ❌ - Did not fallback to default', defaultResult);
        }

        const isSkipDefault = service.isSkipApprovalV2(defaultResult);
        console.log('Test 4: isSkipApprovalV2 for Standard Template');
        if (isSkipDefault === false) {
            console.log('  PASS ✅ - Standard template requries approval');
        } else {
            console.log('  FAIL ❌ - Should not skip', isSkipDefault);
        }

        console.log('\n🎉 Verification Complete!');

    } catch (error) {
        console.error('❌ Verification Failed:', error);
    } finally {
        process.exit(0);
    }
}

verify();
