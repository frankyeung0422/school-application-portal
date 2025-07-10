import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import LoginModal from '../auth/LoginModal';
import SignupModal from '../auth/SignupModal';
import './HomePage.css';

function HomePage() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  const openLoginModal = () => {
    setShowLoginModal(true);
    setShowSignupModal(false);
  };

  const openSignupModal = () => {
    setShowSignupModal(true);
    setShowLoginModal(false);
  };

  const closeLoginModal = () => setShowLoginModal(false);
  const closeSignupModal = () => setShowSignupModal(false);

  const handleLoginSuccess = () => {
    closeLoginModal();
    // Optionally redirect or show success message
  };

  const handleSignupSuccess = () => {
    closeSignupModal();
    // Optionally redirect or show success message
  };

  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Welcome to the School Application Portal
          </h1>
          <p className="hero-subtitle">
            Streamline your kindergarten application process in Hong Kong. 
            Find the perfect school for your child with comprehensive information 
            and easy application management.
          </p>
          <div className="hero-buttons">
            <Link to="/kindergartens" className="primary-btn">
              Browse Kindergartens
            </Link>
            <button onClick={openLoginModal} className="secondary-btn">
              Login
            </button>
            <button onClick={openSignupModal} className="tertiary-btn">
              Sign Up
            </button>
          </div>
        </div>
        <div className="hero-image">
          <div className="hero-graphic">
            <div className="school-icon">🏫</div>
            <div className="children-icon">👶</div>
            <div className="checkmark-icon">✅</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Why Choose Our Portal?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <h3>Comprehensive Search</h3>
              <p>Find kindergartens by location, district, or specific criteria with our advanced search and filtering system.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📋</div>
              <h3>Easy Applications</h3>
              <p>Submit applications online with our streamlined process. Track your application status in real-time.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Detailed Information</h3>
              <p>Access comprehensive information about each kindergarten including contact details, addresses, and websites.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Mobile Friendly</h3>
              <p>Access the portal from any device with our responsive design that works perfectly on phones and tablets.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">500+</div>
              <div className="stat-label">Kindergartens</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">18</div>
              <div className="stat-label">Districts</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Access</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">100%</div>
              <div className="stat-label">Free</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <h2>Ready to Find Your Perfect Kindergarten?</h2>
          <p>Start exploring kindergartens in Hong Kong today and take the first step towards your child's education journey.</p>
          <Link to="/kindergartens" className="cta-button">
            Get Started Now
          </Link>
        </div>
      </section>

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={closeLoginModal}
          onSwitchToSignup={openSignupModal}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* Signup Modal */}
      {showSignupModal && (
        <SignupModal
          isOpen={showSignupModal}
          onClose={closeSignupModal}
          onSwitchToLogin={openLoginModal}
          onSignupSuccess={handleSignupSuccess}
        />
      )}
    </div>
  );
}

export default HomePage; 