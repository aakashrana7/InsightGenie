// src/pages/Insights.jsx
import React, { useEffect, useState } from "react";

const Insights = () => {
  const [insights, setInsights] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call to backend/LLM
    const fetchInsights = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/insights"); // Flask route
        const data = await res.json();
        setInsights(data.summary);
      } catch (err) {
        setInsights("Failed to load insights. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, []);

  return (
    <div>
      <h1>AI Insights</h1>
      {loading ? <p>Loading insights...</p> : <p>{insights}</p>}
      {/* Later you can add charts here */}
    </div>
  );
};

export default Insights;
