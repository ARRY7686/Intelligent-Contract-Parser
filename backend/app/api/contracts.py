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
    """Upload a contract file for processing."""
    
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
    """List all contracts with optional filtering and pagination."""
    
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
    """Get the processing status of a contract."""
    
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
    """Download the original contract file."""
    
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
    """Get the parsed contract data."""
    
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
    """Delete a contract and its associated file."""
    
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
    """Background task to process contract."""
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
