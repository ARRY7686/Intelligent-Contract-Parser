from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Query
from fastapi.responses import FileResponse
from typing import List, Optional
import uuid
import os
import aiofiles
import logging
from datetime import datetime

from ..models.contract import (
    Contract, ContractStatus, ContractUploadResponse, 
    ContractListResponse, ProcessingStatus
)
from ..services.contract_processor import ContractProcessor
from ..core.database import get_collection
from ..core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/upload", response_model=ContractUploadResponse)
async def upload_contract(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Upload a contract PDF file for processing and analysis.
    
    This endpoint handles contract file uploads and initiates the processing pipeline.
    It performs validation, saves the file, creates a database record, and starts
    background processing using the ContractProcessor.
    
    Processing Steps:
    1. File Validation: Ensures the file is a PDF and within size limits
    2. File Storage: Saves the PDF to the uploads directory with a unique ID
    3. Database Record: Creates a contract record with pending status
    4. Background Processing: Starts async contract analysis in the background
    
    File Requirements:
    - File type: PDF only
    - File size: Must be within configured maximum size limit
    - File content: Must be a valid PDF document
    
    Error Handling:
    - Invalid file type: Returns 400 Bad Request
    - File too large: Returns 400 Bad Request with size limit
    - File save error: Returns 500 Internal Server Error
    - Database error: Returns 500 Internal Server Error (cleans up saved file)
    
    Args:
        background_tasks (BackgroundTasks): FastAPI background tasks for async processing
        file (UploadFile): The PDF file to be uploaded and processed
        
    Returns:
        ContractUploadResponse: Contains contract ID, success message, and initial status
        
    Raises:
        HTTPException: For validation errors, file save errors, or database errors
    """
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Validate file size
    if file.size and file.size > settings.max_file_size:
        raise HTTPException(
            status_code=400, 
            detail=f"File size exceeds maximum limit of {settings.max_file_size} bytes"
        )
    
    # Generate contract ID
    contract_id = str(uuid.uuid4())
    
    # Save file
    file_path = os.path.join(settings.upload_dir, f"{contract_id}.pdf")
    
    try:
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
    except Exception as e:
        logger.error(f"Error saving file: {str(e)}")
        raise HTTPException(status_code=500, detail="Error saving file")
    
    # Create contract record in database
    contract_data = {
        "contract_id": contract_id,
        "filename": file.filename,
        "file_size": file.size or 0,
        "status": ProcessingStatus.PENDING,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "progress_percentage": 0
    }
    
    try:
        collection = get_collection("contracts")
        await collection.insert_one(contract_data)
    except Exception as e:
        logger.error(f"Error saving contract to database: {str(e)}")
        # Clean up file if database save fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail="Error saving contract record")
    
    # Start background processing
    background_tasks.add_task(process_contract_background, contract_id, file_path)
    
    return ContractUploadResponse(
        contract_id=contract_id,
        message="Contract uploaded successfully. Processing started.",
        status=ProcessingStatus.PENDING
    )


@router.get("/", response_model=ContractListResponse)
async def list_contracts(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: Optional[ProcessingStatus] = None,
    search: Optional[str] = None
):
    """
    Retrieve a paginated list of contracts with optional filtering and search.
    
    This endpoint provides a comprehensive view of all contracts in the system,
    supporting pagination, status filtering, and text search capabilities.
    
    Features:
    - Pagination: Supports page-based navigation with configurable page sizes
    - Status Filtering: Filter contracts by processing status (pending, processing, completed, failed)
    - Text Search: Search contracts by filename using case-insensitive matching
    - Sorting: Results are sorted by creation date (newest first)
    
    Query Parameters:
    - page: Page number (minimum 1, default 1)
    - page_size: Number of contracts per page (1-100, default 10)
    - status: Filter by processing status (optional)
    - search: Search term for filename matching (optional)
    
    Response Data:
    - contracts: List of contract objects with metadata and extracted data
    - total: Total number of contracts matching the filter criteria
    - page: Current page number
    - page_size: Number of contracts per page
    - total_pages: Total number of pages available
    
    Error Handling:
    - Database errors: Returns 500 Internal Server Error
    - Invalid data: Skips problematic contracts and continues processing
    
    Args:
        page (int): Page number for pagination
        page_size (int): Number of contracts per page
        status (ProcessingStatus, optional): Filter by processing status
        search (str, optional): Search term for filename filtering
        
    Returns:
        ContractListResponse: Paginated list of contracts with metadata
        
    Raises:
        HTTPException: For database errors or invalid query parameters
    """
    
    try:
        collection = get_collection("contracts")
        
        # Build filter
        filter_query = {}
        if status:
            filter_query["status"] = status
        if search:
            filter_query["filename"] = {"$regex": search, "$options": "i"}
        
        # Get total count
        total = await collection.count_documents(filter_query)
        
        # Calculate pagination
        skip = (page - 1) * page_size
        total_pages = (total + page_size - 1) // page_size
        
        # Get contracts
        cursor = collection.find(filter_query).sort("created_at", -1).skip(skip).limit(page_size)
        contracts_data = await cursor.to_list(length=page_size)
        
        contracts = []
        for contract_data in contracts_data:
            try:
                # Handle potential data format issues
                data = contract_data.get("data")
                if data and isinstance(data, dict):
                    # Fix contract_duration if it's an integer
                    if "revenue_classification" in data and data["revenue_classification"]:
                        revenue = data["revenue_classification"]
                        if "contract_duration" in revenue and isinstance(revenue["contract_duration"], int):
                            revenue["contract_duration"] = str(revenue["contract_duration"])
                
                contract = Contract(
                    contract_id=contract_data["contract_id"],
                    filename=contract_data["filename"],
                    file_size=contract_data["file_size"],
                    status=contract_data["status"],
                    data=data,
                    created_at=contract_data["created_at"],
                    updated_at=contract_data["updated_at"],
                    processing_started_at=contract_data.get("processing_started_at"),
                    processing_completed_at=contract_data.get("processing_completed_at")
                )
                contracts.append(contract)
            except Exception as contract_error:
                logger.error(f"Error creating contract object: {str(contract_error)}")
                # Skip this contract and continue with others
                continue
        
        return ContractListResponse(
            contracts=contracts,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    
    except Exception as e:
        logger.error(f"Error listing contracts: {str(e)}")
        raise HTTPException(status_code=500, detail="Error listing contracts")


@router.get("/{contract_id}/status", response_model=ContractStatus)
async def get_contract_status(contract_id: str):
    """
    Retrieve the current processing status of a specific contract.
    
    This endpoint provides real-time status information for contract processing,
    allowing the frontend to display progress indicators and handle processing states.
    
    Status Information:
    - Current status: pending, processing, completed, or failed
    - Progress percentage: Numerical indicator (0-100) of processing completion
    - Error messages: Detailed error information if processing failed
    - Timestamps: Creation, update, start, and completion times
    
    Use Cases:
    - Progress tracking: Display real-time processing progress to users
    - Error handling: Show error messages when processing fails
    - Status polling: Frontend can poll this endpoint to update UI
    - Processing completion: Determine when to fetch final contract data
    
    Response Data:
    - contract_id: Unique identifier for the contract
    - status: Current processing status
    - progress_percentage: Processing completion percentage
    - error_message: Error details if processing failed
    - timestamps: Various processing timestamps
    
    Error Handling:
    - Contract not found: Returns 404 Not Found
    - Database errors: Returns 500 Internal Server Error
    
    Args:
        contract_id (str): Unique identifier for the contract
        
    Returns:
        ContractStatus: Current status and progress information for the contract
        
    Raises:
        HTTPException: For contract not found or database errors
    """
    
    try:
        collection = get_collection("contracts")
        contract = await collection.find_one({"contract_id": contract_id})
        
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
        
        return ContractStatus(
            contract_id=contract["contract_id"],
            status=contract["status"],
            progress_percentage=contract.get("progress_percentage", 0),
            error_message=contract.get("error_message"),
            created_at=contract["created_at"],
            updated_at=contract["updated_at"],
            processing_started_at=contract.get("processing_started_at"),
            processing_completed_at=contract.get("processing_completed_at")
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving contract status: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving contract status")


@router.get("/{contract_id}/download")
async def download_contract(contract_id: str):
    """
    Download the original PDF contract file.
    
    This endpoint allows users to download the original contract file that was uploaded
    for processing. It provides secure file access with proper error handling.
    
    File Access:
    - Validates contract exists in database
    - Checks if file exists in storage
    - Returns file with original filename and PDF content type
    - Provides secure file streaming response
    
    Security Features:
    - Contract ID validation: Ensures only valid contracts can be downloaded
    - File existence check: Prevents access to non-existent files
    - Original filename preservation: Maintains user-friendly file names
    
    Response:
    - File stream: Direct file download with PDF content type
    - Filename: Original uploaded filename
    - Content-Type: application/pdf
    
    Error Handling:
    - Contract not found: Returns 404 Not Found
    - File not found: Returns 404 Not Found (file deleted but record exists)
    - Database errors: Returns 500 Internal Server Error
    
    Args:
        contract_id (str): Unique identifier for the contract to download
        
    Returns:
        FileResponse: Streaming file response with PDF content
        
    Raises:
        HTTPException: For contract not found, file not found, or database errors
    """
    
    try:
        collection = get_collection("contracts")
        contract = await collection.find_one({"contract_id": contract_id})
        
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
        
        file_path = os.path.join(settings.upload_dir, f"{contract_id}.pdf")
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Contract file not found")
        
        return FileResponse(
            path=file_path,
            filename=contract["filename"],
            media_type="application/pdf"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading contract: {str(e)}")
        raise HTTPException(status_code=500, detail="Error downloading contract")


@router.get("/{contract_id}", response_model=Contract)
async def get_contract_data(contract_id: str):
    """
    Retrieve the complete parsed contract data and analysis results.
    
    This endpoint provides access to the full contract analysis results including
    extracted data, confidence scores, and gap analysis. It's only available for
    contracts that have completed processing successfully.
    
    Extracted Data Includes:
    - Party Information: Disclosing/receiving parties, employers/employees, customers/vendors
    - Financial Details: Contract values, line items, salaries, compensation
    - Payment Terms: Payment schedules, methods, terms
    - Revenue Classification: Contract type, billing cycles, auto-renewal
    - SLA Information: Performance metrics, support terms, penalty clauses
    - Gap Analysis: Missing fields, critical gaps, recommendations
    
    Data Quality:
    - Confidence Scores: Individual confidence scores for each data category
    - Overall Score: Weighted confidence score (0-100) for entire contract
    - Gap Analysis: Identified missing information and improvement recommendations
    
    Access Control:
    - Only available for completed contracts
    - Returns error for pending, processing, or failed contracts
    - Ensures data quality by requiring successful processing
    
    Response Data:
    - Contract metadata: ID, filename, size, timestamps
    - Processing status: Current status and completion information
    - Extracted data: Complete structured data from contract analysis
    - Confidence scores: Quality indicators for extracted data
    - Gap analysis: Missing information and recommendations
    
    Error Handling:
    - Contract not found: Returns 404 Not Found
    - Processing incomplete: Returns 400 Bad Request with current status
    - Database errors: Returns 500 Internal Server Error
    
    Args:
        contract_id (str): Unique identifier for the contract
        
    Returns:
        Contract: Complete contract object with extracted data and analysis
        
    Raises:
        HTTPException: For contract not found, incomplete processing, or database errors
    """
    
    try:
        collection = get_collection("contracts")
        contract = await collection.find_one({"contract_id": contract_id})
        
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
        
        if contract["status"] != ProcessingStatus.COMPLETED:
            raise HTTPException(
                status_code=400, 
                detail=f"Contract processing is not complete. Current status: {contract['status']}"
            )
        
        return Contract(
            contract_id=contract["contract_id"],
            filename=contract["filename"],
            file_size=contract["file_size"],
            status=contract["status"],
            data=contract.get("data"),
            created_at=contract["created_at"],
            updated_at=contract["updated_at"],
            processing_started_at=contract.get("processing_started_at"),
            processing_completed_at=contract.get("processing_completed_at")
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving contract data: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving contract data")


@router.delete("/delete/{contract_id}")
async def delete_contract(contract_id: str):
    """
    Delete a contract and its associated file from the system.
    
    This endpoint provides complete contract removal functionality, deleting both
    the database record and the associated PDF file. It ensures data cleanup
    and prevents orphaned files.
    
    Deletion Process:
    1. Database Record: Removes the contract record from MongoDB
    2. File Cleanup: Deletes the associated PDF file from storage
    3. Error Handling: Continues with database deletion even if file deletion fails
    4. Validation: Ensures contract exists before attempting deletion
    
    Security Features:
    - Contract ID validation: Ensures only valid contracts can be deleted
    - File existence check: Handles cases where file was already deleted
    - Graceful degradation: Continues deletion even if file operations fail
    
    Cleanup Operations:
    - Database cleanup: Removes contract metadata and extracted data
    - File system cleanup: Removes PDF file from uploads directory
    - Logging: Records successful deletions and any errors
    
    Response:
    - Success message: Confirms deletion with contract ID
    - Contract ID: Returns the ID of the deleted contract
    
    Error Handling:
    - Contract not found: Returns 404 Not Found
    - File deletion errors: Logs error but continues with database deletion
    - Database errors: Returns 500 Internal Server Error
    
    Args:
        contract_id (str): Unique identifier for the contract to delete
        
    Returns:
        dict: Success message and deleted contract ID
        
    Raises:
        HTTPException: For contract not found or database errors
    """
    
    try:
        collection = get_collection("contracts")
        contract = await collection.find_one({"contract_id": contract_id})
        
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
        
        # Delete the contract file
        file_path = os.path.join(settings.upload_dir, f"{contract_id}.pdf")
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info(f"Deleted contract file: {file_path}")
            except Exception as file_error:
                logger.error(f"Error deleting contract file: {str(file_error)}")
                # Continue with database deletion even if file deletion fails
        
        # Delete the contract record from database
        result = await collection.delete_one({"contract_id": contract_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Contract not found")
        
        logger.info(f"Deleted contract: {contract_id}")
        return {"message": "Contract deleted successfully", "contract_id": contract_id}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting contract {contract_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error deleting contract")


async def process_contract_background(contract_id: str, file_path: str):
    """
    Background task to process contract analysis asynchronously.
    
    This function runs in the background after a contract is uploaded, performing
    the complete contract analysis pipeline without blocking the API response.
    It handles the entire processing workflow and updates the contract status.
    
    Processing Pipeline:
    1. Contract Analysis: Uses ContractProcessor to extract structured data
    2. Data Extraction: Performs contract type detection and data extraction
    3. Confidence Scoring: Calculates quality scores for extracted data
    4. Gap Analysis: Identifies missing information and provides recommendations
    5. Status Updates: Updates database with results and completion status
    
    Processing Steps:
    - Text extraction from PDF
    - Contract type detection (NDA, Employment, Service)
    - Party identification and classification
    - Financial details extraction
    - Payment terms analysis
    - Revenue classification
    - SLA information extraction
    - Confidence score calculation
    - Gap analysis and recommendations
    
    Status Management:
    - Success: Updates status to COMPLETED with extracted data
    - Failure: Updates status to FAILED with error message
    - Progress: Real-time progress updates during processing
    
    Error Handling:
    - Processing errors: Logs error and updates status to FAILED
    - Database errors: Logs error but doesn't re-raise (background task)
    - File errors: Handles file access issues gracefully
    
    Args:
        contract_id (str): Unique identifier for the contract being processed
        file_path (str): Path to the PDF file to be analyzed
        
    Returns:
        None: Updates contract status in database
        
    Note:
        This function runs asynchronously and doesn't return values directly.
        Results are stored in the database and can be retrieved via API endpoints.
    """
    try:
        processor = ContractProcessor()
        extracted_data = await processor.process_contract(contract_id, file_path)
        
        # Update contract with extracted data
        collection = get_collection("contracts")
        await collection.update_one(
            {"contract_id": contract_id},
            {
                "$set": {
                    "status": ProcessingStatus.COMPLETED,
                    "data": extracted_data.dict(),
                    "updated_at": datetime.utcnow(),
                    "processing_completed_at": datetime.utcnow(),
                    "progress_percentage": 100
                }
            }
        )
        
        logger.info(f"Contract {contract_id} processed successfully")
        
    except Exception as e:
        logger.error(f"Error processing contract {contract_id}: {str(e)}")
        
        # Update contract status to failed
        try:
            collection = get_collection("contracts")
            await collection.update_one(
                {"contract_id": contract_id},
                {
                    "$set": {
                        "status": ProcessingStatus.FAILED,
                        "error_message": str(e),
                        "updated_at": datetime.utcnow(),
                        "processing_completed_at": datetime.utcnow(),
                        "progress_percentage": 0
                    }
                }
            )
        except Exception as update_error:
            logger.error(f"Error updating failed status for contract {contract_id}: {str(update_error)}")
