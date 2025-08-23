import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, AlertTriangle, CheckCircle, XCircle, TrendingUp, Trash2 } from 'lucide-react';
import { contractApi, formatDate } from '../services/api';
import { Contract, ContractData, ProcessingStatus } from '../types/contract';

interface ContractDetailProps {
  contract: Contract;
  onBack: () => void;
}

const ContractDetail: React.FC<ContractDetailProps> = ({ contract, onBack }) => {
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contract.status === ProcessingStatus.COMPLETED && contract.data) {
      setContractData(contract.data);
    } else if (contract.status === ProcessingStatus.COMPLETED) {
      loadContractData();
    }
  }, [contract]);

  const loadContractData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await contractApi.getContractData(contract.contract_id);
      setContractData(data.data || null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load contract data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await contractApi.downloadContract(contract.contract_id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = contract.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert('Failed to download contract');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${contract.filename}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await contractApi.deleteContract(contract.contract_id);
      // Go back to the list after successful deletion
      onBack();
    } catch (err: any) {
      alert('Failed to delete contract');
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4" />;
    if (score >= 60) return <AlertTriangle className="h-4 w-4" />;
    return <XCircle className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadContractData}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (contract.status !== ProcessingStatus.COMPLETED) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">
          Contract processing is not complete. Current status: {contract.status}
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Back to List
        </button>
      </div>
    );
  }

  if (!contractData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No contract data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{contract.filename}</h1>
            <p className="text-gray-600">Uploaded on {formatDate(contract.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Original
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            title="Delete Contract"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Overall Score */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Overall Confidence Score</h2>
          <div className={`flex items-center gap-2 text-2xl font-bold ${getConfidenceColor(contractData.overall_confidence_score)}`}>
            {getConfidenceIcon(contractData.overall_confidence_score)}
            {contractData.overall_confidence_score}/100
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${contractData.overall_confidence_score}%` }}
          ></div>
        </div>
      </div>

      {/* Gap Analysis */}
      {contractData.gap_analysis && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Gap Analysis</h2>
          
          {contractData.gap_analysis.critical_gaps.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-medium text-red-700 mb-2 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Critical Gaps
              </h3>
              <ul className="space-y-1">
                {contractData.gap_analysis.critical_gaps.map((gap, index) => (
                  <li key={index} className="text-red-600 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    {gap}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {contractData.gap_analysis.missing_fields.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-medium text-yellow-700 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Missing Fields
              </h3>
              <ul className="space-y-1">
                {contractData.gap_analysis.missing_fields.map((field, index) => (
                  <li key={index} className="text-yellow-600 flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    {field}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {contractData.gap_analysis.recommendations.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-blue-700 mb-2 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recommendations
              </h3>
              <ul className="space-y-1">
                {contractData.gap_analysis.recommendations.map((rec, index) => (
                  <li key={index} className="text-blue-600 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Extracted Data Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Parties */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Parties</h2>
          {contractData.parties.length > 0 ? (
            <div className="space-y-4">
              {contractData.parties.map((party, index) => (
                <div key={index} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{party.name}</h3>
                    <span className="text-sm text-gray-500 capitalize">{party.type}</span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    {party.contact_person && <p>Contact: {party.contact_person}</p>}
                    {party.email && <p>Email: {party.email}</p>}
                    {party.phone && <p>Phone: {party.phone}</p>}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gray-500">Confidence:</span>
                    <span className={`text-xs font-medium ${getConfidenceColor(party.confidence_score * 100)}`}>
                      {Math.round(party.confidence_score * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No party information extracted</p>
          )}
        </div>

        {/* Financial Details */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Details</h2>
          <div className="space-y-4">
            {contractData.financial_details.total_contract_value && (
              <div>
                <p className="text-sm text-gray-600">Total Contract Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {contractData.financial_details.currency || '$'}
                  {contractData.financial_details.total_contract_value.toLocaleString()}
                </p>
              </div>
            )}
            
            {contractData.financial_details.line_items.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Line Items</p>
                <div className="space-y-2">
                  {contractData.financial_details.line_items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">{item.description}</span>
                      <span className="font-medium">
                        {item.currency || '$'}{item.unit_price?.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Confidence:</span>
              <span className={`text-xs font-medium ${getConfidenceColor(contractData.financial_details.confidence_score * 100)}`}>
                {Math.round(contractData.financial_details.confidence_score * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Payment Terms */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Terms</h2>
          <div className="space-y-3">
            {contractData.payment_terms.payment_terms && (
              <div>
                <p className="text-sm text-gray-600">Payment Terms</p>
                <p className="font-medium text-gray-900">{contractData.payment_terms.payment_terms}</p>
              </div>
            )}
            {contractData.payment_terms.payment_method && (
              <div>
                <p className="text-sm text-gray-600">Payment Method</p>
                <p className="font-medium text-gray-900">{contractData.payment_terms.payment_method}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Confidence:</span>
              <span className={`text-xs font-medium ${getConfidenceColor(contractData.payment_terms.confidence_score * 100)}`}>
                {Math.round(contractData.payment_terms.confidence_score * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Revenue Classification */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue Classification</h2>
          <div className="space-y-3">
            {contractData.revenue_classification.payment_type && (
              <div>
                <p className="text-sm text-gray-600">Payment Type</p>
                <p className="font-medium text-gray-900 capitalize">{contractData.revenue_classification.payment_type}</p>
              </div>
            )}
            {contractData.revenue_classification.billing_cycle && (
              <div>
                <p className="text-sm text-gray-600">Billing Cycle</p>
                <p className="font-medium text-gray-900 capitalize">{contractData.revenue_classification.billing_cycle}</p>
              </div>
            )}
            {contractData.revenue_classification.auto_renewal !== undefined && (
              <div>
                <p className="text-sm text-gray-600">Auto Renewal</p>
                <p className="font-medium text-gray-900">
                  {contractData.revenue_classification.auto_renewal ? 'Yes' : 'No'}
                </p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Confidence:</span>
              <span className={`text-xs font-medium ${getConfidenceColor(contractData.revenue_classification.confidence_score * 100)}`}>
                {Math.round(contractData.revenue_classification.confidence_score * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractDetail;
