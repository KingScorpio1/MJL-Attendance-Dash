// File: frontend/src/pages/DashboardPage.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import Spinner from '../components/Spinner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { reportsAPI } from '../services/api';

export default function DashboardPage() {
    const { currentUser } = useAuth();
    const [chartData, setChartData] = useState([]);
    const [stats, setStats] = useState({ today: 0, week: 0 });
    const [trialCount, setTrialCount] = useState(0);
    const [mostAbsent, setMostAbsent] = useState([]);
    const [superAdminStats, setSuperAdminStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        const promises = [
            reportsAPI.getSummary(), // Assuming this function exists in your api.js
            reportsAPI.getStats(), // Assuming this function exists
            reportsAPI.getTrialCount(), // Assuming this function exists
            // Conditionally add the new API call for admins
            currentUser.role === 'admin' ? reportsAPI.getSuperAdminStats() : Promise.resolve(null)
        ];

        Promise.all(promises)
            .then(([summaryRes, statsRes, trialRes, absentRes, superAdminRes]) => {
                const processedData = summaryRes.data.map(item => ({
                    ...item,
                    day: new Date(item.day).toLocaleDateString(),
                }));
                setChartData(processedData);
                setStats(statsRes.data);
                setTrialCount(trialRes.data.count);
                setMostAbsent(absentRes.data);
                if (superAdminRes) {
                    setSuperAdminStats(superAdminRes);
                }
            })
            .catch(err => console.error("Failed to fetch dashboard data:", err))
            .finally(() => setIsLoading(false));
    }, [currentUser.role]);

    if (isLoading) {
        return <div className="p-10"><Spinner /></div>;
    }


    return (
        <div>
            {/* --- NEW: Stat Cards Section --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="font-semibold text-gray-700">Today's Attendance</h3>
                    <p className="text-3xl font-bold">{stats.today}%</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="font-semibold text-gray-700">Weekly Average</h3>
                    <p className="text-3xl font-bold">{stats.week}%</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="font-semibold text-gray-700">Trial Students</h3>
                    <p className="text-3xl font-bold">{trialCount}</p>
                </div>
            </div>

            {/* Attendance Trend Chart (Unchanged) */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h3 className="text-xl font-bold mb-4">Attendance Trend</h3>
                {chartData.length > 0 ? (
                <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                        <LineChart
                            data={chartData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="present" stroke="#10B981" strokeWidth={2} name="Present" />
                            <Line type="monotone" dataKey="absent" stroke="#EF4444" strokeWidth={2} name="Absent" />
                            <Line type="monotone" dataKey="late" stroke="#F59E0B" strokeWidth={2} name="Late" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                ) : <p>No attendance data available to display a chart.</p>}
            </div>

            {/* --- Most Absent Students (Admin Only) --- */}
            {currentUser.role === 'admin' && mostAbsent.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-xl font-bold mb-4">Most Frequent Absences (Last 30 Days)</h3>
                    <ul className="space-y-2">
                        {mostAbsent.map(student => (
                            <li key={student.name} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <span>{student.name}</span>
                                <span className="font-bold text-red-600">{student.absent_count} absences</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {/* --- NEW: Super Admin Section --- */}
            {currentUser.role === 'admin' && superAdminStats && (
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold border-t pt-6">Admin Analytics</h2>
                    
                    {/* Revenue Projection */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-xl font-bold mb-2">Monthly Revenue Projection</h3>
                        <p className="text-4xl font-bold text-green-600">NT${superAdminStats.revenueProjection}</p>
                        <p className="text-sm text-gray-500">Based on current enrollment and class rates.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Teacher Performance */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-xl font-bold mb-4">Teacher Performance</h3>
                            <ul className="space-y-2">
                                {superAdminStats.teacherPerformance.map(teacher => (
                                    <li key={teacher.teacher_name} className="flex justify-between items-center">
                                        <span>{teacher.teacher_name}</span>
                                        <span className="font-semibold">{teacher.attendance_rate}% Attendance</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        {/* Student Retention */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-xl font-bold mb-4">Student Retention (Last 30 Days)</h3>
                            <div className="space-y-3">
                                <p><strong>Total Active Students:</strong> {superAdminStats.studentRetention.totalActive}</p>
                                <p><strong>New Students:</strong> {superAdminStats.studentRetention.new}</p>
                                <p><strong>Retained Students:</strong> {superAdminStats.studentRetention.retained}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}