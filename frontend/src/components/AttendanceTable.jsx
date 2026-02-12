// File: frontend/src/components/AttendanceTable.jsx

import React from 'react';
import classNames from 'classnames';
import EmptyState from './EmptyState';

export default function AttendanceTable({ attendanceData, onStatusChange, highlightedStudent }) {

    if (!attendanceData || attendanceData.length === 0) {
        return <EmptyState message="No students found for this class or filter." />;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="py-2 px-4 text-left font-semibold text-gray-600 border-b">Student Name</th>
                        <th className="py-2 px-4 text-left font-semibold text-gray-600 border-b">Trial Status</th>
                        <th className="py-2 px-4 text-left font-semibold text-gray-600 border-b">Attendance Status</th>
                        <th className="py-2 px-4 text-left font-semibold text-gray-600 border-b">Notes</th>
                    </tr>
                </thead>
                <tbody>
                    {attendanceData.map((student) => (
                        <tr 
                            key={student.student_id} 
                            className={classNames('hover:bg-gray-50 transition-colors duration-300', {
                                'bg-yellow-100': student.student_id === highlightedStudent,
                            })}
                        >
                            <td className="py-2 px-4 border-b">{student.student_name}</td>
                            <td className="py-2 px-4 border-b">
                                {student.is_trial ? (
                                    <span className="bg-yellow-200 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Yes</span>
                                ) : (
                                    <span className="bg-green-200 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">No</span>
                                )}
                            </td>
                            <td className="py-2 px-4 border-b">
                                <select
                                    value={student.status}
                                    onChange={(e) => onStatusChange(student.student_id, 'status', e.target.value)}
                                    className="border rounded p-1 w-full"
                                >
                                    <option value="present">Present</option>
                                    <option value="absent">Absent</option>
                                    <option value="late">Late</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </td>
                            <td className="py-2 px-4 border-b">
                                <input
                                    type="text"
                                    value={student.notes || ''}
                                    onChange={(e) => onStatusChange(student.student_id, 'notes', e.target.value)}
                                    className="border rounded p-1 w-full"
                                    placeholder="Add a note..."
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}