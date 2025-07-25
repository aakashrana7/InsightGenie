import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalProducts: 0,
    topProducts: [],
    salesTrend: [],
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/dashboard'); // Backend endpoint
        setSummary(res.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="dashboard-container">
      <h2>📊 Dashboard</h2>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="card">
          <h3>Total Sales</h3>
          <p>Rs. {summary.totalSales}</p>
        </div>
        <div className="card">
          <h3>Total Products</h3>
          <p>{summary.totalProducts}</p>
        </div>
      </div>

      {/* Sales Trend Chart */}
      <div className="chart-section">
        <h3>Sales Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={summary.salesTrend}>
            <Line type="monotone" dataKey="sales" stroke="#4f46e5" />
            <CartesianGrid stroke="#ccc" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Products */}
      <div className="top-products">
        <h3>Top Selling Products</h3>
        <ul>
          {summary.topProducts.map((prod, index) => (
            <li key={index}>
              {prod.name} — Rs. {prod.sales}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
