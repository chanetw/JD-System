import React from 'react';
import {
    PaperClipIcon,
    LinkIcon,
    CalendarDaysIcon,
    UserIcon,
    CheckCircleIcon,
    ClockIcon,
    ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { CubeIcon } from '@heroicons/react/24/solid';
import DraftReadStatus from './DraftReadStatus';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import FileActions from '@shared/components/FileActions';
import { getFileName } from '@shared/utils/fileUrlUtils';

const getJobTypeLabel = (value) => {
    if (!value) return 'ไม่ระบุประเภท';
    if (typeof value === 'string') return value;
    return value.name || 'ไม่ระบุประเภท';
};

const normalizeItem = (item, fallbackId) => ({
    id: item?.id || fallbackId,
    name: item?.name || 'ไม่ระบุชื่อชิ้นงาน',
    quantity: Number(item?.quantity) || 1,
    defaultSize: item?.defaultSize || item?.jobTypeItem?.defaultSize || null
});

const buildJobTypeGroups = (job) => {
    const childJobs = Array.isArray(job.childJobs)
        ? job.childJobs
        : Array.isArray(job.children)
            ? job.children
            : [];

    if (job.isParent && childJobs.length > 0) {
        const groups = new Map();

        childJobs.forEach((child, childIndex) => {
            const jobTypeName = getJobTypeLabel(child.jobType);
            const childItems = Array.isArray(child.items) ? child.items : [];

            if (!childItems.length) return;

            if (!groups.has(jobTypeName)) {
                groups.set(jobTypeName, {
                    jobType: jobTypeName,
                    items: [],
                    totalQty: 0
                });
            }

            const group = groups.get(jobTypeName);

            childItems.forEach((item, itemIndex) => {
                const normalizedItem = normalizeItem(item, `${childIndex}-${itemIndex}`);
                group.items.push(normalizedItem);
                group.totalQty += normalizedItem.quantity;
            });
        });

        return Array.from(groups.values()).filter(group => group.items.length > 0);
    }

    const ownItems = Array.isArray(job.items) ? job.items : [];
    if (!ownItems.length) return [];

    const normalizedItems = ownItems.map((item, index) => normalizeItem(item, index));

    return [{
        jobType: getJobTypeLabel(job.jobType),
        items: normalizedItems,
        totalQty: normalizedItems.reduce((sum, item) => sum + item.quantity, 0)
    }];
};

function JobTypeMetric({ label, value, emphasize = false }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
            <p className={`mt-2 text-base font-semibold ${emphasize ? 'text-rose-700' : 'text-slate-900'}`}>{value}</p>
        </div>
    );
}

