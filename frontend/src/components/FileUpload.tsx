import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle, FileUp } from 'lucide-react';
import { contractApi } from '../services/api';

interface FileUploadProps {
  onUploadSuccess: (contractId: string) => void;
  onUploadError: (error: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess, onUploadError }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
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
    setUploadStatus('uploading');
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
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: isUploading
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          dark-card p-8 cursor-pointer
          ${isDragActive ? 'border-accent bg-tertiary' : ''}
          ${isDragReject ? 'border-error bg-tertiary' : ''}
          ${uploadStatus === 'uploading' ? 'pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />

        {uploadStatus === 'uploading' && (
          <div className="text-center">
            <div className="mb-4">
              <div className="spinner mx-auto"></div>
            </div>
            <div>
              <FileUp className="h-8 w-8 text-accent mx-auto mb-2" />
            </div>
            <p className="text-accent font-medium text-lg">Processing your contract...</p>
            <p className="text-secondary text-sm mt-2">This may take a few moments</p>
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="text-center">
            <div className="mb-4">
              <CheckCircle className="h-16 w-16 text-success mx-auto" />
            </div>
            <p className="text-success font-medium text-lg">{uploadMessage}</p>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="text-center">
            <div className="mb-4">
              <AlertCircle className="h-16 w-16 text-error mx-auto" />
            </div>
            <p className="text-error font-medium text-lg">{uploadMessage}</p>
          </div>
        )}

        {isDragReject && (
          <div className="text-center">
            <div className="mb-4">
              <AlertCircle className="h-16 w-16 text-error mx-auto" />
            </div>
            <p className="text-error font-medium text-lg">Invalid file type. Only PDF files are allowed.</p>
          </div>
        )}

        {isDragActive && uploadStatus !== 'uploading' && uploadStatus !== 'success' && uploadStatus !== 'error' && (
          <div className="text-center">
            <Upload className="h-16 w-16 text-accent mx-auto mb-4" />
            <p className="text-accent font-medium text-xl">Drop your contract here</p>
            <p className="text-secondary text-sm mt-2">Release to upload</p>
          </div>
        )}

        {!isDragActive && !isDragReject && uploadStatus !== 'uploading' && uploadStatus !== 'success' && uploadStatus !== 'error' && (
          <div className="text-center">
            <Upload className="h-16 w-16 text-secondary mx-auto mb-4" />
            <FileText className="h-8 w-8 text-secondary mx-auto mb-2" />
            <p className="text-primary font-medium text-xl mb-2">Upload your contract</p>
            <p className="text-secondary text-sm">Drag and drop a PDF file here, or click to browse</p>
            <p className="text-muted text-xs mt-4">Supported format: PDF</p>
          </div>
        )}
      </div>

      {uploadStatus === 'success' && (
        <div className="mt-6 dark-card p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-success mr-3" />
            <p className="text-success">
              Your contract is being processed. You'll be notified when it's ready.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
