import React from 'react';
import ContractDetail from '../components/ContractDetail';
import { Contract } from '../types/contract';

interface ContractDetailPageProps {
  contract: Contract;
  onBack: () => void;
}

const ContractDetailPage: React.FC<ContractDetailPageProps> = ({ contract, onBack }) => {
  return (
    <div className="max-w-7xl mx-auto">
      <ContractDetail contract={contract} onBack={onBack} />
    </div>
  );
};

export default ContractDetailPage;
