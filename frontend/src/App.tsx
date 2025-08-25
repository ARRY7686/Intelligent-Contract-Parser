import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import ContractDetailPage from './pages/ContractDetailPage';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="App bg-primary min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/contract/:id" element={<ContractDetailPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
