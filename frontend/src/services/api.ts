import axios from 'axios';
import {
  Contract,
  ContractStatus,
  ContractUploadResponse,
  ContractListResponse,
  ProcessingStatus
} from '../types/contract';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Contract API functions
export const contractApi = {
  // Upload contract
  uploadContract: async (file: File): Promise<ContractUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/contracts/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  // Get contract status
  getContractStatus: async (contractId: string): Promise<ContractStatus> => {
    const response = await api.get(`/contracts/${contractId}/status`);
    return response.data;
  },

  // Get contract data
  getContractData: async (contractId: string): Promise<Contract> => {
    const response = await api.get(`/contracts/${contractId}`);
    return response.data;
  },

  // List contracts
  listContracts: async (
    page: number = 1,
    pageSize: number = 10,
    status?: ProcessingStatus,
    search?: string
  ): Promise<ContractListResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    
    if (status) {
      params.append('status', status);
    }
    
    if (search) {
      params.append('search', search);
    }
    
    const response = await api.get(`/contracts?${params.toString()}`);
    return response.data;
  },

  // Download contract
  downloadContract: async (contractId: string): Promise<Blob> => {
    const response = await api.get(`/contracts/${contractId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

                         // Delete contract
           deleteContract: async (contractId: string): Promise<{ message: string; contract_id: string }> => {
             const response = await api.delete(`/contracts/delete/${contractId}`);
             return response.data;
           },
};

// Utility functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getStatusColor = (status: ProcessingStatus): string => {
  switch (status) {
    case ProcessingStatus.PENDING:
      return 'bg-yellow-100 text-yellow-800';
    case ProcessingStatus.PROCESSING:
      return 'bg-blue-100 text-blue-800';
    case ProcessingStatus.COMPLETED:
      return 'bg-green-100 text-green-800';
    case ProcessingStatus.FAILED:
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getStatusIcon = (status: ProcessingStatus): string => {
  switch (status) {
    case ProcessingStatus.PENDING:
      return '⏳';
    case ProcessingStatus.PROCESSING:
      return '🔄';
    case ProcessingStatus.COMPLETED:
      return '✅';
    case ProcessingStatus.FAILED:
      return '❌';
    default:
      return '❓';
  }
};

export default api;
