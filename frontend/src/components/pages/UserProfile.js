import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InterestedSchools from '../InterestedSchools';
import './UserProfile.css';

function UserProfile() {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    occupation: ''
  });
  const [childrenProfiles, setChildrenProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [newChild, setNewChild] = useState({
    name: '',
    dateOfBirth: '',
    gender: '',
    specialNeeds: '',
    previousSchool: ''
  });
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      navigate('/');
      return;
    }

    // Load user profile data
    const savedProfile = localStorage.getItem('userProfile');
    const savedChildren = localStorage.getItem('childrenProfiles');
    const savedApplications = localStorage.getItem('applications');
    
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
    } else {
      // Initialize with basic info from login
      const email = localStorage.getItem('userEmail');
      const name = localStorage.getItem('userName');
      setUserProfile({
        name: name || '',
        email: email || '',
        phone: '',
        address: '',
        occupation: ''
      });
    }

    if (savedChildren) {
      setChildrenProfiles(JSON.parse(savedChildren));
    }

    if (savedApplications) {
      const allApplications = JSON.parse(savedApplications);
      const userEmail = localStorage.getItem('userEmail');
      const userApplications = allApplications.filter(app => app.parentEmail === userEmail);
      setApplications(userApplications);
    }

    setLoading(false);
  }, [navigate]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setUserProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleChildChange = (e) => {
    const { name, value } = e.target;
    setNewChild(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const saveProfile = () => {
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
    setIsEditing(false);
  };

  const addChild = () => {
    if (newChild.name && newChild.dateOfBirth) {
      const childWithId = {
        ...newChild,
        id: Date.now().toString()
      };
      const updatedChildren = [...childrenProfiles, childWithId];
      setChildrenProfiles(updatedChildren);
      localStorage.setItem('childrenProfiles', JSON.stringify(updatedChildren));
      setNewChild({
        name: '',
        dateOfBirth: '',
        gender: '',
        specialNeeds: '',
        previousSchool: ''
      });
      setShowAddChild(false);
    }
  };

  const removeChild = (childId) => {
    const updatedChildren = childrenProfiles.filter(child => child.id !== childId);
    setChildrenProfiles(updatedChildren);
    localStorage.setItem('childrenProfiles', JSON.stringify(updatedChildren));
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="user-profile-container">
      <div className="profile-header">
        <h1>My Profile</h1>
        <p>Manage your personal information, children profiles, and notification preferences</p>
      </div>

      {/* Tab Navigation */}
      <div className="profile-tabs">
        <button 
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Personal Info
        </button>
        <button 
          className={`tab-btn ${activeTab === 'children' ? 'active' : ''}`}
          onClick={() => setActiveTab('children')}
        >
          Children ({childrenProfiles.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'applications' ? 'active' : ''}`}
          onClick={() => setActiveTab('applications')}
        >
          Applications ({applications.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          Notifications
        </button>
      </div>

      <div className="profile-content">
        {/* Personal Information Tab */}
        {activeTab === 'profile' && (
          <div className="profile-section">
            <div className="section-header">
              <h2>Personal Information</h2>
              <button 
                onClick={() => setIsEditing(!isEditing)} 
                className="edit-btn"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            <div className="profile-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={userProfile.name}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={userProfile.email}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={userProfile.phone}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                  />
                </div>
                <div className="form-group">
                  <label>Occupation</label>
                  <input
                    type="text"
                    name="occupation"
                    value={userProfile.occupation}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Address</label>
                <textarea
                  name="address"
                  value={userProfile.address}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                  rows="3"
                />
              </div>

              {isEditing && (
                <div className="form-actions">
                  <button onClick={saveProfile} className="save-btn">
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Children Tab */}
        {activeTab === 'children' && (
          <div className="profile-section">
            <div className="section-header">
              <h2>Children Profiles</h2>
              <button 
                onClick={() => setShowAddChild(!showAddChild)} 
                className="add-child-btn"
              >
                {showAddChild ? 'Cancel' : 'Add Child'}
              </button>
            </div>

            {childrenProfiles.length === 0 && !showAddChild ? (
              <div className="empty-state">
                <span>👶</span>
                <p>No children profiles added yet</p>
                <p>Add your children to streamline the application process</p>
              </div>
            ) : (
              <>
                {childrenProfiles.map(child => (
                  <div key={child.id} className="child-profile">
                    <div className="child-info">
                      <h3>{child.name}</h3>
                      <div className="child-details">
                        <span>Age: {calculateAge(child.dateOfBirth)} years</span>
                        {child.gender && <span>Gender: {child.gender}</span>}
                        {child.previousSchool && <span>Previous School: {child.previousSchool}</span>}
                        {child.specialNeeds && <span>Special Needs: {child.specialNeeds}</span>}
                      </div>
                    </div>
                    <button 
                      onClick={() => removeChild(child.id)} 
                      className="remove-child-btn"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {showAddChild && (
                  <div className="add-child-form">
                    <h3>Add New Child</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Child's Name</label>
                        <input
                          type="text"
                          name="name"
                          value={newChild.name}
                          onChange={handleChildChange}
                          placeholder="Enter child's full name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Date of Birth</label>
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={newChild.dateOfBirth}
                          onChange={handleChildChange}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Gender</label>
                        <select
                          name="gender"
                          value={newChild.gender}
                          onChange={handleChildChange}
                        >
                          <option value="">Select gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Previous School (if any)</label>
                        <input
                          type="text"
                          name="previousSchool"
                          value={newChild.previousSchool}
                          onChange={handleChildChange}
                          placeholder="Previous school name"
                        />
                      </div>
                    </div>

                    <div className="form-group full-width">
                      <label>Special Needs or Requirements</label>
                      <textarea
                        name="specialNeeds"
                        value={newChild.specialNeeds}
                        onChange={handleChildChange}
                        placeholder="Any special needs, allergies, or requirements"
                        rows="3"
                      />
                    </div>

                    <div className="form-actions">
                      <button onClick={addChild} className="save-btn">
                        Add Child
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div className="profile-section">
            <div className="section-header">
              <h2>Application History</h2>
              <p>Track all your submitted kindergarten applications</p>
            </div>

            {applications.length === 0 ? (
              <div className="empty-state">
                <span>📝</span>
                <p>No applications submitted yet</p>
                <p>Start by browsing kindergartens and submitting applications</p>
                <button 
                  onClick={() => navigate('/kindergartens')} 
                  className="primary-btn"
                >
                  Browse Kindergartens
                </button>
              </div>
            ) : (
              <div className="applications-list">
                {applications.map(application => (
                  <div key={application.id} className="application-card">
                    <div className="application-header">
                      <h3>{application.kindergartenName}</h3>
                      <span className={`status-badge ${application.status}`}>
                        {application.status}
                      </span>
                    </div>
                    
                    <div className="application-details">
                      <div className="detail-row">
                        <span className="detail-label">Child's Name:</span>
                        <span className="detail-value">{application.childName}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Child's Age:</span>
                        <span className="detail-value">{application.childAge} years</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Parent Name:</span>
                        <span className="detail-value">{application.parentName}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Email:</span>
                        <span className="detail-value">{application.parentEmail}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Phone:</span>
                        <span className="detail-value">{application.parentPhone}</span>
                      </div>
                      {application.preferredStartDate && (
                        <div className="detail-row">
                          <span className="detail-label">Preferred Start Date:</span>
                          <span className="detail-value">
                            {new Date(application.preferredStartDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {application.additionalNotes && (
                        <div className="detail-row">
                          <span className="detail-label">Additional Notes:</span>
                          <span className="detail-value">{application.additionalNotes}</span>
                        </div>
                      )}
                      <div className="detail-row">
                        <span className="detail-label">Submitted:</span>
                        <span className="detail-value">
                          {new Date(application.submittedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <InterestedSchools />
        )}
      </div>
    </div>
  );
}

export default UserProfile; 