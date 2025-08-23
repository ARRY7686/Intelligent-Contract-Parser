import React, { useState, useEffect } from 'react';
import { Upload, FileText, TrendingUp, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import ContractList from '../components/ContractList';
import { Contract } from '../types/contract';
import { contractApi } from '../services/api';

interface DashboardProps {
  onUploadSuccess: (contractId: string) => void;
  onUploadError: (error: string) => void;
  onContractSelect: (contract: Contract) => void;
  refreshTrigger: number;
}

/**
 * Main dashboard component that provides the primary interface for contract management.
 * 
 * This component serves as the central hub for contract operations, featuring:
 * - Statistics overview with key metrics
 * - Tabbed interface for upload and contract list views
 * - Integration with file upload and contract list components
 * - Real-time status tracking and updates
 * 
 * The dashboard displays contract statistics, provides upload functionality,
 * and shows a comprehensive list of all contracts with filtering capabilities.
 * 
 * @param onUploadSuccess - Callback function triggered when contract upload succeeds
 * @param onUploadError - Callback function triggered when contract upload fails
 * @param onContractSelect - Callback function triggered when a contract is selected
 * @param refreshTrigger - Number that triggers contract list refresh when changed
 */
const Dashboard: React.FC<DashboardProps> = ({
  onUploadSuccess,
  onUploadError,
  onContractSelect,
  refreshTrigger
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'contracts'>('upload');
  const [stats, setStats] = useState([
    {
      title: 'Total Contracts',
      value: '0',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Processing',
      value: '0',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Completed',
      value: '0',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Success Rate',
      value: '0%',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ]);

  const loadStatistics = async () => {
    try {
      const statistics = await contractApi.getStatistics();
      setStats([
        {
          title: 'Total Contracts',
          value: statistics.total_contracts.toString(),
          icon: FileText,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50'
        },
        {
          title: 'Processing',
          value: statistics.processing.toString(),
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50'
        },
        {
          title: 'Completed',
          value: statistics.completed.toString(),
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50'
        },
        {
          title: 'Success Rate',
          value: `${statistics.success_rate}%`,
          icon: TrendingUp,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50'
        }
      ]);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, [refreshTrigger]);

  // Refresh statistics every 30 seconds to keep them updated
  useEffect(() => {
    const interval = setInterval(loadStatistics, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contract Intelligence Dashboard</h1>
        <p className="text-gray-600">
          Upload and analyze contracts automatically. Extract key information with confidence scoring.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'upload'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Contract
            </div>
          </button>
          <button
            onClick={() => setActiveTab('contracts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'contracts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Contract List
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'upload' ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Upload New Contract</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Drag and drop your PDF contract file below. Our AI will automatically extract 
                key information including parties, financial details, payment terms, and more.
              </p>
            </div>
            
            <FileUpload 
              onUploadSuccess={onUploadSuccess}
              onUploadError={onUploadError}
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">What We Extract</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Party identification and contact details</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Financial terms and contract value</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Payment terms and schedules</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Revenue classification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Service level agreements</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Gap analysis and recommendations</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your Contracts</h2>
              <p className="text-gray-600">
                View and manage all your uploaded contracts. Monitor processing status and access extracted data.
              </p>
            </div>
            
            <ContractList 
              onContractSelect={onContractSelect}
              refreshTrigger={refreshTrigger}
            />
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-yellow-600 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Important Notes</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Only PDF files up to 50MB are supported</li>
              <li>• Processing typically takes 30-60 seconds</li>
              <li>• Extracted data includes confidence scores for accuracy assessment</li>
              <li>• Gap analysis identifies missing critical information</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
