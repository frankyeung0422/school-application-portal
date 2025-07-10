import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './InterestedSchools.css';

function InterestedSchools() {
  const [interestedSchools, setInterestedSchools] = useState([]);
  const [availableSchools, setAvailableSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notificationPreferences, setNotificationPreferences] = useState({
    email: true,
    push: true,
    frequency: 'immediate'
  });
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);

  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const userEmail = localStorage.getItem('userEmail');

  useEffect(() => {
    if (isLoggedIn && userEmail) {
      fetchInterestedSchools();
      fetchAvailableSchools();
      fetchNotificationPreferences();
    }
  }, [isLoggedIn, userEmail]);

  const fetchInterestedSchools = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/users/${userEmail}/interested-schools`);
      setInterestedSchools(response.data);
    } catch (error) {
      console.error('Error fetching interested schools:', error);
    }
  };

  const fetchAvailableSchools = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/kindergartens');
      setAvailableSchools(Array.isArray(response.data) ? response.data : (Array.isArray(response.data.kindergartens) ? response.data.kindergartens : []));
    } catch (error) {
      console.error('Error fetching available schools:', error);
      setAvailableSchools([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationPreferences = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/users/${userEmail}`);
      setNotificationPreferences(response.data.notificationPreferences);
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    }
  };

  const addInterestedSchool = async (schoolNo, schoolName) => {
    try {
      await axios.post(`http://localhost:5000/api/users/${userEmail}/interested-schools`, {
        schoolNo,
        schoolName
      });
      await fetchInterestedSchools();
      setShowAddSchool(false);
      setSelectedSchool(null);
    } catch (error) {
      console.error('Error adding interested school:', error);
      alert('Failed to add school to interested list');
    }
  };

  const removeInterestedSchool = async (schoolNo) => {
    try {
      await axios.delete(`http://localhost:5000/api/users/${userEmail}/interested-schools/${schoolNo}`);
      await fetchInterestedSchools();
    } catch (error) {
      console.error('Error removing interested school:', error);
      alert('Failed to remove school from interested list');
    }
  };

  const updateNotificationPreferences = async (preferences) => {
    try {
      await axios.patch(`http://localhost:5000/api/users/${userEmail}/notification-preferences`, preferences);
      setNotificationPreferences(preferences);
      alert('Notification preferences updated successfully!');
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      alert('Failed to update notification preferences');
    }
  };

  // Defensive fallback for availableSchools
  const safeAvailableSchools = Array.isArray(availableSchools) ? availableSchools : [];

  const filteredSchools = safeAvailableSchools.filter(school =>
    school.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.name_tc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.school_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isSchoolInterested = (schoolNo) => {
    return interestedSchools.some(school => school.schoolNo === schoolNo);
  };

  const handlePreferenceChange = (key, value) => {
    const newPreferences = { ...notificationPreferences, [key]: value };
    updateNotificationPreferences(newPreferences);
  };

  if (!isLoggedIn || !userEmail) {
    return (
      <div className="interested-schools-container">
        <div className="login-prompt">
          <h2>Please Log In</h2>
          <p>You need to be logged in to manage your interested schools and notification preferences.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="interested-schools-container">
      <div className="section-header">
        <h2>Interested Schools & Notifications</h2>
        <p>Manage which schools you want to monitor and how you receive notifications</p>
      </div>

      <div className="content-grid">
        {/* Notification Preferences */}
        <div className="preferences-section">
          <h3>Notification Preferences</h3>
          <div className="preferences-form">
            <div className="preference-item">
              <label>
                <input
                  type="checkbox"
                  checked={notificationPreferences.email}
                  onChange={(e) => handlePreferenceChange('email', e.target.checked)}
                />
                Email Notifications
              </label>
            </div>
            
            <div className="preference-item">
              <label>
                <input
                  type="checkbox"
                  checked={notificationPreferences.push}
                  onChange={(e) => handlePreferenceChange('push', e.target.checked)}
                />
                Push Notifications
              </label>
            </div>

            <div className="preference-item">
              <label>Notification Frequency:</label>
              <select
                value={notificationPreferences.frequency}
                onChange={(e) => handlePreferenceChange('frequency', e.target.value)}
              >
                <option value="immediate">Immediate</option>
                <option value="daily">Daily Digest</option>
                <option value="weekly">Weekly Digest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Interested Schools */}
        <div className="interested-section">
          <div className="section-header-row">
            <h3>Interested Schools ({interestedSchools.length})</h3>
            <button 
              className="add-school-btn"
              onClick={() => setShowAddSchool(!showAddSchool)}
            >
              {showAddSchool ? 'Cancel' : 'Add School'}
            </button>
          </div>

          {interestedSchools.length === 0 ? (
            <div className="empty-state">
              <span>🏫</span>
              <p>No schools added yet</p>
              <p>Add schools you're interested in to receive notifications about application updates</p>
            </div>
          ) : (
            <div className="interested-schools-list">
              {interestedSchools.map(school => (
                <div key={school.schoolNo} className="interested-school-item">
                  <div className="school-info">
                    <h4>{school.schoolName}</h4>
                    <p>School No: {school.schoolNo}</p>
                    {school.monitoringInfo && (
                      <div className="monitoring-info">
                        <span className={`status-badge ${school.monitoringInfo.applicationStatus?.isOpen ? 'open' : 'closed'}`}>
                          {school.monitoringInfo.applicationStatus?.isOpen ? 'Applications Open' : 'Applications Closed'}
                        </span>
                        {school.monitoringInfo.lastChecked && (
                          <span className="last-checked">
                            Last checked: {new Date(school.monitoringInfo.lastChecked).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button 
                    className="remove-school-btn"
                    onClick={() => removeInterestedSchool(school.schoolNo)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add School Section */}
          {showAddSchool && (
            <div className="add-school-section">
              <h4>Add School to Monitor</h4>
              <input
                type="text"
                placeholder="Search schools by name or school number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="school-search-input"
              />
              
              <div className="school-search-results">
                {loading ? (
                  <div className="loading">Loading schools...</div>
                ) : filteredSchools.length === 0 ? (
                  <div className="no-results">No schools found</div>
                ) : (
                  filteredSchools.slice(0, 10).map(school => (
                    <div 
                      key={school.school_no} 
                      className={`school-result-item ${isSchoolInterested(school.school_no) ? 'already-interested' : ''}`}
                    >
                      <div className="school-result-info">
                        <h5>{school.name_en}</h5>
                        <p>{school.name_tc}</p>
                        <span className="school-number">School No: {school.school_no}</span>
                      </div>
                      {isSchoolInterested(school.school_no) ? (
                        <span className="already-added">Already Added</span>
                      ) : (
                        <button 
                          className="add-to-interested-btn"
                          onClick={() => addInterestedSchool(school.school_no, school.name_en)}
                        >
                          Add
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notification Information */}
      <div className="notification-info">
        <h3>How Notifications Work</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-icon">🔍</span>
            <h4>Website Monitoring</h4>
            <p>We automatically monitor school websites for application updates and changes</p>
          </div>
          <div className="info-item">
            <span className="info-icon">🔔</span>
            <h4>Smart Alerts</h4>
            <p>Get notified when applications open, close, or when important updates are posted</p>
          </div>
          <div className="info-item">
            <span className="info-icon">⚡</span>
            <h4>Real-time Updates</h4>
            <p>Choose how often you want to receive notifications - immediately, daily, or weekly</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InterestedSchools; 