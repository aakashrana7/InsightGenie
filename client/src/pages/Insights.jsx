// src/pages/Insights.jsx
import React, { useEffect, useState } from "react";
import "./Insights.css";
// Import Bar, Line, and Pie components
import { Bar, Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement, // Import ArcElement for Pie charts
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement, // Register ArcElement
  Title,
  Tooltip,
  Legend
);

const Insights = () => {
  const [insights, setInsights] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const [chartConfig, setChartConfig] = useState(null); // Stores chart type and parameters from LLM
  const [chartDataForDisplay, setChartDataForDisplay] = useState(null); // Stores actual data fetched for chart
  const [userQuestion, setUserQuestion] = useState("");
  const [currentQuestionAsked, setCurrentQuestionAsked] = useState("Provide a summary of my sales data."); // Default initial question

  const userPhoneNumber = localStorage.getItem('phone_number'); // Retrieve phone number from localStorage

  // Define a set of colors for charts, especially useful for pie charts
  const chartColors = [
    'rgba(75, 192, 192, 0.8)', // Teal
    'rgba(255, 99, 132, 0.8)', // Red
    'rgba(54, 162, 235, 0.8)', // Blue
    'rgba(255, 206, 86, 0.8)', // Yellow
    'rgba(153, 102, 255, 0.8)', // Purple
    'rgba(255, 159, 64, 0.8)', // Orange
    'rgba(199, 199, 199, 0.8)', // Grey
    'rgba(83, 102, 255, 0.8)', // Indigo
    'rgba(201, 203, 207, 0.8)', // Light Grey
    'rgba(0, 128, 0, 0.8)', // Dark Green
  ];

  // Function to fetch chart data based on parameters provided by the LLM
  const fetchChartData = async (chartParameters) => {
    console.log("fetchChartData called with parameters:", chartParameters);
    if (!chartParameters || chartParameters.type === "none") {
      setChartDataForDisplay(null);
      console.log("Chart parameters are null or type is 'none'. No chart to display.");
      return;
    }

    if (!userPhoneNumber) {
      console.error("User phone number not available for fetching chart data.");
      setError(true);
      setInsights("User not logged in or phone number missing. Please log in.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/dynamic-chart-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chart_parameters: chartParameters.data_parameters,
          phone_number: userPhoneNumber
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Fetched raw chart data from backend:", data);

      // Process data for Chart.js
      if (data && data.length > 0) {
        let xAxisLabel = chartParameters.data_parameters.x_axis;
        let yAxisLabel = chartParameters.data_parameters.y_axis;

        // Adjust yAxisLabel if backend returned 'total_sales' for 'price' aggregation
        if (data[0].hasOwnProperty('total_sales') && (yAxisLabel === 'price' || yAxisLabel === 'total_sales')) {
            yAxisLabel = 'total_sales';
            console.log("Adjusted yAxisLabel to 'total_sales' for chart display.");
        }

        const actualXAxisKey = Object.keys(data[0] || {}).find(key => key.toLowerCase() === xAxisLabel?.toLowerCase());
        const actualYAxisKey = Object.keys(data[0] || {}).find(key => key.toLowerCase() === yAxisLabel?.toLowerCase());


        if (actualXAxisKey && actualYAxisKey) {
            setChartDataForDisplay({
                labels: data.map(item => item[actualXAxisKey]),
                datasets: [
                    {
                        label: actualYAxisKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                        data: data.map(item => item[actualYAxisKey]),
                        // Use multiple colors for pie charts, single for bar/line
                        backgroundColor: chartParameters.type === "pie_chart" ? chartColors : [chartColors[0]],
                        borderColor: chartParameters.type === "pie_chart" ? chartColors.map(color => color.replace('0.8', '1')) : [chartColors[0].replace('0.8', '1')],
                        borderWidth: 1,
                        fill: chartParameters.type === "line_chart" ? false : true,
                        tension: chartParameters.type === "line_chart" ? 0.4 : 0,
                    },
                ],
            });
            console.log("Chart data prepared for display:", { labels: data.map(item => item[actualXAxisKey]), datasets: [{ label: actualYAxisKey, data: data.map(item => item[actualYAxisKey]) }] });
        } else {
            console.warn("Chart data parameters x_axis or y_axis missing or not found in fetched data for display.");
            console.warn("Requested x_axis:", xAxisLabel, "Requested y_axis:", yAxisLabel);
            console.warn("Available data keys:", Object.keys(data[0] || {}));
            setChartDataForDisplay(null);
        }
      } else {
        setChartDataForDisplay(null);
        console.log("No data received for chart display.");
      }
    } catch (err) {
      console.error("Failed to fetch chart data:", err);
      setChartDataForDisplay(null);
    }
  };

  const fetchInsights = async (question) => {
    setLoading(true);
    setError(false);
    setInsights("");
    setChartConfig(null);
    setChartDataForDisplay(null);

    if (!userPhoneNumber) {
      console.error("User phone number not available for fetching insights.");
      setInsights("Please log in to view your insights.");
      setLoading(false);
      setError(true);
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
            phone_number: userPhoneNumber,
            question: question
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      console.log("Backend response for insights:", data);

      setInsights(data.full_answer);

      if (data.chart_data && data.chart_data.type && data.chart_data.type !== "none") {
          setChartConfig(data.chart_data);
          fetchChartData(data.chart_data);
      } else {
          setChartConfig(null);
          setChartDataForDisplay(null);
          console.log("Backend did not suggest a chart or chart type is 'none'.");
      }

      if (data.audio_base64) {
        const audio = new Audio(`data:audio/mpeg;base64,${data.audio_base64}`);
        audio.play().catch(e => console.error("Error playing audio:", e));
      }

    } catch (err) {
      console.error("Failed to load insights:", err);
      setInsights("Failed to load insights. Please try again later.");
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userPhoneNumber) {
        fetchInsights(currentQuestionAsked);
    } else {
        setLoading(false);
        setError(true);
        setInsights("Please log in to view your insights.");
    }
  }, [userPhoneNumber, currentQuestionAsked]);

  const handleAskQuestion = () => {
    if (userQuestion.trim()) {
        setCurrentQuestionAsked(userQuestion.trim());
        fetchInsights(userQuestion.trim());
    } else {
        alert("Please enter a question.");
    }
  };

  // Options for Chart.js
  // Conditionally apply scales for bar/line charts only
  const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Sales Performance', // Dynamic title set below
      },
    },
  };

  const barLineChartScales = {
    x: {
        title: {
            display: true,
            text: chartConfig?.data_parameters?.x_axis?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '',
        },
    },
    y: {
        type: 'logarithmic',
        title: {
            display: true,
            text: chartConfig?.data_parameters?.y_axis?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '',
        },
        ticks: {
            callback: function(value, index, values) {
                if (value === 0) return '0'; // Handle zero specifically for log scale if needed
                const s = value.toLocaleString();
                if (s.length < 7) return s; // Show smaller numbers normally
                return value.toExponential(0); // Use scientific notation for very large numbers
            }
        }
    },
  };

  // Helper to parse insights text into structured points
  const parseInsights = (text) => {
    const sections = {
        summary: [],
        trends: [],
        recommendations: []
    };

    const lines = text.split('\n').filter(line => line.trim() !== '');

    let currentSection = 'summary';
    lines.forEach(line => {
        if (line.toLowerCase().includes("recommendations:")) {
            currentSection = 'recommendations';
        } else if (line.toLowerCase().includes("trends:") || line.toLowerCase().includes("key trends:")) {
             currentSection = 'trends';
        }

        if (currentSection === 'summary' && !line.startsWith("1.") && !line.startsWith("-")) {
            sections.summary.push(line);
        } else if (line.startsWith("1.") || line.startsWith("2.") || line.startsWith("3.") || line.startsWith("4.")) {
            sections.trends.push(line.substring(line.indexOf('.') + 1).trim());
        } else if (line.startsWith("-")) {
            sections.recommendations.push(line.substring(1).trim());
        }
    });
    return sections;
  };

  const parsedInsights = parseInsights(insights);

  const handleRefreshInsights = () => {
    fetchInsights(currentQuestionAsked);
  };

  return (
    <div className="insights-page">
      <div className="insights-container">
        <header className="insights-header">
          <h1>
            <span className="ai-icon">🧠</span>
            <span>Insight Intelligence</span>
          </h1>
          <p className="subtitle">AI-powered insights to grow your business</p>
        </header>

        <div className="question-input-area">
          <input
            type="text"
            className="question-input"
            placeholder="Ask about your sales data (e.g., 'Top selling items this month')"
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAskQuestion();
            }}
          />
          <button className="ask-button" onClick={handleAskQuestion} disabled={loading}>
            Ask AI
          </button>
        </div>

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
            <button className="retry-button" onClick={handleRefreshInsights}>
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
                className={`tab ${activeTab === "recommendations" ? "active" : ""}`}
                onClick={() => setActiveTab("recommendations")}
              >
                Recommendations
              </button>
            </div>

            <div className="tab-content">
              {activeTab === "summary" && (
                <div className="insights-summary">
                  <div className="question-display-card">
                    <h3>Question Asked:</h3>
                    <p>"{currentQuestionAsked}"</p>
                  </div>

                  <div className="summary-card highlight">
                    <h3>Overall Insight</h3>
                    <p>{insights}</p>
                  </div>
                </div>
              )}
              <br />
              <div className="trends-section">
                {parsedInsights.trends.length > 0 && (
                  <div className="trends-list card">
                    <h3>Key Trends Observed:</h3>
                    <ul>
                      {parsedInsights.trends.map((trend, i) => (
                        <li key={i}>{trend}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Conditional rendering for charts */}
                {chartConfig && chartDataForDisplay ? (
                    <div className="chart-container card">
                        <h3>
                            {chartConfig.data_parameters.y_axis?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            {chartConfig.type === "pie_chart" ? '' : ' by '} {/* "by" only for bar/line */}
                            {chartConfig.type === "pie_chart" ? '' : chartConfig.data_parameters.x_axis?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h3>
                        {chartConfig.type === "bar_chart" && (
                            <Bar data={chartDataForDisplay} options={{
                                ...commonChartOptions,
                                scales: barLineChartScales, // Apply scales for bar/line
                                plugins: {
                                    ...commonChartOptions.plugins,
                                    title: {
                                        ...commonChartOptions.plugins.title,
                                        text: `${chartConfig.data_parameters.y_axis?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} by ${chartConfig.data_parameters.x_axis?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`
                                    }
                                }
                            }} />
                        )}
                        {chartConfig.type === "line_chart" && (
                            <Line data={chartDataForDisplay} options={{
                                ...commonChartOptions,
                                scales: barLineChartScales, // Apply scales for bar/line
                                plugins: {
                                    ...commonChartOptions.plugins,
                                    title: {
                                        ...commonChartOptions.plugins.title,
                                        text: `${chartConfig.data_parameters.y_axis?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} over ${chartConfig.data_parameters.x_axis?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`
                                    }
                                }
                            }} />
                        )}
                        {chartConfig.type === "pie_chart" && (
                            <Pie data={chartDataForDisplay} options={{
                                ...commonChartOptions,
                                // Scales are not applicable for Pie charts, so omit them
                                plugins: {
                                    ...commonChartOptions.plugins,
                                    title: {
                                        ...commonChartOptions.plugins.title,
                                        text: `Distribution of ${chartConfig.data_parameters.y_axis?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} by ${chartConfig.data_parameters.x_axis?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`
                                    }
                                }
                            }} />
                        )}
                        {chartConfig.type !== "bar_chart" && chartConfig.type !== "line_chart" && chartConfig.type !== "pie_chart" && (
                            <p className="unsupported-chart-message">Unsupported chart type: {chartConfig.type}.</p>
                        )}
                    </div>
                ) : (
                    <div className="no-chart-info card">
                        <p className="no-chart-message"><span><center>No chart available for this insight.</center></span></p>
                    </div>
                )}
              </div>

              {activeTab === "recommendations" && (
                <div className="recommendations">
                    {parsedInsights.recommendations.length > 0 ? (
                        parsedInsights.recommendations.map((rec, i) => (
                            <div key={i} className="recommendation-card">
                                <h3>Recommendation {i + 1}</h3>
                                <p>{rec}</p>
                            </div>
                        ))
                    ) : (
                        // Default recommendations if LLM doesn't provide any
                        <>
                            <div className="recommendation-card priority">
                                <span className="priority-badge">🔥 High Impact</span>
                                <img
                                src="https://img.icons8.com/color/96/discount--v1.png"
                                alt="Discount"
                                className="recommendation-icon"
                                />
                                <h3>Offer 10% Discount on Top-Selling Items</h3>
                                <p>Boost sales by providing limited-time discounts on your best-selling products to increase repeat purchases.</p>
                                <div className="action-buttons">
                                <button className="action-button primary">Apply Discount</button>
                                <button className="action-button secondary">Learn More</button>
                                </div>
                            </div>

                            <div className="recommendation-card">
                                <img
                                src="https://cdn-icons-png.flaticon.com/512/1995/1995515.png"
                                alt="Marketing"
                                className="recommendation-icon"
                                />
                                <h3>Run a Social Media Campaign</h3>
                                <p>Promote trending products on Instagram and Facebook with targeted ads to attract new customers.</p>
                                <div className="action-buttons">
                                <button className="action-button primary">Create Ad</button>
                                <button className="action-button secondary">Learn More</button>
                                </div>
                            </div>

                            <div className="recommendation-card">
                                <img
                                src="https://img.icons8.com/color/96/loyalty-card.png"
                                alt="Loyalty"
                                className="recommendation-icon"
                                />
                                <h3>Introduce a Loyalty Program</h3>
                                <p>Reward customers with points for every purchase and encourage them to return for more shopping.</p>
                                <div className="action-buttons">
                                <button className="action-button primary">Start Program</button>
                                <button className="action-button secondary">Learn More</button>
                                </div>
                            </div>

                            <div className="recommendation-card">
                                <img
                                src="https://img.icons8.com/color/96/combo-chart.png"
                                alt="Bundle"
                                className="recommendation-icon"
                                />
                                <h3>Create Product Bundles</h3>
                                <p>Increase average order value by bundling related products at a slightly discounted price.</p>
                                <div className="action-buttons">
                                <button className="action-button primary">Create Bundle</button>
                                <button className="action-button secondary">Learn More</button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
              )}
            </div>

            <div className="data-actions">
              <button className="export-button">
                <span className="icon">📊</span> Export Report
              </button>
              <button className="refresh-button" onClick={handleRefreshInsights}>
                <span className="icon">🔄</span> Re-analyze
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Insights;
