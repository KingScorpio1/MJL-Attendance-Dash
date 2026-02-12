// File: frontend/src/pages/StudentDashboardPage.jsx

import React, { useState, useEffect } from 'react';
import { studentPortalAPI } from '../services/api';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';

export default function StudentDashboardPage() {
    const [classes, setClasses] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        Promise.all([
            studentPortalAPI.getMyClasses(),
            studentPortalAPI.getMyAttendance()
        ]).then(([classesData, attendanceData]) => {
            setClasses(classesData);
            setAttendance(attendanceData);
        }).catch(() => {
            toast.error("Could not load your dashboard data.");
        }).finally(() => {
            setIsLoading(false);
        });
    }, []);

    if (isLoading) {
        return <div className="p-10"><Spinner /></div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-4">My Upcoming Classes</h2>
                <div className="bg-white p-4 rounded-lg shadow space-y-3">
                    {classes.length > 0 ? classes.map(cls => (
                        <div key={cls.id} className="p-3 border rounded-md">
                            <p className="font-bold text-lg">{cls.name}</p>
                            <p className="text-gray-600">{cls.day} at {cls.start_time}</p>
                            <p className="text-sm text-gray-500">Teacher: {cls.teacher_name}</p>
                        </div>
                    )) : <p>You are not currently enrolled in any classes.</p>}
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold mb-4">Recent Attendance</h2>
                <div className="bg-white p-4 rounded-lg shadow">
                    <ul className="space-y-2">
                        {attendance.length > 0 ? attendance.map((record, index) => (
                            <li key={index} className="flex justify-between items-center p-2 border-b">
                                <div>
                                    <p className="font-semibold">{record.class_name}</p>
                                    <p className="text-sm text-gray-500">{new Date(record.attendance_date).toLocaleDateString()}</p>
                                </div>
                                <span className="font-bold">{record.status}</span>
                            </li>
                        )) : <p>No recent attendance records found.</p>}
                    </ul>
                </div>
            </div>
        </div>
    );
}