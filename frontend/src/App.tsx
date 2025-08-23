import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import ContractDetailPage from './pages/ContractDetailPage';
import { Contract } from './types/contract';

/**
 * Main application content component that handles routing and state management.
 * 
 * This component manages the application's routing logic, contract selection,
 * and navigation between different views. It uses React Router for navigation
 * and maintains state for selected contracts and refresh triggers.
 * 
 * Features:
 * - Contract upload success/error handling
 * - Contract selection and navigation
 * - Route management for dashboard and contract detail views
 * - State management for selected contracts
 * - Refresh trigger for updating contract lists
 */
function AppContent() {
  const navigate = useNavigate();
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = (contractId: string) => {
    // Trigger refresh of contract list
    setRefreshTrigger(prev => prev + 1);
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    // Could add toast notification here
  };

  const handleContractSelect = (contract: Contract) => {
    setSelectedContract(contract);
    navigate(`/contract/${contract.contract_id}`);
  };

  const handleBackToList = () => {
    setSelectedContract(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route 
            path="/" 
            element={
              <Dashboard 
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
                onContractSelect={handleContractSelect}
                refreshTrigger={refreshTrigger}
              />
            } 
          />
          <Route 
            path="/contract/:contractId" 
            element={
              selectedContract ? (
                <ContractDetailPage 
                  contract={selectedContract}
                  onBack={handleBackToList}
                />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

/**
 * Root application component that provides routing context.
 * 
 * This component wraps the entire application with React Router's BrowserRouter,
 * enabling client-side routing throughout the application. It serves as the
 * entry point for the React application.
 * 
 * @returns Router-wrapped application with routing capabilities
 */
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
