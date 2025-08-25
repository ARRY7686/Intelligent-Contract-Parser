import React from 'react';
import { Brain } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="dark-card border-b border-dark sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div>
              <Brain className="h-8 w-8 text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-primary">Contract Intelligence</h1>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="/" className="text-secondary hover:text-primary relative group">
              Dashboard
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent group-hover:w-full"></span>
            </a>
            <a href="/docs" className="text-secondary hover:text-primary relative group">
              Documentation
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent group-hover:w-full"></span>
            </a>
            <a href="/api" className="text-secondary hover:text-primary relative group">
              API
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent group-hover:w-full"></span>
            </a>
          </nav>
          <button className="md:hidden p-2 rounded-lg bg-tertiary border border-dark">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
