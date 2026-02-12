// File: frontend/src/pages/ReportsPage.jsx

import React, { useState, useEffect } from 'react';
import { reportsAPI, classesAPI } from '../services/api';

// Helper to trigger file download in the browser
const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
};

export default function ReportsPage() {
    const [classes, setClasses] = useState([]);
    const [params, setParams] = useState({
        classId: '',
        fromDate: '',
        toDate: '',
        includeTrial: true,
    });
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        classesAPI.getAll().then(setClasses);
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setParams(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleGenerate = (format) => {
        setMessage(`Generating ${format.toUpperCase()}...`);
        const apiCall = format === 'csv' ? reportsAPI.generateCSV : reportsAPI.generatePDF;
        const filename = `attendance_report_${Date.now()}.${format}`;

        apiCall(params)
            .then(blob => {
                downloadFile(blob, filename);
                setMessage('');
            })
            .catch(err => {
                console.error(`Failed to generate ${format}`, err);
                setMessage(`Error generating ${format}.`);
            });
    };
    
    const handleEmailReport = () => {
        if (!email) {
            setMessage('Please enter a recipient email address.');
            return;
        }
        setMessage('Sending email...');
        reportsAPI.emailReport({ to: email, ...params })
            .then(() => {
                setMessage('Report emailed successfully!');
                setTimeout(() => setMessage(''), 3000);
            })
            .catch(err => {
                console.error("Failed to email report", err);
                setMessage('Error emailing report.');
            });
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">Attendance Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 border p-4 rounded-md">
                <div>
                    <label className="block text-gray-700 mb-1">Class</label>
                    <select name="classId" value={params.classId} onChange={handleChange} className="w-full border rounded p-2">
                        <option value="">All Classes</option>
                        {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-gray-700 mb-1">From Date</label>
                    <input type="date" name="fromDate" value={params.fromDate} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
                <div>
                    <label className="block text-gray-700 mb-1">To Date</label>
                    <input type="date" name="toDate" value={params.toDate} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
                <div className="flex items-end">
                    <label className="flex items-center">
                        <input type="checkbox" name="includeTrial" checked={params.includeTrial} onChange={handleChange} className="mr-2" />
                        Include Trial Students
                    </label>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
                <button onClick={() => handleGenerate('csv')} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Generate CSV</button>
                <button onClick={() => handleGenerate('pdf')} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Generate PDF</button>
                <div className="flex-grow flex items-center gap-2">
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Recipient email address" className="border rounded p-2 flex-grow" />
                    <button onClick={handleEmailReport} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Email Report</button>
                </div>
            </div>
            {message && <p className="mt-4 text-gray-600">{message}</p>}
        </div>
    );
}