import React, { useState, useEffect, useCallback } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import LoginModal from './auth/LoginModal';
import SignupModal from './auth/SignupModal';
import NotificationBell from './NotificationBell';
import './Navigation.css';

function Navigation() {
  const { t, toggleLanguage, language } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const location = useLocation();

  const updateLoginStatus = useCallback(() => {
    const loginStatus = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loginStatus);
    if (loginStatus) {
      const userProfile = JSON.parse(localStorage.getItem('userProfile'));
      setUserName(userProfile?.name || '');
    } else {
      setUserName('');
    }
  }, []);

  useEffect(() => {
    updateLoginStatus();
    window.addEventListener('storage', updateLoginStatus);
    return () => {
      window.removeEventListener('storage', updateLoginStatus);
    };
  }, [updateLoginStatus]);
  
  useEffect(() => {
    // Close mobile menu on route change
    setIsMenuOpen(false);
  }, [location.pathname]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const closeMenu = () => {
    setIsMenuOpen(false);
  }

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userProfile');
    localStorage.removeItem('childrenProfiles');
    localStorage.removeItem('userId');
    setIsLoggedIn(false);
    setUserName('');
    window.dispatchEvent(new Event('storage')); // To update other tabs
    closeMenu();
  };

  const openLoginModal = () => {
    closeMenu();
    setShowLoginModal(true);
    setShowSignupModal(false);
  };

  const openSignupModal = () => {
    closeMenu();
    setShowSignupModal(true);
    setShowLoginModal(false);
  };

  const closeLoginModal = () => setShowLoginModal(false);
  const closeSignupModal = () => setShowSignupModal(false);

  const handleLoginSuccess = () => {
    updateLoginStatus();
    closeLoginModal();
  };
  
  const handleSignupSuccess = () => {
    updateLoginStatus();
    closeSignupModal();
  };
  
  const renderNavLinks = (isMobile = false) => (
    <>
      <NavLink to="/" className="nav-link" onClick={isMobile ? closeMenu : undefined} end>
        {t('home')}
      </NavLink>
      <NavLink to="/kindergartens" className="nav-link" onClick={isMobile ? closeMenu : undefined}>
        {t('kindergartens')}
      </NavLink>
      <NavLink to="/about" className="nav-link" onClick={isMobile ? closeMenu : undefined}>
        {t('about')}
      </NavLink>
      {isLoggedIn && (
        <NavLink to="/profile" className="nav-link" onClick={isMobile ? closeMenu : undefined}>
          {t('profile')}
        </NavLink>
      )}
    </>
  );

  const renderAuthActions = (isMobile = false) => {
    const containerClass = isMobile ? 'nav-actions-mobile' : 'nav-actions';
    
    return (
      <div className={containerClass}>
        {isLoggedIn ? (
          <div className="user-menu">
            {!isMobile && <NotificationBell />}
            {userName && <span className="user-name">{t('hello')}, {userName}</span>}
            <button onClick={handleLogout} className="logout-btn">{t('logout')}</button>
          </div>
        ) : (
          <>
            <button onClick={openLoginModal} className="login-btn">{t('login')}</button>
            <button onClick={openSignupModal} className="signup-btn">{t('signup')}</button>
          </>
        )}
        <button className="language-switcher" onClick={toggleLanguage}>
          {language === 'en' ? '中文' : 'EN'}
        </button>
      </div>
    );
  };

  return (
    <>
      <nav className="navigation">
        <div className="nav-container">
          <Link to="/" className="nav-logo">
            <span role="img" aria-label="school-logo" className="logo-icon">🏫</span>
            <span className="logo-text">School Portal</span>
          </Link>

          <div className="nav-desktop">
            <div className="nav-menu">
              {renderNavLinks()}
            </div>
            {renderAuthActions()}
          </div>

          <button className={`hamburger ${isMenuOpen ? 'active' : ''}`} onClick={toggleMenu} aria-label="Toggle menu">
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        </div>

        <div className={`nav-mobile-menu ${isMenuOpen ? 'active' : ''}`}>
          {renderNavLinks(true)}
          {renderAuthActions(true)}
        </div>
      </nav>

      {showLoginModal && (
        <LoginModal
          onClose={closeLoginModal}
          onSwitchToSignup={openSignupModal}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {showSignupModal && (
        <SignupModal
          onClose={closeSignupModal}
          onSwitchToLogin={openLoginModal}
          onSignupSuccess={handleSignupSuccess}
        />
      )}
    </>
  );
}

export default Navigation; 