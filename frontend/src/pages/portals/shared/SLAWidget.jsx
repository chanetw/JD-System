/**
 * @file SLAWidget.jsx
 * @description SLA Info + Contact Support (Shared Component)
 */

import React from 'react';
import {
    QuestionMarkCircleIcon,
    PhoneIcon,
    EnvelopeIcon,
    ClockIcon,
    PhotoIcon,
    PrinterIcon,
    VideoCameraIcon,
    ShareIcon
} from '@heroicons/react/24/outline';

export default function SLAWidget({ showContact = true }) {
    const slaItems = [
        { icon: PhotoIcon, iconColor: 'bg-rose-100 text-rose-600', title: 'Online Artwork', days: '7 วันทำการ' },
        { icon: PrinterIcon, iconColor: 'bg-purple-100 text-purple-600', title: 'Print Artwork', days: '10 วันทำการ' },
        { icon: VideoCameraIcon, iconColor: 'bg-blue-100 text-blue-600', title: 'Video Production', days: '15 วันทำการ' },
        { icon: ShareIcon, iconColor: 'bg-cyan-100 text-cyan-600', title: 'Social Media', days: '3 วันทำการ' },
    ];

    return (
        <div className="space-y-6">
            {/* SLA Info */}
            <div>
                <h3 className="font-semibold text-slate-800 text-lg mb-4">ระยะเวลาดำเนินการ (SLA)</h3>
                <div className="bg-white rounded-xl shadow-sm p-4 space-y-3 border border-slate-200">
                    {slaItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.iconColor}`}>
                                <item.icon className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-800">{item.title}</p>
                                <p className="text-xs text-slate-500">{item.days}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Contact Info */}
            {showContact && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-6">
                    <h4 className="font-semibold text-rose-800 mb-3 flex items-center gap-2">
                        <QuestionMarkCircleIcon className="w-5 h-5" /> ต้องการความช่วยเหลือ?
                    </h4>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2 text-rose-700">
                            <PhoneIcon className="w-4 h-4" />
                            <span>Creative Team: 2345</span>
                        </div>
                        <div className="flex items-center gap-2 text-rose-700">
                            <EnvelopeIcon className="w-4 h-4" />
                            <span>creative@sena.co.th</span>
                        </div>
                        <div className="flex items-center gap-2 text-rose-700">
                            <ClockIcon className="w-4 h-4" />
                            <span>จ-ศ, 8:30 - 17:30</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
