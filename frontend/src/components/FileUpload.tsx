import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { contractApi } from '../services/api';
import { ProcessingStatus } from '../types/contract';

interface FileUploadProps {
  onUploadSuccess: (contractId: string) => void;
  onUploadError: (error: string) => void;
}

/**
 * File upload component with drag-and-drop functionality for contract PDFs.
 * 
 * This component provides an intuitive interface for uploading contract files
 * with comprehensive validation, progress tracking, and error handling.
 * 
 * Features:
 * - Drag-and-drop file upload with visual feedback
 * - File type validation (PDF only)
 * - File size validation (50MB limit)
 * - Upload progress indication
 * - Success and error state management
 * - Integration with contract API service
 * 
 * The component uses react-dropzone for drag-and-drop functionality and
 * provides real-time feedback during the upload process.
 * 
 * @param onUploadSuccess - Callback function triggered when upload succeeds
 * @param onUploadError - Callback function triggered when upload fails
 */
const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess, onUploadError }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadStatus('error');
      setUploadMessage('Only PDF files are allowed');
      onUploadError('Only PDF files are allowed');
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      setUploadStatus('error');
      setUploadMessage('File size must be less than 50MB');
      onUploadError('File size must be less than 50MB');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');
    setUploadMessage('');

    try {
      const response = await contractApi.uploadContract(file);
      setUploadStatus('success');
      setUploadMessage('Contract uploaded successfully! Processing started.');
      onUploadSuccess(response.contract_id);
    } catch (error: any) {
      setUploadStatus('error');
      const errorMessage = error.response?.data?.detail || 'Upload failed. Please try again.';
      setUploadMessage(errorMessage);
      onUploadError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [onUploadSuccess, onUploadError]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: isUploading
  });

  const getDropzoneContent = () => {
    if (isUploading) {
      return (
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Uploading contract...</p>
        </div>
      );
    }

    if (uploadStatus === 'success') {
      return (
        <div className="text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <p className="text-green-600 font-medium">{uploadMessage}</p>
        </div>
      );
    }

    if (uploadStatus === 'error') {
      return (
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium">{uploadMessage}</p>
        </div>
      );
    }

    if (isDragReject) {
      return (
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium">Invalid file type. Only PDF files are allowed.</p>
        </div>
      );
    }

    if (isDragActive) {
      return (
        <div className="text-center">
          <Upload className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <p className="text-blue-600 font-medium">Drop the contract file here...</p>
        </div>
      );
    }

    return (
      <div className="text-center">
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 font-medium mb-2">
          Drag & drop a contract file here, or click to select
        </p>
        <p className="text-gray-500 text-sm">
          Only PDF files up to 50MB are supported
        </p>
      </div>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors
          ${isDragActive && !isDragReject ? 'border-blue-500 bg-blue-50' : ''}
          ${isDragReject ? 'border-red-500 bg-red-50' : ''}
          ${uploadStatus === 'success' ? 'border-green-500 bg-green-50' : ''}
          ${uploadStatus === 'error' ? 'border-red-500 bg-red-50' : ''}
          ${!isDragActive && uploadStatus === 'idle' ? 'border-gray-300 hover:border-gray-400' : ''}
          ${isUploading ? 'cursor-not-allowed opacity-75' : ''}
        `}
      >
        <input {...getInputProps()} />
        {getDropzoneContent()}
      </div>
      
      {uploadStatus === 'success' && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <p className="text-green-700">
              Your contract is being processed. You'll be notified when it's ready.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
