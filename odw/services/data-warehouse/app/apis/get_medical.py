from moose_lib import ConsumptionApi, EgressConfig
from app.ingest.models import Medical
from pydantic import BaseModel
from typing import List, Optional

# An API to get a list of Medical records from the data warehouse.
# For more information on consumption apis, see: https://docs.fiveonefour.com/moose/building/consumption-apis.

# Define the query params
class GetMedicalQuery(BaseModel):
    limit: Optional[int] = None
    offset: int = 0
    patient_name: Optional[str] = None  # Filter by patient name
    doctor: Optional[str] = None  # Filter by doctor
    dental_procedure_name: Optional[str] = None  # Filter by procedure

# Define the response model
class GetMedicalResponse(BaseModel):
    items: List[Medical] = []
    total: int = 0

# Define the query function
def get_medical(client, params: GetMedicalQuery) -> GetMedicalResponse:
    """
    Retrieve Medical records with pagination and optional filtering.
    
    Args:
        client: Database client for executing queries
        params: Contains pagination parameters and optional filters
        
    Returns:
        GetMedicalResponse object containing Medical items and count
    """
    
    query = """
        SELECT
            id,
            patient_name,
            patient_age,
            phone_number,
            scheduled_appointment_date,
            dental_procedure_name,
            doctor,
            transform_timestamp,
            source_file_path
        FROM Medical
    """
    
    query_params = {}
    where_clauses = []
    
    # Add patient name filter if specified
    if params.patient_name is not None:
        where_clauses.append("patient_name LIKE {patient_name}")
        query_params["patient_name"] = f"%{params.patient_name}%"
    
    # Add doctor filter if specified
    if params.doctor is not None:
        where_clauses.append("doctor LIKE {doctor}")
        query_params["doctor"] = f"%{params.doctor}%"
    
    # Add procedure filter if specified
    if params.dental_procedure_name is not None:
        where_clauses.append("dental_procedure_name LIKE {dental_procedure_name}")
        query_params["dental_procedure_name"] = f"%{params.dental_procedure_name}%"
    
    # Add WHERE clause if any filters are specified
    if where_clauses:
        query += " WHERE " + " AND ".join(where_clauses)
    
    query += " ORDER BY transform_timestamp DESC"
    
    # Only add LIMIT if specified
    if params.limit is not None:
        query += " LIMIT {limit}"
        query_params["limit"] = params.limit
    
    # Only add OFFSET if limit is specified and offset > 0
    if params.limit is not None and params.offset > 0:
        query += " OFFSET {offset}"
        query_params["offset"] = params.offset
    
    # Execute query
    result = client.query.execute(query, query_params)
    
    # Convert results to Medical objects
    items = [Medical(**item) for item in result]
    
    # Return the response
    return GetMedicalResponse(
        items=items,
        total=len(items)
    )

# Create the consumption API
get_medical_api = ConsumptionApi[GetMedicalQuery, GetMedicalResponse](
    "getMedical",
    query_function=get_medical,
    source="Medical",
    config=EgressConfig()
)