const JobBriefInfo = ({ job }) => {
    const { user } = useAuthStoreV2();
    if (!job) return null;

    // API returns fields at root level, not nested under 'brief'
    const brief = {
        headline: job.headline,
        subHeadline: job.subHeadline,
        objective: job.objective,
        description: job.description
    };
    const jobTypeGroups = buildJobTypeGroups(job);
    const totalGroups = jobTypeGroups.length;
    const totalQuantity = jobTypeGroups.reduce((sum, group) => sum + group.totalQty, 0);
    const primaryJobType = totalGroups === 1 ? jobTypeGroups[0].jobType : 'ประเภทงานและชิ้นงาน';
    const slaLabel = job.slaWorkingDays ? `${job.slaWorkingDays} วัน` : '-';
    const hasFiles = job.briefFiles && job.briefFiles.length > 0;

    const formatDate = (dateStr) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleDateString('th-TH', {
            day: 'numeric', month: 'short', year: '2-digit'
        });
    };

    const normalizeUrl = (value) => {
        if (!value) return '#';
        return value.startsWith('http://') || value.startsWith('https://')
            ? value
            : `https://${value}`;
    };

    const chips = [
        job.createdAt ? {
            key: 'createdAt',
            label: 'สร้างเมื่อ',
            value: formatDate(job.createdAt),
            icon: CalendarDaysIcon,
            className: 'bg-blue-100 text-blue-800 border border-blue-200'
        } : null,
        job.assignedAt ? {
            key: 'assignedAt',
            label: 'มอบหมาย',
            value: formatDate(job.assignedAt),
            icon: UserIcon,
            className: 'bg-orange-100 text-orange-800 border border-orange-200'
        } : null,
        job.acceptanceDate ? {
            key: 'acceptanceDate',
            label: 'รับงาน',
            value: formatDate(job.acceptanceDate),
            icon: CheckCircleIcon,
            className: 'bg-green-100 text-green-800 border border-green-200'
        } : null,
        (job.dueDate || job.deadline) ? {
            key: 'dueDate',
            label: 'กำหนด',
            value: formatDate(job.dueDate || job.deadline),
            icon: ClockIcon,
            className: 'bg-red-100 text-red-800 border border-red-200'
        } : null
    ].filter(Boolean);

    const files = Array.isArray(job.briefFiles) ? job.briefFiles : [];
    const inheritedFiles = files.filter(file => !!file?.sourceJobId);
    const hasPredecessor = !!job.predecessorId;
    const inheritedSources = Array.from(new Set(
        inheritedFiles
            .map(file => file?.sourceDjId)
            .filter(Boolean)
    ));

    return (
        <div className="overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
            <div className="border-b border-gray-300 px-4 py-4 sm:px-6">
                <h3 className="text-lg font-semibold text-gray-900">ข้อมูลงาน (Brief Info)</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                    {chips.map((chip) => {
                        const Icon = chip.icon;
                        return (
                            <span
                                key={chip.key}
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${chip.className}`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                <span className="font-semibold">{chip.label}:</span>
                                <span>{chip.value}</span>
                            </span>
                        );
                    })}
                </div>
            </div>

            <div className="px-4 sm:px-6">
                <dl className="divide-y divide-gray-200">
                    {brief.headline && (
                        <div className="py-4 sm:grid sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-6">
                            <dt className="text-sm font-medium text-gray-500">หัวข้อหลัก (Headline)</dt>
                            <dd className="mt-1 text-sm font-medium text-gray-900 sm:mt-0">{brief.headline}</dd>
                        </div>
                    )}

                    {brief.subHeadline && (
                        <div className="py-4 sm:grid sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-6">
                            <dt className="text-sm font-medium text-gray-500">หัวข้อรอง (Sub-Headline)</dt>
                            <dd className="mt-1 text-sm font-medium text-gray-900 sm:mt-0">{brief.subHeadline}</dd>
                        </div>
                    )}

                    {brief.objective && (
                        <div className="py-4 sm:grid sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-6">
                            <dt className="text-sm font-medium text-gray-500">วัตถุประสงค์ (Objective)</dt>
                            <dd className="mt-1 text-sm leading-7 text-gray-700 whitespace-pre-line sm:mt-0">{brief.objective}</dd>
                        </div>
                    )}

                    <div className="py-4 sm:grid sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-6">
                        <dt className="text-sm font-medium text-gray-500">รายละเอียด (Description)</dt>
                        <dd className="mt-1 text-sm leading-7 text-gray-700 whitespace-pre-line sm:mt-0">{brief.description || '-'}</dd>
                    </div>

                    {job.briefLink && (
                        <div className="py-4 sm:grid sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-6">
                            <dt className="text-sm font-medium text-gray-500">ลิงก์ Brief (Brief Link)</dt>
                            <dd className="mt-1 sm:mt-0">
                                <a
                                    href={normalizeUrl(job.briefLink)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm font-medium text-rose-600 hover:text-rose-700 hover:underline"
                                >
                                    <LinkIcon className="h-4 w-4" />
                                    <span className="break-all">{job.briefLink}</span>
                                </a>
                            </dd>
                        </div>
                    )}

                    {job.draftLink && (
                        <div className="py-4 sm:grid sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-6">
                            <dt className="text-sm font-medium text-gray-500">Draft Submission</dt>
                            <dd className="mt-1 space-y-3 sm:mt-0">
                                <a
                                    href={normalizeUrl(job.draftLink)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm font-medium text-rose-600 hover:text-rose-700 hover:underline"
                                >
                                    <LinkIcon className="h-4 w-4" />
                                    <span className="break-all">{job.draftLink}</span>
                                </a>

                                {job.draftNote && (
                                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                                        <span className="font-medium text-gray-800">หมายเหตุ:</span> {job.draftNote}
                                    </div>
                                )}

                                <DraftReadStatus
                                    jobId={job.id}
                                    isRequester={user && String(job.requesterId) === String(user.id)}
                                    showDetails={user && String(job.assigneeId) === String(user.id)}
                                />
                            </dd>
                        </div>
                    )}

                    {(hasPredecessor || inheritedFiles.length > 0) && (
                        <div className="py-4 sm:grid sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-6">
                            <dt className="text-sm font-medium text-gray-500">File Final Work</dt>
                            <dd className="mt-1 sm:mt-0">
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {inheritedFiles.length > 0 ? (
                                            <>
                                                <span className="inline-flex items-center rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                                                    ✅ รับไฟล์ต่อเนื่องแล้ว {inheritedFiles.length} ไฟล์
                                                </span>
                                                {inheritedSources.map((djId) => (
                                                    <span
                                                        key={djId}
                                                        className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800"
                                                    >
                                                        จาก {djId}
                                                    </span>
                                                ))}
                                            </>
                                        ) : (
                                            <span className="inline-flex items-center rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                                                ⏳ รอรับไฟล์จากงานก่อนหน้า
                                            </span>
                                        )}
                                    </div>
                                    {inheritedFiles.length > 0 ? (
                                        <p className="mt-2 text-xs text-amber-800">
                                            ไฟล์ที่มีสัญลักษณ์รับต่อ (⬇) คือไฟล์ส่งมอบที่ระบบพ่วงมาจากงานก่อนหน้าใน chain
                                        </p>
                                    ) : (
                                        <p className="mt-2 text-xs text-amber-800">
                                            เมื่อปิดงานก่อนหน้าและมีไฟล์ส่งมอบ ระบบจะพ่วงไฟล์มาแสดงในส่วนไฟล์แนบอัตโนมัติ
                                        </p>
                                    )}
                                </div>
                            </dd>
                        </div>
                    )}

                    {hasFiles && (
                        <div className="py-4 sm:grid sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-6">
                            <dt className="text-sm font-medium text-gray-500">ไฟล์แนบ (Attachments)</dt>
                            <dd className="mt-1 sm:mt-0">
                                <ul className="overflow-hidden rounded-xl border border-gray-300 divide-y divide-gray-200">
                                    {files.map((file, idx) => {
                                        const fileName = getFileName(file, `ไฟล์แนบ ${idx + 1}`);
                                        const isHandedOff = !!file.sourceJobId;

                                        return (
                                            <li key={`${fileName}-${idx}`} className={`flex items-center justify-between gap-3 px-4 py-3 text-sm ${isHandedOff ? 'bg-amber-50' : ''}`}>
                                                <div className="min-w-0 flex items-center gap-3">
                                                    <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${isHandedOff ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                                                        {isHandedOff ? <ArrowDownTrayIcon className="h-4 w-4" /> : <PaperClipIcon className="h-4 w-4" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="truncate text-gray-800 block">{fileName}</span>
                                                        {isHandedOff && (
                                                            <span className="text-xs text-amber-700 font-medium">
                                                                📎 จากงานก่อนหน้า: {file.sourceDjId}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <FileActions file={file} compact className="flex-shrink-0" />
                                            </li>
                                        );
                                    })}
                                </ul>
                            </dd>
                        </div>
                    )}
                </dl>
            </div>

            {jobTypeGroups.length > 0 && (
                <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                    <div className="overflow-hidden rounded-2xl border border-rose-200 bg-white">
                        <div className="border-b border-rose-100 bg-rose-50/50 px-5 py-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 shadow-sm">
                                        <CubeIcon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-lg font-semibold text-slate-900">{primaryJobType}</p>
                                            {totalGroups === 1 && (
                                                <span className="inline-flex items-center rounded-full border border-rose-200 bg-white px-2.5 py-0.5 text-xs font-medium text-rose-700">
                                                    Job Type
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-sm text-slate-500">สรุปประเภทงานและรายการที่ต้องส่งแบบเรียงลงมาใน brief section เดียว</p>
                                    </div>
                                </div>

                                <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:min-w-[280px]">
                                    <JobTypeMetric label="SLA" value={slaLabel} />
                                    <JobTypeMetric label="ประเภท" value={`${totalGroups} รายการ`} />
                                    <JobTypeMetric label="รวม" value={`${totalQuantity} ชิ้น`} emphasize />
                                </div>
                            </div>
                        </div>

                        <div className="divide-y divide-slate-200">
                            {jobTypeGroups.map((group) => (
                                <div key={group.jobType} className="px-5 py-4">
                                    {totalGroups > 1 && (
                                        <div className="mb-3 flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-semibold text-slate-900">{group.jobType}</p>
                                            <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                                                {group.totalQty} ชิ้น
                                            </span>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        {group.items.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                                                    <p className="mt-1 text-xs text-slate-500">{item.defaultSize || 'ไม่ระบุขนาด'}</p>
                                                </div>
                                                <span className="inline-flex flex-shrink-0 items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                                    x{item.quantity}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobBriefInfo;
