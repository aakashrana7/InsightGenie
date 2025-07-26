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
  const [retailerData, setRetailerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const navigate = useNavigate();

  // Mock data
  const salesTrendData = [
    { name: 'Jan', sales: 40000, target: 35000 },
    { name: 'Feb', sales: 30000, target: 32000 },
    { name: 'Mar', sales: 50000, target: 45000 },
    { name: 'Apr', sales: 27800, target: 30000 },
    { name: 'May', sales: 18900, target: 25000 },
    { name: 'Jun', sales: 23900, target: 28000 },
    { name: 'Jul', sales: 34900, target: 35000 },
  ];

  const inventoryData = [
    { name: 'Electronics', value: 400 },
    { name: 'Clothing', value: 300 },
    { name: 'Home Goods', value: 200 },
    { name: 'Groceries', value: 100 },
  ];

  const COLORS = ['#4285F4', '#34A853', '#FBBC05', '#EA4335'];

  const refreshData = () => {
    setLoading(true);
    setTimeout(() => {
      setLastRefresh(new Date());
      setLoading(false);
    }, 1000);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(retailerData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retail-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setTimeout(() => {
          setRetailerData({
            lastUpdated: new Date().toISOString(),
            summary: {
              totalSales: 1254300,
              totalOrders: 3421,
              inventoryValue: 587200,
              lowStockItems: 5,
              customerGrowth: 12.5,
              topSelling: 'Smartphones'
            },
            salesTrend: salesTrendData,
            inventory: inventoryData,
            recentOrders: [
              { id: '#ORD-1001', date: '2023-11-15', amount: 12500, status: 'Delivered' },
              { id: '#ORD-1002', date: '2023-11-14', amount: 8500, status: 'Shipped' },
              { id: '#ORD-1003', date: '2023-11-14', amount: 19200, status: 'Processing' },
              { id: '#ORD-1004', date: '2023-11-13', amount: 5600, status: 'Delivered' },
            ]
          });
          setLoading(false);
        }, 1500);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, [lastRefresh]);

  const formatCurrency = (amount) => {
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
        <p>Loading your retail insights...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Retail Analytics Dashboard</h1>
          <p className="last-updated">
            Last updated: {new Date(retailerData?.lastUpdated).toLocaleString()}
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

      {retailerData ? (
        <>
          <div className="summary-cards">
            <div className="summary-card sales">
              <div className="card-icon">
                <FiDollarSign />
              </div>
              <div className="card-content">
                <h3>Total Sales</h3>
                <p>{formatCurrency(retailerData.summary.totalSales)}</p>
                <span className="trend up">↑ 8.2% from last month</span>
              </div>
            </div>

            <div className="summary-card orders">
              <div className="card-icon">
                <FiShoppingCart />
              </div>
              <div className="card-content">
                <h3>Total Orders</h3>
                <p>{retailerData.summary.totalOrders.toLocaleString()}</p>
                <span className="trend up">↑ 5.7% from last month</span>
              </div>
            </div>

            <div className="summary-card inventory">
              <div className="card-icon">
                <FiPackage />
              </div>
              <div className="card-content">
                <h3>Inventory Value</h3>
                <p>{formatCurrency(retailerData.summary.inventoryValue)}</p>
                <span className="trend down">↓ 3.1% from last month</span>
              </div>
            </div>

            <div className="summary-card alerts">
              <div className="card-icon">
                <FiAlertCircle />
              </div>
              <div className="card-content">
                <h3>Low Stock Items</h3>
                <p>{retailerData.summary.lowStockItems}</p>
                <span className="trend neutral">Needs attention</span>
              </div>
            </div>
          </div>

          <div className="chart-row">
            <div className="chart-container">
              <h2>Sales Performance</h2>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={retailerData.salesTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="name" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip 
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
                      data={retailerData.inventory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {retailerData.inventory.map((entry, index) => (
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
              <h3>Top Selling Category</h3>
              <p className="highlight">{retailerData.summary.topSelling}</p>
            </div>
            <div className="stat-card">
              <h3>Customer Growth</h3>
              <p className="highlight">{retailerData.summary.customerGrowth}% <span className="trend up">↑</span></p>
            </div>
            <div className="stat-card">
              <h3>Average Order Value</h3>
              <p className="highlight">{formatCurrency(retailerData.summary.totalSales / retailerData.summary.totalOrders)}</p>
            </div>
          </div>
        </>
      ) : (
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
      )}
    </div>
  );
};

export default Dashboard;