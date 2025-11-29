import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import FuelPage from './pages/FuelPage';
import VehiclesPage from './pages/VehiclesPage';
import VehicleDetails from './pages/VehicleDetails';
import DriversPage from './pages/DriversPage';
import MissionsPage from './pages/MissionsPage';
import SettingsPage from './pages/SettingsPage';
// 👇 1. IMPORT IMPORTANT
import LogbookPage from './pages/LogbookPage'; 

function App() {
  useEffect(() => {
    const savedColor = localStorage.getItem('themeColor');
    if (savedColor) {
      document.documentElement.style.setProperty('--color-primary', savedColor);
    }
  }, []);

  return (
    <Router>
      <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Sidebar />
        <main className="flex-1 ml-64 transition-all duration-300">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/fuel" element={<FuelPage />} />
            <Route path="/vehicles" element={<VehiclesPage />} />
            <Route path="/vehicles/:id" element={<VehicleDetails />} />
            
            {/* 👇 2. AJOUT DE LA ROUTE QUI MANQUAIT */}
            <Route path="/vehicles/:id/logbook" element={<LogbookPage />} />
            
            <Route path="/drivers" element={<DriversPage />} />
            <Route path="/missions" element={<MissionsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
