/**
 * @file PortalHero.jsx
 * @description Hero Section + Search Bar (Shared Component)
 * ใช้ร่วมกันทุก Portal - สีตาม Original (Rose)
 */

import React from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function PortalHero({
    title = "ต้องการงาน Design อะไรวันนี้?",
    subtitle = "ค้นหางานเดิมหรือสร้าง Design Job ใหม่",
    searchPlaceholder = "ค้นหา DJ ID หรือชื่องาน...",
    searchValue = "",
    onSearchChange = () => { },
    onSearchSubmit = () => { }
}) {
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            onSearchSubmit(searchValue);
        }
    };

    return (
        <div className="bg-gradient-to-r from-rose-600 to-rose-800 py-16">
            <div className="max-w-6xl mx-auto px-6 text-center">
                <h2 className="text-3xl font-bold text-white mb-4">{title}</h2>
                <p className="text-rose-100 mb-8">{subtitle}</p>

                <div className="max-w-2xl mx-auto relative">
                    <MagnifyingGlassIcon className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="w-full pl-14 pr-4 py-4 rounded-xl text-lg focus:outline-none focus:ring-4 focus:ring-rose-300 shadow-lg bg-white"
                    />
                </div>
            </div>
        </div>
    );
}
