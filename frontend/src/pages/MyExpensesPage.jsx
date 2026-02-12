// File: frontend/src/pages/MyExpensesPage.jsx

import React, { useState, useEffect } from 'react';
import { expensesAPI, fileUploadAPI } from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../AuthContext';

export default function MyExpensesPage() {
    const { currentUser } = useAuth(); // We need this to get the user ID
    const [expenses, setExpenses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [file, setFile] = useState(null); 
    
    // Form state
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');

    useEffect(() => {
        if (!currentUser) return; // Don't fetch if user isn't loaded yet
        
        setIsLoading(true);
        expensesAPI.getMyExpenses()
            .then(setExpenses)
            .catch(() => toast.error("Could not load expenses."))
            .finally(() => setIsLoading(false));
    }, [currentUser]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        // Enforce size limit (approx 5MB for example, Cloudinary free tier has limits)
        if (selectedFile && selectedFile.size > 5 * 1024 * 1024) {
            toast.error("File is too large! Maximum size is 5MB.");
            e.target.value = null; // Clear the input
            return;
        }
        setFile(selectedFile);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const loadingToast = toast.loading('Submitting expense...');
        
        try {
            let fileUrl = null;
            // 1. If a file was selected, upload it first
            if (file) {
                toast.loading('Uploading file...', { id: loadingToast });
                fileUrl = await fileUploadAPI.upload(file);
            }

            // 2. Then, create the expense record with the file URL
            toast.loading('Saving expense record...', { id: loadingToast });
            const expenseData = { description, amount, file_url: fileUrl };
            const newExpense = await expensesAPI.create(expenseData);
            
            setExpenses([newExpense, ...expenses]);
            setIsModalOpen(false);
            setDescription(''); setAmount(''); setFile(null);
            toast.success('Expense submitted!', { id: loadingToast });

        } catch (err) {
            toast.error(err.response?.data?.error || 'Submission failed.', { id: loadingToast });
        }
    };
    
    if (isLoading) return <Spinner />;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">My Expense Claims</h2>
                <button onClick={() => setIsModalOpen(true)} className="bg-green-600 text-white px-4 py-2 rounded">Submit New Expense</button>
            </div>
           <div className="bg-white p-4 rounded-lg shadow">
                {expenses.length > 0 ? (
                    <ul className="space-y-2">
                        {expenses.map(exp => (
                            <li key={exp.id} className="p-3 border-b flex justify-between items-center">
                                <div>
                                    <p className="font-medium">{exp.description}</p>
                                    <p className="text-sm text-gray-500">Submitted: {new Date(exp.submitted_at).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-lg">NT${parseFloat(exp.amount).toFixed(2)}</p>
                                    <p className="text-sm font-medium">{exp.status}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <EmptyState message="You have not submitted any expense claims." />}
            </div>
            <Modal title="Submit New Expense" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label>Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows="3" className="w-full border rounded p-2" required></textarea>
                    </div>
                    <div className="mb-4">
                        <label>Amount (NTD)</label>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full border rounded p-2" step="0.01" required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-1">Attach Receipt (PDF/Image, max 5MB)</label>
                        <input type="file" onChange={handleFileChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                    </div>
                    <div className="flex justify-end space-x-2"><button type="button" onClick={() => setIsModalOpen(false)}>Cancel</button><button type="submit">Submit</button></div>
                </form>
            </Modal>
        </div>
    );
}