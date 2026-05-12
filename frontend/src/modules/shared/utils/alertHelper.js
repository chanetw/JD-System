import Swal from 'sweetalert2';

export const ALERT_COLORS = {
    primary: '#e11d48',
    danger: '#dc2626',
    neutral: '#6b7280',
    warningIcon: '#f59e0b'
};

const DEFAULT_TYPE_CONFIG = {
    success: { icon: 'success', confirmButtonColor: ALERT_COLORS.primary },
    warning: { icon: 'warning', confirmButtonColor: ALERT_COLORS.primary },
    error: { icon: 'error', confirmButtonColor: ALERT_COLORS.primary },
    info: { icon: 'info', confirmButtonColor: ALERT_COLORS.primary }
};

export const ACTION_BUTTON_STYLES = {
    complete: 'bg-emerald-500 text-white hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200',
    draft: 'bg-blue-500 text-white hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200',
    rebrief: 'bg-amber-500 text-white hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200',
    reject: 'bg-rose-500 text-white hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200',
    neutral: 'bg-slate-500 text-white hover:bg-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200'
};

export function showAlert(type, title, text = '', options = {}) {
    const base = DEFAULT_TYPE_CONFIG[type] || DEFAULT_TYPE_CONFIG.info;
    return Swal.fire({
        ...base,
        title,
        ...(text ? { text } : {}),
        ...options
    });
}

export function showConfirmWithInput(options = {}) {
    return Swal.fire({
        icon: 'warning',
        iconColor: ALERT_COLORS.warningIcon,
        showCancelButton: true,
        confirmButtonColor: ALERT_COLORS.danger,
        cancelButtonColor: ALERT_COLORS.neutral,
        ...options
    });
}

export function showToast(type, message, options = {}) {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        },
        ...options
    });

    return Toast.fire({ icon: type, title: message });
}

export function getJobActionErrorDetail(error, options = {}) {
    const {
        actionLabel = 'ดำเนินการ',
        fallbackTitle = 'ไม่สามารถดำเนินการได้'
    } = options;

    const response = error?.response;
    const payload = response?.data || {};
    const code = payload?.error || null;
    const status = response?.status;
    const currentStatus = payload?.data?.currentStatus || payload?.currentStatus || null;
    const serverMessage = payload?.message || error?.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';

    if (code === 'INVALID_STATUS' || code === 'ALREADY_PROCESSED') {
        const statusText = currentStatus ? `\nสถานะล่าสุด: ${currentStatus}` : '';
        return {
            title: `${actionLabel}ไม่สำเร็จ: สถานะงานเปลี่ยนแล้ว`,
            text: `สาเหตุ: งานถูกดำเนินการไปก่อนแล้วหรือระบบหมดเวลารออนุมัติ${statusText}\nแนวทางแก้: กดรีเฟรชหน้า แล้วตรวจสอบสถานะล่าสุด หากยังไม่ถูกต้องให้ติดต่อแอดมินพร้อม DJ-ID`
        };
    }

    if (code === 'COMMENT_REQUIRED') {
        return {
            title: `${actionLabel}ไม่สำเร็จ: ข้อมูลไม่ครบ`,
            text: 'สาเหตุ: ไม่พบเหตุผลประกอบการปฏิเสธ\nแนวทางแก้: กรุณาระบุเหตุผลให้ชัดเจน แล้วลองอีกครั้ง'
        };
    }

    if (code === 'NOT_ASSIGNEE') {
        return {
            title: `${actionLabel}ไม่สำเร็จ: ไม่มีสิทธิ์`,
            text: 'สาเหตุ: บัญชีนี้ไม่ใช่ผู้รับผิดชอบงาน\nแนวทางแก้: ตรวจสอบผู้รับงานปัจจุบัน หรือติดต่อหัวหน้าทีม/แอดมินเพื่ออัปเดตสิทธิ์'
        };
    }

    if (code === 'FORBIDDEN' || status === 403) {
        return {
            title: `${actionLabel}ไม่สำเร็จ: สิทธิ์ไม่เพียงพอ`,
            text: 'สาเหตุ: บทบาทปัจจุบันไม่สามารถทำรายการนี้ได้\nแนวทางแก้: ให้ผู้มีสิทธิ์ Approver/Admin ทำรายการแทน หรือติดต่อแอดมินเพื่อขอสิทธิ์'
        };
    }

    if (code === 'NOT_FOUND' || status === 404) {
        return {
            title: `${actionLabel}ไม่สำเร็จ: ไม่พบงาน`,
            text: 'สาเหตุ: ไม่พบรายการงานในระบบ หรือข้อมูลถูกเปลี่ยนไปแล้ว\nแนวทางแก้: กลับไปหน้าคิวแล้วค้นหา DJ-ID ใหม่ หากยังหาไม่พบให้ติดต่อแอดมิน'
        };
    }

    if (status >= 500) {
        return {
            title: `${fallbackTitle}`,
            text: 'สาเหตุ: ระบบเซิร์ฟเวอร์ขัดข้องชั่วคราว\nแนวทางแก้: ลองใหม่อีกครั้งใน 1-2 นาที หากยังเกิดซ้ำให้ติดต่อแอดมินพร้อมเวลาและ DJ-ID'
        };
    }

    return {
        title: fallbackTitle,
        text: `${serverMessage}\nหากพบซ้ำ ให้ติดต่อแอดมินพร้อม DJ-ID และเวลาที่เกิดเหตุ`
    };
}
