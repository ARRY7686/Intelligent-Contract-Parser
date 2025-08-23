import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, Calendar, FileText, Trash2 } from 'lucide-react';
import { contractApi, formatFileSize, formatDate, getStatusColor, getStatusIcon } from '../services/api';
import { Contract, ProcessingStatus } from '../types/contract';

interface ContractListProps {
  onContractSelect: (contract: Contract) => void;
  refreshTrigger: number;
}

/**
 * Contract list component that displays and manages all uploaded contracts.
 * 
 * This component provides a comprehensive interface for viewing, searching,
 * filtering, and managing contracts with full CRUD operations.
 * 
 * Features:
 * - Paginated contract display with sorting
 * - Search functionality by filename
 * - Status filtering (pending, processing, completed, failed)
 * - Contract download functionality
 * - Contract deletion with confirmation
 * - Real-time status updates
 * - Loading and error state management
 * 
 * The component integrates with the contract API service for all operations
 * and provides a responsive, user-friendly interface for contract management.
 * 
 * @param onContractSelect - Callback function triggered when a contract is selected
 * @param refreshTrigger - Number that triggers contract list refresh when changed
 */
const ContractList: React.FC<ContractListProps> = ({ onContractSelect, refreshTrigger }) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProcessingStatus | ''>('');

  const loadContracts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await contractApi.listContracts(
        page,
        10,
        statusFilter || undefined,
        searchTerm || undefined
      );
      
      setContracts(response.contracts);
      setTotalPages(response.total_pages);
      setTotal(response.total);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, [page, searchTerm, statusFilter, refreshTrigger]);

  const handleDownload = async (contractId: string, filename: string) => {
    try {
      const blob = await contractApi.downloadContract(contractId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert('Failed to download contract');
    }
  };

  const handleDelete = async (contractId: string, filename: string) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await contractApi.deleteContract(contractId);
      // Refresh the contract list
      loadContracts();
    } catch (err: any) {
      alert('Failed to delete contract');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleStatusFilterChange = (status: ProcessingStatus | '') => {
    setStatusFilter(status);
    setPage(1);
  };

  if (loading && contracts.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && contracts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadContracts}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search contracts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </form>
        
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value as ProcessingStatus | '')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value={ProcessingStatus.PENDING}>Pending</option>
            <option value={ProcessingStatus.PROCESSING}>Processing</option>
            <option value={ProcessingStatus.COMPLETED}>Completed</option>
            <option value={ProcessingStatus.FAILED}>Failed</option>
          </select>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <p className="text-gray-600">
          Showing {contracts.length} of {total} contracts
        </p>
      </div>

      {/* Contracts List */}
      <div className="space-y-4">
        {contracts.map((contract) => (
          <div
            key={contract.contract_id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {contract.filename}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
                    {getStatusIcon(contract.status)} {contract.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Uploaded: {formatDate(contract.created_at)}</span>
                  </div>
                  <div>
                    <span>Size: {formatFileSize(contract.file_size)}</span>
                  </div>
                  {contract.data && (
                    <div>
                      <span>Score: {contract.data.overall_confidence_score}/100</span>
                    </div>
                  )}
                </div>

                {contract.status === ProcessingStatus.FAILED && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    Processing failed. Please try uploading again.
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => onContractSelect(contract)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="View Details"
                >
                  <Eye className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDownload(contract.contract_id, contract.filename)}
                  className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  title="Download Original"
                >
                  <Download className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(contract.contract_id, contract.filename)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Contract"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          
          <span className="px-3 py-2 text-gray-600">
            Page {page} of {totalPages}
          </span>
          
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {contracts.length === 0 && !loading && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No contracts found</p>
          {searchTerm || statusFilter ? (
            <p className="text-gray-500 text-sm mt-2">
              Try adjusting your search or filter criteria
            </p>
          ) : (
            <p className="text-gray-500 text-sm mt-2">
              Upload your first contract to get started
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ContractList;
