import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { classesAPI, usersAPI, roomsAPI } from '../../services/api';
import Modal from '../Modal';

export default function ClassManagement() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]); // To populate the teacher dropdown
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [rooms, setRooms] = useState([]);

  // Form state for new class
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [day, setDay] = useState('Monday');
  const [teacherId, setTeacherId] = useState('');
  const [roomId, setRoomId] = useState('');  

  useEffect(() => {
    // Fetch all necessary data on component mount
    Promise.all([
        classesAPI.getAll(),
        usersAPI.getAll(),
        roomsAPI.getAll()
    ]).then(([classesData, usersData, roomsData]) => {
        setClasses(classesData);
        setTeachers(usersData.filter(user => user.role === 'teacher'));
        setRooms(roomsData);
    }).catch(err => console.error("Failed to fetch initial data:", err));
  }, []);

  const handleAddClass = async (e) => {
    e.preventDefault();
    setError('');
    if (!teacherId) {
        setError('You must select a teacher.');
        return;
    }
    const classData = { name, start_time: startTime, end_time: endTime, day, teacher_id: teacherId, room_id: roomId};
    const addPromise = classesAPI.create(classData);
    
    toast.promise(addPromise, {
        loading: 'Adding class...',
        success: (newClass) => {
            setClasses(prev => [...prev, newClass]);
            setIsModalOpen(false);
            // Reset form
            setName(''); setStartTime(''); setEndTime(''); setDay('Monday'); setTeacherId(''); setRoomId('');
            return <b>Class added!</b>;
        },
        error: (err) => <b>{err.response?.data?.error || 'Could not add class.'}</b>
    });
  };
  
  // You can add a handleDeleteClass function here similar to the one in UserManagement

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="font-semibold mb-2">Class Management</h3>
      <button onClick={() => setIsModalOpen(true)} className="bg-green-600 text-white px-3 py-1 rounded text-sm mb-2">
        Add Class
      </button>
      <Link to="/admin/rooms" className="bg-gray-500 text-white px-3 py-1 rounded text-sm">Manage Rooms</Link>
      <div className="border rounded p-2 max-h-40 overflow-y-auto">
        {classes.map(cls => (
          <div key={cls.id} className="p-1 hover:bg-gray-100">
            {cls.name} ({cls.day} at {cls.start_time})
          </div>
        ))}
      </div>

      <Modal title="Add New Class" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleAddClass}>
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <div className="mb-2"><label>Class Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border rounded p-2" required /></div>
          <div className="mb-2"><label>Start Time</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full border rounded p-2" required /></div>
          <div className="mb-2"><label>End Time</label><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full border rounded p-2" required /></div>
          <div className="mb-2"><label>Day of Week</label><select value={day} onChange={e => setDay(e.target.value)} className="w-full border rounded p-2">
              <option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option>Saturday</option><option>Sunday</option>
          </select></div>
          <div className="mb-4"><label>Teacher</label><select value={teacherId} onChange={e => setTeacherId(e.target.value)} className="w-full border rounded p-2" required>
              <option value="">-- Select a Teacher --</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.username}</option>)}
          </select></div>
          <div className="mb-4">
              <label>Room/Venue (Optional)</label>
              <select value={roomId} onChange={e => setRoomId(e.target.value)} className="w-full border rounded p-2">
                  <option value="">-- Select a Room --</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
          </div>
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-300 text-gray-800 px-4 py-2 rounded">Cancel</button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Add Class</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}