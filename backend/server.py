from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime, timezone
import pandas as pd
import io
import json
import requests
import asyncio
import time

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Google Sheets configuration
GOOGLE_SHEETS_API_KEY = os.environ.get('GOOGLE_SHEETS_API_KEY')
GOOGLE_SHEETS_ID = os.environ.get('GOOGLE_SHEETS_ID')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Data cache for Google Sheets sync
sheets_cache = {
    "data": None,
    "last_updated": None,
    "update_interval": 300,  # 5 minutes
    "is_syncing": False
}

# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class SalesData(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    departamento: int
    custo_medio: float
    d_estoque: float
    pmp: float
    meta_ia: float
    venda_rs: float
    margem_24: float
    margem_25: float
    variacao_percent: float
    upload_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    source: str = "upload"  # "upload" or "sheets"

class DashboardSummary(BaseModel):
    total_vendas: float
    margem_media_24: float
    margem_media_25: float
    variacao_total: float
    departamentos_count: int
    top_departamentos: List[Dict[str, Any]]
    data_source: str = "unknown"
    last_sync: Optional[str] = None

def prepare_for_mongo(data):
    """Convert datetime objects to ISO strings for MongoDB storage"""
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
    return data

def parse_from_mongo(item):
    """Parse ISO strings back to datetime objects"""
    if isinstance(item, dict):
        for key, value in item.items():
            if key.endswith('timestamp') and isinstance(value, str):
                try:
                    item[key] = datetime.fromisoformat(value)
                except:
                    pass
    return item

def fetch_google_sheets_data(sheet_name: str = "SETEMBRO25") -> Dict[str, Any]:
    """
    Fetch data from Google Sheets using the Sheets API
    """
    try:
        # Google Sheets API endpoint
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{GOOGLE_SHEETS_ID}/values/{sheet_name}?key={GOOGLE_SHEETS_API_KEY}"
        
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        values = data.get('values', [])
        
        if not values:
            return {"success": False, "error": "No data found in sheet"}
        
        # Convert to structured data
        headers = values[0] if values else []
        rows = values[1:] if len(values) > 1 else []
        
        structured_data = []
        for row in rows:
            # Pad row with empty strings if shorter than headers
            padded_row = row + [''] * (len(headers) - len(row))
            row_dict = dict(zip(headers, padded_row))
            structured_data.append(row_dict)
        
        return {
            "success": True,
            "data": structured_data,
            "headers": headers,
            "total_rows": len(structured_data),
            "sheet_name": sheet_name
        }
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching Google Sheets data: {str(e)}")
        return {"success": False, "error": f"Network error: {str(e)}"}
    except Exception as e:
        logger.error(f"Unexpected error fetching Google Sheets data: {str(e)}")
        return {"success": False, "error": f"Unexpected error: {str(e)}"}

def process_sheets_data_to_sales_records(sheets_data: List[Dict]) -> List[SalesData]:
    """
    Convert Google Sheets data to SalesData records
    """
    sales_records = []
    
    for index, row in enumerate(sheets_data):
        try:
            # Handle different column name variations
            dept_field = None
            for key in row.keys():
                if 'departamento' in key.lower() or 'depto' in key.lower() or 'dept' in key.lower():
                    dept_field = key
                    break
            
            if not dept_field or not row.get(dept_field):
                continue
                
            # Extract department number
            dept_value = str(row[dept_field]).strip()
            if '-' in dept_value:
                dept_number = int(dept_value.split('-')[0].strip())
            else:
                dept_number = int(float(dept_value))
            
            # Map other fields with flexible column name matching
            def get_field_value(row, possible_names, default=0.0):
                for name in possible_names:
                    for key in row.keys():
                        if name.lower() in key.lower().replace(' ', '').replace('_', ''):
                            value = row[key]
                            if value == '' or value is None:
                                return default
                            try:
                                return float(value)
                            except (ValueError, TypeError):
                                continue
                return default
            
            sales_record = SalesData(
                departamento=dept_number,
                custo_medio=get_field_value(row, ['customedio', 'custo', 'cost']),
                d_estoque=get_field_value(row, ['destoque', 'estoque', 'stock']),
                pmp=get_field_value(row, ['pmp', 'precomedio', 'price']),
                meta_ia=get_field_value(row, ['metaia', 'meta', 'target']),
                venda_rs=get_field_value(row, ['vendar$', 'venda', 'vendas', 'sales']),
                margem_24=get_field_value(row, ['margem24', 'margem2024', 'margin24']),
                margem_25=get_field_value(row, ['margem25', 'margem2025', 'margin25']),
                variacao_percent=get_field_value(row, ['variacao', 'variação', 'variation', '%variacao']),
                source="sheets"
            )
            sales_records.append(sales_record)
            
        except Exception as e:
            logger.warning(f"Error processing row {index}: {e}")
            continue
    
    return sales_records

