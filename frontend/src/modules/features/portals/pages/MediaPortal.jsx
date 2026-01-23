/**
 * @file MediaPortal.jsx
 * @description หน้ารวมไฟล์งาน Design ที่เสร็จแล้ว
 * 
 * Features:
 * - แสดงไฟล์แยกตาม Project
 * - Download History Tracking
 * - Version Management
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardBody } from '@shared/components/Card';
import {
    FolderIcon,
    PhotoIcon,
    ArrowDownTrayIcon,
    EyeIcon,
    DocumentIcon,
    VideoCameraIcon
} from '@heroicons/react/24/outline';

export default function MediaPortal() {
    const [selectedProject, setSelectedProject] = useState('all');

    // Mock Data
    const projects = [
        { id: 'all', name: 'ทั้งหมด', files: 245 },
        { id: '1', name: 'Sena Park Grand', files: 85 },
        { id: '2', name: 'Sena Villa', files: 62 },
        { id: '3', name: 'Sena Ecotown', files: 98 }
    ];

    const mediaFiles = [
        { id: 1, name: 'Banner_FB_Q1.jpg', project: 'Sena Park Grand', type: 'image', size: '2.4 MB', djId: 'DJ-0148', downloads: 23, version: 2 },
        { id: 2, name: 'Walkthrough.mp4', project: 'Sena Villa', type: 'video', size: '156 MB', djId: 'DJ-0142', downloads: 47, version: 1 },
        { id: 3, name: 'Brochure.pdf', project: 'Sena Ecotown', type: 'document', size: '8.7 MB', djId: 'DJ-0145', downloads: 89, version: 3 },
        { id: 4, name: 'Richmenu.png', project: 'Sena Park Grand', type: 'image', size: '1.8 MB', djId: 'DJ-0151', downloads: 12, version: 1 },
    ];

    const filteredFiles = selectedProject === 'all'
        ? mediaFiles
        : mediaFiles.filter(f => f.project === projects.find(p => p.id === selectedProject)?.name);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Media Portal</h1>
                <p className="text-gray-500">คลังไฟล์งาน Design ทั้งหมด</p>
            </div>

            {/* Project Tabs */}
            <div className="flex gap-2 overflow-x-auto">
                {projects.map(project => (
                    <button
                        key={project.id}
                        onClick={() => setSelectedProject(project.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedProject === project.id
                            ? 'bg-rose-500 text-white'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        {project.name} ({project.files})
                    </button>
                ))}
            </div>

            {/* File Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredFiles.map(file => (
                    <MediaCard key={file.id} file={file} />
                ))}
            </div>

            {/* Stats Footer */}
            <Card>
                <CardBody>
                    <div className="flex items-center justify-around text-center">
                        <div>
                            <p className="text-2xl font-bold text-gray-900">245</p>
                            <p className="text-sm text-gray-500">ไฟล์ทั้งหมด</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">189</p>
                            <p className="text-sm text-gray-500">ส่งมอบแล้ว</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">1,247</p>
                            <p className="text-sm text-gray-500">ดาวน์โหลดทั้งหมด</p>
                        </div>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}

function MediaCard({ file }) {
    const getIcon = () => {
        switch (file.type) {
            case 'video': return <VideoCameraIcon className="w-8 h-8 text-purple-500" />;
            case 'document': return <DocumentIcon className="w-8 h-8 text-red-500" />;
            default: return <PhotoIcon className="w-8 h-8 text-blue-500" />;
        }
    };

    return (
        <Card>
            <CardBody>
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center mb-3">
                    {getIcon()}
                </div>
                <p className="font-medium text-gray-900 text-sm truncate">{file.name}</p>
                <p className="text-xs text-gray-500 mt-1">{file.djId} • v{file.version}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">{file.size}</span>
                    <div className="flex gap-2">
                        <button className="p-1.5 hover:bg-gray-100 rounded">
                            <EyeIcon className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1.5 hover:bg-rose-50 rounded">
                            <ArrowDownTrayIcon className="w-4 h-4 text-rose-600" />
                        </button>
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Downloads: {file.downloads}</p>
            </CardBody>
        </Card>
    );
}
