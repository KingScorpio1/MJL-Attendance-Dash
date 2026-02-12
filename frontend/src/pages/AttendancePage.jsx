import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import Spinner from '../components/Spinner';
import { useAuth } from '../AuthContext';
import { classesAPI, attendanceAPI } from '../services/api';
import AttendanceTable from '../components/AttendanceTable'; // We will create/update this next
import TrialStudentModal from '../components/TrialStudentModal';
import classNames from 'classnames';

// Helper to get today's date in YYYY-MM-DD format
const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

export default function AttendancePage() {
    const { socket } = useAuth();
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedDate, setSelectedDate] = useState(getTodayString());
    const [attendanceData, setAttendanceData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [highlightedStudent, setHighlightedStudent] = useState(null);
    const [showOnlyTrials, setShowOnlyTrials] = useState(false);
    const [studentForTrialModal, setStudentForTrialModal] = useState(null);

    const fetchData = useCallback(() => {
        if (selectedClass && selectedDate) {
            setIsLoading(true);
            attendanceAPI.get(selectedClass, selectedDate)
                .then(setAttendanceData)
                .catch(() => toast.error('Could not load attendance data.'))
                .finally(() => setIsLoading(false));
        } else {
            setAttendanceData([]);
        }
    }, [selectedClass, selectedDate]);

    // Fetch all classes for the dropdown when the component first loads
    useEffect(() => {
        classesAPI.getAll()
            .then(setClasses)
            .catch(err => console.error("Failed to fetch classes", err));
    }, []);

    // Fetch attendance data when a class or date is selected
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // REAL-TIME UPDATE LOGIC
    useEffect(() => {
        if (!socket || !selectedClass) return;

        socket.emit('join_class', selectedClass);

        const handleAttendanceUpdate = (payload) => {
            // Check if the update is for the class we are currently viewing
            if (payload.classId === parseInt(selectedClass)) {
                setAttendanceData(currentData =>
                    currentData.map(student =>
                        student.student_id === payload.studentId
                            ? { ...student, status: payload.status }
                            : student
                    )
                );
                // Trigger the highlight animation
                setHighlightedStudent(payload.studentId);
                setTimeout(() => setHighlightedStudent(null), 1500); // Remove highlight after 1.5s
            }
        };

        socket.on('attendance_updated', handleAttendanceUpdate);

        // Cleanup function
        return () => {
            socket.emit('leave_class', selectedClass);
            socket.off('attendance_updated', handleAttendanceUpdate);
        };
    }, [socket, selectedClass]);



    // MODIFIED handler to accept any field change
    const handleFieldChange = (studentId, fieldName, value) => {
        setAttendanceData(currentData =>
            currentData.map(student =>
                student.student_id === studentId ? { ...student, [fieldName]: value } : student
            )
        );
    };

    const handleSaveAttendance = async () => {
        const payload = attendanceData.map(({ student_id, status, notes }) => ({ student_id, status, notes }));
        
        const savePromise = attendanceAPI.recordBulk(selectedClass, payload, selectedDate);
        toast.promise(savePromise, {
            loading: 'Saving attendance...',
            success: () => {
                // --- NEW LOGIC: After saving, check for trial students ---
                checkForTrialFollowUps();
                return <b>Attendance saved!</b>;
            },
            error: <b>Failed to save.</b>
        });
    };

    const handleCancelSession = async () => {
        if (!selectedClass || !selectedDate) return;

        if (window.confirm(`Are you sure you want to cancel this entire class session for ${selectedDate}? This will remove it from payroll and cannot be undone.`)) {
            const cancelPromise = attendanceAPI.cancelSession(selectedClass, selectedDate);
            
            toast.promise(cancelPromise, {
                loading: 'Canceling session...',
                success: () => {
                    // Refresh the data to show that all statuses are now 'pending'
                    fetchData(); 
                    return <b>Session canceled successfully!</b>;
                },
                error: (err) => <b>{err.response?.data?.error || 'Could not cancel session.'}</b>
            });
        }
    };

    const checkForTrialFollowUps = () => {
        const presentTrialStudents = attendanceData.filter(s =>
            s.is_trial &&
            (s.status === 'present' || s.status === 'late') &&
            s.trial_count > 0 // We check for > 0 because the count is incremented on the backend
        );
        // For simplicity, we'll just pop up the first one.
        // A more advanced version could queue them up.
        if (presentTrialStudents.length > 0) {
            setStudentForTrialModal(presentTrialStudents[0]);
        }
    };

    const handleModalUpdate = () => {
        fetchData();
    };

    const filteredAttendanceData = useMemo(() => {
        if (!showOnlyTrials) {
            return attendanceData;
        }
        return attendanceData.filter(student => student.is_trial);
    }, [attendanceData, showOnlyTrials]);

    if (isLoading && attendanceData.length === 0) {
        return <div className="p-10"><Spinner /></div>;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">Record Attendance</h2>

            {/* Controls: Class and Date Selection */}
            <div className="flex flex-wrap gap-4 items-center mb-4">
                <div className="flex-grow">
                    <label htmlFor="class-select" className="block text-sm font-medium text-gray-700 mb-1">Select a Class</label>
                    <select
                        id="class-select"
                        value={selectedClass}
                        onChange={e => setSelectedClass(e.target.value)}
                        className="w-full border rounded p-2"
                    >
                        <option value="">-- Please select a class --</option>
                        {classes.map(cls => (
                            <option key={cls.id} value={cls.id}>
                                {cls.name} ({cls.day} at {cls.start_time})
                            </option>
                        ))}
                    </select>
                </div>
                <div className="pt-6">
                    <button
                        onClick={() => setShowOnlyTrials(!showOnlyTrials)}
                        className={classNames(
                            'px-4 py-2 rounded transition-colors',
                            showOnlyTrials
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        )}
                    >
                        Show Trial Students Only
                    </button>
                </div>
                <div className="flex-grow">
                    <label htmlFor="date-select" className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
                    <input
                        type="date"
                        id="date-select"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        className="w-full border rounded p-2"
                    />
                </div>
            </div>

            {/* Attendance Table Section */}
            {selectedClass ? (
                isLoading ? <p>Loading students...</p> : (
                    <>
                        <AttendanceTable
                            attendanceData={filteredAttendanceData}
                            onStatusChange={handleFieldChange}
                            highlightedStudent={highlightedStudent}
                        />
                        <div className="mt-4 flex justify-between items-center">
                            <button onClick={handleSaveAttendance}className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                                Save Attendance
                            </button>
                            {/* --- NEW: Cancel Session Button --- */}
                            <button onClick={handleCancelSession} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
                                Cancel Class Session
                            </button>
                        </div>
                    </>
                )
            ) : (
                <p className="text-center text-gray-500 py-8">Please select a class to view students.</p>
            )}
            {studentForTrialModal && (
                <TrialStudentModal
                    student={studentForTrialModal}
                    classId={selectedClass}
                    onClose={() => setStudentForTrialModal(null)}
                    onUpdate={handleModalUpdate}
                />
            )}
        </div>
    );
}