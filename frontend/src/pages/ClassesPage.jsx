// File: frontend/src/pages/ClassesPage.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { classesAPI, usersAPI, roomsAPI} from '../services/api';
import Modal from '../components/Modal';

export default function ClassesPage() {
    const { currentUser } = useAuth();
    const [classes, setClasses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [rooms, setRooms] = useState([]);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null);

    const [filters, setFilters] = useState({ day: '', teacherId: '' });
    const [sortBy, setSortBy] = useState('day'); // 'day', 'students_desc', 'students_asc'

    const fetchData = useCallback(() => {
        setIsLoading(true);
        Promise.all([
            classesAPI.getAll(),
            currentUser.role === 'admin' ? usersAPI.getAll() : Promise.resolve([]),
            currentUser.role === 'admin' ? roomsAPI.getAll() : Promise.resolve([])
        ]).then(([classesData, usersData, roomsData]) => {
            setClasses(classesData);
            setTeachers(usersData.filter(user => user.role === 'teacher'));
            setRooms(roomsData);
            setIsLoading(false);
        }).catch(err => {
            console.error("Failed to fetch data:", err);
            toast.error("Could not load class data.");
        }).finally(() => setIsLoading(false));
    }, [currentUser.role]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    // This is the core of the filtering logic
    const filteredAndSortedClasses = useMemo(() => {
        let result = [...classes];

        // Apply filters
        if (filters.day) {
            result = result.filter(cls => cls.day === filters.day);
        }
        if (filters.teacherId) {
            result = result.filter(cls => cls.teacher_id === parseInt(filters.teacherId));
        }

        // Apply sorting
        switch (sortBy) {
            case 'students_desc':
                result.sort((a, b) => b.student_count - a.student_count);
                break;
            case 'students_asc':
                result.sort((a, b) => a.student_count - b.student_count);
                break;
            default: // 'day'
                result.sort((a, b) => a.name.localeCompare(b.name)); // Default sort by name
                break;
        }
        return result;
    }, [classes, filters, sortBy]);

    // NEW: Function to open the modal and pre-fill it with student data
    const handleOpenEditModal = (cls) => {
        setEditingClass({...cls});
        setIsEditModalOpen(true);
    };

    // NEW: Function to handle form input changes in the edit modal
    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        setEditingClass(prev => ({ ...prev, [name]: value }));
    };

    // NEW: Function to submit the update to the backend
    const handleUpdateClass = async (e) => {
        e.preventDefault();
        const updatePromise = classesAPI.update(editingClass.id, editingClass);
        toast.promise(updatePromise, {
            loading: 'Saving...',
            success: () => { // <-- FIX: No need to use the returned value
                fetchData();
                setIsEditModalOpen(false);
                return <b>Class updated!</b>;
            },
            error: (err) => <b>{err.response?.data?.error || 'Could not update.'}</b>
        });
    };

    // NEW: Handler for the delete button
    const handleDeleteClass = async (classId) => {
        if (window.confirm('Are you sure you want to permanently delete this class? This will also delete all associated attendance records.')) {
            // Use a toast promise for great UX
            toast.promise(
                classesAPI.delete(classId),
                {
                    loading: 'Deleting class...',
                    success: () => {
                        // On success, update the UI and return a success message
                        setClasses(prevClasses => prevClasses.filter(c => c.id !== classId));
                        return <b>Class deleted successfully!</b>;
                    },
                    error: (err) => <b>{err.response?.data?.error || 'Failed to delete class.'}</b>,
                }
            );
        }
    };

    if (isLoading) {
        return <div className="p-10"><Spinner /></div>;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">
                {currentUser.role === 'admin' ? 'Class Management' : 'My Classes'}
            </h2>
            {currentUser.role === 'admin' && (
                <div className="p-4 bg-gray-50 border rounded-md mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Filter by Day</label>
                        <select name="day" value={filters.day} onChange={handleFilterChange} className="mt-1 w-full border rounded p-2">
                            <option value="">All Days</option>
                            <option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option>Saturday</option><option>Sunday</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Filter by Teacher</label>
                        <select name="teacherId" value={filters.teacherId} onChange={handleFilterChange} className="mt-1 w-full border rounded p-2">
                            <option value="">All Teachers</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.username}</option>)}
                        </select>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-700">Sort by</label>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="mt-1 w-full border rounded p-2">
                            <option value="day">Default</option>
                            <option value="students_desc">Most Students</option>
                            <option value="students_asc">Fewest Students</option>
                        </select>
                    </div>
                </div>
            )}
            {currentUser.role === 'teacher' && (
                <div className="p-4 bg-gray-50 border rounded-md mb-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Filter by Day</label>
                        <select name="day" value={filters.day} onChange={handleFilterChange} className="mt-1 w-full border rounded p-2">
                            <option value="">All Days</option>
                            <option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option>Saturday</option><option>Sunday</option>
                        </select>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-700">Sort by</label>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="mt-1 w-full border rounded p-2">
                            <option value="day">Default</option>
                            <option value="students_desc">Most Students</option>
                            <option value="students_asc">Fewest Students</option>
                        </select>
                    </div>
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="py-2 px-4 text-left font-semibold">Class Name</th>
                            <th className="py-2 px-4 text-left font-semibold">Time</th>
                            <th className="py-2 px-4 text-left font-semibold">Day</th>
                            <th className="py-2 px-4 text-left font-semibold">Teacher</th>
                            <th className="py-2 px-4 text-left font-semibold">Students</th>
                            <th className="py-2 px-4 text-left font-semibold">Room</th>
                            <th className="py-2 px-4 text-left font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSortedClasses.length > 0 ? (
                            filteredAndSortedClasses.map(cls => (
                                <tr key={cls.id} className="hover:bg-gray-50 border-b">
                                    <td className="py-2 px-4">
                                        <Link to={`/classes/${cls.id}`} className="text-blue-600 hover:underline">
                                            {cls.name}
                                        </Link>
                                    </td>
                                    <td className="py-2 px-4">{cls.start_time} - {cls.end_time}</td>
                                    <td className="py-2 px-4">{cls.day}</td>
                                    <td className="py-2 px-4">{cls.teacher_name || 'N/A'}</td>
                                    <td className="py-2 px-4">{cls.student_count}</td>
                                    <td className="py-2 px-4">{cls.room_name || 'N/A'}</td>
                                    <td className="py-2 px-4">
                                        {currentUser.role === 'admin' && (
                                            <>
                                                <button onClick={() => handleOpenEditModal(cls)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                                                <button onClick={() => handleDeleteClass(cls.id)} className="text-red-600 hover:text-red-800 text-sm ml-4">Delete</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ):(
                            <tr>
                                {/* The colSpan="6" makes this single cell span all 6 columns of the table */}
                                <td colSpan="6">
                                    <EmptyState message="No classes found matching your criteria." />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
             {editingClass && (
                <Modal title="Edit Class" isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
                        <form onSubmit={handleUpdateClass}>
                            <div className="mb-2"><label>Class Name</label><input type="text" name="name" value={editingClass.name} onChange={handleEditFormChange} className="w-full border rounded p-2" required /></div>
                            <div className="mb-2"><label>Start Time</label><input type="time" name="start_time" value={editingClass.start_time} onChange={handleEditFormChange} className="w-full border rounded p-2" required /></div>
                            <div className="mb-2"><label>End Time</label><input type="time" name="end_time" value={editingClass.end_time} onChange={handleEditFormChange} className="w-full border rounded p-2" required /></div>
                            <div className="mb-2"><label>Day</label><select name="day" value={editingClass.day} onChange={handleEditFormChange} className="w-full border rounded p-2"><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option>Saturday</option><option>Sunday</option></select></div>
                            <div className="mb-4"><label>Teacher</label><select name="teacher_id" value={editingClass.teacher_id} onChange={handleEditFormChange} className="w-full border rounded p-2" required>
                                <option value="">-- Select a Teacher --</option>
                                {teachers.map(t => <option key={t.id} value={t.id}>{t.username}</option>)}
                            </select></div>
                            <div className="mb-4">
                                <label>Room/Venue (Optional)</label>
                                <select name="room_id" value={editingClass.room_id || ''} onChange={handleEditFormChange} className="w-full border rounded p-2">
                                    <option value="">-- Select a Room --</option>
                                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="bg-gray-300 px-4 py-2 rounded">Cancel</button>
                                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Save Changes</button>
                            </div>
                        </form>
                </Modal>
            )}
        </div>
    );
}