async def sync_google_sheets_data():
    """
    Background task to sync data from Google Sheets
    """
    if sheets_cache["is_syncing"]:
        logger.info("Sync already in progress, skipping")
        return
    
    sheets_cache["is_syncing"] = True
    
    try:
        logger.info("Starting Google Sheets sync...")
        
        # Fetch data from Google Sheets
        sheets_result = fetch_google_sheets_data()
        
        if not sheets_result["success"]:
            logger.error(f"Failed to fetch sheets data: {sheets_result['error']}")
            return
        
        # Process data into sales records
        sales_records = process_sheets_data_to_sales_records(sheets_result["data"])
        
        if not sales_records:
            logger.warning("No valid sales records found in sheets data")
            return
        
        # Clear existing sheets data from database
        await db.sales_data.delete_many({"source": "sheets"})
        
        # Insert new data
        records_dicts = [prepare_for_mongo(record.dict()) for record in sales_records]
        await db.sales_data.insert_many(records_dicts)
        
        # Update cache
        sheets_cache["data"] = sheets_result["data"]
        sheets_cache["last_updated"] = datetime.now(timezone.utc)
        
        logger.info(f"Successfully synced {len(sales_records)} records from Google Sheets")
        
    except Exception as e:
        logger.error(f"Error during Google Sheets sync: {str(e)}")
    finally:
        sheets_cache["is_syncing"] = False

def should_sync_sheets() -> bool:
    """Check if Google Sheets sync is needed"""
    if sheets_cache["last_updated"] is None:
        return True
    
    elapsed = (datetime.now(timezone.utc) - sheets_cache["last_updated"]).total_seconds()
    return elapsed >= sheets_cache["update_interval"]

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Dashboard de Vendas API com Google Sheets"}

@api_router.post("/upload-excel")
async def upload_excel(file: UploadFile = File(...)):
    """Process uploaded Excel file and store sales data"""
    try:
        # Read Excel file
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Clear existing upload data
        await db.sales_data.delete_many({"source": "upload"})
        
        # Process each row
        sales_records = []
        for index, row in df.iterrows():
            try:
                # Extract department number from strings like "2 - MAGAZINE" or just "2"
                dept_value = str(row['Departamento']).strip()
                if '-' in dept_value:
                    dept_number = int(dept_value.split('-')[0].strip())
                else:
                    dept_number = int(float(dept_value))  # Handle floats like 2.0
                
                sales_record = SalesData(
                    departamento=dept_number,
                    custo_medio=float(row['Custo Médio']),
                    d_estoque=float(row['D. Estoque']),
                    pmp=float(row['PMP']),
                    meta_ia=float(row['Meta IA']),
                    venda_rs=float(row['Venda R$']),
                    margem_24=float(row['Margem 24']),
                    margem_25=float(row['Margem 25']),
                    variacao_percent=float(row['% Variação']),
                    source="upload"
                )
                sales_records.append(sales_record)
            except Exception as e:
                logger.warning(f"Error processing row {index}: {e}")
                continue
        
        # Insert into MongoDB
        if sales_records:
            records_dicts = [prepare_for_mongo(record.dict()) for record in sales_records]
            await db.sales_data.insert_many(records_dicts)
        
        return {
            "message": f"Successfully processed {len(sales_records)} records from upload",
            "records_count": len(sales_records),
            "source": "upload"
        }
        
    except Exception as e:
        logger.error(f"Error processing Excel file: {e}")
        raise HTTPException(status_code=400, detail=f"Error processing Excel file: {str(e)}")

@api_router.get("/sync-sheets")
async def trigger_sheets_sync(background_tasks: BackgroundTasks):
    """Manually trigger Google Sheets synchronization"""
    background_tasks.add_task(sync_google_sheets_data)
    
    return {
        "message": "Google Sheets sync triggered",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "last_sync": sheets_cache["last_updated"].isoformat() if sheets_cache["last_updated"] else None
    }

