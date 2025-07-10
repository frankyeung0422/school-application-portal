import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './KindergartenList.css';

function KindergartenList() {
  const [kindergartens, setKindergartens] = useState([]);
  const [filteredKindergartens, setFilteredKindergartens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [districts, setDistricts] = useState([]);
  const [language, setLanguage] = useState(localStorage.getItem('lang') || 'en');
  const [totalCount, setTotalCount] = useState(0);

  // Fetch districts
  useEffect(() => {
    axios.get('http://localhost:5000/api/districts')
      .then(response => {
        setDistricts(response.data.districts || []);
      })
      .catch(error => {
        console.error('Error fetching districts:', error);
        // Fallback to empty districts array
        setDistricts(['All Districts']);
      });
  }, []);

  // Fetch kindergartens
  useEffect(() => {
    const fetchKindergartens = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5000/api/kindergartens');
        
        // Handle both old array format and new object format
        if (Array.isArray(response.data)) {
          // Old format - direct array
          setKindergartens(response.data);
          setFilteredKindergartens(response.data);
          setTotalCount(response.data.length);
        } else {
          // New format - object with pagination
          setKindergartens(response.data.kindergartens || []);
          setFilteredKindergartens(response.data.kindergartens || []);
          setTotalCount(response.data.total || 0);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('There was an error fetching the kindergarten data!', error);
        setError('Error fetching data. Please make sure the backend is running.');
        setLoading(false);
      }
    };

    fetchKindergartens();
  }, []);

  // Filter kindergartens based on search and district
  useEffect(() => {
    let filtered = kindergartens;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(kg =>
        (kg.name_en && kg.name_en.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (kg.name_tc && kg.name_tc.includes(searchTerm)) ||
        (kg.school_name && kg.school_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (kg.district_en && kg.district_en.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (kg.district_tc && kg.district_tc.includes(searchTerm))
      );
    }

    // Filter by district
    if (selectedDistrict && selectedDistrict !== 'All Districts') {
      filtered = filtered.filter(kg => 
        (kg.district_en && kg.district_en === selectedDistrict) ||
        (kg.district_tc && kg.district_tc === selectedDistrict)
      );
    }

    setFilteredKindergartens(filtered);
  }, [searchTerm, selectedDistrict, kindergartens]);

  useEffect(() => {
    const handleStorage = () => setLanguage(localStorage.getItem('lang') || 'en');
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDistrict('');
  };

  const getSchoolName = (kg) => {
    if (language === 'en') {
      return kg.name_en || kg.school_name || 'N/A';
    } else {
      return kg.name_tc || kg.school_name || 'N/A';
    }
  };

  const getSchoolNameOther = (kg) => {
    if (language === 'en') {
      return kg.name_tc || kg.school_name || 'N/A';
    } else {
      return kg.name_en || kg.school_name || 'N/A';
    }
  };

  const getDistrict = (kg) => {
    if (language === 'en') {
      return kg.district_en || kg.district || 'N/A';
    } else {
      return kg.district_tc || kg.district || 'N/A';
    }
  };

  const getAddress = (kg) => {
    if (language === 'en') {
      return kg.address_en || kg.address || 'N/A';
    } else {
      return kg.address_tc || kg.address || 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading kindergartens...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button onClick={() => window.location.reload()} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="kindergarten-list-container">
      <div className="header-section">
        <h1>Hong Kong Kindergartens</h1>
        <p>Find and explore kindergartens across Hong Kong</p>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name or district..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="district-filter">
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="district-select"
          >
            <option value="">All Districts</option>
            {districts.map(district => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
        </div>

        {(searchTerm || selectedDistrict) && (
          <button onClick={clearFilters} className="clear-filters-btn">
            Clear Filters
          </button>
        )}
      </div>

      <div className="results-info">
        <p>Showing {filteredKindergartens.length} of {totalCount} kindergartens</p>
      </div>

      {filteredKindergartens.length > 0 ? (
        <div className="kindergartens-grid">
          {filteredKindergartens.map(kg => (
            <div key={kg.school_no} className="kindergarten-card">
              <div className="card-header">
                <h3 className="school-name">{getSchoolName(kg)}</h3>
                <span className="school-name-chinese">{getSchoolNameOther(kg)}</span>
              </div>
              
              <div className="card-content">
                <div className="info-row">
                  <span className="label">School No:</span>
                  <span className="value">{kg.school_no}</span>
                </div>
                
                <div className="info-row">
                  <span className="label">{language === 'en' ? 'District:' : '地區:'}</span>
                  <span className="value">{getDistrict(kg)}</span>
                </div>

                {getAddress(kg) !== 'N/A' && (
                  <div className="info-row">
                    <span className="label">{language === 'en' ? 'Address:' : '地址:'}</span>
                    <span className="value">{getAddress(kg)}</span>
                  </div>
                )}

                {kg.tel && (
                  <div className="info-row">
                    <span className="label">Phone:</span>
                    <span className="value">{kg.tel}</span>
                  </div>
                )}

                {kg.website && (
                  <div className="info-row">
                    <span className="label">Website:</span>
                    <a href={kg.website} target="_blank" rel="noopener noreferrer" className="website-link">
                      Visit Website
                    </a>
                  </div>
                )}

                {/* Application Status */}
                {kg.applicationStatus && (
                  <div className="info-row">
                    <span className="label">{language === 'en' ? 'Application:' : '申請:'}</span>
                    <span className={`status-badge ${kg.applicationStatus.isOpen ? 'open' : 'closed'}`}>
                      {kg.applicationStatus.isOpen ? (language === 'en' ? 'Open' : '開放') : (language === 'en' ? 'Closed' : '關閉')}
                    </span>
                  </div>
                )}

                {/* Application Start Date */}
                {kg.applicationStatus && kg.applicationStatus.startDate && (
                  <div className="info-row">
                    <span className="label">{language === 'en' ? 'Start Date:' : '開始日期:'}</span>
                    <span className="date-info">
                      {new Date(kg.applicationStatus.startDate).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {/* Application End Date */}
                {kg.applicationStatus && kg.applicationStatus.endDate && (
                  <div className="info-row">
                    <span className="label">{language === 'en' ? 'End Date:' : '結束日期:'}</span>
                    <span className="date-info">
                      {new Date(kg.applicationStatus.endDate).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {/* Application Deadline (legacy) */}
                {kg.applicationStatus && kg.applicationStatus.deadline && !kg.applicationStatus.endDate && (
                  <div className="info-row">
                    <span className="label">{language === 'en' ? 'Deadline:' : '截止日期:'}</span>
                    <span className="deadline">
                      {new Date(kg.applicationStatus.deadline).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {/* Website Verification Status */}
                {kg.has_website !== undefined && (
                  <div className="info-row">
                    <span className="label">Website:</span>
                    <span className={`verification-badge ${kg.has_website ? 'verified' : 'placeholder'}`}>
                      {kg.has_website ? 'Official' : 'Placeholder'}
                    </span>
                  </div>
                )}
              </div>

              <div className="card-actions">
                <Link to={`/kindergartens/${kg.school_no}`} className="view-details-btn">
                  View Details
                </Link>
                {kg.applicationStatus && kg.applicationStatus.isOpen ? (
                  <Link to={`/kindergartens/${kg.school_no}`} className="apply-btn open">
                    Apply Now
                  </Link>
                ) : (
                  <Link to={`/kindergartens/${kg.school_no}`} className="apply-btn closed">
                    View Details
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-results">
          <p>No kindergartens found matching your criteria.</p>
          <button onClick={clearFilters} className="clear-filters-btn">
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}

export default KindergartenList; 