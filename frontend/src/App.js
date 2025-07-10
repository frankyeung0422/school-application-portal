import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import Navigation from './components/Navigation';
import HomePage from './components/pages/HomePage';
import KindergartenList from './components/pages/KindergartenList';
import KindergartenDetail from './components/pages/KindergartenDetail';
import UserProfile from './components/pages/UserProfile';
import AboutPage from './components/pages/AboutPage';
import './App.css';

function App() {
  return (
    <LanguageProvider>
      <div className="App">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/kindergartens" element={<KindergartenList />} />
            <Route path="/kindergartens/:schoolNo" element={<KindergartenDetail />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </main>
      </div>
    </LanguageProvider>
  );
}

export default App;
