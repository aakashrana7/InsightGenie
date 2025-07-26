import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800 font-sans p-4">
      <div className="text-center bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-6xl md:text-8xl font-extrabold text-brand-primary mb-4">404</h1>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Page Not Found</h2>
        <p className="text-lg text-gray-600 mb-8">
          Oops! The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white
                     bg-brand-primary hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary
                     transition-colors duration-200 transform hover:-translate-y-0.5"
        >
          <i className="fas fa-arrow-left mr-2"></i> Go back to Login
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
