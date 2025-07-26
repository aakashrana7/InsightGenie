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

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-brand">
          RetailInsight
        </Link>
        
        <div className="navbar-links">
          <Link to="/dashboard" className="navbar-link">
            Dashboard
          </Link>
          <Link to="/insights" className="navbar-link">
            Insights
          </Link>
          <div className="navbar-link disabled-link">
            Settings
          </div>
          <button onClick={handleLogout} className="navbar-link logout-button">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; // Make sure this line exists