import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import ContractList from '../components/ContractList';
import { contractApi } from '../services/api';
import { Contract } from '../types/contract';

interface Stats {
  total: number;
  processed: number;
  failed: number;
  pending: number;
}

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'contracts'>('upload');
  const [stats, setStats] = useState<Stats>({ total: 0, processed: 0, failed: 0, pending: 0 });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadStatistics();
  }, [refreshTrigger]);

  const loadStatistics = async () => {
    try {
      const response = await contractApi.listContracts();
      const contracts = response.contracts || [];
      
      setStats({
        total: contracts.length,
        processed: contracts.filter(c => c.status === 'completed').length,
        failed: contracts.filter(c => c.status === 'failed').length,
        pending: contracts.filter(c => c.status === 'processing').length
      });
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const handleUploadSuccess = (contractId: string) => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
  };

  const handleContractSelect = (contract: Contract) => {
    window.location.href = `/contract/${contract.contract_id}`;
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-primary">Contract Intelligence Dashboard</h1>
        <p className="text-secondary text-lg max-w-2xl mx-auto">
          Upload and analyze your contracts with AI-powered intelligence. 
          Get instant insights, risk assessments, and compliance checks.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="dark-card p-6 text-center">
          <div className="flex items-center justify-center mb-3">
            <BarChart3 className="h-8 w-8 text-accent" />
          </div>
          <h3 className="text-2xl font-bold text-primary">{stats.total}</h3>
          <p className="text-secondary">Total Contracts</p>
        </div>

        <div className="dark-card p-6 text-center">
          <div className="flex items-center justify-center mb-3">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h3 className="text-2xl font-bold text-success">{stats.processed}</h3>
          <p className="text-secondary">Processed</p>
        </div>

        <div className="dark-card p-6 text-center">
          <div className="flex items-center justify-center mb-3">
            <TrendingUp className="h-8 w-8 text-warning" />
          </div>
          <h3 className="text-2xl font-bold text-warning">{stats.pending}</h3>
          <p className="text-secondary">Pending</p>
        </div>

        <div className="dark-card p-6 text-center">
          <div className="flex items-center justify-center mb-3">
            <AlertTriangle className="h-8 w-8 text-error" />
          </div>
          <h3 className="text-2xl font-bold text-error">{stats.failed}</h3>
          <p className="text-secondary">Failed</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="dark-card-secondary p-1 rounded-lg">
          <button
            className={`px-6 py-3 rounded-md font-medium ${
              activeTab === 'upload' 
                ? 'bg-accent text-white shadow-lg' 
                : 'text-secondary hover:text-primary'
            }`}
            onClick={() => setActiveTab('upload')}
          >
            <Upload className="inline-block w-5 h-5 mr-2" />
            Upload New Contract
          </button>
          <button
            className={`px-6 py-3 rounded-md font-medium ${
              activeTab === 'contracts' 
                ? 'bg-accent text-white shadow-lg' 
                : 'text-secondary hover:text-primary'
            }`}
            onClick={() => setActiveTab('contracts')}
          >
            <FileText className="inline-block w-5 h-5 mr-2" />
            Your Contracts
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'upload' && (
        <FileUpload 
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
        />
      )}

      {activeTab === 'contracts' && (
        <ContractList 
          onContractSelect={handleContractSelect}
          refreshTrigger={refreshTrigger}
        />
      )}

      {/* Features Section */}
      <div className="dark-card p-8">
        <h2 className="text-2xl font-bold text-primary mb-6 text-center">
          What We Extract
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-success mx-auto" />
            <h3 className="text-lg font-semibold text-primary">Key Terms & Conditions</h3>
            <p className="text-secondary">Identify critical clauses, obligations, and rights</p>
          </div>
          <div className="text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-success mx-auto" />
            <h3 className="text-lg font-semibold text-primary">Financial Details</h3>
            <p className="text-secondary">Extract payment terms, amounts, and schedules</p>
          </div>
          <div className="text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-success mx-auto" />
            <h3 className="text-lg font-semibold text-primary">Risk Assessment</h3>
            <p className="text-secondary">Analyze potential risks and compliance issues</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
