# Contract Intelligence Platform

A modern, AI-powered contract analysis platform with sleek animations and glassmorphism design. Upload PDF contracts and automatically extract key information with confidence scoring.

## Features

### 🎨 Modern Frontend
- **Glassmorphism Design**: Beautiful frosted glass effects and modern UI
- **Smooth Animations**: Framer Motion powered animations throughout the app
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Real-time Updates**: Live status updates and progress tracking
- **Interactive Elements**: Hover effects, micro-interactions, and visual feedback

### 🤖 AI-Powered Analysis
- **Automatic Extraction**: Extract parties, financial details, payment terms
- **Confidence Scoring**: AI confidence scores for all extracted data
- **Gap Analysis**: Identify missing critical information
- **Smart Recommendations**: Actionable insights and improvements

### 📊 Dashboard & Analytics
- **Real-time Statistics**: Live contract processing metrics
- **Status Tracking**: Monitor processing status in real-time
- **Search & Filter**: Advanced search and filtering capabilities
- **Bulk Operations**: Download, delete, and manage contracts

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Framer Motion** for animations
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Router** for navigation
- **React Dropzone** for file uploads

### Backend
- **FastAPI** with Python
- **MongoDB** for data storage
- **Pydantic** for data validation
- **Uvicorn** for ASGI server

### Infrastructure
- **Docker** for containerization
- **Docker Compose** for orchestration
- **Nginx** for reverse proxy
- **MongoDB** for database

## Quick Start with Docker

### Production Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd contracts-intel
   ```

2. **Start the application**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Development Setup

1. **Start development environment**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Access development environment**
   - Frontend: http://localhost:3000 (with hot reloading)
   - Backend API: http://localhost:8000 (with auto-reload)

## Docker Commands

### Production
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up -d --build

# Clean up volumes
docker-compose down -v
```

### Development
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop development environment
docker-compose -f docker-compose.dev.yml down

# Rebuild development environment
docker-compose -f docker-compose.dev.yml up -d --build
```

### Individual Services
```bash
# Start only frontend
docker-compose up frontend

# Start only backend
docker-compose up backend

# Start only database
docker-compose up mongodb
```

## API Endpoints

### Contract Management
- `POST /api/contracts/upload` - Upload a contract
- `GET /api/contracts/` - List all contracts
- `GET /api/contracts/{contract_id}` - Get contract details
- `GET /api/contracts/{contract_id}/data` - Get extracted data
- `DELETE /api/contracts/{contract_id}` - Delete contract
- `GET /api/contracts/{contract_id}/download` - Download original file

### Statistics
- `GET /api/statistics/` - Get processing statistics

## Environment Variables

### Frontend
- `REACT_APP_API_URL` - Backend API URL (default: http://localhost:8000)
- `NODE_ENV` - Environment (development/production)

### Backend
- `MONGODB_URL` - MongoDB connection string
- `UPLOAD_DIR` - Upload directory path
- `MAX_FILE_SIZE` - Maximum file size in bytes

### Database
- `MONGO_INITDB_ROOT_USERNAME` - MongoDB root username
- `MONGO_INITDB_ROOT_PASSWORD` - MongoDB root password

## File Structure

```
contracts-intel/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── types/          # TypeScript type definitions
│   ├── Dockerfile          # Production Dockerfile
│   ├── Dockerfile.dev      # Development Dockerfile
│   └── nginx.conf          # Nginx configuration
├── backend/                 # FastAPI backend application
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Core configuration
│   │   ├── models/         # Data models
│   │   └── services/       # Business logic
│   └── Dockerfile          # Backend Dockerfile
├── docker-compose.yml      # Production Docker Compose
├── docker-compose.dev.yml  # Development Docker Compose
└── README.md              # This file
```

## Development

### Frontend Development
The frontend uses modern React patterns with:
- **Functional Components** with hooks
- **TypeScript** for type safety
- **Framer Motion** for animations
- **Tailwind CSS** for styling
- **Custom hooks** for reusable logic

### Backend Development
The backend uses FastAPI with:
- **Async/await** patterns
- **Pydantic models** for validation
- **MongoDB** with motor for async operations
- **Structured logging** and error handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.
