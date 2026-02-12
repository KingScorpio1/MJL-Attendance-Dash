// File: frontend/src/components/TrialStudentModal.jsx

import React from 'react';
import { studentsAPI } from '../services/api';
import toast from 'react-hot-toast';
import Modal from './Modal';

export default function TrialStudentModal({ student, classId, onClose, onUpdate }) {
    if (!student) return null;

    const handleMakeRegular = async () => {
        const promise = studentsAPI.makeRegular(student.student_id, classId);
        toast.promise(promise, {
            loading: 'Updating status...',
            success: () => {
                onUpdate(); // This will re-fetch data on the parent page
                onClose(); // Close the modal
                return <b>{student.student_name} is now a regular student!</b>;
            },
            error: <b>Could not update status.</b>
        });
    };
    
    const handleContinueTrial = async () => {
        // We just call this to acknowledge, then close the modal
        studentsAPI.continueTrial(student.student_id);
        onClose();
    };

    return (
        <Modal title="Trial Student Follow-up" isOpen={true} onClose={onClose}>
            <div className="p-4">
                <p className="text-lg mb-4">
                    <strong>{student.student_name}</strong> is a trial student who has now attended 
                    <strong className="mx-1">{student.trial_count + 1}</strong> 
                    class(es). What is their status?
                </p>
                <div className="space-y-4">
                    <button onClick={handleMakeRegular} className="w-full bg-green-600 text-white p-3 rounded-lg text-left">
                        <p className="font-bold">Registered - Make Regular</p>
                        <p className="text-sm">This student has paid and is now a regular member.</p>
                    </button>
                    <button onClick={handleContinueTrial} className="w-full bg-blue-600 text-white p-3 rounded-lg text-left">
                        <p className="font-bold">Continue Trial</p>
                        <p className="text-sm">This is their {student.trial_count + 1 === 2 ? '2nd' : '3rd'} trial class.</p>
                    </button>
                </div>
                <div className="mt-6 text-center">
                    <button onClick={onClose} className="text-gray-500 hover:underline">Cancel</button>
                </div>
            </div>
        </Modal>
    );
}