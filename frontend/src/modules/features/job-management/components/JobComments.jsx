import React, { useState, useEffect, useRef } from 'react';
import { api } from '@shared/services/apiService';
import { UserIcon, TrashIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import Button from '@shared/components/Button';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

const JobComments = ({ jobId, currentUser, isEmbedded = false }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [comments]);

    useEffect(() => {
        if (jobId) {
            loadComments();
        }
    }, [jobId]);

    const loadComments = async () => {
        setIsLoading(true);
        try {
            const result = await api.getJobComments(jobId);
            if (result.success) {
                setComments(result.data.map(c => ({
                    id: c.id,
                    // รวมชื่อ-นามสกุล ถ้าไม่มีให้ใช้ displayName เป็น fallback
                    author: [c.user?.firstName, c.user?.lastName].filter(Boolean).join(' ') || c.user?.displayName || 'Unknown',
                    avatar: c.user?.avatarUrl,
                    message: c.comment,
                    timestamp: c.createdAt,
                    userId: c.userId
                })));
            }
        } catch (err) {
            console.error('Failed to load comments:', err);
            setError('ไม่สามารถโหลดความคิดเห็นได้');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setIsSubmitting(true);
        try {
            const result = await api.addJobComment(jobId, newComment);
            if (result.success) {
                const addedComment = {
                    id: result.data.id,
                    // รวมชื่อ-นามสกุล ถ้าไม่มีให้ดึงจาก currentUser หรือใช้ Unknown
                    author: [result.data.user?.firstName, result.data.user?.lastName].filter(Boolean).join(' ')
                        || [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ')
                        || currentUser?.displayName
                        || 'Unknown',
                    avatar: result.data.user?.avatarUrl || currentUser?.avatarUrl,
                    message: result.data.comment,
                    timestamp: result.data.createdAt,
                    userId: result.data.userId
                };
                setComments(prev => [...prev, addedComment]);
                setNewComment('');
            } else {
                alert(result.error);
            }
        } catch (err) {
            console.error('Failed to add comment:', err);
            alert('เกิดข้อผิดพลาดในการส่งความคิดเห็น');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('ต้องการลบความคิดเห็นนี้หรือไม่?')) return;

        try {
            const result = await api.deleteJobComment(jobId, commentId);
            if (result.success) {
                setComments(prev => prev.filter(c => c.id !== commentId));
            } else {
                alert(result.error);
            }
        } catch (err) {
            console.error('Failed to delete comment:', err);
            alert('เกิดข้อผิดพลาดในการลบ');
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className={`flex flex-col h-full bg-white ${!isEmbedded ? 'rounded-xl shadow-sm border border-gray-400 overflow-hidden' : ''}`}>
            {!isEmbedded && (
                <div className="border-b border-gray-400 px-6 py-4 flex justify-between items-center bg-white">
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                        <ChatBubbleLeftRightIcon className="w-5 h-5 text-gray-500" />
                        ความคิดเห็น ({comments.length})
                    </h2>
                </div>
            )}
            <div className={`flex-1 overflow-y-auto ${isEmbedded ? 'p-4' : 'p-6'} space-y-6 bg-white/50 backdrop-blur-sm relative ${isEmbedded ? 'max-h-[300px]' : 'max-h-[500px]'}`}>
                {comments.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        ยังไม่มีความคิดเห็น เริ่มต้นการสนทนาได้เลย
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="flex space-x-3">
                            <div className="flex-shrink-0">
                                {comment.avatar ? (
                                    <img
                                        className="h-10 w-10 rounded-full"
                                        src={comment.avatar}
                                        alt=""
                                    />
                                ) : (
                                    <span className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                                        <UserIcon className="h-6 w-6 text-gray-400" />
                                    </span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                    {comment.author}
                                    <span className="text-gray-500 font-normal ml-2 text-xs">
                                        {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true, locale: th })}
                                    </span>
                                </p>
                                <p className="mt-1 text-sm text-gray-700">{comment.message}</p>
                            </div>
                            {(comment.userId === currentUser?.id || currentUser?.roles?.some(r => (typeof r === 'string' ? r : r?.name)?.toLowerCase() === 'admin') || currentUser?.roleName?.toLowerCase() === 'admin') && (
                                <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="text-gray-400 hover:text-red-500"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ))
                )}
                {/* Dummy ref to scroll to bottom */}
                <div ref={messagesEndRef} />
            </div>

            <div className={`border-t border-gray-200 ${isEmbedded ? 'p-4' : 'p-6'} bg-white`}>
                <form onSubmit={handleAddComment} className="flex space-x-3">
                    {/* Avatar ส่วนผู้ใช้ปัจจุบัน: แสดงรูปหรือ Icon ถ้าไม่มีรูป */}
                    {currentUser?.avatarUrl ? (
                        <img
                            className="h-8 w-8 rounded-full object-cover"
                            src={currentUser.avatarUrl}
                            alt=""
                        />
                    ) : (
                        <span className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center text-xs font-semibold text-rose-600">
                            {([currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || currentUser?.displayName || '?').charAt(0).toUpperCase()}
                        </span>
                    )}
                    <div className="flex-1 min-w-0">
                        <label htmlFor="comment" className="sr-only">Comment</label>
                        <textarea
                            id="comment"
                            rows={2}
                            className="shadow-sm block w-full focus:ring-rose-500 focus:border-rose-500 sm:text-sm border border-gray-300 rounded-md"
                            placeholder="แสดงความคิดเห็น..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                        />
                    </div>
                    <div className="flex-shrink-0">
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={isSubmitting || !newComment.trim()}
                        >
                            <PaperAirplaneIcon className="h-5 w-5 -rotate-90" />
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default JobComments;
