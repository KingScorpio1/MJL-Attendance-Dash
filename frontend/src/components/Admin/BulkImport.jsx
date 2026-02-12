// File: frontend/src/components/Admin/BulkImport.jsx

import React, { useState } from 'react';
import Papa from 'papaparse';
import { studentsAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function BulkImport({ onImportSuccess }) {
    const [isImporting, setIsImporting] = useState(false);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsImporting(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const students = results.data;
                const importPromise = studentsAPI.bulkImport(students);
                
                toast.promise(importPromise, {
                    loading: 'Importing students...',
                    success: (res) => {
                        onImportSuccess(); // Refresh the student list on the parent page
                        return <b>{res.message || 'Import successful!'}</b>;
                    },
                    error: <b>Could not import students. Please check the file format.</b>
                }).finally(() => setIsImporting(false));
            },
            error: () => {
                toast.error('Failed to parse CSV file.');
                setIsImporting(false);
            }
        });
    };

    return (
        <div className="mt-4">
            <label
                htmlFor="csv-import"
                className={`
                    inline-block bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 cursor-pointer
                    ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                {isImporting ? 'Processing...' : 'Import Students from CSV'}
            </label>
            <input
                id="csv-import"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
                disabled={isImporting}
            />
            <p className="text-xs text-gray-500 mt-1">
                Required headers: <strong>name, email</strong>. Optional: <strong>phone, is_trial, birthday</strong>.
            </p>
        </div>
    );
}