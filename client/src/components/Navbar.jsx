// src/components/Navbar.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  const goToVendorProfile = () => {
    navigate('/vendor-profile'); // Placeholder route
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-brand">
          💫InsightGenie
        </Link>

        <div className="navbar-links">
          <Link to="/dashboard" className="navbar-link">Dashboard</Link>
          <Link to="/insights" className="navbar-link">Insights</Link>
          <button onClick={handleLogout} className="navbar-link logout-button">Logout</button>

          {/* Placeholder Profile Icon */}
          <img
            src="/profile.jpg" // Must be in public folder
            alt="Vendor Profile"
            onClick={goToVendorProfile}
            className="vendor-profile-icon"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              marginLeft: '15px',
              cursor: 'pointer'
            }}
          />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
