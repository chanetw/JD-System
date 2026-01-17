/**
 * @file PortalFooter.jsx
 * @description Footer สำหรับ Portal (Shared Component)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

export default function PortalFooter() {
    return (
        <footer className="bg-white border-t border-slate-200 py-6">
            <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-slate-500">DJ System v2.0 | SENA Development PCL</p>
                <Link to="/" className="text-sm text-rose-600 hover:underline flex items-center gap-1">
                    <ArrowRightIcon className="w-4 h-4" />
                    Staff Dashboard
                </Link>
            </div>
        </footer>
    );
}
