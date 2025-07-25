// src/pages/Suggestions.jsx
import React, { useEffect, useState } from "react";

const Suggestions = () => {
  const [suggestions, setSuggestions] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/suggestions");
        const data = await res.json();
        setSuggestions(data.tips);
      } catch (err) {
        setSuggestions("Could not load suggestions.");
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, []);

  return (
    <div>
      <h1>AI Suggestions</h1>
      {loading ? <p>Loading suggestions...</p> : <p>{suggestions}</p>}
    </div>
  );
};

export default Suggestions;
