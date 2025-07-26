// src/pages/Insights.jsx
import React, { useEffect, useState } from "react";
import "./Insights.css"; // We'll create this CSS file

const Insights = () => {
  const [insights, setInsights] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      setError(false);
      try {
        // Simulating API call with mock data
        setTimeout(() => {
          setInsights("After analyzing your sales data, we've identified key trends:\n\n1. Electronics sales increased by 32% last month\n2. Clothing category shows seasonal patterns\n3. Your top-performing product is the 'Premium Smartphone'\n4. Sunday afternoons are your busiest sales period\n\nRecommendations:\n- Increase stock of top 3 products by 25%\n- Run weekend promotions targeting electronics\n- Optimize staffing on Sundays");
          
          // Mock chart data
          setChartData({
            categories: ["Electronics", "Clothing", "Home Goods", "Groceries"],
            values: [45, 30, 15, 10],
            trends: [32, 5, -2, 8] // percentage changes
          });
          
          setLoading(false);
        }, 1500);
        
        // In your actual implementation, you would use:
        // const res = await fetch("http://localhost:5000/api/insights");
        // const data = await res.json();
        // setInsights(data.summary);
        // setChartData(data.charts);
      } catch (err) {
        console.error("Failed to load insights:", err);
        setInsights("Failed to load insights. Please try again later.");
        setError(true);
        setLoading(false);
      }
    };

    fetchInsights();
  }, []);

  return (
    <div className="insights-page">
      <div className="insights-container">
        <header className="insights-header">
          <h1>
            <span className="ai-icon">🧠</span>
            <span>Retail Intelligence Dashboard</span>
          </h1>
          <p className="subtitle">AI-powered insights to grow your business</p>
        </header>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Analyzing your retail data...</p>
            <div className="loading-bar">
              <div className="loading-progress"></div>
            </div>
          </div>
        ) : error ? (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>Data Unavailable</h3>
            <p>{insights}</p>
            <button className="retry-button" onClick={() => window.location.reload()}>
              Retry Analysis
            </button>
          </div>
        ) : (
          <div className="insights-content">
            <div className="tabs">
              <button 
                className={`tab ${activeTab === "summary" ? "active" : ""}`}
                onClick={() => setActiveTab("summary")}
              >
                Key Insights
              </button>
              <button 
                className={`tab ${activeTab === "trends" ? "active" : ""}`}
                onClick={() => setActiveTab("trends")}
              >
                Sales Trends
              </button>
              <button 
                className={`tab ${activeTab === "recommendations" ? "active" : ""}`}
                onClick={() => setActiveTab("recommendations")}
              >
                Recommendations
              </button>
            </div>

            <div className="tab-content">
              {activeTab === "summary" && (
                <div className="insights-summary">
                  <div className="summary-card highlight">
                    <h3>Top Performing Category</h3>
                    <p>Electronics (+32% growth)</p>
                  </div>
                  <div className="summary-card">
                    <h3>Best Selling Product</h3>
                    <p>Premium Smartphone (450 units)</p>
                  </div>
                  <div className="summary-card">
                    <h3>Peak Sales Time</h3>
                    <p>Sunday, 2-5 PM</p>
                  </div>
                  
                  <div className="insights-text">
                    {insights.split('\n\n').map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "trends" && chartData && (
                <div className="trends-section">
                  <div className="chart-container">
                    <h3>Category Performance</h3>
                    <div className="bar-chart">
                      {chartData.categories.map((category, i) => (
                        <div key={category} className="chart-row">
                          <div className="category-name">{category}</div>
                          <div className="bar-container">
                            <div 
                              className="bar" 
                              style={{ width: `${chartData.values[i]}%` }}
                            ></div>
                            <span className="bar-value">{chartData.values[i]}%</span>
                          </div>
                          <div className={`trend ${chartData.trends[i] > 0 ? "up" : "down"}`}>
                            {chartData.trends[i] > 0 ? "↑" : "↓"} {Math.abs(chartData.trends[i])}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="time-chart">
                    <h3>Hourly Sales Pattern</h3>
                    <div className="time-bars">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="time-bar-container">
                          <div 
                            className="time-bar" 
                            style={{ height: `${Math.random() * 80 + 20}%` }}
                          ></div>
                          <span>{i + 9}:00 {i < 3 ? "AM" : "PM"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "recommendations" && (
                <div className="recommendations">
                  <div className="recommendation-card priority">
                    <div className="priority-badge">High Priority</div>
                    <h3>Increase Electronics Stock</h3>
                    <p>Projected demand suggests you should increase inventory of top-selling electronics by 25% for the upcoming month.</p>
                    <div className="action-buttons">
                      <button className="action-button primary">Order Now</button>
                      <button className="action-button secondary">Remind Later</button>
                    </div>
                  </div>
                  <div className="recommendation-card">
                    <h3>Weekend Promotion</h3>
                    <p>Run targeted promotions on weekends when electronics sales are highest. Consider bundling accessories.</p>
                  </div>
                  <div className="recommendation-card">
                    <h3>Staff Optimization</h3>
                    <p>Schedule additional staff during Sunday afternoon peak hours to improve customer experience.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="data-actions">
              <button className="export-button">
                <span className="icon">📊</span> Export Report
              </button>
              <button className="refresh-button">
                <span className="icon">🔄</span> Refresh Insights
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Insights;