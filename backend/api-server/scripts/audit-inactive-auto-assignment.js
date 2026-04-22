import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function printSection(title) {
  console.log(`\n=== ${title} ===`);
}

async function main() {
  console.log('Audit: Inactive users referenced by auto-assignment configurations');

  // 1) Matrix rules: project_job_assignments -> assignee inactive
  const inactiveMatrixRules = await prisma.projectJobAssignment.findMany({
    where: {
      isActive: true,
      assigneeId: { not: null },
      assignee: {
        is: {
          isActive: false
        }
      }
    },
    select: {
      id: true,
      projectId: true,
      jobTypeId: true,
      assigneeId: true,
      project: { select: { name: true, code: true } },
      jobType: { select: { name: true } },
      assignee: { select: { firstName: true, lastName: true, email: true, isActive: true } }
    },
    orderBy: [{ projectId: 'asc' }, { jobTypeId: 'asc' }]
  });

  printSection('Inactive Matrix Rules');
  if (inactiveMatrixRules.length === 0) {
    console.log('OK: No inactive assignees in project_job_assignments');
  } else {
    inactiveMatrixRules.forEach((row) => {
      const assigneeName = `${row.assignee?.firstName || ''} ${row.assignee?.lastName || ''}`.trim() || row.assignee?.email || `User #${row.assigneeId}`;
      console.log(
        `Rule #${row.id} | Project: ${row.project?.name || row.projectId} | JobType: ${row.jobType?.name || row.jobTypeId} | Assignee: ${assigneeName} (inactive)`
      );
    });
  }

  // 2) Flow defaults: approval_flows.auto_assign_user_id -> user inactive
  const inactiveFlowDefaults = await prisma.approvalFlow.findMany({
    where: {
      isActive: true,
      autoAssignUserId: { not: null },
      autoAssignUser: {
        is: {
          isActive: false
        }
      }
    },
    select: {
      id: true,
      projectId: true,
      jobTypeId: true,
      autoAssignUserId: true,
      name: true,
      project: { select: { name: true, code: true } },
      jobType: { select: { name: true } },
      autoAssignUser: { select: { firstName: true, lastName: true, email: true, isActive: true } }
    },
    orderBy: [{ projectId: 'asc' }, { id: 'asc' }]
  });

  printSection('Inactive Flow Defaults');
  if (inactiveFlowDefaults.length === 0) {
    console.log('OK: No inactive assignees in approval_flows.auto_assign_user_id');
  } else {
    inactiveFlowDefaults.forEach((row) => {
      const assigneeName = `${row.autoAssignUser?.firstName || ''} ${row.autoAssignUser?.lastName || ''}`.trim() || row.autoAssignUser?.email || `User #${row.autoAssignUserId}`;
      console.log(
        `Flow #${row.id} (${row.name || 'Unnamed'}) | Project: ${row.project?.name || row.projectId} | JobType: ${row.jobType?.name || 'Default'} | Assignee: ${assigneeName} (inactive)`
      );
    });
  }

  printSection('Summary');
  const totalIssues = inactiveMatrixRules.length + inactiveFlowDefaults.length;
  console.log(`Matrix issues: ${inactiveMatrixRules.length}`);
  console.log(`Flow issues: ${inactiveFlowDefaults.length}`);
  console.log(`Total issues: ${totalIssues}`);

  process.exitCode = totalIssues > 0 ? 2 : 0;
}

main()
  .catch((error) => {
    console.error('Audit failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
