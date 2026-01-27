/**
 * @file TrendIndicator.jsx
 * @description Component สำหรับแสดงตัวบ่งชี้แนวโน้ม
 * 
 * วัตถุประสงค์:
 * - แสดงแนวโน้มของ KPI (เพิ่มขึ้น/ลดลง)
 * - แสดงเปอร์เซ็นต์การเปลี่ยนแปลง
 * - ใช้สีและไอคอนที่เหมาะสม
 */

/**
 * @component TrendIndicator
 * @description ตัวบ่งชี้แนวโน้ม
 * @param {object} props
 * @param {number} props.value - ค่าแนวโน้ม (เปอร์เซ็นต์)
 * @param {boolean} props.showLabel - แสดง Label หรือไม่ (default: true)
 * @param {string} props.label - Label ที่กำหนดเอง (optional)
 */
export default function TrendIndicator({ value, showLabel = true, label }) {
    // กำหนดสีและไอคอนตามค่า
    const getTrendInfo = (val) => {
        if (val > 0) {
            return {
                color: 'text-green-600',
                bgColor: 'bg-green-50',
                icon: <ArrowUpIcon />,
                label: 'เพิ่มขึ้น'
            };
        } else if (val < 0) {
            return {
                color: 'text-red-600',
                bgColor: 'bg-red-50',
                icon: <ArrowDownIcon />,
                label: 'ลดลง'
            };
        } else {
            return {
                color: 'text-gray-600',
                bgColor: 'bg-gray-50',
                icon: <MinusIcon />,
                label: 'ไม่เปลี่ยนแปลง'
            };
        }
    };

    const trendInfo = getTrendInfo(value);
    const displayLabel = label || trendInfo.label;

    return (
        <div className={`flex items-center gap-2 ${trendInfo.color}`}>
            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${trendInfo.bgColor}`}>
                {trendInfo.icon}
            </span>
            {showLabel && (
                <span className="text-sm font-medium">
                    {displayLabel} {Math.abs(value).toFixed(1)}%
                </span>
            )}
        </div>
    );
}

// ============================================
// Icons
// ============================================

function ArrowUpIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
    );
}

function ArrowDownIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
    );
}

function MinusIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
    );
}
