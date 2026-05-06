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
import { useSuperSearchStore } from '@core/stores/superSearchStore';
import httpClient from '@shared/services/httpClient';
import {
    PhotoIcon,
    Bars3BottomLeftIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { matchesSuperSearch } from '@shared/utils/superSearch';
import FileActions from '@shared/components/FileActions';

export default function MediaPortal() {
    const { user } = useAuthStoreV2();
    const superSearchQuery = useSuperSearchStore(state => state.query);
    const setSuperSearchMeta = useSuperSearchStore(state => state.setResultMeta);
    const [selectedProject, setSelectedProject] = useState('all');
    const [projects, setProjects] = useState([]);
    const [mediaFiles, setMediaFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        totalFiles: 0,
        deliveredFiles: 0,
        totalDownloads: 0
    });

    const projectsWithFiles = projects
        .filter(project => project.id !== 'all' && (project.files || 0) > 0)
        .sort((a, b) => {
            const countDiff = (b.files || 0) - (a.files || 0);
            if (countDiff !== 0) return countDiff;
            return a.name.localeCompare(b.name, 'th');
        });

    const projectsWithoutFiles = projects
        .filter(project => project.id !== 'all' && (project.files || 0) === 0)
        .sort((a, b) => a.name.localeCompare(b.name, 'th'));

    // โหลดโครงการตามสิทธิ์ User
    useEffect(() => {
        loadProjects();
    }, []);

    // โหลดไฟล์ทั้งหมด 1 ครั้ง แล้วกรองตามโครงการในฝั่ง client
    useEffect(() => {
        if (projects.length > 0) {
            loadMediaFiles();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projects.length]);

    /**
     * ดึงรายชื่อโครงการที่ User มีสิทธิ์เข้าถึง
     * - Admin: เห็นทุกโครงการ
     * - Requester/Approver/Assignee: เห็นเฉพาะโครงการที่อยู่ใน Scope
     */
    const loadProjects = async () => {
        console.log('[MediaPortal] loadProjects called');
        try {
            setIsLoading(true);
            // ดึงโครงการทั้งหมดจาก Backend (Backend จะกรองตาม RLS/User Scope อัตโนมัติ)
            const projectsData = await adminService.getProjects();
            console.log('[MediaPortal] Projects loaded:', projectsData.length, 'projects');

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
        console.log('[MediaPortal] loadMediaFiles called');
        try {
            // ดึงทั้งหมดเพื่อให้คำนวณ count ต่อโครงการได้ครบ
            const response = await httpClient.get('/storage/files');
            console.log('[MediaPortal] API response:', response.data);

            if (response.data.success) {
                const files = response.data.data;
                console.log('[MediaPortal] Files loaded:', files.length, 'files');
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
            console.error('[MediaPortal] Error details:', error.response?.data || error.message);
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
    const handleFileAction = (file, action = 'view') => {
        // Track click/view แบบ async (ไม่ block การเปิดหน้า)
        httpClient.post('/analytics/track-click', {
            fileId: file.id,
            action
        }).catch(err => console.error('[MediaPortal] Track error:', err));
    };

    const projectFilteredFiles = selectedProject === 'all'
        ? mediaFiles
        : mediaFiles.filter(f => {
            // แปลง selectedProject เป็น number เพื่อเปรียบเทียบกับ projectId
            const projectIdToMatch = selectedProject === 'all' ? null : Number(selectedProject);
            return f.projectId === projectIdToMatch;
        });

    const filteredFiles = projectFilteredFiles.filter(file => matchesSuperSearch(file, superSearchQuery, [
        item => item.fileName,
        item => item.file_name,
        item => item.originalName,
        item => item.projectName,
        item => item.jobId,
        item => item.mimeType,
        item => item.fileType,
        item => item.publicUrl,
    ]));

    useEffect(() => {
        setSuperSearchMeta({ resultCount: filteredFiles.length, totalCount: projectFilteredFiles.length });
    }, [filteredFiles.length, projectFilteredFiles.length, setSuperSearchMeta]);

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

            {/* Project Dropdown */}
            <div className="max-w-md">
                <label htmlFor="project-filter" className="block text-sm font-medium text-gray-700 mb-2">
                    เลือกโครงการ
                </label>
                <select
                    id="project-filter"
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400"
                >
                    <option value="all">ทั้งหมด ({stats.totalFiles})</option>
                    {projectsWithFiles.length > 0 && (
                        <optgroup label="มีไฟล์">
                            {projectsWithFiles.map(project => (
                                <option key={project.id} value={String(project.id)}>
                                    {project.name} ({project.files})
                                </option>
                            ))}
                        </optgroup>
                    )}
                    {projectsWithoutFiles.length > 0 && (
                        <optgroup label="ยังไม่มีไฟล์">
                            {projectsWithoutFiles.map(project => (
                                <option key={project.id} value={String(project.id)}>
                                    {project.name} ({project.files})
                                </option>
                            ))}
                        </optgroup>
                    )}
                </select>
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
                        <MediaCard key={file.id} file={file} onAction={handleFileAction} />
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
function MediaCard({ file, onAction }) {
    const isExternalLink = file.fileType === 'link';
    const jobSubject = file.job?.subject || file.fileName || 'Untitled';
    const dateStr = new Date(file.createdAt || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const projectName = file.project?.name || file.project?.code || 'No Project';
    const hasProject = Boolean(file.projectId || file.project?.id);

    const resolveFileTypeLabel = () => {
        if (isExternalLink) return 'LINK';

        const mime = String(file.mimeType || file.fileType || '').toLowerCase();
        if (mime.includes('pdf')) return 'PDF';
        if (mime.includes('png')) return 'PNG';
        if (mime.includes('jpeg') || mime.includes('jpg')) return 'JPEG';
        if (mime.includes('gif')) return 'GIF';
        if (mime.includes('webp')) return 'WEBP';
        if (mime.includes('svg')) return 'SVG';
        if (mime.includes('msword') || mime.includes('wordprocessingml')) return 'DOC';
        if (mime.includes('spreadsheetml') || mime.includes('ms-excel')) return 'XLS';
        if (mime.includes('presentationml') || mime.includes('ms-powerpoint')) return 'PPT';
        if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z')) return 'ARCHIVE';

        const fileName = String(file.fileName || '').toLowerCase();
        const ext = fileName.includes('.') ? fileName.split('.').pop() : '';
        return ext ? ext.toUpperCase() : 'FILE';
    };

    const fileTypeLabel = resolveFileTypeLabel();
    
    console.log('[MediaCard] File data:', {
        id: file.id,
        fileName: file.fileName,
        fileType: file.fileType,
        filePath: file.filePath,
        publicUrl: file.publicUrl,
        isExternalLink,
        projectName
    });

    return (
        <div className="bg-white rounded border border-gray-200 shadow-sm p-3 hover:bg-gray-50 hover:shadow transition-all flex flex-col justify-between min-h-[100px]">
            <div>
                {/* Project Badge */}
                <div className="flex gap-1.5 mb-2">
                    <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${hasProject ? 'bg-rose-100 text-rose-800' : 'bg-gray-100 text-gray-700'}`}
                        title={hasProject ? projectName : 'ไฟล์นี้ยังไม่ถูกผูกกับโปรเจกต์'}
                    >
                        {hasProject ? projectName : 'ยังไม่ผูกโปรเจกต์'}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                        {fileTypeLabel}
                    </span>
                </div>

                {/* Title */}
                <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug mb-3" title={file.fileName}>
                    {jobSubject}
                </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-gray-400 mt-auto pt-2">
                <div className="flex items-center gap-3">
                    <Bars3BottomLeftIcon className="w-4 h-4" />
                    <div className="flex items-center gap-1 text-xs font-medium">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {dateStr}
                    </div>
                </div>
                <FileActions file={file} onAction={onAction} compact />
            </div>
        </div>
    );
}
