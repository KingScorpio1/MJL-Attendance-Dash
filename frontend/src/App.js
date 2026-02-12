// File: frontend/src/App.js

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './AuthContext';

// Import Pages
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import AttendancePage from './pages/AttendancePage';
import ClassesPage from './pages/ClassesPage'; 
import StudentsPage from './pages/StudentsPage'; 
import ReportsPage from './pages/ReportsPage'; 
import ClassDetailPage from './pages/ClassDetailPage';
import CalendarPage from './pages/CalendarPage';
import RoomsPage from './pages/RoomsPage';
import PayrollPage from './pages/PayrollPage';
import StudentLoginPage from './pages/StudentLoginPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import StudentMaterialsPage from './pages/StudentMaterialsPage'; 
import MyExpensesPage from './pages/MyExpensesPage';
import AdminExpensesPage from './pages/AdminExpensesPage';

// Import Admin Components
import UserManagement from './components/Admin/UserManagement';
import ClassManagement from './components/Admin/ClassManagement';
import StudentManagement from './components/Admin/StudentManagement';

// --- Wrapper Components for Route Protection ---
function StaffLayoutWrapper() {
    const { currentUser } = useAuth();
    const isStaff = currentUser && ['admin', 'teacher', 'accountant'].includes(currentUser.role);
    if (!isStaff) return <Navigate to="/login" replace />;
    return <MainLayout />;
}

function StudentLayoutWrapper() {
    const { currentUser } = useAuth();
    const isStudent = currentUser && currentUser.role === 'student';
    if (!isStudent) return <Navigate to="/student-login" replace />;
    return <StudentLayout />;
}

function ExpensesPageWrapper() {
    const { currentUser } = useAuth();
    if (!currentUser) return null;
    return currentUser.role === 'teacher' ? <MyExpensesPage /> : <AdminExpensesPage />;
}

// The new layout for the Student Portal
function StudentLayout() {
    const { currentUser, logout } = useAuth();

    useEffect(() => {
        console.log('[StudentLayout] Successfully rendered for user:', currentUser);
    }, [currentUser]);

    if (!currentUser) return null;
    const activeLinkStyle = { color: 'white', textDecoration: 'underline' };

    return (
        <div className="bg-gray-100 min-h-screen">
            <nav className="bg-green-600 text-white p-4 shadow-md">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center space-x-6">
                        <h1 className="text-2xl font-bold">Student Portal</h1>
                        <div className="flex space-x-4">
                            <NavLink to="/student/dashboard" style={({ isActive }) => isActive ? activeLinkStyle : undefined}>Dashboard</NavLink>
                            <NavLink to="/student/materials" style={({ isActive }) => isActive ? activeLinkStyle : undefined}>Materials</NavLink>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span>Welcome, {currentUser.name}!</span>
                        <button onClick={logout}>Logout</button>
                    </div>
                </div>
            </nav>
            <div className="container mx-auto p-4">
                <Outlet />
            </div>
        </div>
    );
}

