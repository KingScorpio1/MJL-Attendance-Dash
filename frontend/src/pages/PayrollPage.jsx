// File: frontend/src/pages/PayrollPage.jsx

import React, { useState, useEffect } from 'react';
import { usersAPI, payrollAPI } from '../services/api';
import toast from 'react-hot-toast';
import Spinner from '../components/Spinner';

// Trigger a file download from a blob
const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
};

export default function PayrollPage() {
    const [teachers, setTeachers] = useState([]);
    const [selectedTeacher, setSelectedTeacher] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [report, setReport] = useState(null);
    const [isLoading, setIsLoading] = useState(false);


    useEffect(() => {
        // Fetch only users with the 'teacher' role
        usersAPI.getAll().then(allUsers => {
            setTeachers(allUsers.filter(u => u.role === 'teacher'));
        });
    }, []);

    const handleGenerate = async () => {
        if (!selectedTeacher || !fromDate || !toDate) {
            toast.error("Please select a teacher and a date range.");
            return;
        }
        setIsLoading(true);
        setReport(null);
        try {
            const data = await payrollAPI.generate({ teacherId: selectedTeacher, fromDate, toDate });
            setReport(data);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to generate report.");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrintPayslip = async () => {
        const params = { teacherId: selectedTeacher, fromDate, toDate };
        const teacherName = teachers.find(t => t.id === selectedTeacher)?.username || 'teacher';
        const filename = `payslip_${teacherName}_${fromDate}_to_${toDate}.pdf`;

        const toastId = toast.loading('Generating PDF...');
        try {
            const pdfBlob = await payrollAPI.generatePayslip(params);
            downloadFile(pdfBlob, filename);
            toast.success('Payslip downloaded!', { id: toastId });
        } catch (err) {
            toast.error('Could not generate payslip.', { id: toastId });
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Teacher Payroll</h2>
            
            {/* Control Panel */}
            <div className="p-4 bg-gray-50 border rounded-md mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium">Teacher</label>
                    <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)} className="w-full border rounded p-2 mt-1">
                        <option value="">-- Select Teacher --</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.username}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium">From Date</label>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full border rounded p-2 mt-1" />
                </div>
                <div>
                    <label className="block text-sm font-medium">To Date</label>
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full border rounded p-2 mt-1" />
                </div>
                <button onClick={handleGenerate} disabled={isLoading} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-gray-400">
                    {isLoading ? 'Generating...' : 'Generate Report'}
                </button>
            </div>
            {isLoading && <Spinner />}

            {/* Report Display */}
            {report && (
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-xl font-bold mb-4">Payroll Report for {teachers.find(t => t.id === parseInt(selectedTeacher))?.username}</h3>
                    <button onClick={handlePrintPayslip} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">Export Payslip (PDF)</button>
                    <table className="min-w-full">
                        {/* --- Class Earnings Section --- */}
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="py-2 px-4 text-left">Date</th>
                                <th className="py-2 px-4 text-left">Class</th>
                                <th className="py-2 px-4 text-left">Duration (Hours)</th>
                                <th className="py-2 px-4 text-right">Pay For Session</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.classes.map((item, index) => (
                                <tr key={index} className="border-b">
                                    <td className="py-2 px-4">{new Date(item.attendance_date).toLocaleDateString()}</td>
                                    <td className="py-2 px-4">{item.class_name}</td>
                                    <td className="py-2 px-4">{parseFloat(item.class_duration_hours).toFixed(2)}</td>
                                    <td className="py-2 px-4 text-right">{item.session_pay}</td>
                                </tr>
                            ))}
                        </tbody>
                        {/* --- Approved Expenses Section --- */}
                        {report.expenses && report.expenses.length > 0 && (
                            <>
                                <thead className="bg-gray-100 mt-6">
                                    <tr>
                                        <th className="py-2 px-4 text-left font-semibold pt-6" colSpan="4">Expense Reimbursements</th>
                                    </tr>
                                    <tr>
                                        <th className="py-2 px-4 text-left">Date Submitted</th>
                                        <th className="py-2 px-4 text-left" colSpan="2">Description</th>
                                        <th className="py-2 px-4 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.expenses.map((expense, index) => (
                                        <tr key={`expense-${index}`} className="border-b">
                                            <td className="py-2 px-4">{new Date(expense.submitted_at).toLocaleDateString()}</td>
                                            <td className="py-2 px-4" colSpan="2">{expense.description}</td>
                                            <td className="py-2 px-4 text-right">{parseFloat(expense.amount).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </>
                        )}

                        {/* --- Grand Total Section --- */}
                        <tfoot className="font-bold">
                            <tr>
                                <td colSpan="3" className="py-4 px-4 text-right text-xl">Grand Total Payable:</td>
                                <td className="py-4 px-4 text-right text-xl">NT${report.totalSalary}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}