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

/**
 * Contract API service providing all contract-related API operations.
 * 
 * This service handles all communication with the backend API endpoints
 * for contract management, including upload, retrieval, status checking,
 * and deletion operations.
 */
export const contractApi = {
  /**
   * Upload a contract PDF file for processing and analysis.
   * 
   * This function handles the file upload process by creating a FormData
   * object and sending it to the backend upload endpoint. It supports
   * PDF files and provides progress tracking through the response.
   * 
   * @param file - The PDF file to be uploaded and processed
   * @returns Promise containing the upload response with contract ID and status
   * @throws Error if upload fails or file is invalid
   */
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

  /**
   * Retrieve the current processing status of a specific contract.
   * 
   * This function fetches real-time status information for contract processing,
   * including progress percentage, error messages, and processing timestamps.
   * Used for displaying progress indicators and handling processing states.
   * 
   * @param contractId - Unique identifier for the contract
   * @returns Promise containing the contract status information
   * @throws Error if contract not found or API call fails
   */
  getContractStatus: async (contractId: string): Promise<ContractStatus> => {
    const response = await api.get(`/contracts/${contractId}/status`);
    return response.data;
  },

  /**
   * Retrieve the complete parsed contract data and analysis results.
   * 
   * This function fetches the full contract analysis results including
   * extracted data, confidence scores, and gap analysis. Only available
   * for contracts that have completed processing successfully.
   * 
   * @param contractId - Unique identifier for the contract
   * @returns Promise containing the complete contract object with extracted data
   * @throws Error if contract not found, processing incomplete, or API call fails
   */
  getContractData: async (contractId: string): Promise<Contract> => {
    const response = await api.get(`/contracts/${contractId}`);
    return response.data;
  },

  /**
   * Retrieve a paginated list of contracts with optional filtering and search.
   * 
   * This function fetches a comprehensive view of all contracts in the system,
   * supporting pagination, status filtering, and text search capabilities.
   * Results are sorted by creation date (newest first).
   * 
   * @param page - Page number for pagination (default: 1)
   * @param pageSize - Number of contracts per page (default: 10)
   * @param status - Optional filter by processing status
   * @param search - Optional search term for filename matching
   * @returns Promise containing paginated list of contracts with metadata
   * @throws Error if API call fails or invalid parameters provided
   */
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

  /**
   * Download the original PDF contract file.
   * 
   * This function downloads the original contract file that was uploaded
   * for processing. It returns a Blob object that can be used to create
   * a download link or save the file locally.
   * 
   * @param contractId - Unique identifier for the contract to download
   * @returns Promise containing the file as a Blob object
   * @throws Error if contract not found, file not found, or API call fails
   */
  downloadContract: async (contractId: string): Promise<Blob> => {
    const response = await api.get(`/contracts/${contractId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Delete a contract and its associated file from the system.
   * 
   * This function removes both the contract record from the database
   * and the associated PDF file from storage. It ensures complete
   * cleanup and prevents orphaned files.
   * 
   * @param contractId - Unique identifier for the contract to delete
   * @returns Promise containing success message and deleted contract ID
   * @throws Error if contract not found or API call fails
   */
  deleteContract: async (contractId: string): Promise<{ message: string; contract_id: string }> => {
             const response = await api.delete(`/contracts/delete/${contractId}`);
             return response.data;
           },

  /**
   * Retrieve contract statistics for dashboard display.
   * 
   * This function fetches aggregated statistics about contracts in the system,
   * including total counts, processing status breakdowns, and success rates.
   * It's designed for dashboard displays and provides real-time metrics.
   * 
   * @returns Promise containing contract statistics with counts and percentages
   * @throws Error if API call fails
   */
  getStatistics: async (): Promise<{
    total_contracts: number;
    processing: number;
    completed: number;
    failed: number;
    success_rate: number;
  }> => {
    const response = await api.get('/contracts/statistics');
    return response.data;
  },
};

/**
 * Utility functions for data formatting and manipulation.
 */

/**
 * Format file size in bytes to human-readable format.
 * 
 * This function converts byte values to appropriate units (Bytes, KB, MB, GB)
 * with proper decimal formatting for better readability.
 * 
 * @param bytes - File size in bytes
 * @returns Formatted string with appropriate unit (e.g., "1.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format date string to localized readable format.
 * 
 * This function converts ISO date strings to a user-friendly format
 * using the browser's locale settings for consistent date display.
 * 
 * @param dateString - ISO date string to format
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
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
