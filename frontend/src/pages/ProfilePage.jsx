// File: frontend/src/pages/ProfilePage.jsx

import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
    const { currentUser, logout } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }
        if (newPassword.length < 6) {
            setError("New password must be at least 6 characters long.");
            return;
        }

        const passwordPromise = authAPI.changePassword(currentPassword, newPassword);

        toast.promise(passwordPromise, {
            loading: 'Updating password...',
            success: () => {
                // Reset form and show success message
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                // Optional: log out user after password change for security
                setTimeout(() => logout(), 2000);
                return <b>Password updated successfully! You will be logged out.</b>;
            },
            error: (err) => {
                setError(err.response?.data?.error || 'Failed to update password.');
                return <b>Could not update password.</b>; // Toast message
            }
        });
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow max-w-lg mx-auto">
            <h2 className="text-2xl font-bold mb-4">My Profile</h2>
            <p className="mb-4 text-gray-600">Welcome, <strong>{currentUser.username}</strong>! Here you can change your password.</p>
            <form onSubmit={handleSubmit}>
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                <div className="mb-4">
                    <label className="block text-gray-700 mb-1">Current Password</label>
                    <input
                        type="password"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="w-full border rounded p-2"
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700 mb-1">New Password</label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full border rounded p-2"
                        required
                    />
                </div>
                <div className="mb-6">
                    <label className="block text-gray-700 mb-1">Confirm New Password</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full border rounded p-2"
                        required
                    />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
                    Change Password
                </button>
            </form>
        </div>
    );
}