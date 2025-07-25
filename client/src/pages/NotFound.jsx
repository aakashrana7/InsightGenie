import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>404 - Page Not Found</h1>
      <p style={styles.message}>
        Oops! The page you're looking for doesn't exist.
      </p>
      <Link to="/" style={styles.link}>Go back to Login</Link>
    </div>
  );
};

const styles = {
  container: {
    textAlign: "center",
    marginTop: "10vh",
    padding: "20px",
  },
  title: {
    fontSize: "3rem",
    marginBottom: "20px",
  },
  message: {
    fontSize: "1.2rem",
    marginBottom: "20px",
  },
  link: {
    fontSize: "1rem",
    color: "#007bff",
    textDecoration: "none",
  },
};

export default NotFound;
