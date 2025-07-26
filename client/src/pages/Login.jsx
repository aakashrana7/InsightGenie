import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const Login = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    email: "",
    password: ""
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Validate credentials (in a real app, this would be server-side)
      if (credentials.email && credentials.password) {
        if (rememberMe) {
          localStorage.setItem("rememberedEmail", credentials.email);
        }
        navigate("/dashboard");
      } else {
        setError("Please enter both email and password");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="platform-info">
          <div className="logo">
            <span className="logo-icon">🧠</span>
            <h1>InsightGenie</h1>
          </div>
          <h2>Your AI-powered sales intelligence platform</h2>
          <ul className="features">
            <li className="feature-item">
              <span className="feature-icon">📊</span>
              <span>Real-time sales analytics</span>
            </li>
            <li className="feature-item">
              <span className="feature-icon">🤖</span>
              <span>AI-driven recommendations</span>
            </li>
            <li className="feature-item">
              <span className="feature-icon">🚀</span>
              <span>Boost your business performance</span>
            </li>
          </ul>
        </div>

        <div className="login-form-container">
          <div className="login-form">
            <h1>Welcome </h1>
            <p className="subtitle">Sign in to access your dashboard</p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email"
                  value={credentials.email}
                  onChange={handleChange}
                  placeholder="your@email.com" 
                  required
                  autoComplete="username"
                />
              </div>

              <div className="form-group">
                <div className="password-header">
                  <label htmlFor="password">Password</label>
                  <a href="/forgot-password" className="forgot-password">Forgot password?</a>
                </div>
                <input 
                  type="password" 
                  id="password" 
                  name="password"
                  value={credentials.password}
                  onChange={handleChange}
                  placeholder="**********" 
                  required
                  autoComplete="current-password"
                />
              </div>

              <div className="form-options">
                <div className="remember-me">
                  <input 
                    type="checkbox" 
                    id="remember" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label htmlFor="remember">Remember me</label>
                </div>
              </div>

              <button 
                type="submit" 
                className="signin-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="button-loader"></span>
                ) : (
                  <>
                    Sign In <span className="arrow">→</span>
                  </>
                )}
              </button>
            </form>

            <div className="divider">
              <span className="divider-line"></span>
              <span className="divider-text">Or continue with</span>
              <span className="divider-line"></span>
            </div>

            <div className="social-login">
              <button className="social-button google">
                <span className="social-icon">G</span>
                Google
              </button>
              <button className="social-button microsoft">
                <span className="social-icon">M</span>
                Microsoft
              </button>
            </div>

            <div className="register-link">
              Don't have an account? <a href="/register">Register here</a>
            </div>

            <div className="terms">
              By signing in, you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;