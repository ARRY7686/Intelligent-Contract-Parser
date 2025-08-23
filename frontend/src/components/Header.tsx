import React from 'react';
import { FileText, Brain } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Brain className="h-8 w-8 text-blue-600" />
              <FileText className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Contract Intelligence</h1>
              <p className="text-sm text-gray-600">Automated Contract Analysis</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <a 
              href="/" 
              className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
            >
              Dashboard
            </a>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Documentation
            </a>
            <a 
              href="mailto:support@contractintel.com" 
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Support
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
