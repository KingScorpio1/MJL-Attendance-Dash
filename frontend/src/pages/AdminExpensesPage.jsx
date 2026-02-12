// File: frontend/src/pages/AdminExpensesPage.jsx

import React, { useState, useEffect } from 'react';
import { expensesAPI } from '../services/api';
import toast from 'react-hot-toast';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';

export default function AdminExpensesPage() {
    const [expenses, setExpenses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        expensesAPI.getAll()
            .then(setExpenses)
            .catch(() => toast.error("Could not load expenses."))
            .finally(() => setIsLoading(false));
    }, []);

    const handleStatusChange = (id, newStatus) => {
        const promise = expensesAPI.updateStatus(id, newStatus);
        toast.promise(promise, {
            loading: 'Updating status...',
            success: (updatedExpense) => {
                setExpenses(expenses.map(e => e.id === id ? updatedExpense : e));
                return <b>Status updated!</b>;
            },
            error: <b>Update failed.</b>
        });
    };
    
    if (isLoading) return <Spinner />;

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Manage Expense Claims</h2>
            <div className="bg-white p-4 rounded-lg shadow">
                {expenses.length > 0 ? (
                    <table className="min-w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="py-2 px-4 text-left">Teacher</th>
                                <th className="py-2 px-4 text-left">Description</th>
                                <th className="py-2 px-4 text-left">Amount</th>
                                <th className="py-2 px-4 text-left">Status</th>
                                <th className="py-2 px-4 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.map(exp => (
                                <tr key={exp.id} className="border-b">
                                    <td className="py-2 px-4">{exp.teacher_name}</td>
                                    <td className="py-2 px-4">{exp.description}</td>
                                    <td className="py-2 px-4">NT${parseFloat(exp.amount).toFixed(2)}</td>
                                    {expenses.file_url && (
                                        <a href={expenses.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline ml-4">
                                            View Receipt
                                        </a>
                                    )}
                                    <td className="py-2 px-4">{exp.status}</td>
                                    <td className="py-2 px-4 space-x-2">
                                        {exp.status === 'pending' && (
                                            <>
                                                <button onClick={() => handleStatusChange(exp.id, 'approved')} className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">Approve</button>
                                                <button onClick={() => handleStatusChange(exp.id, 'rejected')} className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">Reject</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : <EmptyState message="There are no pending expense claims." />}
            </div>
        </div>
    );
}