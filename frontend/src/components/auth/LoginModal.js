import React, { useState } from 'react';
import './AuthModals.css';

function LoginModal({ isOpen, onClose, onSwitchToSignup, onLoginSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Simple validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    // Simulate login - in real app, this would be an API call
    if (formData.email && formData.password) {
      // Save login state
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', formData.email);
      localStorage.setItem('userName', formData.email.split('@')[0]); // Use email prefix as name
      
      // Initialize user profile if not exists
      const existingProfile = localStorage.getItem('userProfile');
      if (!existingProfile) {
        const userProfile = {
          name: formData.email.split('@')[0],
          email: formData.email,
          phone: '',
          address: '',
          occupation: ''
        };
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
      }
      
      onClose();
      
      // Call onLoginSuccess if provided, otherwise reload the page
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        // Trigger page reload to update navigation
        window.location.reload();
      }
    } else {
      setError('Invalid credentials');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Login</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div className="auth-footer">
            <p>Don't have an account? <button type="button" onClick={onSwitchToSignup} className="link-btn">Sign up</button></p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginModal; 