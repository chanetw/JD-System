import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@shared/services/apiService';
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Badge from '@shared/components/Badge';

export default function PendingApprovalSection() {
    const [approvals, setApprovals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const loadApprovals = async () => {
            try {
                // Backend is already patched to filter approvals for role='approver'
                // This will return jobs that have a pending approval for CURRENT USER
                const data = await api.getJobs({ role: 'approver' });
                setApprovals(data);
            } catch (error) {
                console.error("Failed to load approvals", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadApprovals();
    }, []);

    if (isLoading) return null;
    if (approvals.length === 0) return null;

    return (
        <div className="max-w-6xl mx-auto px-6 -mt-8 relative z-20 mb-8">
            <div className="bg-white border-l-4 border-rose-500 rounded-xl shadow-lg p-6 animate-pulse-once">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-rose-700 font-bold text-xl flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-6 h-6" />
                        งานรอคุณอนุมัติ ({approvals.length})
                    </h3>
                    <span className="text-sm text-slate-500">โปรดตรวจสอบและอนุมัติเพื่อให้งานดำเนินการต่อได้</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {approvals.map(job => (
                        <div
                            key={job.id}
                            onClick={() => navigate(`/jobs/${job.id}`)}
                            className="border border-slate-200 rounded-lg p-4 hover:shadow-md hover:border-rose-300 transition cursor-pointer bg-white group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-semibold text-rose-600 text-sm">{job.djId}</span>
                                <Badge status={job.status} />
                            </div>
                            <h4 className="font-medium text-slate-800 mb-1 line-clamp-1">{job.subject}</h4>
                            <div className="text-sm text-slate-500 flex items-center gap-2 mb-3">
                                <img
                                    src={job.requesterAvatar || `https://ui-avatars.com/api/?name=${job.requester}&background=random`}
                                    className="w-5 h-5 rounded-full"
                                    alt="requester"
                                />
                                <span>คุณ{job.requester}</span>
                            </div>

                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                <div className="text-xs text-slate-400 flex items-center gap-1">
                                    <ClockIcon className="w-3 h-3" />
                                    {new Date(job.createdAt).toLocaleDateString('th-TH')}
                                </div>
                                <span className="text-xs font-medium text-rose-600 group-hover:underline">
                                    ตรวจทาน & อนุมัติ →
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
