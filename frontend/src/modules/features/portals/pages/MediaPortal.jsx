/**
 * @file MediaPortal.jsx
 * @description หน้ารวมไฟล์งาน Design ที่เสร็จแล้ว (ดึงข้อมูลจริงตามสิทธิ์ User)
 * 
 * Features:
 * - แสดงไฟล์แยกตาม Project (ตามสิทธิ์ User Scope)
 * - Download/View Link Tracking
 * - รองรับ Link ภายนอก (Google Drive, Canva)
 */

import React, { useState, useEffect } from 'react';
import { Card, CardBody } from '@shared/components/Card';
import { adminService } from '@shared/services/modules/adminService';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import httpClient from '@shared/services/httpClient';
import {
    PhotoIcon,
    ArrowDownTrayIcon,
    EyeIcon,
    DocumentIcon,
    VideoCameraIcon,
    LinkIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '@shared/components/LoadingSpinner';

export default function MediaPortal() {
    const { user } = useAuthStoreV2();
    const [selectedProject, setSelectedProject] = useState('all');
    const [projects, setProjects] = useState([]);
    const [mediaFiles, setMediaFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        totalFiles: 0,
        deliveredFiles: 0,
        totalDownloads: 0
    });

    // โหลดโครงการตามสิทธิ์ User
    useEffect(() => {
        loadProjects();
    }, []);

    // โหลดไฟล์เมื่อเลือกโครงการ
    useEffect(() => {
        if (projects.length > 0) {
            loadMediaFiles();
        }
    }, [selectedProject, projects]);

    /**
     * ดึงรายชื่อโครงการที่ User มีสิทธิ์เข้าถึง
     * - Admin: เห็นทุกโครงการ
     * - Requester/Approver/Assignee: เห็นเฉพาะโครงการที่อยู่ใน Scope
     */
    const loadProjects = async () => {
        try {
            setIsLoading(true);
            // ดึงโครงการทั้งหมดจาก Backend (Backend จะกรองตาม RLS/User Scope อัตโนมัติ)
            const projectsData = await adminService.getProjects();

            // นับจำนวนไฟล์ในแต่ละโครงการ (TODO: ควรให้ Backend ส่งมาพร้อมกัน)
            const projectsWithCount = projectsData.map(p => ({
                id: p.id,
                name: p.name,
                code: p.code,
                files: 0 // จะอัพเดตหลังโหลดไฟล์
            }));

            setProjects([
                { id: 'all', name: 'ทั้งหมด', files: 0 },
                ...projectsWithCount
            ]);
        } catch (error) {
            console.error('[MediaPortal] Error loading projects:', error);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * ดึงรายการไฟล์จาก MediaFile table
     * (กรองตามโครงการที่เลือก)
     */
    const loadMediaFiles = async () => {
        try {
            const params = selectedProject === 'all' ? {} : { projectId: selectedProject };
            const response = await httpClient.get('/storage/files', { params });

            if (response.data.success) {
                const files = response.data.data;
                setMediaFiles(files);

                // คำนวณสถิติ
                const totalDownloads = files.reduce((sum, f) => sum + (f.downloadCount || 0), 0);
                setStats({
                    totalFiles: files.length,
                    deliveredFiles: files.filter(f => f.jobId).length, // ไฟล์ที่แนบกับ Job
                    totalDownloads
                });

                // อัพเดตจำนวนไฟล์ใน Project Tabs
                updateProjectFileCounts(files);
            }
        } catch (error) {
            console.error('[MediaPortal] Error loading media files:', error);
            setMediaFiles([]);
        }
    };

    /**
     * นับจำนวนไฟล์ในแต่ละโครงการ
     */
    const updateProjectFileCounts = (files) => {
        const counts = {};
        files.forEach(f => {
            if (f.projectId) {
                counts[f.projectId] = (counts[f.projectId] || 0) + 1;
            }
        });

        setProjects(prev => prev.map(p => ({
            ...p,
            files: p.id === 'all' ? files.length : (counts[p.id] || 0)
        })));
    };

    /**
     * Track Click (เพื่อนับสถิติการกด Link)
     */
    const handleViewFile = async (file) => {
        try {
            // Track click/view ก่อนเปิดไฟล์
            await httpClient.post('/analytics/track-click', {
                fileId: file.id,
                action: 'view'
            });

            console.log('[MediaPortal] Tracked view for file:', file.fileName);
        } catch (error) {
            console.error('[MediaPortal] Error tracking click:', error);
            // ไม่ block การเปิดไฟล์แม้ tracking ล้มเหลว
        } finally {
            // เปิด Link/URL ในแท็บใหม่ (เปิดไฟล์แม้ tracking ล้มเหลว)
            window.open(file.publicUrl || file.filePath, '_blank');
        }
    };

    const filteredFiles = selectedProject === 'all'
        ? mediaFiles
        : mediaFiles.filter(f => f.projectId === parseInt(selectedProject));

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <LoadingSpinner size="lg" color="rose" label="กำลังโหลดข้อมูล..." />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Media Portal</h1>
                <p className="text-gray-500">คลังไฟล์งาน Design ทั้งหมด (ตามสิทธิ์ของคุณ)</p>
            </div>

            {/* Project Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {projects.map(project => (
                    <button
                        key={project.id}
                        onClick={() => setSelectedProject(project.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedProject === project.id
                            ? 'bg-rose-500 text-white shadow-md'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        {project.name} ({project.files})
                    </button>
                ))}
            </div>

            {/* File Grid */}
            {filteredFiles.length === 0 ? (
                <Card>
                    <CardBody>
                        <div className="text-center py-12 text-gray-400">
                            <PhotoIcon className="w-16 h-16 mx-auto mb-3 opacity-20" />
                            <p>ยังไม่มีไฟล์ในโครงการนี้</p>
                        </div>
                    </CardBody>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {filteredFiles.map(file => (
                        <MediaCard key={file.id} file={file} onView={handleViewFile} />
                    ))}
                </div>
            )}

            {/* Stats Footer */}
            <Card>
                <CardBody>
                    <div className="flex items-center justify-around text-center">
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalFiles}</p>
                            <p className="text-sm text-gray-500">ไฟล์ทั้งหมด</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{stats.deliveredFiles}</p>
                            <p className="text-sm text-gray-500">ส่งมอบแล้ว</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalDownloads}</p>
                            <p className="text-sm text-gray-500">เข้าชม/ดาวน์โหลด</p>
                        </div>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}

