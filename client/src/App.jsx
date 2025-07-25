import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import RegisterVendor from "./pages/RegisterVendor";
import Dashboard from "./pages/Dashboard";
import UploadData from "./pages/UploadData";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<RegisterVendor />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<UploadData />} />
      </Routes>
    </Router>
  );
}

export default App;
