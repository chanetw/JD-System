/**
 * @file PerformanceChart.jsx
 * @description Component สำหรับแสดงกราฟประสิทธิภาพ
 * 
 * วัตถุประสงค์:
 * - แสดงกราฟแท่ง (Bar Chart) เปรียบเทียบงานที่สร้าง vs งานที่เสร็จ
 * - แสดงกราฟวงกลม (Pie Chart) สัดส่วนสถานะงาน
 * - แสดงกราฟเส้น (Line Chart) แนวโน้มตามช่วงเวลา
 * - รองรับ Loading และ Error states
 */

import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';

/**
 * @component PerformanceChart
 * @description กราฟประสิทธิภาพ
 * @param {object} props
 * @param {object} props.data - ข้อมูลกราฟ
 * @param {string} props.chartType - ประเภทกราฟ (bar, pie, line)
 * @param {boolean} props.isLoading - สถานะ Loading
 * @param {string} props.error - ข้อความ Error
 * @param {string} props.title - ชื่อกราฟ
 */
export default function PerformanceChart({ data, chartType = 'bar', isLoading, error, title }) {
    // แสดง Loading state
    if (isLoading) {
        return (
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="h-80 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
                </div>
            </div>
        );
    }

    // แสดง Error state
    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
                <p className="font-medium">เกิดข้อผิดพลาดในการโหลดกราฟ</p>
                <p className="text-sm mt-1">{error}</p>
            </div>
        );
    }

    // แสดงกราฟตามประเภท
    return (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            {title && (
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
            )}

            <div className="h-80">
                {chartType === 'bar' && <BarChartComponent data={data} />}
                {chartType === 'pie' && <PieChartComponent data={data} />}
                {chartType === 'line' && <LineChartComponent data={data} />}
            </div>
        </div>
    );
}

/**
 * @component BarChartComponent
 * @description กราฟแท่ง
 */
function BarChartComponent({ data }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="created" name="งานที่สร้าง" fill="#f43f5e" />
                <Bar dataKey="completed" name="งานที่เสร็จ" fill="#10b981" />
            </BarChart>
        </ResponsiveContainer>
    );
}

/**
 * @component PieChartComponent
 * @description กราฟวงกลม
 */
function PieChartComponent({ data }) {
    const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6b7280'];

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
}

/**
 * @component LineChartComponent
 * @description กราฟเส้น
 */
function LineChartComponent({ data }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                    type="monotone"
                    dataKey="onTimeRate"
                    name="อัตราส่งตรงเวลา (%)"
                    stroke="#10b981"
                    strokeWidth={2}
                />
                <Line
                    type="monotone"
                    dataKey="avgTurnaround"
                    name="เวลาเฉลี่ย (วัน)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
