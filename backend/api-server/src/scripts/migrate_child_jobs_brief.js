/**
 * Migration Script: Copy Brief from Parent to Child Jobs
 * Purpose: แก้ไข child jobs เก่าที่ไม่มี brief โดย copy จาก parent
 *
 * Usage: cd backend/api-server && node src/scripts/migrate_child_jobs_brief.js
 */

import { getDatabase } from '../config/database.js';

const prisma = getDatabase();

async function migrateChildJobsBrief() {
  console.log('[Migration] Starting Child Jobs Brief Migration...\n');

  try {
    // 1. หา child jobs ทั้งหมดที่ไม่มี brief
    const childJobsWithoutBrief = await prisma.job.findMany({
      where: {
        parentJobId: { not: null },
        objective: null
      },
      select: {
        id: true,
        djId: true,
        parentJobId: true,
        subject: true
      }
    });

    console.log(`[Migration] Found ${childJobsWithoutBrief.length} child jobs without brief data\n`);

    if (childJobsWithoutBrief.length === 0) {
      console.log('[Migration] ✅ No jobs to migrate. All child jobs have brief data.');
      return;
    }

    // 2. Loop แต่ละ child job
    let successCount = 0;
    let skipCount = 0;
    const updateResults = [];

    for (const child of childJobsWithoutBrief) {
      // 2.1 หา parent job
      const parent = await prisma.job.findUnique({
        where: { id: child.parentJobId },
        select: {
          djId: true,
          objective: true,
          headline: true,
          subHeadline: true,
          description: true,
          briefLink: true,
          briefFiles: true
        }
      });

      if (!parent) {
        console.warn(`[Migration] ⚠️  Parent not found for child ${child.djId}`);
        skipCount++;
        updateResults.push({
          djId: child.djId,
          status: 'skipped',
          reason: 'Parent not found'
        });
        continue;
      }

      // 2.2 ถ้า parent ก็ไม่มี brief ให้ skip
      if (!parent.objective && !parent.headline && !parent.subHeadline && !parent.description && !parent.briefLink) {
        console.warn(`[Migration] ⚠️  Parent (${parent.djId}) also has no brief for child ${child.djId}`);
        skipCount++;
        updateResults.push({
          djId: child.djId,
          status: 'skipped',
          reason: 'Parent has no brief data'
        });
        continue;
      }

      // 2.3 Copy brief จาก parent ไปให้ child
      try {
        await prisma.job.update({
          where: { id: child.id },
          data: {
            objective: parent.objective,
            headline: parent.headline,
            subHeadline: parent.subHeadline,
            description: parent.description,
            briefLink: parent.briefLink,
            briefFiles: parent.briefFiles
          }
        });

        console.log(`[Migration] ✅ Updated ${child.djId} (from parent ${parent.djId})`);
        successCount++;
        updateResults.push({
          djId: child.djId,
          status: 'success',
          parentDjId: parent.djId
        });
      } catch (updateError) {
        console.error(`[Migration] ❌ Failed to update ${child.djId}:`, updateError.message);
        skipCount++;
        updateResults.push({
          djId: child.djId,
          status: 'error',
          error: updateError.message
        });
      }
    }

    // 3. Print Summary
    console.log('\n[Migration] ========== Migration Summary ==========');
    console.log(`[Migration] Total child jobs without brief: ${childJobsWithoutBrief.length}`);
    console.log(`[Migration] ✅ Successfully updated: ${successCount}`);
    console.log(`[Migration] ⚠️  Skipped: ${skipCount}`);
    console.log(`[Migration] Migration completed!\n`);

    // 4. Print detailed results (first 5 and last 5)
    if (updateResults.length > 0) {
      console.log('[Migration] === Detailed Results ===');
      const displayResults = updateResults.length <= 10
        ? updateResults
        : [...updateResults.slice(0, 5), { djId: '...', status: 'omitted' }, ...updateResults.slice(-5)];

      displayResults.forEach(result => {
        if (result.status === 'success') {
          console.log(`  ✅ ${result.djId} (from ${result.parentDjId})`);
        } else if (result.status === 'skipped') {
          console.log(`  ⚠️  ${result.djId} - Reason: ${result.reason}`);
        } else if (result.status === 'error') {
          console.log(`  ❌ ${result.djId} - Error: ${result.error}`);
        } else if (result.status === 'omitted') {
          console.log(`  ... (${updateResults.length - 10} more results omitted)`);
        }
      });
    }

  } catch (error) {
    console.error('[Migration] ❌ Error:', error);
    throw error;
  }
}

// Run migration
migrateChildJobsBrief()
  .then(() => {
    console.log('\n[Migration] Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n[Migration] Script failed:', error.message);
    process.exit(1);
  });