// This is the main layout for the application AFTER a user logs in.
// It includes the navbar and the tabbed navigation.
function MainLayout() {
  const { currentUser, logout } = useAuth();

  // --- DIAGNOSTIC 2: Check the user once inside the layout ---
  useEffect(() => {
    console.log('[MainLayout] Component has rendered. currentUser:', currentUser);
  }, [currentUser]);

  if (!currentUser){
    console.log("[MainLayout] Rendering 'Please log in' because currentUser is null.");
    return <div>Please log in.</div>
  }

  // Style for active NavLink tab
  const activeLinkStyle = {
    borderColor: '#2563EB', // blue-600
    color: '#2563EB',
    fontWeight: 500,
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <nav className="bg-blue-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Teacher Attendance System</h1>
          <div className="flex items-center space-x-4">
            <NavLink to="/profile" className="hover:underline">
                Welcome, {currentUser.username}!
            </NavLink>
            <button onClick={logout} className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded">Logout</button>
          </div>
        </div>
      </nav>
      
      <div className="container mx-auto p-4">
        {currentUser.role === 'admin' && (
          <div id="admin-panel" className="mb-6 bg-gray-50 p-4 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Admin Controls</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <UserManagement />
              <ClassManagement />
              <StudentManagement />
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b mb-4 bg-white rounded-t-lg p-2">
            <NavLink to="/dashboard" className="py-2 px-4 text-gray-600 hover:text-blue-600 border-b-2 border-transparent" style={({ isActive }) => isActive ? activeLinkStyle : undefined}>Dashboard</NavLink>
            <NavLink to="/calendar" className="py-2 px-4 text-gray-600 hover:text-blue-600 border-b-2 border-transparent" style={({ isActive }) => isActive ? activeLinkStyle : undefined}>Calendar</NavLink>
            <NavLink to="/attendance" className="py-2 px-4 text-gray-600 hover:text-blue-600 border-b-2 border-transparent" style={({ isActive }) => isActive ? activeLinkStyle : undefined}>Attendance</NavLink>
            <NavLink to="/classes" className="py-2 px-4 text-gray-600 hover:text-blue-600 border-b-2 border-transparent" style={({ isActive }) => isActive ? activeLinkStyle : undefined}>Classes</NavLink>
            <NavLink to="/students" className="py-2 px-4 text-gray-600 hover:text-blue-600 border-b-2 border-transparent" style={({ isActive }) => isActive ? activeLinkStyle : undefined}>Students</NavLink>
            <NavLink to="/reports" className="py-2 px-4 text-gray-600 hover:text-blue-600 border-b-2 border-transparent" style={({ isActive }) => isActive ? activeLinkStyle : undefined}>Reports</NavLink>
            <NavLink to="/expenses" className="py-2 px-4 text-gray-600 hover:text-blue-600 border-b-2 border-transparent" style={({ isActive }) => isActive ? activeLinkStyle : undefined}>Expenses</NavLink>
            {(currentUser.role === 'admin' || currentUser.role === 'accountant') && (
              <NavLink to="/payroll" className="py-2 px-4 text-gray-600 hover:text-blue-600 border-b-2 border-transparent" style={({ isActive }) => isActive ? activeLinkStyle : undefined}>Payroll</NavLink>
            )}
        </div>

        {/* The content of the selected tab will be rendered here */}
        <Routes>
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/classes" element={<ClassesPage />} />
                <Route path="/classes/:classId" element={<ClassDetailPage />} />
                <Route path="/students" element={<StudentsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/admin/rooms" element={<RoomsPage />} />
                <Route path="/payroll" element={<PayrollPage />} />
                <Route path="/expenses" element={<ExpensesPageWrapper />} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
      </div>
    </div>
  );
}


// This is the main App component that defines all the application routes.
export default function App() {
  return (
    <AuthProvider>
      <Toaster 
        position="top-right"
        toastOptions={{
          success: {
            style: {
              background: '#D1FAE5', // green-100
              color: '#065F46', // green-800
            },
          },
          error: {
            style: {
              background: '#FEE2E2', // red-100
              color: '#991B1B', // red-800
            },
          },
        }}
      />
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/student-login" element={<StudentLoginPage />} />

          {/* Staff Private Routes - All staff pages are nested here */}
          <Route path="/" element={<StaffLayoutWrapper />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="classes" element={<ClassesPage />} />
            <Route path="classes/:classId" element={<ClassDetailPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="expenses" element={<ExpensesPageWrapper />} />
            <Route path="payroll" element={<PayrollPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="admin/rooms" element={<RoomsPage />} />
            <Route index element={<Navigate to="dashboard" />} />
          </Route>

          {/* Student Private Routes - All student pages are nested here */}
          <Route path="/student" element={<StudentLayoutWrapper />}>
            <Route path="dashboard" element={<StudentDashboardPage />} />
            <Route path="materials" element={<StudentMaterialsPage />} />
            <Route index element={<Navigate to="dashboard" />} />
          </Route>

          {/* A final catch-all to redirect any unknown path */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}