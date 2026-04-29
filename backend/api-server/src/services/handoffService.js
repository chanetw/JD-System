/**
 * @file handoffService.js
 * @description Service สำหรับส่งต่อไฟล์ส่งมอบจากงานที่เสร็จแล้ว ไปยังงานถัดไปในลำดับ chain
 *
 * Logic:
 * 1. ดึง finalFiles จากงานที่เพิ่ง complete
 * 2. หางานถัดไปทั้งหมดที่ predecessorId = completedJobId
 * 3. Merge + dedupe เข้า briefFiles ของงานถัดไป (ไม่ซ้ำ ไม่ย้ายไฟล์จริง)
 * 4. บันทึก activity log ทุกครั้ง
 */

/**
 * แปลง finalFiles entry เป็น briefFiles format พร้อม handoff metadata
 */
function mapFinalFileToBriefFile(file, completedJob) {
  const base = {
    sourceJobId: completedJob.id,
    sourceDjId: completedJob.djId,
    handoffFrom: 'predecessor_completion',
    handedOffAt: new Date().toISOString()
  };

  if (file.fileId) {
    return {
      ...base,
      fileId: file.fileId,
      name: file.name || file.fileName || `ไฟล์จาก ${completedJob.djId}`,
      filePath: file.filePath || null,
      publicUrl: file.publicUrl || null,
      type: 'file'
    };
  }

  if (file.url) {
    return {
      ...base,
      name: file.name || `ลิงก์จาก ${completedJob.djId}`,
      url: file.url,
      type: 'link'
    };
  }

  // fallback: unknown format – preserve as-is with metadata
  return { ...base, ...file };
}

/**
 * Dedupe: ตรวจว่าไฟล์นี้มีอยู่ใน briefFiles เดิมแล้วหรือยัง
 * ใช้ key: (fileId | url | filePath) + sourceJobId
 */
function isDuplicate(incoming, existing) {
  // ถ้า sourceJobId ตรงกัน แล้ว filePath/url ตรงกัน → duplicate
  if (incoming.sourceJobId && incoming.sourceJobId === existing.sourceJobId) {
    if (incoming.filePath && incoming.filePath === existing.filePath) return true;
    if (incoming.url && incoming.url === existing.url) return true;
    if (incoming.fileId && incoming.fileId === existing.fileId) return true;
  }
  return false;
}

/**
 * handoffCompletionFilesToNextJobs
 *
 * @param {number} completedJobId - Job ที่เพิ่ง complete
 * @param {number} actorUserId - User ที่กด complete
 * @param {Object} prisma - Prisma client instance
 * @returns {Promise<{ handed: number, skipped: number, nextJobs: string[] }>}
 */
export async function handoffCompletionFilesToNextJobs(completedJobId, actorUserId, prisma) {
  // 1. ดึงงานที่เพิ่ง complete
  const completedJob = await prisma.job.findUnique({
    where: { id: completedJobId },
    select: {
      id: true,
      djId: true,
      tenantId: true,
      finalFiles: true
    }
  });

  if (!completedJob) {
    console.warn(`[Handoff] Job ${completedJobId} not found – skipping handoff`);
    return { handed: 0, skipped: 0, nextJobs: [] };
  }

  // 2. แปลง finalFiles เป็น array
  let finalFiles = [];
  if (Array.isArray(completedJob.finalFiles)) {
    finalFiles = completedJob.finalFiles;
  } else if (typeof completedJob.finalFiles === 'string') {
    try {
      finalFiles = JSON.parse(completedJob.finalFiles);
      if (!Array.isArray(finalFiles)) finalFiles = [];
    } catch {
      finalFiles = [];
    }
  }

  if (finalFiles.length === 0) {
    console.log(`[Handoff] ${completedJob.djId} has no final files – skipping handoff`);
    return { handed: 0, skipped: 0, nextJobs: [] };
  }

  // 3. หางานถัดไปทั้งหมดที่ predecessorId = completedJobId
  const nextJobs = await prisma.job.findMany({
    where: {
      predecessorId: completedJobId,
      tenantId: completedJob.tenantId,
      status: { not: 'completed' }
    },
    select: {
      id: true,
      djId: true,
      briefFiles: true
    }
  });

  if (nextJobs.length === 0) {
    console.log(`[Handoff] No next jobs found for ${completedJob.djId}`);
    return { handed: 0, skipped: 0, nextJobs: [] };
  }

  // 4. แปลงไฟล์ส่งมอบให้เป็น briefFiles format
  const incomingFiles = finalFiles.map(f => mapFinalFileToBriefFile(f, completedJob));

  let totalHanded = 0;
  const handedDjIds = [];

  for (const nextJob of nextJobs) {
    // parse briefFiles เดิม
    let existingBriefFiles = [];
    if (Array.isArray(nextJob.briefFiles)) {
      existingBriefFiles = nextJob.briefFiles;
    } else if (typeof nextJob.briefFiles === 'string') {
      try {
        existingBriefFiles = JSON.parse(nextJob.briefFiles);
        if (!Array.isArray(existingBriefFiles)) existingBriefFiles = [];
      } catch {
        existingBriefFiles = [];
      }
    }

    // dedupe
    const newFiles = incomingFiles.filter(incoming =>
      !existingBriefFiles.some(existing => isDuplicate(incoming, existing))
    );

    if (newFiles.length === 0) {
      console.log(`[Handoff] All files already present in ${nextJob.djId} – skip`);
      continue;
    }

    const mergedBriefFiles = [...existingBriefFiles, ...newFiles];

    // update briefFiles ของงานถัดไป
    await prisma.job.update({
      where: { id: nextJob.id },
      data: { briefFiles: mergedBriefFiles }
    });

    // บันทึก activity log ในงานถัดไป
    try {
      await prisma.activityLog.create({
        data: {
          jobId: nextJob.id,
          userId: actorUserId,
          action: 'predecessor_files_handed_off',
          message: `รับไฟล์จากงานก่อนหน้า ${completedJob.djId} (${newFiles.length} ไฟล์)`,
          detail: {
            sourceJobId: completedJob.id,
            sourceDjId: completedJob.djId,
            fileCount: newFiles.length,
            files: newFiles.map(f => ({ name: f.name, type: f.type }))
          }
        }
      });
    } catch (logErr) {
      console.warn(`[Handoff] Failed to log activity for ${nextJob.djId}:`, logErr.message);
    }

    totalHanded += newFiles.length;
    handedDjIds.push(nextJob.djId);
    console.log(`[Handoff] ✅ Handed ${newFiles.length} file(s) from ${completedJob.djId} → ${nextJob.djId}`);
  }

  return {
    handed: totalHanded,
    skipped: nextJobs.length - handedDjIds.length,
    nextJobs: handedDjIds
  };
}