@api_router.get("/dashboard-summary", response_model=DashboardSummary)
async def get_dashboard_summary(background_tasks: BackgroundTasks, auto_sync: bool = True):
    """Get dashboard summary statistics with automatic sync"""
    try:
        # Trigger sync if needed
        if auto_sync and should_sync_sheets():
            background_tasks.add_task(sync_google_sheets_data)
        
        sales_data = await db.sales_data.find().to_list(1000)
        
        if not sales_data:
            # If no data, try immediate sync
            if auto_sync:
                await sync_google_sheets_data()
                sales_data = await db.sales_data.find().to_list(1000)
        
        if not sales_data:
            return DashboardSummary(
                total_vendas=0,
                margem_media_24=0,
                margem_media_25=0,
                variacao_total=0,
                departamentos_count=0,
                top_departamentos=[],
                data_source="none",
                last_sync=None
            )
        
        # Calculate summary statistics
        df = pd.DataFrame(sales_data)
        
        total_vendas = df['venda_rs'].sum()
        margem_media_24 = df['margem_24'].mean()
        margem_media_25 = df['margem_25'].mean()
        variacao_total = df['variacao_percent'].mean()
        departamentos_count = len(df)
        
        # Top 5 departments by sales
        top_deps = df.nlargest(5, 'venda_rs')[['departamento', 'venda_rs', 'margem_25']].to_dict('records')
        
        # Determine data source
        sources = df['source'].unique() if 'source' in df.columns else ["unknown"]
        data_source = "sheets" if "sheets" in sources else "upload" if "upload" in sources else "mixed"
        
        return DashboardSummary(
            total_vendas=total_vendas,
            margem_media_24=margem_media_24,
            margem_media_25=margem_media_25,
            variacao_total=variacao_total,
            departamentos_count=departamentos_count,
            top_departamentos=top_deps,
            data_source=data_source,
            last_sync=sheets_cache["last_updated"].isoformat() if sheets_cache["last_updated"] else None
        )
        
    except Exception as e:
        logger.error(f"Error getting dashboard summary: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting dashboard summary: {str(e)}")

@api_router.get("/sales-data", response_model=List[SalesData])
async def get_sales_data():
    """Get all sales data"""
    try:
        sales_data = await db.sales_data.find().to_list(1000)
        return [SalesData(**parse_from_mongo(record)) for record in sales_data]
    except Exception as e:
        logger.error(f"Error getting sales data: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting sales data: {str(e)}")

@api_router.get("/chart-data")
async def get_chart_data():
    """Get data formatted for charts"""
    try:
        sales_data = await db.sales_data.find().to_list(1000)
        
        if not sales_data:
            return {
                "vendas_por_departamento": [],
                "comparativo_margens": [],
                "variacao_departamentos": []
            }
        
        df = pd.DataFrame(sales_data)
        
        # Sales by department
        vendas_por_departamento = df[['departamento', 'venda_rs']].to_dict('records')
        
        # Margin comparison
        comparativo_margens = df[['departamento', 'margem_24', 'margem_25']].to_dict('records')
        
        # Variation by department
        variacao_departamentos = df[['departamento', 'variacao_percent']].to_dict('records')
        
        return {
            "vendas_por_departamento": vendas_por_departamento,
            "comparativo_margens": comparativo_margens,
            "variacao_departamentos": variacao_departamentos
        }
        
    except Exception as e:
        logger.error(f"Error getting chart data: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting chart data: {str(e)}")

@api_router.get("/sheets-status")
async def get_sheets_status():
    """Get Google Sheets integration status"""
    return {
        "sheets_id": GOOGLE_SHEETS_ID,
        "api_key_set": bool(GOOGLE_SHEETS_API_KEY),
        "last_sync": sheets_cache["last_updated"].isoformat() if sheets_cache["last_updated"] else None,
        "sync_interval": sheets_cache["update_interval"],
        "is_syncing": sheets_cache["is_syncing"],
        "should_sync": should_sync_sheets()
    }

# Legacy routes
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(prepare_for_mongo(status_obj.dict()))
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**parse_from_mongo(status_check)) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Startup event to trigger initial sync
@app.on_event("startup")
async def startup_event():
    """Initialize Google Sheets sync on startup"""
    if GOOGLE_SHEETS_API_KEY and GOOGLE_SHEETS_ID:
        logger.info("Starting initial Google Sheets sync...")
        asyncio.create_task(sync_google_sheets_data())
    else:
        logger.warning("Google Sheets configuration missing, sync disabled")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()