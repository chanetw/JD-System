import React from 'react';
import { UserIcon } from '@heroicons/react/24/outline';

/**
 * ParentJobAssignees Component
 *
 * Displays a list of all unique assignees from child jobs of a parent job
 * Only renders for parent jobs with child jobs
 *
 * @param {Object} job - The job object (should have isParent and childJobs)
 */
const ParentJobAssignees = ({ job }) => {
  // Early return if not a parent job or no child jobs
  if (!job?.isParent || !job?.childJobs || job.childJobs.length === 0) {
    return null;
  }

  // Aggregate unique assignees (deduplicate)
  const assignees = job.childJobs
    .map(child => child.assignee)
    .filter(Boolean) // Remove null/undefined
    .filter((assignee, index, self) =>
      // Deduplicate by name - keep first occurrence
      index === self.findIndex(a => a === assignee)
    );

  // Count child jobs that don't have an assignee
  const unassignedCount = job.childJobs.filter(
    child => !child.assignee
  ).length;

  return (
    <div className="bg-white px-4 py-5 sm:px-6 shadow sm:rounded-lg">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        ผู้รับผิดชอบงานย่อย (Child Job Assignees)
      </h3>

      <div className="flex flex-wrap gap-2">
        {/* Display assigned users */}
        {assignees.map((assignee, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-medium border border-purple-200"
          >
            <UserIcon className="w-4 h-4" />
            {assignee}
          </span>
        ))}

        {/* Display unassigned count */}
        {unassignedCount > 0 && (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm font-medium border border-gray-300">
            <UserIcon className="w-4 h-4" />
            Unassigned ({unassignedCount})
          </span>
        )}

        {/* Empty state */}
        {assignees.length === 0 && unassignedCount === 0 && (
          <p className="text-sm text-gray-500 italic">
            ไม่มีผู้รับผิดชอบ
          </p>
        )}
      </div>
    </div>
  );
};

export default ParentJobAssignees;
