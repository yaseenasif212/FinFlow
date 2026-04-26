import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard'; // <-- 1. Import it here
import CustomerDashboard from './pages/CustomerDashboard';
import CardManagement from './pages/CardManagement';
import Analytics from './pages/Analytics';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* <-- 2. Add the Admin Dashboard Route --> */}
        <Route path="/admin-dashboard" element={<AdminDashboard />} /> 
        
        <Route path="/dashboard" element={<CustomerDashboard />} />
        <Route path="/cards" element={<CardManagement />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Router>
  );
}



export default App;