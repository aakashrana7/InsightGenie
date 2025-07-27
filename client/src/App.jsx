// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Insights from './pages/Insights';
import Login from './pages/Login';
import RegisterVendor from './pages/RegisterVendor';
import UploadData from './pages/UploadData'; // Add this import
import VendorProfile from './pages/VendorProfile';


function AppContent() {
  const location = useLocation();
  const hideNavbar = ['/login', '/register'].includes(location.pathname);

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/register" element={<RegisterVendor />} />
        <Route path="/upload" element={<UploadData />} /> {/* Add this route */}
        <Route path="/vendor-profile" element={<VendorProfile />} />
        
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;