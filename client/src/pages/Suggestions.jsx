// src/pages/Suggestions.jsx
import React, { useEffect, useState } from "react";

const Suggestions = () => {
  const [suggestions, setSuggestions] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch("http://localhost:5000/api/suggestions");
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        setSuggestions(data.tips || "No suggestions available at this time.");
      } catch (err) {
        console.error("Failed to load suggestions:", err);
        setSuggestions("Could not load suggestions. Please try again later.");
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6 md:p-10 font-sans">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-3xl p-6 md:p-8">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">💡 AI Suggestions</h1>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-600">
            <i className="fas fa-spinner fa-spin text-4xl mb-4 text-brand-primary"></i>
            <p className="text-lg">Loading suggestions...</p>
          </div>
        ) : error ? (
          <div className="bg-error-red/10 text-error-red border border-error-red rounded-md p-4 text-center text-lg font-medium">
            {suggestions}
          </div>
        ) : (
          <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
            <p>{suggestions}</p>
            {/* You can format suggestions as a list or more structured content if the API provides it */}
          </div>
        )}
      </div>
    </div>
  );
};

export default Suggestions;
