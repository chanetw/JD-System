import React from 'react';
import { PaperClipIcon, LinkIcon } from '@heroicons/react/24/outline';


const JobBriefInfo = ({ job }) => {
    if (!job) return null;

    // API returns fields at root level, not nested under 'brief'
    const brief = {
        headline: job.headline,
        subHeadline: job.subHeadline,
        objective: job.objective,
        description: job.description
    };
    const hasFiles = job.briefFiles && job.briefFiles.length > 0;

    return (
        <div className="space-y-6">
            {/* Headlines */}
            <div className="bg-white px-4 py-5 sm:px-6 shadow sm:rounded-lg">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                    ข้อมูลงาน (Brief Info)
                </h3>
                <div className="mt-5 border-t border-gray-400">
                    <dl className="sm:divide-y sm:divide-gray-400">
                        {brief.headline && (
                            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                                <dt className="text-sm font-medium text-gray-500">หัวข้อหลัก (Headline)</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{brief.headline}</dd>
                            </div>
                        )}
                        {brief.subHeadline && (
                            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                                <dt className="text-sm font-medium text-gray-500">หัวข้อรอง (Sub-Headline)</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{brief.subHeadline}</dd>
                            </div>
                        )}
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                            <dt className="text-sm font-medium text-gray-500">วัตถุประสงค์ (Objective)</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                <div className="prose prose-sm max-w-none text-gray-500 whitespace-pre-line">
                                    {brief.objective || '-'}
                                </div>
                            </dd>
                        </div>
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                            <dt className="text-sm font-medium text-gray-500">รายละเอียด (Description)</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                <div className="prose prose-sm max-w-none text-gray-500 whitespace-pre-line">
                                    {brief.description || '-'}
                                </div>
                            </dd>
                        </div>
                        {job.briefLink && (
                            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 border-t border-gray-400">
                                <dt className="text-sm font-medium text-gray-500">ลิงก์ Brief (Brief Link)</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    <a
                                        href={job.briefLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 hover:underline"
                                    >
                                        <LinkIcon className="w-4 h-4" />
                                        {job.briefLink}
                                    </a>
                                </dd>
                            </div>
                        )}
                        {hasFiles && (
                            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                                <dt className="text-sm font-medium text-gray-500">ไฟล์แนบ (Attachments)</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    <ul className="border border-gray-400 rounded-md divide-y divide-gray-400">
                                        {job.briefFiles.map((file, idx) => (
                                            <li key={idx} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                                                <div className="w-0 flex-1 flex items-center">
                                                    <PaperClipIcon className="flex-shrink-0 h-5 w-5 text-gray-400" aria-hidden="true" />
                                                    <span className="ml-2 flex-1 w-0 truncate">{file.name}</span>
                                                </div>
                                                <div className="ml-4 flex-shrink-0">
                                                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 hover:text-indigo-500">
                                                        ดาวน์โหลด
                                                    </a>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </dd>
                            </div>
                        )}
                    </dl>
                </div>
            </div>
        </div>
    );
};

export default JobBriefInfo;
