import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

const CASCADE_CONFIRM_ASSIGNEE_REJECTION_MARKER = 'cascade_confirm_assignee_rejection';
const CASCADE_REJECT_DOWNSTREAM_MARKER = 'cascade_reject_downstream';
const ADMIN_OVERRIDE_PREFIX = '[Admin Override]';
const CASCADE_REJECTION_SOURCES = ['cascade_predecessor', 'cascade_parent'];
const HISTORY_STATUSES = ['approved', 'rejected', 'returned'];
const AUTO_APPROVED_COMMENT = 'Auto-approved';

const args = process.argv.slice(2);
const isApply = args.includes('--apply');
const dryRun = !isApply;

const getArgValue = (name) => {
  const prefix = `${name}=`;
  const arg = args.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
};

const limitArg = Number(getArgValue('--limit'));
const limit = Number.isInteger(limitArg) && limitArg > 0 ? limitArg : null;
const jobIdArg = Number(getArgValue('--job-id'));
const targetJobId = Number.isInteger(jobIdArg) && jobIdArg > 0 ? jobIdArg : null;

const includesText = (value, needle) => String(value || '').toLowerCase().includes(needle.toLowerCase());

const hasAdminOverridePrefix = (comment) => String(comment || '').trim().startsWith(ADMIN_OVERRIDE_PREFIX);

const classifyApproval = (approval) => {
  const comment = String(approval?.comment || '');

  if (
    includesText(comment, CASCADE_CONFIRM_ASSIGNEE_REJECTION_MARKER)
    || includesText(comment, 'Confirmed assignee rejection')
  ) {
    return 'confirm_assignee_rejection';
  }

  if (approval?.status === 'rejected') {
    return 'direct_reject';
  }

  return null;
};

const markerForKind = (kind) => (
  kind === 'confirm_assignee_rejection'
    ? CASCADE_CONFIRM_ASSIGNEE_REJECTION_MARKER
    : CASCADE_REJECT_DOWNSTREAM_MARKER
);

const buildComment = ({ kind, sourceJob, sourceApproval }) => {
  const marker = markerForKind(kind);
  const baseComment = kind === 'confirm_assignee_rejection'
    ? `${marker}: งานพ่วงถูกปฏิเสธตามการยืนยันปฏิเสธของงาน ${sourceJob.djId} - backfill`
    : `${marker}: งานพ่วงถูกปฏิเสธตามงาน ${sourceJob.djId} - backfill`;

  return hasAdminOverridePrefix(sourceApproval.comment)
    ? `${ADMIN_OVERRIDE_PREFIX} ${baseComment}`
    : baseComment;
};

