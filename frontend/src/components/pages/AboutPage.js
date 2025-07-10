import React from 'react';
import './AboutPage.css';

function AboutPage() {
  return (
    <div className="about-page">
      <div className="about-hero">
        <div className="container">
          <h1>About School Application Portal</h1>
          <p>Empowering parents to make informed decisions about their children's education</p>
        </div>
      </div>

      <div className="about-content">
        <div className="container">
          <section className="mission-section">
            <h2>Our Mission</h2>
            <p>
              The School Application Portal is dedicated to simplifying the kindergarten application process 
              for parents in Hong Kong. We believe every child deserves access to quality education, and 
              every parent should have the tools and information they need to make the best choice for 
              their family.
            </p>
          </section>

          <section className="features-section">
            <h2>What We Offer</h2>
            <div className="features-grid">
              <div className="feature-item">
                <div className="feature-icon">📚</div>
                <h3>Comprehensive Database</h3>
                <p>Access detailed information about hundreds of kindergartens across Hong Kong, including contact details, locations, and facilities.</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🔍</div>
                <h3>Advanced Search</h3>
                <p>Find the perfect kindergarten using our powerful search and filtering tools based on location, district, and other criteria.</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">📝</div>
                <h3>Easy Applications</h3>
                <p>Submit applications directly through our platform with a streamlined process designed for busy parents.</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">📱</div>
                <h3>Mobile Friendly</h3>
                <p>Access our portal from any device with our responsive design that works perfectly on phones, tablets, and computers.</p>
              </div>
            </div>
          </section>

          <section className="stats-section">
            <h2>Our Impact</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-number">500+</div>
                <div className="stat-label">Kindergartens Listed</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">18</div>
                <div className="stat-label">Districts Covered</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">1000+</div>
                <div className="stat-label">Happy Parents</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">24/7</div>
                <div className="stat-label">Available Support</div>
              </div>
            </div>
          </section>

          <section className="team-section">
            <h2>Our Team</h2>
            <p>
              We are a dedicated team of education professionals, developers, and parents who understand 
              the challenges of finding the right kindergarten. Our goal is to make this process as 
              smooth and stress-free as possible for families across Hong Kong.
            </p>
          </section>

          <section className="contact-section">
            <h2>Get in Touch</h2>
            <p>
              Have questions or suggestions? We'd love to hear from you! Contact us to learn more about 
              our services or to provide feedback on how we can improve.
            </p>
            <div className="contact-info">
              <div className="contact-item">
                <span className="contact-icon">📧</span>
                <span>info@schoolportal.hk</span>
              </div>
              <div className="contact-item">
                <span className="contact-icon">📞</span>
                <span>+852 1234 5678</span>
              </div>
              <div className="contact-item">
                <span className="contact-icon">📍</span>
                <span>Hong Kong</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default AboutPage; 