import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, AlertTriangle, CheckCircle, XCircle, TrendingUp, Trash2 } from 'lucide-react';
import { contractApi, formatDate } from '../services/api';
import { Contract, ContractData, ProcessingStatus } from '../types/contract';

interface ContractDetailProps {
  contract: Contract;
  onBack: () => void;
}

/**
 * Contract detail component that displays comprehensive analysis results.
 */
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
      onBack();
    } catch (err: any) {
      alert('Failed to delete contract');
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-error';
  };

  const getConfidenceIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4" />;
    if (score >= 60) return <AlertTriangle className="h-4 w-4" />;
    return <XCircle className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-error mb-4">{error}</p>
        <button onClick={loadContractData} className="btn-primary">
          Retry
        </button>
      </div>
    );
  }

  if (contract.status !== ProcessingStatus.COMPLETED) {
    return (
      <div className="text-center py-8">
        <p className="text-secondary mb-4">
          Contract processing is not complete. Current status: {contract.status}
        </p>
        <button onClick={onBack} className="btn-secondary">
          Back to List
        </button>
      </div>
    );
  }

  if (!contractData) {
    return (
      <div className="text-center py-8">
        <p className="text-secondary">No contract data available</p>
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
            className="p-2 rounded-lg bg-tertiary border border-dark hover:border-light"
          >
            <ArrowLeft className="h-5 w-5 text-primary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-primary">{contract.filename}</h1>
            <p className="text-secondary">Uploaded on {formatDate(contract.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleDownload} className="btn-primary flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download Original
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center gap-2"
            title="Delete Contract"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Overall Score */}
      <div className="dark-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-primary">Overall Confidence Score</h2>
          <div className={`flex items-center gap-2 text-2xl font-bold ${getConfidenceColor(contractData.overall_confidence_score)}`}>
            {getConfidenceIcon(contractData.overall_confidence_score)}
            {contractData.overall_confidence_score}/100
          </div>
        </div>
        <div className="w-full bg-tertiary rounded-full h-3 overflow-hidden border border-dark">
          <div
            className="bg-accent h-3 rounded-full"
            style={{ width: `${contractData.overall_confidence_score}%` }}
          />
        </div>
      </div>

      {/* Gap Analysis */}
      {contractData.gap_analysis && (
        <div className="dark-card p-6">
          <h2 className="text-xl font-semibold text-primary mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            Gap Analysis
          </h2>

          {contractData.gap_analysis.critical_gaps.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-medium text-error mb-2 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Critical Gaps
              </h3>
              <ul className="space-y-2">
                {contractData.gap_analysis.critical_gaps.map((gap, index) => (
                  <li key={index} className="text-error flex items-center gap-2">
                    <span className="w-2 h-2 bg-error rounded-full"></span>
                    {gap}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {contractData.gap_analysis.missing_fields.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-medium text-warning mb-2 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Missing Fields
              </h3>
              <ul className="space-y-2">
                {contractData.gap_analysis.missing_fields.map((field, index) => (
                  <li key={index} className="text-warning flex items-center gap-2">
                    <span className="w-2 h-2 bg-warning rounded-full"></span>
                    {field}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {contractData.gap_analysis.recommendations.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-accent mb-2 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recommendations
              </h3>
              <ul className="space-y-2">
                {contractData.gap_analysis.recommendations.map((rec, index) => (
                  <li key={index} className="text-accent flex items-center gap-2">
                    <span className="w-2 h-2 bg-accent rounded-full"></span>
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
        <div className="dark-card p-6">
          <h2 className="text-xl font-semibold text-primary mb-4">Parties</h2>
          {contractData.parties.length > 0 ? (
            <div className="space-y-4">
              {contractData.parties.map((party, index) => (
                <div key={index} className="border border-dark rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-primary">{party.name}</h3>
                    <span className="text-sm text-secondary capitalize">{party.type}</span>
                  </div>
                  <div className="text-sm text-secondary space-y-1">
                    {party.contact_person && <p>Contact: {party.contact_person}</p>}
                    {party.email && <p>Email: {party.email}</p>}
                    {party.phone && <p>Phone: {party.phone}</p>}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-muted">Confidence:</span>
                    <span className={`text-xs font-medium ${getConfidenceColor(party.confidence_score * 100)}`}>
                      {Math.round(party.confidence_score * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">No party information extracted</p>
          )}
        </div>

        {/* Financial Details */}
        <div className="dark-card p-6">
          <h2 className="text-xl font-semibold text-primary mb-4">Financial Details</h2>
          <div className="space-y-4">
            {contractData.financial_details.total_contract_value && (
              <div>
                <p className="text-sm text-secondary">Total Contract Value</p>
                <p className="text-2xl font-bold text-primary">
                  {contractData.financial_details.currency || '$'}
                  {contractData.financial_details.total_contract_value.toLocaleString()}
                </p>
              </div>
            )}
            
            {contractData.financial_details.line_items.length > 0 && (
              <div>
                <p className="text-sm text-secondary mb-2">Line Items</p>
                <div className="space-y-2">
                  {contractData.financial_details.line_items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-sm p-2 rounded-lg">
                      <span className="text-primary">{item.description}</span>
                      <span className="font-medium">
                        {item.currency || '$'}{item.unit_price?.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Confidence:</span>
              <span className={`text-xs font-medium ${getConfidenceColor(contractData.financial_details.confidence_score * 100)}`}>
                {Math.round(contractData.financial_details.confidence_score * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Payment Terms */}
        <div className="dark-card p-6">
          <h2 className="text-xl font-semibold text-primary mb-4">Payment Terms</h2>
          <div className="space-y-3">
            {contractData.payment_terms.payment_terms && (
              <div>
                <p className="text-sm text-secondary">Payment Terms</p>
                <p className="font-medium text-primary">{contractData.payment_terms.payment_terms}</p>
              </div>
            )}
            {contractData.payment_terms.payment_method && (
              <div>
                <p className="text-sm text-secondary">Payment Method</p>
                <p className="font-medium text-primary">{contractData.payment_terms.payment_method}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Confidence:</span>
              <span className={`text-xs font-medium ${getConfidenceColor(contractData.payment_terms.confidence_score * 100)}`}>
                {Math.round(contractData.payment_terms.confidence_score * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Revenue Classification */}
        <div className="dark-card p-6">
          <h2 className="text-xl font-semibold text-primary mb-4">Revenue Classification</h2>
          <div className="space-y-3">
            {contractData.revenue_classification.payment_type && (
              <div>
                <p className="text-sm text-secondary">Payment Type</p>
                <p className="font-medium text-primary capitalize">{contractData.revenue_classification.payment_type}</p>
              </div>
            )}
            {contractData.revenue_classification.billing_cycle && (
              <div>
                <p className="text-sm text-secondary">Billing Cycle</p>
                <p className="font-medium text-primary capitalize">{contractData.revenue_classification.billing_cycle}</p>
              </div>
            )}
            {contractData.revenue_classification.auto_renewal !== undefined && (
              <div>
                <p className="text-sm text-secondary">Auto Renewal</p>
                <p className="font-medium text-primary">{contractData.revenue_classification.auto_renewal ? 'Yes' : 'No'}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Confidence:</span>
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
