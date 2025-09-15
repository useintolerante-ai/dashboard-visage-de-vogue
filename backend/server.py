from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import uuid
from datetime import datetime, timezone
import pandas as pd
import io
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

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

class DashboardSummary(BaseModel):
    total_vendas: float
    margem_media_24: float
    margem_media_25: float
    variacao_total: float
    departamentos_count: int
    top_departamentos: List[Dict[str, Any]]

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

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Dashboard de Vendas API"}

@api_router.post("/upload-excel")
async def upload_excel(file: UploadFile = File(...)):
    """Process uploaded Excel file and store sales data"""
    try:
        # Read Excel file
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Clear existing data
        await db.sales_data.delete_many({})
        
        # Process each row
        sales_records = []
        for index, row in df.iterrows():
            try:
                sales_record = SalesData(
                    departamento=int(row['Departamento']),
                    custo_medio=float(row['Custo Médio']),
                    d_estoque=float(row['D. Estoque']),
                    pmp=float(row['PMP']),
                    meta_ia=float(row['Meta IA']),
                    venda_rs=float(row['Venda R$']),
                    margem_24=float(row['Margem 24']),
                    margem_25=float(row['Margem 25']),
                    variacao_percent=float(row['% Variação'])
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
            "message": f"Successfully processed {len(sales_records)} records",
            "records_count": len(sales_records)
        }
        
    except Exception as e:
        logger.error(f"Error processing Excel file: {e}")
        raise HTTPException(status_code=400, detail=f"Error processing Excel file: {str(e)}")

@api_router.get("/dashboard-summary", response_model=DashboardSummary)
async def get_dashboard_summary():
    """Get dashboard summary statistics"""
    try:
        sales_data = await db.sales_data.find().to_list(1000)
        
        if not sales_data:
            return DashboardSummary(
                total_vendas=0,
                margem_media_24=0,
                margem_media_25=0,
                variacao_total=0,
                departamentos_count=0,
                top_departamentos=[]
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
        
        return DashboardSummary(
            total_vendas=total_vendas,
            margem_media_24=margem_media_24,
            margem_media_25=margem_media_25,
            variacao_total=variacao_total,
            departamentos_count=departamentos_count,
            top_departamentos=top_deps
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()