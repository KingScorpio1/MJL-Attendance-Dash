// File: frontend/src/pages/StudentsPage.jsx

import React, { useState, useEffect } from 'react';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';
import { studentsAPI, reportsAPI } from '../services/api';
import Modal from '../components/Modal';
import BulkImport from '../components/Admin/BulkImport';
import { useAuth } from '../AuthContext';
import EmptyState from '../components/EmptyState';

export default function StudentsPage() {
    const { currentUser } = useAuth();
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);


    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [historyStudent, setHistoryStudent] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const fetchStudents = () => {
        setIsLoading(true);
        studentsAPI.getAll()
            .then(setStudents)
            .catch(err => console.error("Failed to fetch students:", err))
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    // NEW: Function to open the modal and pre-fill it with student data
    const handleOpenEditModal = (student) => {
        const formattedStudent = {
            ...student,
            birthday: student.birthday ? student.birthday.split('T')[0] : '',
            password: '' // Always start with a blank password field for reset
        };
        setEditingStudent(formattedStudent);
        setIsEditModalOpen(true);
    };
    
    // NEW: Function to handle form input changes in the edit modal
    const handleEditFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditingStudent(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // NEW: Function to submit the update to the backend
    const handleUpdateStudent = async (e) => {
        e.preventDefault();
        const updatePromise = studentsAPI.update(editingStudent.id, editingStudent);
        toast.promise(updatePromise, {
            loading: 'Saving student...',
            success: (updatedStudent) => {
                setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
                setIsEditModalOpen(false);
                return <b>Student saved successfully!</b>;
            },
            error: (err) => <b>{err.response?.data?.error || 'Could not save student.'}</b>
        });
    };

    const handleDeleteStudent = async (studentId) => {
        if (window.confirm('Are you sure you want to permanently delete this student?')) {
            // Use a toast promise for great UX
            toast.promise(
                studentsAPI.delete(studentId),
                {
                    loading: 'Deleting student...',
                    success: () => {
                        // On success, update the UI and return a success message
                        setStudents(prev => prev.filter(s => s.id !== studentId));
                        return <b>Student deleted successfully!</b>;
                    },
                    error: (err) => <b>{err.response?.data?.error || 'Could not delete student.'}</b>,
                }
            );
        }
    };

    const handleOpenHistoryModal = async (student) => {
        setHistoryStudent(student);
        setHistoryModalOpen(true);
        setHistoryLoading(true);
        try {
            // We can reuse the reports API logic by filtering for this student
            // This requires a new backend endpoint
            const data = await reportsAPI.getStudentHistory(student.id); // NEW API CALL
            setHistoryData(data);
        } catch (err) {
            toast.error("Could not load student history.");
        } finally {
            setHistoryLoading(false);
        }
    };

    if (isLoading) {
        return <div className="p-10"><Spinner /></div>;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">Student Management</h2>
            {currentUser.role === 'admin' && (
                <div className="mb-4">
                    <BulkImport onImportSuccess={fetchStudents} />
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="py-2 px-4 text-left font-semibold">Student Name</th>
                            <th className="py-2 px-4 text-left font-semibold">Email</th>
                            <th className="py-2 px-4 text-left font-semibold">Birthday</th>
                            <th className="py-2 px-4 text-left font-semibold">Trial</th>
                            <th className="py-2 px-4 text-left font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.length > 0 ? (
                            students.map(student => (
                                <tr key={student.id} className="hover:bg-gray-50 border-b">
                                    <td className="py-2 px-4">
                                        <button onClick={() => handleOpenHistoryModal(student)} className="text-blue-600 hover:underline">{student.name}</button>
                                    </td>
                                    <td className="py-2 px-4">{student.email}</td>
                                    <td className="py-2 px-4">{student.birthday ? new Date(student.birthday).toLocaleDateString() : 'N/A'}</td>
                                    <td className="py-2 px-4">{student.is_trial ? 'Yes' : 'No'}</td>
                                    <td className="py-2 px-4">
                                        <button onClick={() => handleOpenEditModal(student)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                                        <button onClick={() => handleDeleteStudent(student.id)} className="text-red-600 hover:text-red-800 text-sm ml-4">Delete</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                {/* This cell spans all 5 columns of the table */}
                                <td colSpan="5"> 
                                    <EmptyState message="No students found. Use the 'Add Student' button in the Admin Controls or 'Import from CSV' to add some." />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {editingStudent && (
                <Modal title="Edit Student" isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
                        <form onSubmit={handleUpdateStudent}>
                            <div className="mb-2">
                                <label>Full Name</label>
                                <input type="text" name="name" value={editingStudent.name} onChange={handleEditFormChange} className="w-full border rounded p-2" required />
                            </div>
                            <div className="mb-2">
                                <label>Email</label>
                                <input type="email" name="email" value={editingStudent.email} onChange={handleEditFormChange} className="w-full border rounded p-2" required />
                            </div>
                            <div className="mb-2">
                                <label>Birthday (Optional)</label>
                                <input type="date" name="birthday" value={editingStudent.birthday} onChange={handleEditFormChange} className="w-full border rounded p-2" />
                            </div>
                            <div className="mb-4 flex items-center">
                                <input type="checkbox" name="is_trial" checked={editingStudent.is_trial} onChange={handleEditFormChange} id="is_trial_edit" className="mr-2" />
                                <label htmlFor="is_trial_edit">Is this a trial student?</label>
                            </div>
                            <div className="mb-2">
                                <label>Parent Contact Info (Optional)</label>
                                <textarea 
                                    name="parent_info"
                                    value={editingStudent.parent_info || ''} 
                                    onChange={handleEditFormChange}
                                    className="w-full border rounded p-2"
                                    rows="3"
                                ></textarea>
                            </div>
                            <hr className="my-4" />
                            <h4 className="font-semibold text-gray-800 mb-2">Portal Login</h4>
                            <p className="text-xs text-gray-500 mb-2">Optional. Set a username and password for the student/parent portal.</p>
                            <div className="mb-2">
                                <label>Portal Username</label>
                                <input 
                                    type="text" 
                                    name="username" 
                                    value={editingStudent.username || ''}
                                    onChange={handleEditFormChange}
                                    className="w-full border rounded p-2" 
                                />
                            </div>
                            <div className="mb-2">
                                <label>Set/Reset Password</label>
                                <input 
                                    type="password" 
                                    name="password" 
                                    value={editingStudent.password}
                                    onChange={handleEditFormChange}
                                    className="w-full border rounded p-2" 
                                    placeholder="Leave blank to keep unchanged"
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="bg-gray-300 text-gray-800 px-4 py-2 rounded">Cancel</button>
                                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Save Changes</button>
                            </div>
                        </form>
                </Modal>
            )}
            {historyStudent && (
                <Modal title={`Attendance History for ${historyStudent.name}`} isOpen={historyModalOpen} onClose={() => setHistoryModalOpen(false)}>
                    {historyLoading ? <Spinner /> : (
                        <div className="max-h-96 overflow-y-auto">
                            {historyData.length > 0 ? (
                                <ul className="space-y-3">
                                    {historyData.map((record, index) => (
                                        <li key={index} className="p-2 border-b">
                                            <p className="font-semibold">{record.class_name} on {new Date(record.attendance_timestamp).toLocaleDateString()}</p>
                                            <p>Status: <span className="font-medium">{record.attendance_status}</span></p>
                                            {record.notes && <p className="text-sm text-gray-600 mt-1">Note: {record.notes}</p>}
                                        </li>
                                    ))}
                                </ul>
                            ) : <EmptyState message="No attendance history found for this student." />}
                        </div>
                    )}
                </Modal>
            )}
        </div>
    );
}