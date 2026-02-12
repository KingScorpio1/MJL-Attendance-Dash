// File: frontend/src/pages/StudentLoginPage.jsx

import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';

export default function StudentLoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { setSession } = useAuth();  // We'll still use the main login function from context
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const loginPromise = authAPI.studentLogin(username, password);

        toast.promise(loginPromise, {
            loading: 'Logging in...',
            success: (data) => {
                // THE FIX: We call setSession with the data from the student login
                setSession(data.token, data.user);
                navigate('/student/dashboard'); // Redirect to the student dashboard
                return <b>Welcome!</b>;
            },
            error: (err) => <b>{err.response?.data?.error || 'Login failed.'}</b>
        });
    };

    return (
        <div className="bg-gray-100 min-h-screen flex items-center justify-center">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-6 text-center">Student & Parent Portal</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                            required
                        />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
                        Login
                    </button>
                </form>
                <div className="text-center mt-4">
                    <Link to="/login" className="text-sm text-blue-600 hover:underline">Are you a teacher or admin?</Link>
                </div>
            </div>
        </div>
    );
}