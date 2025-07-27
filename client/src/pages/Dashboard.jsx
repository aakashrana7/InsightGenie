import React, { useState, useEffect } from 'react';
import { 
  FiUpload, FiAlertCircle, FiShoppingCart, FiDollarSign, 
  FiPackage, FiRefreshCw, FiDownload, FiTrendingUp, FiTrendingDown 
} from 'react-icons/fi';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null); // Renamed from retailerData for clarity
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const navigate = useNavigate();

  const userPhoneNumber = localStorage.getItem('phone_number');

  // Define COLORS for PieChart
  const COLORS = ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#9C27B0', '#FF5722', '#607D8B', '#795548'];

  // Function to fetch all dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    if (!userPhoneNumber) {
      setError("User phone number not found. Please log in.");
      setLoading(false);
      return;
    }

    try {
      const headers = { 'Content-Type': 'application/json' };
      const body = JSON.stringify({ phone_number: userPhoneNumber });

      // Fetch Summary Data
      const summaryResponse = await fetch('http://localhost:5000/api/dashboard-summary', { method: 'POST', headers, body });
      const summaryData = await summaryResponse.json();
      if (!summaryResponse.ok) throw new Error(summaryData.error || 'Failed to fetch summary data');

      // Fetch Sales Trend Data
      const salesTrendResponse = await fetch('http://localhost:5000/api/dashboard-sales-trend', { method: 'POST', headers, body });
      const salesTrendData = await salesTrendResponse.json();
      if (!salesTrendResponse.ok) throw new Error(salesTrendData.error || 'Failed to fetch sales trend data');

      // Fetch Inventory Distribution Data
      const inventoryDistributionResponse = await fetch('http://localhost:5000/api/dashboard-inventory-distribution', { method: 'POST', headers, body });
      const inventoryDistributionData = await inventoryDistributionResponse.json();
      if (!inventoryDistributionResponse.ok) throw new Error(inventoryDistributionData.error || 'Failed to fetch inventory distribution data');

      setDashboardData({
        lastUpdated: new Date().toISOString(),
        summary: summaryData,
        salesTrend: salesTrendData,
        inventory: inventoryDistributionData,
        // recentOrders: [] // If you want to include this, you'd need another endpoint
      });
      setLastRefresh(new Date()); // Update last refresh timestamp
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
      setDashboardData(null); // Clear data on error
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch on component mount and when userPhoneNumber changes
  useEffect(() => {
    fetchDashboardData();
  }, [userPhoneNumber]);

  // Refresh data handler
  const refreshData = () => {
    fetchDashboardData();
  };

  const handleExport = () => {
    if (dashboardData) {
      const blob = new Blob([JSON.stringify(dashboardData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `retail-report-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert("No data to export.");
    }
  };

  const formatCurrency = (amount) => {
    // Ensure amount is a number before formatting
    if (typeof amount !== 'number') return '₹0';
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR', 
      maximumFractionDigits: 0 
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-loading error-state">
        <FiAlertCircle className="error-icon" />
        <p>Error: {error}</p>
        <button onClick={refreshData}>Retry</button>
      </div>
    );
  }

  // If no data is available after loading (e.g., empty database)
  if (!dashboardData || !dashboardData.summary || !dashboardData.salesTrend || !dashboardData.inventory) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Analytics Dashboard</h1>
          <div className="header-actions">
            <button className="refresh-btn" onClick={refreshData}>
              <FiRefreshCw /> Refresh
            </button>
            <button 
              className="update-btn"
              onClick={() => navigate('/upload')}
            >
              <FiUpload /> Update Data
            </button>
          </div>
        </div>
        <div className="no-data">
          <FiPackage className="no-data-icon" />
          <h2>No Data Available</h2>
          <p>Connect your retail data to get started with powerful analytics</p>
          <button 
            className="upload-btn"
            onClick={() => navigate('/upload')}
          >
            <FiUpload /> Upload Your Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1> Analytics Dashboard</h1>
          <p className="last-updated">
            Last updated: {new Date(dashboardData.lastUpdated).toLocaleString()}
          </p>
        </div>
        <div className="header-actions">
          <button className="refresh-btn" onClick={refreshData}>
            <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button className="export-btn" onClick={handleExport}>
            <FiDownload /> Export Report
          </button>
          <button 
            className="update-btn"
            onClick={() => navigate('/upload')}
          >
            <FiUpload /> Update Data
          </button>
        </div>
      </div>

      <>
        <div className="summary-cards">
          <div className="summary-card sales">
            <div className="card-icon">
              <FiDollarSign />
            </div>
            <div className="card-content">
              <h3>Total Sales</h3>
              <p>{formatCurrency(dashboardData.summary.totalSales)}</p>
              {/* Trend indicators are static for now, would need more complex backend logic */}
              <span className="trend up">↑ 8.2% from last month</span> 
            </div>
          </div>

          <div className="summary-card orders">
            <div className="card-icon">
              <FiShoppingCart />
            </div>
            <div className="card-content">
              <h3>Total Orders</h3>
              <p>{dashboardData.summary.totalOrders.toLocaleString()}</p>
              <span className="trend up">↑ 5.7% from last month</span>
            </div>
          </div>

          <div className="summary-card inventory">
            <div className="card-icon">
              <FiPackage />
            </div>
            <div className="card-content">
              <h3>Inventory Value</h3>
              <p>{formatCurrency(dashboardData.summary.inventoryValue)}</p>
              <span className="trend down">↓ 3.1% from last month</span>
            </div>
          </div>

          <div className="summary-card alerts">
            <div className="card-icon">
              <FiAlertCircle />
            </div>
            <div className="card-content">
              <h3>Low Stock Items</h3>
              <p>{dashboardData.summary.lowStockItems}</p>
              <span className="trend neutral">Needs attention</span>
            </div>
          </div>
        </div>

        <div className="chart-row">
          <div className="chart-container">
            <h2>Sales Performance</h2>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboardData.salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip 
                    formatter={(value, name) => [`${formatCurrency(value)}`, name === 'sales' ? 'Sales' : 'Target']}
                    contentStyle={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #eee',
                      borderRadius: '4px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#4285F4" 
                    strokeWidth={3} 
                    dot={{ r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="target" 
                    stroke="#EA4335" 
                    strokeWidth={2} 
                    strokeDasharray="5 5"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-container">
            <h2>Inventory Distribution</h2>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dashboardData.inventory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {dashboardData.inventory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} items`, 'Inventory']}
                    contentStyle={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #eee',
                      borderRadius: '4px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="quick-stats">
          <div className="stat-card">
            <h3>Top Selling Item</h3>
            <p className="highlight">{dashboardData.summary.topSelling}</p>
          </div>
          <div className="stat-card">
            <h3>Customer Growth</h3>
            <p className="highlight">{dashboardData.summary.customerGrowth}% <span className="trend up">↑</span></p>
          </div>
          <div className="stat-card">
            <h3>Average Order Value</h3>
            <p className="highlight">{formatCurrency(dashboardData.summary.totalSales / (dashboardData.summary.totalOrders || 1))}</p>
          </div>
        </div>
      </>
    </div>
  );
};

export default Dashboard;
