//File: frontend/src/components/Admin/UserManagement.jsx

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { usersAPI } from '../../services/api'; // Make sure path to api.js is correct
import Modal from '../Modal'; // Import the new Modal component

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsAddModalOpen] = useState(false);
  const [error, setError] = useState('');

  // State for the Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editError, setEditError] = useState('');

  // Form state for new user
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('teacher');
  const [color, setColor] = useState('#4299E1')
  const [hourly_rate, setHourlyRate] = useState('')

  const PREDEFINED_COLORS = [
  '#4299E1', // blue-500
  '#48BB78', // green-500
  '#ED8936', // orange-500
  '#F56565', // red-500
  '#9F7AEA', // purple-500
  '#ED64A6', // pink-500
  '#A0AEC0', // gray-500
  '#38B2AC', // teal-500
];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await usersAPI.getAll();
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setError('Could not load user data.');
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    // The 'color' variable is now correctly included
    const addPromise = usersAPI.create({ username, password, role, color, hourly_rate: role === 'teacher' ? hourly_rate : 0  });

    toast.promise(addPromise, {
        loading: 'Adding user...',
        success: (newUser) => {
            setUsers(prev => [...prev, newUser].sort((a,b) => a.username.localeCompare(b.username)));
            setIsAddModalOpen(false); // Correctly closes the "Add" modal
            setUsername(''); setPassword(''); setRole('teacher'); setColor('#4299E1'); setHourlyRate('');
            return <b>User added!</b>;
        },
        error: (err) => {
            setError(err.response?.data?.error || 'Could not add user.');
            return <b>Could not add user.</b>
        }
    });
  };

  const handleDeleteUser = async (userId) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            // Use a toast promise for great UX
            toast.promise(
                usersAPI.delete(userId),
                {
                    loading: 'Deleting user...',
                    success: () => {
                        // On success, update the UI and return a success message
                        setUsers(users.filter(u => u.id !== userId));
                        return <b>User deleted successfully!</b>;
                    },
                    error: (err) => <b>{err.response?.data?.error || 'Could not delete user.'}</b>,
                }
            );
        }
    };

  const handleOpenEditModal = (user) => {
    // Set the user to edit, include a blank password field for optional reset
    setEditingUser({ ...user, password: '', color: user.color || '#000000' });
    setIsEditModalOpen(true);
    setEditError('');
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditingUser(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setError('');

    const dataToSend = {
      ...editingUser,
      hourly_rate: editingUser.role === 'teacher' ? editingUser.hourly_rate : 0
    };

    const updatePromise = usersAPI.update(editingUser.id, dataToSend);

    toast.promise(updatePromise, {
        loading: 'Saving changes...',
        success: (updatedUser) => {
            setUsers(prevUsers => prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u));
            setIsEditModalOpen(false);
            return <b>User updated!</b>;
        },
        error: (err) => {
            setError(err.response?.data?.error || 'Could not update.');
            return <b>Could not update.</b>;
        }
    });
  };



  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="font-semibold mb-2">User Management</h3>
      <button onClick={() => setIsAddModalOpen(true)} className="bg-green-600 text-white px-3 py-1 rounded text-sm mb-2">
        Add User
      </button>
      <div className="border rounded p-2 max-h-40 overflow-y-auto">
        {users.map(user => (
          <div key={user.id} className="flex justify-between items-center p-1 hover:bg-gray-100">
            <span className="flex items-center">
              {/* Show a small color swatch next to the user's name */}
              <span className="inline-block w-4 h-4 rounded-full mr-2 border" style={{ backgroundColor: user.color || '#ccc' }}></span>
              {user.username} ({user.role})
            </span>
            <button onClick={() => handleOpenEditModal(user)} className="text-blue-600 hover:text-blue-800 text-xs mr-2">Edit</button>
            <button onClick={() => handleDeleteUser(user.id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
          </div>
        ))}
      </div>

      <Modal title="Add New User" isOpen={isModalOpen} onClose={() => setIsAddModalOpen(false)}>
        <form onSubmit={handleAddUser}>
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full border rounded p-2" required />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded p-2" required />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="w-full border rounded p-2">
              <option value="teacher">Teacher</option>
              <option value="accountant">Accountant</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {role === 'teacher' && (
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Hourly Rate (NTD)</label>
              <input 
                type="number"
                value={hourly_rate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="w-full border rounded p-2"
                step="0.01"
                placeholder="e.g., 600.00"
              />
            </div>
          )}
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Teacher Color</label>
            <div className="flex items-center space-x-4">
                <input 
                    type="color" 
                    value={color} 
                    onChange={e => setColor(e.target.value)} 
                    className="w-12 h-12 p-1 border rounded" 
                />
                <div className="flex flex-wrap gap-2">
                        {PREDEFINED_COLORS.map((predefinedColor) => (
                            <button
                                type="button"
                                key={predefinedColor}
                                onClick={() => setColor(predefinedColor)}
                                className="w-8 h-8 rounded-full border"
                                style={{ backgroundColor: predefinedColor }}
                            >
                                {/* Optional: Add a checkmark if this color is selected */}
                                {color === predefinedColor && <span className="text-white">✔</span>}
                            </button>
                        ))}
                </div>
             </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="bg-gray-300 text-gray-800 px-4 py-2 rounded">Cancel</button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Add User</button>
          </div>
        </form>
      </Modal>
      {editingUser && (
        <Modal title="Edit User" isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
            <form onSubmit={handleUpdateUser}>
                {editError && <p className="text-red-500 text-sm mb-2">{editError}</p>}
                <div className="mb-4">
                    <label className="block text-gray-700 mb-2">Username</label>
                    <input type="text" name="username" value={editingUser.username} onChange={handleEditFormChange} className="w-full border rounded p-2" required />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700 mb-2">Role</label>
                    <select name="role" value={editingUser.role} onChange={handleEditFormChange} className="w-full border rounded p-2">
                        <option value="teacher">Teacher</option>
                        <option value="accountant">Accountant</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                {editingUser.role === 'teacher' && (
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">Hourly Rate (NTD)</label>
                    <input 
                      type="number"
                      name="hourly_rate"
                      value={editingUser.hourly_rate || ''}
                      onChange={handleEditFormChange}
                      className="w-full border rounded p-2"
                      step="0.01"
                      placeholder="e.g., 600.00"
                    />
                  </div>
                )}
                <div className="mb-4">
                    <label className="block text-gray-700 mb-2">New Password</label>
                    <input type="password" name="password" value={editingUser.password} onChange={handleEditFormChange} className="w-full border rounded p-2" placeholder="Leave blank to keep unchanged" />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700 mb-2">Teacher Color</label>
                    <div className="flex items-center space-x-4">
                        <input 
                            type="color" 
                            name="color" 
                            value={editingUser.color || '#000000'} 
                            onChange={handleEditFormChange} 
                            className="w-12 h-12 p-1 border rounded" 
                        />
                        <div className="flex-grow">
                            <span className="text-sm text-gray-500 block mb-2">Or pick a preset:</span>
                            <div className="flex flex-wrap gap-2">
                                {PREDEFINED_COLORS.map((predefinedColor) => (
                                    <button
                                        type="button"
                                        key={predefinedColor}
                                        onClick={() => handleEditFormChange({ target: { name: 'color', value: predefinedColor } })}
                                        className="w-8 h-8 rounded-full border"
                                        style={{ backgroundColor: predefinedColor }}
                                    >
                                        {editingUser.color === predefinedColor && <span className="text-white">✔</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end space-x-2">
                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="bg-gray-300 px-4 py-2 rounded">Cancel</button>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Save Changes</button>
                </div>
            </form>
        </Modal>
      )}
    </div>
  );
}