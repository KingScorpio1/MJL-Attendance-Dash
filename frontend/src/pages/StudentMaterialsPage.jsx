// File: frontend/src/pages/StudentMaterialsPage.jsx

import React, { useState, useEffect } from 'react';
import { studentPortalAPI } from '../services/api';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';

export default function StudentMaterialsPage() {
    const [materials, setMaterials] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        studentPortalAPI.getMyMaterials()
            .then(setMaterials)
            .catch(() => toast.error("Could not load class materials."))
            .finally(() => setIsLoading(false));
    }, []);

    if (isLoading) return <Spinner />;

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">My Class Materials</h2>
            <div className="bg-white p-4 rounded-lg shadow space-y-4">
                {materials.length > 0 ? materials.map(mat => (
                    <div key={mat.id} className="p-3 border rounded-md">
                        <p className="text-sm text-gray-500">{mat.class_name}</p>
                        <a href={mat.file_url || mat.url} target="_blank" rel="noopener noreferrer" className="font-bold text-lg text-blue-600 hover:underline">
                            {mat.title}
                        </a>
                    </div>
                )) : <p>No materials have been added to your classes yet.</p>}
            </div>
        </div>
    );
}