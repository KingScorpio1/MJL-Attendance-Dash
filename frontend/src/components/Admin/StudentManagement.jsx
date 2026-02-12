import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { studentsAPI } from '../../services/api'; // Correct relative path
import Modal from '../Modal';

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');

  // Form state for new student
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isTrial, setIsTrial] = useState(false);
  const [birthday, setBirthday] = useState('');
  const [parent_info, setParentInfo] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');


  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const data = await studentsAPI.getAll();
      setStudents(data);
    } catch (err) {
      console.error("Failed to fetch students:", err);
    }
  };

  const handleAddStudent = async (e) => {
      e.preventDefault();
      setError('');
      const studentData = { 
        name, email, phone, is_trial: isTrial, 
        birthday: birthday || null, 
        parent_info: parent_info || null, 
        username: username || null,
        password: password || null }; 
      
      const addPromise = studentsAPI.create(studentData);
      toast.promise(addPromise, {
          loading: 'Adding student...',
          success: (newStudent) => {
              setStudents(prev => [...prev, newStudent]);
              setIsModalOpen(false);
              // Reset all form fields
              setName(''); setEmail(''); setPhone(''); setIsTrial(false); 
              setBirthday(''); setParentInfo(''); setUsername(''); setPassword('');
              return <b>Student added!</b>;
          },
          error: (err) => <b>{err.response?.data?.error || 'Could not add student.'}</b>
      });
  };
  
  const handleDeleteStudent = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student? This cannot be undone.')) {
        try {
            await studentsAPI.delete(studentId);
            setStudents(students.filter(s => s.id !== studentId));
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete student.');
        }
    }
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="font-semibold mb-2">Student Management</h3>
      <button onClick={() => setIsModalOpen(true)} className="bg-green-600 text-white px-3 py-1 rounded text-sm mb-2">
        Add Student
      </button>
      <div className="border rounded p-2 max-h-40 overflow-y-auto">
        {students.map(student => (
          <div key={student.id} className="flex justify-between items-center p-1 hover:bg-gray-100">
            <span>{student.name}{student.is_trial ? ' (Trial)' : ''}</span>
            <button onClick={() => handleDeleteStudent(student.id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
          </div>
        ))}
      </div>

      <Modal title="Add New Student" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleAddStudent}>
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <div className="mb-2"><label>Full Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border rounded p-2" required /></div>
          <div className="mb-2"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded p-2" required /></div>
          <div className="mb-2"><label>Phone (Optional)</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border rounded p-2" /></div>
          <div className="mb-2"><label>Birthday (Optional)</label><input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="w-full border rounded p-2" /></div>
          <div className="mb-4 flex items-center">
            <input type="checkbox" checked={isTrial} onChange={e => setIsTrial(e.target.checked)} id="is_trial" className="mr-2" />
            <label htmlFor="is_trial">Is this a trial student?</label>
          </div>
          <div className="mb-2">
            <label>Parent Contact Info (Optional)</label>
            <textarea 
              name="parent_info"
              value={parent_info} 
              onChange={e => setParentInfo(e.target.value)}
              className="w-full border rounded p-2"
              rows="3"
            ></textarea>
          </div>
          <hr className="my-4" />
          <h4 className="font-semibold text-gray-800 mb-2">Portal Login</h4>
          <p className="text-xs text-gray-500 mb-2">Optional. Set a username and password for the student/parent portal.</p>
          <div className="mb-2">
            <label>Portal Username</label>
            <input 
                type="text" 
                name="username" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full border rounded p-2" 
            />
          </div>
          <div className="mb-2">
            <label>Set Password</label>
            <input 
                type="password" 
                name="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border rounded p-2" 
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-300 text-gray-800 px-4 py-2 rounded">Cancel</button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Add Student</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}