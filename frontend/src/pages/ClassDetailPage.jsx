// File: frontend/src/pages/ClassDetailPage.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { classesAPI, studentsAPI, logsAPI, fileUploadAPI } from '../services/api';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import toast from 'react-hot-toast';
import classNames from 'classnames';

// --- Sub-components for the tabs ---
const RosterTab = ({ roster, allStudents, onAdd, onRemove }) => {
    const [selectedStudent, setSelectedStudent] = useState('');
    const availableStudents = useMemo(() => {
        const rosterIds = new Set(roster.map(s => s.id));
        return allStudents.filter(s => !rosterIds.has(s.id));
    }, [roster, allStudents]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <h3 className="text-xl font-semibold mb-2">Current Roster ({roster.length})</h3>
                <div className="bg-gray-50 p-4 rounded-lg border max-h-96 overflow-y-auto">
                    {roster.length > 0 ? (
                        <ul>{roster.map(student => (
                            <li key={student.id} className="flex justify-between items-center p-2 hover:bg-gray-100">
                                <span>{student.name}</span>
                                <button onClick={() => onRemove(student.id)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                            </li>
                        ))}</ul>
                    ) : <EmptyState message="No students are enrolled." />}
                </div>
            </div>
            <div>
                <h3 className="text-xl font-semibold mb-2">Add Student to Class</h3>
                <div className="bg-gray-50 p-4 rounded-lg border">
                    <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="w-full border rounded p-2 mb-2">
                        <option value="">-- Available Students --</option>
                        {availableStudents.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}
                    </select>
                    <button onClick={() => onAdd(selectedStudent)} className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Add to Roster</button>
                </div>
            </div>
        </div>
    );
};

const MaterialsTab = ({ materials, onAdd, onUpdate, onDelete }) => {
    const [editingMaterial, setEditingMaterial] = useState(null); // null or the material object
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [file, setFile] = useState(null); 

    const handleSelectForEdit = (material) => {
        setEditingMaterial(material);
        setTitle(material.title);
        setUrl(material.url || ''); // Use url from existing material
        setFile(null); // Clear file input when editing
    };

    const handleCancelEdit = () => {
        setEditingMaterial(null);
        setTitle('');
        setUrl('');
        setFile(null);
    };
    
    const handleSubmit = (e) => {
        e.preventDefault();
        // Pass the entire state up to the parent to handle the upload
        const materialData = { title, url, file };
        if (editingMaterial) {
            onUpdate(editingMaterial.id, materialData);
        } else {
            onAdd(materialData);
        }
        handleCancelEdit(); // Reset the form after submission
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        // Material upload size limit (e.g., 10MB)
        if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
            toast.error("File is too large! Maximum size is 10MB.");
            e.target.value = null;
            return;
        }
        setFile(selectedFile);
        // If a file is selected, clear the URL input
        if (selectedFile) {
            setUrl('');
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <h3 className="text-xl font-semibold mb-2">Class Materials</h3>
                <div className="bg-gray-50 p-4 rounded-lg border max-h-96 overflow-y-auto">
                    {materials.length > 0 ? (
                        <ul className="space-y-2">{materials.map(mat => (
                            <li key={mat.id} className="flex justify-between items-center p-2 hover:bg-gray-100 rounded">
                                {/* The link now prioritizes the uploaded file_url */}
                                <a href={mat.file_url || mat.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    {mat.title}
                                </a>
                                <div className="space-x-3">
                                    <button onClick={() => handleSelectForEdit(mat)} className="text-sm text-blue-600">Edit</button>
                                    <button onClick={() => onDelete(mat.id)} className="text-sm text-red-600">Delete</button>
                                </div>
                            </li>
                        ))}</ul>
                    ) : <EmptyState message="No materials have been added." />}
                </div>
            </div>
            <div>
                <h3 className="text-xl font-semibold mb-2">{editingMaterial ? 'Edit Material' : 'Add New Material'}</h3>
                <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg border">
                    <div className="mb-2"><label>Title</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded p-2" required /></div>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-1">Upload File (PDF/Image, etc.)</label>
                        <input 
                            type="file" 
                            onChange={handleFileChange} 
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                    </div>
                    <div className="text-center text-gray-500 text-sm my-2">OR</div>
                    <div className="mb-4"><label>Link to External URL</label><input type="url" value={url} onChange={e => setUrl(e.target.value)} className="w-full border rounded p-2" placeholder="https://..." /></div>
                    <div className="flex justify-end space-x-2">
                        {editingMaterial && <button type="button" onClick={handleCancelEdit}>Cancel</button>}
                        <button type="submit">{editingMaterial ? 'Save Changes' : 'Add Material'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CommunicationLogTab = ({ logs, students, onAdd }) => {
    const [studentId, setStudentId] = useState('');
    const [note, setNote] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!studentId) {
            toast.error('Please select a student.');
            return;
        }
        onAdd({ student_id: studentId, note });
        setStudentId('');
        setNote('');
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <h3 className="text-xl font-semibold mb-2">Communication History</h3>
                <div className="bg-gray-50 p-4 rounded-lg border max-h-96 overflow-y-auto">
                    {logs.length > 0 ? (
                        <ul className="space-y-4">
                            {logs.map(log => (
                                <li key={log.id} className="p-2 border-b">
                                    <p className="font-semibold">{log.student_name}</p>
                                    <p className="text-gray-700 my-1">"{log.note}"</p>
                                    <p className="text-xs text-gray-500">
                                        Logged by {log.user_name} on {new Date(log.created_at).toLocaleString()}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    ) : <EmptyState message="No communication logs for students in this class yet." />}
                </div>
            </div>
            <div>
                <h3 className="text-xl font-semibold mb-2">Add New Log</h3>
                <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg border">
                    <div className="mb-2">
                        <label className="block text-sm font-medium">Student</label>
                        <select value={studentId} onChange={e => setStudentId(e.target.value)} className="w-full border rounded p-2" required>
                            <option value="">-- Select a Student --</option>
                            {students.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium">Note</label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full border rounded p-2" rows="4" required placeholder="e.g., Spoke to parent about progress..."></textarea>
                    </div>
                    <button type="submit" className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Add Log</button>
                </form>
            </div>
        </div>
    );
};


export default function ClassDetailPage() {
    const { classId } = useParams(); // Gets the class ID from the URL (e.g., '1')
    const [classDetails, setClassDetails] = useState(null);
    const [roster, setRoster] = useState([]); // Students in the class
    const [allStudents, setAllStudents] = useState([]); // All students in the school
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('roster'); // 'roster', 'materials', 'logs'
    const [materials, setMaterials] = useState([]);
    const [logs, setLogs] = useState([]);

    const fetchData = useCallback(() => {
        setIsLoading(true);
        Promise.all([
            classesAPI.get(classId),
            classesAPI.getStudents(classId),
            studentsAPI.getAll(),
            classesAPI.getMaterials(classId),
            logsAPI.getForClass(classId), 
        ]).then(([classData, rosterData, allStudentsData, materialsData, logsData]) => {
            setClassDetails(classData);
            setRoster(rosterData);
            setAllStudents(allStudentsData);
            setMaterials(materialsData);
            setLogs(logsData);
        }).catch(err => {
            console.error("Failed to fetch class details:", err);
            toast.error("Could not load class data."); // Use toast for user feedback
        }).finally(() => setIsLoading(false));
    }, [classId]);

    useEffect(() => { 
        fetchData(); 
    }, [fetchData]);

    const handleAddStudent = async (studentId) => {
        if (!studentId) {
            toast.error("Please select a student to add.");
            return;
        }

        const loadingToast = toast.loading('Adding student...');
        try {
            await classesAPI.addStudent(classId, { student_id: studentId });
            toast.success('Student added successfully!', { id: loadingToast });
            fetchData(); // Refresh all data from the server
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not add student.', { id: loadingToast });
        }
    };

    const handleRemoveStudent = async (studentId) => {
        if (window.confirm('Are you sure you want to remove this student from the class?')) {
            const loadingToast = toast.loading('Removing student...');
            try {
                await classesAPI.removeStudent(classId, studentId);
                toast.success('Student removed!', { id: loadingToast });
                // We can instantly update the UI for a smoother experience
                setRoster(prev => prev.filter(s => s.id !== studentId)); 
            } catch (err) {
                toast.error(err.response?.data?.error || 'Could not remove student.', { id: loadingToast });
            }
        }
    };

    const handleAddMaterial = async (materialData) => {
        const loadingToast = toast.loading('Saving material...');
        try {
            let fileUrl = null;
            // 1. If a file was included, upload it first
            if (materialData.file) {
                toast.loading('Uploading file...', { id: loadingToast });
                fileUrl = await fileUploadAPI.upload(materialData.file);
            }
            
            // 2. Prepare the final data and save the record to our database
            const finalData = { title: materialData.title, url: materialData.url, file_url: fileUrl, class_id: classId };
            const newMaterial = await classesAPI.addMaterial(finalData);
            
            setMaterials(prev => [newMaterial, ...prev]);
            toast.success('Material added!', { id: loadingToast });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not add material.', { id: loadingToast });
        }
    };

    const handleUpdateMaterial = async (materialId, materialData) => {
        const loadingToast = toast.loading('Saving material...');
        try {
            let fileUrl = null;
            // 1. If a new file was included, upload it
            if (materialData.file) {
                toast.loading('Uploading file...', { id: loadingToast });
                fileUrl = await fileUploadAPI.upload(materialData.file);
            }
            
            // 2. Prepare final data. If a new file was uploaded, it overrides the URL.
            const finalData = { 
                title: materialData.title, 
                url: fileUrl ? null : materialData.url, // Clear manual URL if file is uploaded
                file_url: fileUrl 
            };
            const updatedMaterial = await classesAPI.updateMaterial(materialId, finalData);
            
            setMaterials(prev => prev.map(m => m.id === updatedMaterial.id ? updatedMaterial : m));
            toast.success('Material updated!', { id: loadingToast });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not update material.', { id: loadingToast });
        }
    };

    const handleDeleteMaterial = async (materialId) => {
        if (window.confirm("Are you sure you want to delete this material?")) {
            const deletePromise = classesAPI.deleteMaterial(materialId);
            toast.promise(deletePromise, {
                loading: 'Deleting material...',
                success: () => {
                    setMaterials(prev => prev.filter(m => m.id !== materialId));
                    return <b>Material deleted!</b>;
                },
                error: <b>Could not delete material.</b>
            });
        }
    };

    const handleAddLog = async (logData) => {
        const loadingToast = toast.loading('Adding log...');
        try {
            const newLog = await logsAPI.create(logData);
            toast.success('Log added!', { id: loadingToast });
            // Instantly add the new log to the top of the list for better UX
            setLogs(prev => [newLog, ...prev]); 
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not add log.', { id: loadingToast });
        }
    };

    if (isLoading) {
        return <div className="p-10"><Spinner /></div>;
    }

    const tabButtonClass = (tabName) => classNames('py-2 px-4 border-b-2 font-medium', {
        'border-blue-600 text-blue-600': activeTab === tabName,
        'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700': activeTab !== tabName
    });

    return (
        <div>
            <div className="mb-4">
                <Link to="/classes" className="text-blue-600 hover:underline">&larr; Back to All Classes</Link>
            </div>
            <h2 className="text-2xl font-bold mb-1">{classDetails?.name}</h2>
            <p className="text-gray-600 mb-4">Teacher: {classDetails?.teacher_name}</p>
            <div className="flex border-b mb-4">
                <button onClick={() => setActiveTab('roster')} className={tabButtonClass('roster')}>Roster</button>
                <button onClick={() => setActiveTab('materials')} className={tabButtonClass('materials')}>Materials</button>
                <button onClick={() => setActiveTab('logs')} className={tabButtonClass('logs')}>Communication Logs</button>
            </div>

            <div>
                {activeTab === 'roster' && <RosterTab roster={roster} allStudents={allStudents} onAdd={handleAddStudent} onRemove={handleRemoveStudent} />}
                {activeTab === 'materials' && <MaterialsTab materials={materials} onAdd={handleAddMaterial} onUpdate={handleUpdateMaterial} onDelete={handleDeleteMaterial}/>}
                {activeTab === 'logs' && <CommunicationLogTab logs={logs} students={roster} onAdd={handleAddLog} />}
            </div>
        </div>
    );
}