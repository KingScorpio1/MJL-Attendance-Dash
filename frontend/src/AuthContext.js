// File: frontend/src/AuthContext.js

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from './services/api';
import { io } from 'socket.io-client';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);

  // This effect handles the initial auto-login from localStorage.
  // It runs only ONCE when the app first loads.
  useEffect(() => {
    let newSocket; // Use a local variable to avoid race conditions
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      const parsedUser = JSON.parse(user);
      setCurrentUser(parsedUser);
      authAPI.setToken(token);

      newSocket = io(process.env.REACT_APP_API_URL.replace('/api', ''), {
        auth: { token },
        transports: ['websocket']
      });
      setSocket(newSocket);
    }
    
    setLoading(false);

    // The cleanup function will only run if a socket was created in THIS effect.
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []); // The empty array [] is crucial here, ensuring it runs only once.

  useEffect(() => {
    // If a user is logged in, create a socket connection.
    if (currentUser) {
      const token = localStorage.getItem('token');
      const newSocket = io(process.env.REACT_APP_API_URL.replace('/api', ''), {
        auth: { token },
        transports: ['websocket']
      });
      setSocket(newSocket);
      console.log("Socket connection established.");

      // The cleanup function for this effect: disconnect when the user logs out.
      return () => {
        console.log("Disconnecting socket.");
        newSocket.disconnect();
      };
    } 
    // If there is no user, make sure the socket is null.
    else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [currentUser, socket]); // The dependency array ensures this runs when currentUser changes.

  // --- A universal function to start a user session ---
  const setSession = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    authAPI.setToken(token);
    setCurrentUser(user);
  };

  // The login function is now fully self-contained.
  const login = async (username, password, isStudent = false) => {
    try { 
        // Use the correct API endpoint based on the 'isStudent' flag
        const apiCall = isStudent 
            ? authAPI.studentLogin(username, password) 
            : authAPI.login(username, password);

        const response = await apiCall;
        const { token, user } = response;

        // Disconnect any existing socket from a previous session before creating a new one.
        if (socket) {
            socket.disconnect();
        }

        // Set up the new session
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        authAPI.setToken(token);

        // Create the new socket for the new session
        const newSocket = io(process.env.REACT_APP_API_URL.replace('/api', ''), {
            auth: { token },
            transports: ['websocket']
        });

        // Update the state
        setSocket(newSocket);
        setCurrentUser(user);

        return { success: true };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || 'Login failed' };
    }
  };

  const logout = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    authAPI.setToken(null);
    setCurrentUser(null);
  };

  const value = { currentUser, socket, login, logout, setSession };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}