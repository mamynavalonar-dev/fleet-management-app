import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import FuelPage from './pages/FuelPage';
import VehiclesPage from './pages/VehiclesPage';
import VehicleDetails from './pages/VehicleDetails';
import DriversPage from './pages/DriversPage';
import MissionsPage from './pages/MissionsPage';
import MaintenancePage from './pages/MaintenancePage';
import FraudAlertsPage from './pages/FraudAlertsPage';
import SettingsPage from './pages/SettingsPage';
import LogbookPage from './pages/LogbookPage'; // <--- AJOUT IMPORTANT 1
import UserProfilePage from './pages/UserProfilePage'; // <--- AJOUT IMPORTANT 2 (Pour le point 5)

function App() {
  useEffect(() => {
    const savedColor = localStorage.getItem('themeColor');
    if (savedColor) {
      document.documentElement.style.setProperty('--color-primary', savedColor);
    }
  }, []);

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
                  <Sidebar />
                  <main className="flex-1 ml-64 transition-all duration-300">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/fuel" element={<FuelPage />} />
                      <Route path="/vehicles" element={<VehiclesPage />} />
                      <Route path="/vehicles/:id" element={<VehicleDetails />} />
                      
                      {/* 👇 CORRECTION POINT 2 & 4 : ROUTE JOURNAL DE BORD */}
                      <Route path="/vehicles/:id/logbook" element={<LogbookPage />} />
                      
                      <Route path="/drivers" element={<DriversPage />} />
                      <Route path="/missions" element={<MissionsPage />} />
                      
                      <Route path="/maintenance" element={
                          <ProtectedRoute allowedRoles={['gestionnaire', 'admin']}>
                            <MaintenancePage />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="/fraud-alerts" element={
                          <ProtectedRoute allowedRoles={['gestionnaire', 'admin']}>
                            <FraudAlertsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="/settings" element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <SettingsPage />
                          </ProtectedRoute>
                        }
                      />
                      
                      {/* 👇 CORRECTION POINT 5 : ROUTE PROFIL */}
                      <Route path="/profile" element={<UserProfilePage />} />

                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;