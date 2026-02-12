// File: frontend/src/services/api.js

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (username, password) => {
    return api.post('/auth/login', { username, password }).then(res => res.data);
  },

  studentLogin: (username, password) => {
    return api.post('/auth/student/login', { username, password }).then(res => res.data);
  },
  
  changePassword: (currentPassword, newPassword) => {
    return api.post('/auth/change-password', { currentPassword, newPassword }).then(res => res.data);
  },
  
  setToken: (token) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }
};

// Users API
export const usersAPI = {
  getAll: () => {
    return api.get('/users').then(res => res.data);
  },
  
  create: (userData) => {
    return api.post('/users', userData).then(res => res.data);
  },
  
  update: (id, userData) => {
    return api.put(`/users/${id}`, userData).then(res => res.data);
  },
  
  delete: (id) => {
    return api.delete(`/users/${id}`).then(res => res.data);
  }
};

// Classes API
export const classesAPI = {
  getAll: () => {
    return api.get('/classes').then(res => res.data);
  },
  
  get: (id) => {
    return api.get(`/classes/${id}`).then(res => res.data);
  },
  
  create: (classData) => {
    return api.post('/classes', classData).then(res => res.data);
  },
  
  update: (id, classData) => {
    return api.put(`/classes/${id}`, classData).then(res => res.data);
  },
  
  delete: (id) => {
    return api.delete(`/classes/${id}`).then(res => res.data);
  },
  
  getStudents: (id) => {
    return api.get(`/classes/${id}/students`).then(res => res.data);
  },
  
  addStudent: (classId, studentData) => {
    return api.post(`/classes/${classId}/students`, studentData).then(res => res.data);
  },

  getMaterials: (classId) => {
    return api.get(`/materials/class/${classId}`).then(res => res.data);
  },
  
  addMaterial: (materialData) => {
    return api.post('/materials', materialData).then(res => res.data);
  },

  updateMaterial: (materialId, materialData) => {
    return api.put(`/materials/${materialId}`, materialData).then(res => res.data);
  },

  deleteMaterial: (materialId) => {
    return api.delete(`/materials/${materialId}`);
  },
  
  removeStudent: (classId, studentId) => {
    return api.delete(`/classes/${classId}/students/${studentId}`).then(res => res.data);
  }
};

// Students Portal API
export const studentPortalAPI = {
  getMyClasses: () => {
    return api.get('/student/my-classes').then(res => res.data);
  },
  
  getMyAttendance: () => {
    return api.get('/student/my-attendance').then(res => res.data);
  },

  getMyMaterials: () => {
    return api.get('/student/my-materials').then(res => res.data);
  },
};

// Students API
export const studentsAPI = {
  getAll: () => {
    return api.get('/students').then(res => res.data);
  },
  
  get: (id) => {
    return api.get(`/students/${id}`).then(res => res.data);
  },
  
  create: (studentData) => {
    return api.post('/students', studentData).then(res => res.data);
  },

  bulkImport: (students) => {
    return api.post('/students/bulk', { students }).then(res => res.data);
  },
  
  update: (id, studentData) => {
    return api.put(`/students/${id}`, studentData).then(res => res.data);
  },

  makeRegular: (studentId, classId) => {
    return api.post(`/students/${studentId}/make-regular`, { class_id: classId })
  },
  
  continueTrial: (studentId) => {
    return api.post(`/students/${studentId}/continue-trial`, {})
  },
  
  delete: (id) => {
    return api.delete(`/students/${id}`).then(res => res.data);
  }
};

// Attendance API
export const attendanceAPI = {
  get: (classId, date) => {
    return api.get('/attendance', { 
      params: { class_id: classId, date } 
    }).then(res => res.data);
  },
  
  record: (attendanceData) => {
    return api.post('/attendance', attendanceData).then(res => res.data);
  },
  
  recordBulk: (classId, attendanceData, date) => {
    return api.post('/attendance/bulk', { 
      class_id: classId, 
      attendance_data: attendanceData, 
      date: date
    }).then(res => res.data);
  },

  cancelSession: (classId, date) => api.post('/attendance/session/cancel', { 
      data: { class_id: classId, date: date } 
  }),
};

// Reports API
export const reportsAPI = {
  generateCSV: (params) => {
    return api.get('/reports/attendance/csv', { 
      params,
      responseType: 'blob'
    }).then(res => res.data);
  },
  
  generatePDF: (params) => {
    return api.get('/reports/attendance/pdf', { 
      params,
      responseType: 'blob'
    }).then(res => res.data);
  },
  
  emailReport: (emailData) => {
    return api.post('/reports/attendance/email', emailData).then(res => res.data);
  },

  getStudentHistory: (studentId) => {
    return api.get(`/reports/student/${studentId}/history`).then(res => res.data);
  },

  getSummary: () => {
    return api.get('/reports/summary').then(res => res.data);
  },

  getStats: () => {
    return api.get('/reports/stats').then(res => res.data);
  },

  getTrialCount: () => {
    return api.get('/reports/stats/trial-count').then(res => res.data);
  },

  getSuperAdminStats: () => {
    return api.get('/reports/super-admin-stats').then(res => res.data);
  }
};

// Rooms API
export const roomsAPI = {
  getAll: () => api.get('/rooms').then(res => res.data),
  create: (roomData) => api.post('/rooms', roomData).then(res => res.data),
  update: (id, roomData) => api.put(`/rooms/${id}`, roomData).then(res => res.data),
  delete: (id) => api.delete(`/rooms/${id}`).then(res => res.data),
};

// Logs API 
export const logsAPI = {
  getForClass: (classId) => api.get(`/logs/class/${classId}`).then(res => res.data),
  create: (logData) => api.post('/logs', logData).then(res => res.data),
};

// Payroll API
export const payrollAPI = {
  generate: (params) => api.get('/payroll/generate', { params }).then(res => res.data),

  generatePayslip: (params) => api.get('/payroll/payslip', { 
      params, 
      responseType: 'blob' // Important: We expect a file, not JSON
  }).then(res => res.data),
};

// Expenses API
export const expensesAPI = {
  getMyExpenses: () => api.get('/expenses/my-expenses').then(res => res.data),
  getAll: () => api.get('/expenses/all').then(res => res.data),
  create: (expenseData) => api.post('/expenses', expenseData).then(res => res.data),
  updateStatus: (id, status) => api.put(`/expenses/${id}/status`, { status }).then(res => res.data),
};

// File Upload API
export const fileUploadAPI = {
    async upload(file) {
        // 1. Get the signature from our backend
        const { signature, timestamp } = await api.get('/uploads/signature').then(res => res.data);
        
        // 2. Create a FormData object to send the file
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', process.env.REACT_APP_CLOUDINARY_API_KEY); // You'll add this to your .env
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);

        // 3. Make the POST request directly to Cloudinary
        const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME; // You'll add this
        const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
        
        const response = await axios.post(url, formData);
        
        // 4. Return the URL of the uploaded file
        return response.data.secure_url;
    }
};

export default api;