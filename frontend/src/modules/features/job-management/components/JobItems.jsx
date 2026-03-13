/**
 * @file JobItems.jsx
 * @description แสดงรายการงานย่อย (Design Job Items) ที่ต้องส่งมอบแบบลำดับชั้น
 *
 * Features:
 * - แสดง Job Types พร้อมจำนวนรวม
 * - แสดง Job Items แบบลำดับชั้นพร้อมขนาด
 * - รองรับทั้ง Parent Job และ Child Job
 * - ไม่แสดงสถานะ (ตามที่ผู้ใช้ต้องการ)
 */

import React from 'react';
import { CubeIcon } from '@heroicons/react/24/solid';

export default function JobItems({ job }) {
    // ถ้าไม่มี items และไม่มี children ให้ return null
    if (!job) return null;

    // สร้างข้อมูลสำหรับแสดงผล
    let jobTypeGroups = [];
    let totalItems = 0;
    let totalQuantity = 0;

    if (job.isParent && job.children && job.children.length > 0) {
        // ===== Parent Job: รวม items จากทุก children =====
        const groups = {};

        job.children.forEach(child => {
            const jobTypeName = child.jobType || 'ไม่ระบุประเภท';

            if (!groups[jobTypeName]) {
                groups[jobTypeName] = {
                    jobType: jobTypeName,
                    items: [],
                    totalQty: 0
                };
            }

            if (child.items && child.items.length > 0) {
                child.items.forEach(item => {
                    groups[jobTypeName].items.push({
                        ...item,
                        jobType: jobTypeName
                    });
                    groups[jobTypeName].totalQty += (item.quantity || 1);
                });
            }
        });

        jobTypeGroups = Object.values(groups).filter(g => g.items.length > 0);
        totalItems = jobTypeGroups.reduce((sum, g) => sum + g.items.length, 0);
        totalQuantity = jobTypeGroups.reduce((sum, g) => sum + g.totalQty, 0);
    } else {
        // ===== Child Job หรือ Single Job: ใช้ items ของตัวเอง =====
        const jobTypeName = job.jobType || 'ไม่ระบุประเภท';

        if (job.items && job.items.length > 0) {
            jobTypeGroups = [{
                jobType: jobTypeName,
                items: job.items.map(item => ({
                    ...item,
                    jobType: jobTypeName
                })),
                totalQty: job.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
            }];
            totalItems = job.items.length;
            totalQuantity = jobTypeGroups[0].totalQty;
        }
    }

    // ถ้าไม่มีข้อมูลให้ return null
    if (jobTypeGroups.length === 0) {
        return null;
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 border-b border-rose-100 px-4 py-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <CubeIcon className="w-5 h-5 text-rose-600" />
                        รายการงานที่ต้องส่งมอบ
                    </h3>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                            รายการทั้งหมด: <span className="font-semibold text-rose-600">{jobTypeGroups.length}</span>
                        </span>
                        <span className="text-sm text-gray-600">
                            จำนวนรวม: <span className="font-semibold text-rose-600">{totalQuantity}</span> ชิ้น
                        </span>
                    </div>
                </div>
            </div>

            {/* Job Types List with Hierarchical Items */}
            <div className="divide-y divide-gray-100">
                {jobTypeGroups.map((group, groupIndex) => (
                    <div key={group.jobType} className="px-4 py-3">
                        {/* Job Type Header */}
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold text-gray-800">
                                {group.jobType}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                                <CubeIcon className="w-3 h-3" />
                                {group.totalQty} ชิ้น
                            </span>
                        </div>

                        {/* Job Items under this Job Type */}
                        <div className="ml-4 space-y-1">
                            {group.items.map((item, itemIndex) => (
                                <div
                                    key={item.id || itemIndex}
                                    className="flex items-center gap-2 text-sm text-gray-700 py-1"
                                >
                                    <span className="text-gray-400">└──</span>
                                    <span className="font-medium">{item.name}</span>
                                    {item.defaultSize && (
                                        <span className="text-gray-500">{item.defaultSize}</span>
                                    )}
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ml-1">
                                        ({item.quantity || 1} ชิ้น)
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Summary */}
            {jobTypeGroups.length > 1 && (
                <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-center">
                    <p className="text-xs text-gray-500">
                        รวมทั้งหมด {jobTypeGroups.length} ประเภทงาน ({totalQuantity} ชิ้น)
                    </p>
                </div>
            )}
        </div>
    );
}
