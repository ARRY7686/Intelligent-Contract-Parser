import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, Calendar, FileText, Trash2, TrendingUp } from 'lucide-react';
import { contractApi, formatFileSize, formatDate, getStatusIcon } from '../services/api';
import { Contract, ProcessingStatus } from '../types/contract';

interface ContractListProps {
  onContractSelect: (contract: Contract) => void;
  refreshTrigger: number;
}

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
        <div className="spinner"></div>
      </div>
    );
  }

  if (error && contracts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-error mb-4">{error}</p>
        <button onClick={loadContracts} className="btn-primary">
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary h-5 w-5" />
            <input
              type="text"
              placeholder="Search contracts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-dark w-full pl-10 pr-4 py-3"
            />
          </div>
        </form>
        
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-secondary" />
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value as ProcessingStatus | '')}
            className="input-dark px-4 py-3"
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
        <p className="text-secondary">
          Showing {contracts.length} of {total} contracts
        </p>
        {total > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <TrendingUp className="h-4 w-4" />
            <span>Real-time updates</span>
          </div>
        )}
      </div>

      {/* Contracts List */}
      <div className="space-y-4">
        {contracts.map((contract) => (
          <div
            key={contract.contract_id}
            className="dark-card p-6 cursor-pointer"
            onClick={() => onContractSelect(contract)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="h-5 w-5 text-secondary" />
                  <h3 className="text-lg font-semibold text-primary">
                    {contract.filename}
                  </h3>
                  <span 
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      contract.status === ProcessingStatus.COMPLETED ? 'bg-success/20 text-success' :
                      contract.status === ProcessingStatus.PROCESSING ? 'bg-warning/20 text-warning' :
                      contract.status === ProcessingStatus.FAILED ? 'bg-error/20 text-error' :
                      'bg-secondary/20 text-secondary'
                    }`}
                  >
                    {getStatusIcon(contract.status)} {contract.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-secondary">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Uploaded: {formatDate(contract.created_at)}</span>
                  </div>
                  <div>
                    <span>Size: {formatFileSize(contract.file_size)}</span>
                  </div>
                  {contract.data && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span>Score: {contract.data.overall_confidence_score}/100</span>
                    </div>
                  )}
                </div>

                {contract.status === ProcessingStatus.FAILED && (
                  <div className="mt-3 p-3 bg-error/10 border border-error/20 rounded-xl text-error text-sm">
                    Processing failed. Please try uploading again.
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onContractSelect(contract);
                  }}
                  className="p-2 rounded-lg bg-tertiary border border-dark"
                  title="View Details"
                >
                  <Eye className="h-4 w-4 text-primary" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(contract.contract_id, contract.filename);
                  }}
                  className="p-2 rounded-lg bg-tertiary border border-dark"
                  title="Download"
                >
                  <Download className="h-4 w-4 text-primary" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(contract.contract_id, contract.filename);
                  }}
                  className="p-2 rounded-lg bg-tertiary border border-dark"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-error" />
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
            className={`px-4 py-2 rounded-lg font-medium ${
              page === 1 
                ? 'bg-tertiary text-muted cursor-not-allowed' 
                : 'bg-tertiary text-primary border border-dark'
            }`}
          >
            Previous
          </button>
          
          <span className="text-secondary px-4">
            Page {page} of {totalPages}
          </span>
          
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className={`px-4 py-2 rounded-lg font-medium ${
              page === totalPages 
                ? 'bg-tertiary text-muted cursor-not-allowed' 
                : 'bg-tertiary text-primary border border-dark'
            }`}
          >
            Next
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && contracts.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-secondary mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-primary mb-2">No contracts found</h3>
          <p className="text-secondary mb-6">
            {searchTerm || statusFilter 
              ? 'Try adjusting your search or filter criteria.'
              : 'Upload your first contract to get started.'
            }
          </p>
          {searchTerm || statusFilter ? (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
              }}
              className="btn-secondary"
            >
              Clear Filters
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default ContractList;