const loadJobWithApprovals = async (jobId) => prisma.job.findUnique({
  where: { id: jobId },
  select: {
    id: true,
    djId: true,
    tenantId: true,
    predecessorId: true,
    parentJobId: true,
    rejectionSource: true,
    approvals: {
      where: {
        status: { in: HISTORY_STATUSES },
        NOT: [
          { comment: { startsWith: AUTO_APPROVED_COMMENT, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        approverId: true,
        stepNumber: true,
        status: true,
        comment: true,
        approvedAt: true,
        createdAt: true,
        ipAddress: true,
        userAgent: true
      },
      orderBy: { createdAt: 'desc' }
    }
  }
});

const pickTriggerApproval = (approvals = []) => {
  const confirmed = approvals.find((approval) => classifyApproval(approval) === 'confirm_assignee_rejection');
  if (confirmed) {
    return { approval: confirmed, kind: 'confirm_assignee_rejection' };
  }

  const directReject = approvals.find((approval) => classifyApproval(approval) === 'direct_reject');
  if (directReject) {
    return { approval: directReject, kind: 'direct_reject' };
  }

  return null;
};

const getNextSourceJobId = (job) => {
  if (job?.predecessorId) return job.predecessorId;
  if (job?.rejectionSource === 'cascade_parent' && job?.parentJobId) return job.parentJobId;
  return null;
};

const findTrigger = async (job) => {
  const visited = new Set([job.id]);
  let sourceJobId = getNextSourceJobId(job);

  while (sourceJobId && !visited.has(sourceJobId)) {
    visited.add(sourceJobId);
    const sourceJob = await loadJobWithApprovals(sourceJobId);
    if (!sourceJob) return null;

    const picked = pickTriggerApproval(sourceJob.approvals);
    if (picked) {
      return {
        sourceJob,
        sourceApproval: picked.approval,
        kind: picked.kind
      };
    }

    sourceJobId = getNextSourceJobId(sourceJob);
  }

  return null;
};

const alreadyHasMarker = async ({ jobId, approverId, marker }) => {
  const existing = await prisma.approval.findFirst({
    where: {
      jobId,
      approverId,
      comment: { contains: marker, mode: 'insensitive' }
    },
    select: { id: true }
  });

  return Boolean(existing);
};

const buildCandidateWhere = () => ({
  isParent: false,
  status: 'rejected',
  rejectionSource: { in: CASCADE_REJECTION_SOURCES },
  ...(targetJobId ? { id: targetJobId } : {})
});

async function main() {
  const candidates = await prisma.job.findMany({
    where: buildCandidateWhere(),
    select: {
      id: true,
      djId: true,
      tenantId: true,
      predecessorId: true,
      parentJobId: true,
      rejectionSource: true
    },
    orderBy: { id: 'asc' },
    ...(limit ? { take: limit } : {})
  });

  const planned = [];
  const skipped = [];

  for (const job of candidates) {
    const trigger = await findTrigger(job);
    if (!trigger) {
      skipped.push({ jobId: job.id, djId: job.djId, reason: 'missing_trigger_approval' });
      continue;
    }

    const marker = markerForKind(trigger.kind);
    const exists = await alreadyHasMarker({
      jobId: job.id,
      approverId: trigger.sourceApproval.approverId,
      marker
    });

    if (exists) {
      skipped.push({ jobId: job.id, djId: job.djId, reason: 'marker_exists' });
      continue;
    }

    planned.push({
      jobId: job.id,
      djId: job.djId,
      tenantId: job.tenantId,
      approverId: trigger.sourceApproval.approverId,
      sourceJobId: trigger.sourceJob.id,
      sourceDjId: trigger.sourceJob.djId,
      marker,
      comment: buildComment({
        kind: trigger.kind,
        sourceJob: trigger.sourceJob,
        sourceApproval: trigger.sourceApproval
      }),
      stepNumber: trigger.sourceApproval.stepNumber || 1,
      approvedAt: trigger.sourceApproval.approvedAt || trigger.sourceApproval.createdAt || new Date(),
      ipAddress: trigger.sourceApproval.ipAddress || null,
      userAgent: 'backfill_cascade_history'
    });
  }

  console.log(JSON.stringify({
    mode: dryRun ? 'dry-run' : 'apply',
    candidates: candidates.length,
    planned: planned.length,
    skipped: skipped.length,
    plannedRows: planned.map((row) => ({
      jobId: row.jobId,
      djId: row.djId,
      sourceDjId: row.sourceDjId,
      approverId: row.approverId,
      marker: row.marker,
      comment: row.comment
    })),
    skippedRows: skipped
  }, null, 2));

  if (dryRun || planned.length === 0) return;

  await prisma.$transaction(
    planned.map((row) => prisma.approval.create({
      data: {
        tenantId: row.tenantId,
        jobId: row.jobId,
        approverId: row.approverId,
        stepNumber: row.stepNumber,
        status: 'rejected',
        approvedAt: row.approvedAt,
        comment: row.comment,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent
      }
    }))
  );

  console.log(`Backfilled ${planned.length} cascade approval history row(s).`);
}

main()
  .catch((error) => {
    console.error('[backfillCascadeApprovalHistory] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
