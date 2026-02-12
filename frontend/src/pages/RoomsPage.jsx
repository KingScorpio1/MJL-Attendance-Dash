// File: frontend/src/pages/RoomsPage.jsx

import React, { useState, useEffect } from 'react';
import { roomsAPI } from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';

export default function RoomsPage() {
    const [rooms, setRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null); // null for 'Add', object for 'Edit'
    const [roomName, setRoomName] = useState('');

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = () => {
        setIsLoading(true);
        roomsAPI.getAll().then(setRooms).catch(() => toast.error("Could not load rooms.")).finally(() => setIsLoading(false));
    };

    const handleOpenModal = (room = null) => {
        setEditingRoom(room);
        setRoomName(room ? room.name : '');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingRoom(null);
        setRoomName('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const apiCall = editingRoom
            ? roomsAPI.update(editingRoom.id, { name: roomName })
            : roomsAPI.create({ name: roomName });
        
        toast.promise(apiCall, {
            loading: editingRoom ? 'Updating room...' : 'Adding room...',
            success: (updatedOrNewRoom) => {
                if (editingRoom) {
                    setRooms(rooms.map(r => r.id === updatedOrNewRoom.id ? updatedOrNewRoom : r));
                } else {
                    setRooms([...rooms, updatedOrNewRoom]);
                }
                handleCloseModal();
                return <b>Room saved successfully!</b>;
            },
            error: (err) => <b>{err.response?.data?.error || 'An error occurred.'}</b>
        });
    };

    const handleDelete = (roomId) => {
        if (window.confirm("Are you sure? Classes in this room will become unassigned.")) {
            toast.promise(roomsAPI.delete(roomId), {
                loading: 'Deleting...',
                success: () => { setRooms(rooms.filter(r => r.id !== roomId)); return <b>Room deleted.</b> },
                error: <b>Could not delete.</b>
            });
        }
    };

    if (isLoading) return <Spinner />;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Room & Venue Management</h2>
                <button onClick={() => handleOpenModal()} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                    Add Room
                </button>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
                {rooms.length > 0 ? (
                    <ul className="space-y-2">
                        {rooms.map(room => (
                            <li key={room.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                                <span className="font-medium">{room.name}</span>
                                <div className="space-x-4">
                                    <button onClick={() => handleOpenModal(room)} className="text-blue-600 hover:text-blue-800">Edit</button>
                                    <button onClick={() => handleDelete(room.id)} className="text-red-600 hover:text-red-800">Delete</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <EmptyState message="No rooms have been created yet." />}
            </div>

            <Modal title={editingRoom ? 'Edit Room' : 'Add New Room'} isOpen={isModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-1">Room Name</label>
                        <input
                            type="text"
                            value={roomName}
                            onChange={e => setRoomName(e.target.value)}
                            className="w-full border rounded p-2"
                            required
                        />
                    </div>
                    <div className="flex justify-end space-x-2">
                        <button type="button" onClick={handleCloseModal}>Cancel</button>
                        <button type="submit">Save</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}