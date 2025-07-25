// src/routes.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import RegisterVendor from './pages/RegisterVendor';
import Dashboard from './pages/Dashboard';
import UploadData from './pages/UploadData';
import Insights from './pages/Insights';
import Suggestions from './pages/Suggestions';
import NotFound from './pages/NotFound';

const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<RegisterVendor />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/upload" element={<UploadData />} />
      <Route path="/insights" element={<Insights />} />
      <Route path="/suggestions" element={<Suggestions />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default AppRoutes;
