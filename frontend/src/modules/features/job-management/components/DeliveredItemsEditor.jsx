import React from 'react';

const getDisplayQuantity = (item, values) => {
    const rawValue = values?.[item.id];
    if (rawValue !== '' && rawValue !== null && rawValue !== undefined) {
        const parsed = Number.parseInt(rawValue, 10);
        return Number.isNaN(parsed) ? 0 : parsed;
    }

    if (item?.effectiveQuantity !== null && item?.effectiveQuantity !== undefined) {
        return Number(item.effectiveQuantity) || 0;
    }

    if (item?.deliveredQuantity !== null && item?.deliveredQuantity !== undefined) {
        return Number(item.deliveredQuantity) || 0;
    }

    return Number(item?.quantity) || 0;
};

export default function DeliveredItemsEditor({
    items,
    jobTypeLabel,
    values,
    onChange,
    disabled = false,
    title = 'Job Type และจำนวนงานที่ส่งจริง',
    description = 'ระบุว่างานอะไรส่งจริงกี่ชิ้น หากเว้นว่าง ระบบจะใช้จำนวนเดิมของชิ้นงานนั้น'
}) {
    const safeItems = Array.isArray(items) ? items : [];
    const requestedTotal = safeItems.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
    const deliveredTotal = safeItems.reduce((sum, item) => sum + getDisplayQuantity(item, values), 0);

    if (safeItems.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                ไม่พบรายการชิ้นงานสำหรับกรอกจำนวนส่งจริง
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-rose-200 bg-white overflow-hidden">
            <div className="border-b border-rose-100 bg-rose-50/60 px-4 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-base font-semibold text-slate-900">{title}</p>
                        <p className="mt-1 text-sm text-slate-500">{description}</p>
                        <p className="mt-2 text-sm font-medium text-rose-700">{jobTypeLabel || 'ไม่ระบุประเภทงาน'}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:min-w-[280px]">
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">ประเภท</p>
                            <p className="mt-2 text-base font-semibold text-slate-900">1 รายการ</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">จำนวนที่ขอ</p>
                            <p className="mt-2 text-base font-semibold text-slate-900">{requestedTotal} ชิ้น</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">จำนวนที่จะนับ</p>
                            <p className="mt-2 text-base font-semibold text-rose-700">{deliveredTotal} ชิ้น</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="divide-y divide-slate-200">
                {safeItems.map((item) => {
                    const currentValue = values?.[item.id] ?? '';
                    const hasOverride = item?.deliveredQuantity !== null && item?.deliveredQuantity !== undefined;

                    return (
                        <div key={item.id} className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                    <span>{item.defaultSize || 'ไม่ระบุขนาด'}</span>
                                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700">
                                        ขอ {item.quantity || 0} ชิ้น
                                    </span>
                                    {hasOverride && (
                                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-700">
                                            ปัจจุบันนับ {item.effectiveQuantity ?? item.deliveredQuantity} ชิ้น
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="w-full lg:w-[180px]">
                                <label className="mb-1 block text-xs font-medium text-slate-500">จำนวนที่ส่งจริง</label>
                                <input
                                    type="number"
                                    min="0"
                                    inputMode="numeric"
                                    value={currentValue}
                                    onChange={(event) => onChange?.(item.id, event.target.value)}
                                    disabled={disabled}
                                    placeholder={`${item.effectiveQuantity ?? item.quantity ?? 0}`}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:bg-slate-50 disabled:text-slate-400"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}