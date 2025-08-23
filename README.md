# Contract Intelligence Parser

A comprehensive contract intelligence system for automated contract analysis and data extraction, specifically designed for accounts receivable SaaS platforms.

## Features

- **Intelligent Contract Type Detection**: Automatically identifies NDA, Employment, and Service contracts
- **Automated Contract Processing**: Upload PDF contracts and extract critical financial and operational data
- **Real-time Status Tracking**: Monitor processing progress with detailed status updates
- **Smart Data Extraction**: Extract party information, financial details, payment terms, and SLAs based on contract type
- **Confidence Scoring**: Weighted scoring system to assess data completeness and quality
- **Gap Analysis**: Identify missing critical fields with contract-type-specific recommendations
- **Modern Web Interface**: React-based frontend with drag-and-drop upload and data visualization
- **Contract Management**: View, download, and delete contracts with full CRUD operations

## Contract Type Support

### NDA (Non-Disclosure Agreement) Contracts
- **Party Identification**: Disclosing party and receiving party detection
- **Financial Handling**: Correctly identifies that NDAs typically have no financial terms (100% confidence)
- **Payment Terms**: Properly handles absence of payment terms in NDAs
- **Gap Analysis**: Checks for NDA-specific elements like confidentiality periods and obligations

### Employment Contracts
- **Party Identification**: Employer and employee detection
- **Financial Details**: Salary, compensation, and benefits extraction
- **Payment Terms**: Employment-specific payment schedules
- **Duration**: Contract term and employment period detection

### Service Contracts
- **Party Identification**: Customer, vendor, and service provider detection
- **Financial Details**: Contract values, line items, and pricing
- **SLA Extraction**: Performance metrics, uptime guarantees, response times
- **Payment Terms**: Net terms, payment schedules, and methods

## System Architecture

- **Backend**: Python FastAPI with async processing and background tasks
- **Database**: MongoDB for document storage and contract metadata
- **Frontend**: React with TypeScript and Tailwind CSS
- **File Processing**: PyPDF2 with enhanced text extraction and pattern matching
- **Deployment**: Docker containers with docker-compose orchestration
- **Reverse Proxy**: Nginx for static file serving and load balancing

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)

### Running with Docker

1. Clone the repository:
```bash
git clone <repository-url>
cd contracts-intel
```

2. Start the application:
```bash
docker compose up --build
```

3. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Local Development

1. Install backend dependencies:
```bash
cd backend
pip install -r requirements.txt
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Start MongoDB (using Docker):
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

4. Start the backend:
```bash
cd backend
uvicorn main:app --reload
```

5. Start the frontend:
```bash
cd frontend
npm run dev
```

## API Endpoints

### Contract Management
- `POST /api/v1/contracts/upload` - Upload contract file
- `GET /api/v1/contracts/{contract_id}/status` - Get processing status
- `GET /api/v1/contracts/{contract_id}` - Get parsed contract data
- `GET /api/v1/contracts` - List all contracts with filtering and pagination
- `GET /api/v1/contracts/{contract_id}/download` - Download original file
- `DELETE /api/v1/contracts/delete/{contract_id}` - Delete contract and associated file

### Query Parameters for Contract Listing
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 10, max: 100)
- `status`: Filter by processing status (pending, processing, completed, failed)
- `search`: Search contracts by filename

## Data Extraction Fields

### 1. Party Identification
- **NDA Contracts**: Disclosing party, receiving party
- **Employment Contracts**: Employer, employee
- **Service Contracts**: Customer, vendor, third parties
- **General**: Legal entity names, authorized signatories

### 2. Account Information
- Account numbers and references
- Billing contact information
- Contract IDs and identifiers

### 3. Financial Details
- **Service Contracts**: Line items, total contract value, currency
- **Employment Contracts**: Salary, compensation, benefits
- **NDA Contracts**: Correctly identified as having no financial terms

### 4. Payment Structure
- **Service Contracts**: Payment terms (Net 30, Net 60, etc.), payment methods
- **Employment Contracts**: Payment schedules, salary payment terms
- **NDA Contracts**: Correctly identified as having no payment terms

### 5. Revenue Classification
- Contract type detection (NDA, Employment, Service)
- Billing cycles (one-time, monthly, quarterly, annually)
- Auto-renewal terms and contract duration

### 6. Service Level Agreements (SLA)
- Performance metrics and benchmarks
- Uptime guarantees and availability targets
- Response time commitments
- Support hours and maintenance terms
- Penalty clauses and service credits
- Escalation procedures and remedies

## Scoring Algorithm

The system uses a weighted scoring system (0-100 points) that adapts based on contract type:

### Standard Contracts
- Financial completeness: 30 points
- Party identification: 25 points
- Payment terms clarity: 20 points
- SLA definition: 15 points
- Contact information: 10 points

### NDA Contracts
- Party identification: 40 points
- NDA-specific elements: 30 points
- Contact information: 20 points
- Contract structure: 10 points

## Gap Analysis

### NDA-Specific Analysis
- Checks for disclosing and receiving party identification
- Validates confidentiality period definitions
- Ensures confidential information is properly defined
- Verifies non-disclosure obligations are stated

### Service Contract Analysis
- Validates financial terms and payment structures
- Checks for SLA performance metrics
- Ensures support and maintenance terms are defined
- Verifies penalty clauses and remedies

## Technical Specifications

- **Performance**: Handles contracts up to 50MB
- **Scalability**: Supports concurrent processing of multiple contracts
- **Reliability**: Implements proper error handling and retry mechanisms
- **Security**: Secure file handling and data storage
- **Code Coverage**: Unit tests with comprehensive coverage
- **File Support**: PDF documents with enhanced text extraction
- **Processing**: Asynchronous background processing with status tracking

## Project Structure

```
contracts-intel/
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes and endpoints
│   │   ├── core/           # Configuration and database setup
│   │   ├── models/         # Pydantic data models
│   │   ├── services/       # Business logic and contract processing
│   │   └── utils/          # Helper functions
│   ├── tests/              # Unit tests and test coverage
│   ├── uploads/            # Contract file storage
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile          # Backend container configuration
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components (ContractList, ContractDetail, etc.)
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services and utilities
│   │   └── types/          # TypeScript type definitions
│   ├── public/             # Static assets
│   ├── package.json        # Node.js dependencies
│   ├── tailwind.config.js  # Tailwind CSS configuration
│   └── Dockerfile          # Frontend container configuration
├── logs/                   # Application logs
├── docker-compose.yml      # Multi-container orchestration
├── setup.sh               # Development environment setup script
└── README.md              # This file
```

## Key Improvements

### Enhanced Contract Processing
- **Contract Type Detection**: Automatic identification of NDA, Employment, and Service contracts
- **Context-Aware Extraction**: Different extraction strategies based on contract type
- **Improved Text Processing**: Better handling of PDF text extraction quirks
- **Validation**: Meaningful line item validation to prevent false positives

### Better User Experience
- **Real-time Status Updates**: Progress tracking during contract processing
- **Responsive Design**: Modern, mobile-friendly interface
- **Error Handling**: Comprehensive error messages and recovery
- **Data Visualization**: Clear presentation of extracted data with confidence scores

### Robust API Design
- **RESTful Endpoints**: Standard HTTP methods and status codes
- **Pagination**: Efficient handling of large contract lists
- **Filtering**: Search and status-based filtering
- **File Management**: Secure file upload, download, and deletion

## Testing

Run the test suite:
```bash
cd backend
pytest --cov=app tests/
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure code coverage is maintained
6. Submit a pull request

## License

MIT License
