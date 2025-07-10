import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import LoginModal from '../auth/LoginModal';
import './KindergartenDetail.css';

function KindergartenDetail() {
  const { schoolNo } = useParams();
  const navigate = useNavigate();
  const [kindergarten, setKindergarten] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedChild, setSelectedChild] = useState('');
  const [applicationForm, setApplicationForm] = useState({
    childName: '',
    childAge: '',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    preferredStartDate: '',
    additionalNotes: ''
  });
  const [language, setLanguage] = useState(localStorage.getItem('lang') || 'en');

  useEffect(() => {
    const fetchKindergarten = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/kindergartens/${schoolNo}`);
        setKindergarten(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching kindergarten details:', error);
        setError('Error loading kindergarten details. Please try again.');
        setLoading(false);
      }
    };

    fetchKindergarten();
  }, [schoolNo]);

  useEffect(() => {
    const handleStorage = () => setLanguage(localStorage.getItem('lang') || 'en');
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setApplicationForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStartApplication = () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    // Auto-populate form with user data
    const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const childrenProfiles = JSON.parse(localStorage.getItem('childrenProfiles') || '[]');
    
    setApplicationForm({
      childName: '',
      childAge: '',
      parentName: userProfile.name || '',
      parentEmail: userProfile.email || '',
      parentPhone: userProfile.phone || '',
      preferredStartDate: '',
      additionalNotes: ''
    });

    setShowApplicationForm(true);
  };

  const handleChildSelection = (childId) => {
    const childrenProfiles = JSON.parse(localStorage.getItem('childrenProfiles') || '[]');
    const selectedChildData = childrenProfiles.find(child => child.id === childId);
    
    if (selectedChildData) {
      const age = calculateAge(selectedChildData.dateOfBirth);
      setApplicationForm(prev => ({
        ...prev,
        childName: selectedChildData.name,
        childAge: age.toString()
      }));
    }
    setSelectedChild(childId);
  };

  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    
    // Save application to localStorage for now
    const applications = JSON.parse(localStorage.getItem('applications') || '[]');
    const newApplication = {
      id: Date.now().toString(),
      kindergartenId: schoolNo,
      kindergartenName: kindergarten.name_en,
      ...applicationForm,
      submittedAt: new Date().toISOString(),
      status: 'pending'
    };
    
    applications.push(newApplication);
    localStorage.setItem('applications', JSON.stringify(applications));
    
    alert('Application submitted successfully! We will contact you soon.');
    setShowApplicationForm(false);
    setApplicationForm({
      childName: '',
      childAge: '',
      parentName: '',
      parentEmail: '',
      parentPhone: '',
      preferredStartDate: '',
      additionalNotes: ''
    });
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    // After successful login, automatically open the application form
    handleStartApplication();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading kindergarten details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate('/kindergartens')} className="back-button">
          Back to Kindergartens
        </button>
      </div>
    );
  }

  if (!kindergarten) {
    return (
      <div className="not-found">
        <h2>Kindergarten Not Found</h2>
        <p>The kindergarten you're looking for doesn't exist.</p>
        <button onClick={() => navigate('/kindergartens')} className="back-button">
          Back to Kindergartens
        </button>
      </div>
    );
  }

  const childrenProfiles = JSON.parse(localStorage.getItem('childrenProfiles') || '[]');

  return (
    <div className="kindergarten-detail-container">
      <div className="detail-header">
        <button onClick={() => navigate('/kindergartens')} className="back-btn">
          ← Back to Kindergartens
        </button>
        <div className="header-content">
          <h1 className="school-name">{language === 'en' ? kindergarten.name_en : kindergarten.name_tc}</h1>
          <p className="school-name-chinese">{language === 'en' ? kindergarten.name_tc : kindergarten.name_en}</p>
          <div className="school-badge">
            <span className="badge-text">School No: {kindergarten.school_no}</span>
          </div>
        </div>
      </div>

      <div className="detail-content">
        <div className="main-info">
          <div className="info-card">
            <h3>School Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">{language === 'en' ? 'District:' : '地區:'}</span>
                <span className="value">{language === 'en' ? kindergarten.district_en : kindergarten.district_tc}</span>
              </div>
              {kindergarten.organisation_en && (
                <div className="info-item">
                  <span className="label">Organization:</span>
                  <span className="value">{kindergarten.organisation_en}</span>
                </div>
              )}
              {kindergarten.address_en && (
                <div className="info-item full-width">
                  <span className="label">{language === 'en' ? 'Address:' : '地址:'}</span>
                  <span className="value">{language === 'en' ? kindergarten.address_en : kindergarten.address_tc}</span>
                </div>
              )}
            </div>
          </div>

          <div className="info-card">
            <h3>Contact Information</h3>
            <div className="info-grid">
              {kindergarten.tel && (
                <div className="info-item">
                  <span className="label">Phone:</span>
                  <span className="value">
                    <a href={`tel:${kindergarten.tel}`}>{kindergarten.tel}</a>
                  </span>
                </div>
              )}
              {kindergarten.fax && (
                <div className="info-item">
                  <span className="label">Fax:</span>
                  <span className="value">{kindergarten.fax}</span>
                </div>
              )}
              {kindergarten.website && (
                <div className="info-item full-width">
                  <span className="label">Website:</span>
                  <span className="value">
                    <a href={kindergarten.website} target="_blank" rel="noopener noreferrer">
                      Visit Website
                    </a>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sidebar">
          <div className="action-card">
            <h3>Apply Now</h3>
            <p>Ready to apply to this kindergarten? Click the button below to start your application.</p>
            <button 
              onClick={handleStartApplication}
              className="apply-button"
            >
              Start Application
            </button>
          </div>

          <div className="quick-info-card">
            <h3>Quick Facts</h3>
            <ul>
              <li>✓ Located in {language === 'en' ? kindergarten.district_en : kindergarten.district_tc}</li>
              <li>✓ Government registered</li>
              <li>✓ Professional staff</li>
              <li>✓ Safe learning environment</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="modal-overlay" onClick={() => setShowLoginPrompt(false)}>
          <div className="modal-content login-prompt" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Login Required</h2>
              <button 
                onClick={() => setShowLoginPrompt(false)}
                className="close-button"
              >
                ×
              </button>
            </div>
            <div className="login-prompt-content">
              <p>You need to be logged in to submit an application.</p>
              <div className="login-prompt-actions">
                <button 
                  onClick={() => {
                    setShowLoginPrompt(false);
                    setShowLoginModal(true);
                  }} 
                  className="login-btn"
                >
                  Login Now
                </button>
                <button 
                  onClick={() => setShowLoginPrompt(false)} 
                  className="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSwitchToSignup={() => {
            // You can add signup modal here if needed
            setShowLoginModal(false);
          }}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* Application Modal */}
      {showApplicationForm && (
        <div className="modal-overlay" onClick={() => setShowApplicationForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Application Form</h2>
              <button 
                onClick={() => setShowApplicationForm(false)}
                className="close-button"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmitApplication} className="application-form">
              {/* Child Selection */}
              {childrenProfiles.length > 0 && (
                <div className="form-group">
                  <label>Select Child from Profile</label>
                  <select
                    value={selectedChild}
                    onChange={(e) => handleChildSelection(e.target.value)}
                  >
                    <option value="">Choose a child from your profile</option>
                    {childrenProfiles.map(child => (
                      <option key={child.id} value={child.id}>
                        {child.name} ({calculateAge(child.dateOfBirth)} years old)
                      </option>
                    ))}
                  </select>
                  <small>Or fill in the details manually below</small>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="childName">Child's Name *</label>
                <input
                  type="text"
                  id="childName"
                  name="childName"
                  value={applicationForm.childName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="childAge">Child's Age *</label>
                <input
                  type="number"
                  id="childAge"
                  name="childAge"
                  min="2"
                  max="6"
                  value={applicationForm.childAge}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="parentName">Parent/Guardian Name *</label>
                <input
                  type="text"
                  id="parentName"
                  name="parentName"
                  value={applicationForm.parentName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="parentEmail">Email Address *</label>
                <input
                  type="email"
                  id="parentEmail"
                  name="parentEmail"
                  value={applicationForm.parentEmail}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="parentPhone">Phone Number *</label>
                <input
                  type="tel"
                  id="parentPhone"
                  name="parentPhone"
                  value={applicationForm.parentPhone}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="preferredStartDate">Preferred Start Date</label>
                <input
                  type="date"
                  id="preferredStartDate"
                  name="preferredStartDate"
                  value={applicationForm.preferredStartDate}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="additionalNotes">Additional Notes</label>
                <textarea
                  id="additionalNotes"
                  name="additionalNotes"
                  value={applicationForm.additionalNotes}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Any additional information you'd like to share..."
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowApplicationForm(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default KindergartenDetail; 