/**
 * Component แสดงการ์ดไฟล์แต่ละชิ้น
 * รองรับ Link ภายนอก (แสดง Icon Link แทนประเภทไฟล์)
 */
function MediaCard({ file, onView }) {
    const isExternalLink = file.filePath?.includes('http') || file.filePath?.includes('drive.google');

    const getIcon = () => {
        // ถ้าเป็น Link ภายนอก แสดงไอคอน Link
        if (isExternalLink) {
            return <LinkIcon className="w-8 h-8 text-indigo-500" />;
        }

        // ถ้าเป็นไฟล์จริง แสดงตามประเภท
        const mimeType = file.mimeType || file.fileType || '';
        if (mimeType.includes('video')) return <VideoCameraIcon className="w-8 h-8 text-purple-500" />;
        if (mimeType.includes('pdf') || mimeType.includes('document')) return <DocumentIcon className="w-8 h-8 text-red-500" />;
        return <PhotoIcon className="w-8 h-8 text-blue-500" />;
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '-';
        const kb = bytes / 1024;
        const mb = kb / 1024;
        return mb >= 1 ? `${mb.toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
    };

    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardBody>
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden flex items-center justify-center mb-3">
                    {/* แสดง Thumbnail ถ้ามี, ไม่งั้นแสดง Icon */}
                    {file.thumbnailPath ? (
                        <img
                            src={`${import.meta.env.VITE_API_URL}/uploads/${file.thumbnailPath}`}
                            alt={file.fileName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                // Fallback to icon ถ้าโหลดรูปไม่ได้
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                    ) : null}
                    <div style={{ display: file.thumbnailPath ? 'none' : 'flex' }} className="w-full h-full items-center justify-center">
                        {getIcon()}
                    </div>
                </div>
                <p className="font-medium text-gray-900 text-sm truncate" title={file.fileName}>
                    {file.fileName}
                </p>
                <div className="flex items-center gap-2 mt-1">
                    {file.job?.djId && (
                        <span className="text-xs text-gray-500">{file.job.djId}</span>
                    )}
                    {isExternalLink && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-indigo-50 text-indigo-700">
                            🔗 Link
                        </span>
                    )}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                        {formatFileSize(file.fileSize)}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onView(file)}
                            className="p-1.5 hover:bg-indigo-50 rounded transition-colors"
                            title="เปิด/ดูไฟล์"
                        >
                            <EyeIcon className="w-4 h-4 text-indigo-600" />
                        </button>
                        <button
                            onClick={() => onView(file)}
                            className="p-1.5 hover:bg-rose-50 rounded transition-colors"
                            title="ดาวน์โหลด/เข้าชม"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4 text-rose-600" />
                        </button>
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                    เข้าชม: {file.downloadCount || 0} ครั้ง
                </p>
            </CardBody>
        </Card>
    );
}
