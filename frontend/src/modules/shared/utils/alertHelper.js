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
