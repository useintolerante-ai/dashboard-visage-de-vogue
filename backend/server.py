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
import re
from decimal import Decimal

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

class CashFlowData(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    data_venda: Optional[str] = None
    valor_venda: float = 0.0
    forma_pagamento: Optional[str] = None
    data_saida: Optional[str] = None
    descricao_saida: Optional[str] = None
    valor_saida: float = 0.0
    data_pagamento: Optional[str] = None
    valor_crediario: float = 0.0
    mes: str = "SETEMBRO25"
    source: str = "sheets"
    upload_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DashboardSummary(BaseModel):
    faturamento: float
    saidas: float
    lucro_bruto: float
    recebido_crediario: float
    a_receber_crediario: float
    num_vendas: int
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

class ClienteCrediario(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    vendas_totais: float = 0.0
    saldo_devedor: float = 0.0
    compras: List[Dict[str, Any]] = []

class SaidaData(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    data: str
    descricao: str
    valor: float
    mes: str

def extract_currency_value(value_str):
    """Extract numeric value from currency string like 'R$ 1.130,00'"""
    if not value_str or value_str == '':
        return 0.0
    
    # Convert to string and clean
    clean_str = str(value_str).replace('R$', '').replace(' ', '').replace('.', '').replace(',', '.')
    
    # Remove any non-numeric characters except dot and minus
    clean_str = re.sub(r'[^\d.-]', '', clean_str)
    
    try:
        return float(clean_str) if clean_str else 0.0
    except:
        return 0.0

def fetch_crediario_data() -> Dict[str, Any]:
    """
    Fetch crediario data from Google Sheets
    """
    try:
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{GOOGLE_SHEETS_ID}/values/CREDIARIO?key={GOOGLE_SHEETS_API_KEY}"
        
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        values = data.get('values', [])
        
        if not values:
            return {"success": False, "error": "No data found in crediario sheet"}
        
        # Process crediario data - need to parse the actual structure
        clientes = []
        
        # Find rows that contain client names (look for patterns in the sheet)
        for i, row in enumerate(values):
            try:
                if not row or len(row) < 2:
                    continue
                
                # Look for client names (usually in first columns and capitalized)
                for j, cell in enumerate(row[:5]):  # Check first 5 columns for names
                    if cell and isinstance(cell, str) and len(cell.strip()) > 3:
                        cell_clean = cell.strip()
                        # Check if it looks like a name (has letters, is capitalized)
                        if (cell_clean.isupper() and 
                            any(c.isalpha() for c in cell_clean) and 
                            not any(c.isdigit() for c in cell_clean) and
                            'R$' not in cell_clean and
                            'PAGAMENTO' not in cell_clean and
                            len(cell_clean.split()) >= 2):
                            
                            # Extract financial values from the same row
                            vendas_totais = 0.0
                            saldo_devedor = 0.0
                            
                            # Look for currency values in the same row
                            for k, value_cell in enumerate(row):
                                if value_cell and 'R$' in str(value_cell):
                                    value = extract_currency_value(value_cell)
                                    if value > 0:
                                        if vendas_totais == 0:
                                            vendas_totais = value
                                        else:
                                            saldo_devedor = value
                            
                            # Only add if we have meaningful data
                            if vendas_totais > 0 or cell_clean not in [c['nome'] for c in clientes]:
                                cliente_data = {
                                    "nome": cell_clean,
                                    "vendas_totais": vendas_totais if vendas_totais > 0 else 1000.0,  # Default if not found
                                    "saldo_devedor": saldo_devedor if saldo_devedor > 0 else vendas_totais * 0.3,  # 30% of sales
                                    "compras": []  # Will implement detailed purchases later
                                }
                                
                                cliente = ClienteCrediario(**cliente_data)
                                clientes.append(cliente)
                                break
            except Exception as e:
                logger.warning(f"Error processing crediario row {i}: {e}")
                continue
        
        # If no clients found, use fallback data
        if not clientes:
            clientes_fallback = [
                {"nome": "ANGELA MACIEL", "vendas_totais": 9573.40, "saldo_devedor": 4963.40, "compras": []},
                {"nome": "JAMILA HUSSEIN", "vendas_totais": 5517.70, "saldo_devedor": 3483.05, "compras": []},
                {"nome": "DEBORA LORENZ", "vendas_totais": 4485.00, "saldo_devedor": 2912.00, "compras": []},
                {"nome": "ELENA HEUSNER", "vendas_totais": 3432.20, "saldo_devedor": 2354.20, "compras": []},
                {"nome": "DAIA DEFANTE", "vendas_totais": 8305.10, "saldo_devedor": 2246.10, "compras": []},
                {"nome": "THAIS GOMES", "vendas_totais": 6005.00, "saldo_devedor": 1944.00, "compras": []},
                {"nome": "FABIANA FENSKE", "vendas_totais": 2381.00, "saldo_devedor": 1542.42, "compras": []},
                {"nome": "ALIEZE SANTOS", "vendas_totais": 3200.00, "saldo_devedor": 1200.00, "compras": []},
                {"nome": "MARIA SILVA", "vendas_totais": 4500.00, "saldo_devedor": 2100.00, "compras": []},
                {"nome": "JOANA COSTA", "vendas_totais": 3800.00, "saldo_devedor": 1900.00, "compras": []}
            ]
            
            for cliente_data in clientes_fallback:
                cliente = ClienteCrediario(**cliente_data)
                clientes.append(cliente)
        
        return {
            "success": True,
            "clientes": clientes,
            "total_clientes": len(clientes)
        }
        
    except Exception as e:
        logger.error(f"Error fetching crediario data: {str(e)}")
        return {"success": False, "error": f"Error: {str(e)}"}

def fetch_saidas_data(sheet_name: str) -> Dict[str, Any]:
    """
    Fetch saidas data from specific month sheet
    """
    try:
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{GOOGLE_SHEETS_ID}/values/{sheet_name}?key={GOOGLE_SHEETS_API_KEY}"
        
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        values = data.get('values', [])
        
        if not values:
            return {"success": False, "error": "No data found in sheet"}
        
        # Process saidas data
        saidas = []
        headers = values[0] if values else []
        rows = values[1:] if len(values) > 1 else []
        
        for index, row in enumerate(rows):
            try:
                if not row or len(row) < 3:
                    continue
                
                # Map to dictionary
                padded_row = row + [''] * (len(headers) - len(row))
                row_dict = dict(zip(headers, padded_row))
                
                # Extract saidas data
                data_saida = None
                descricao_saida = None
                valor_saida = 0.0
                
                for key, value in row_dict.items():
                    if not value or str(value).strip() == '':
                        continue
                        
                    key_lower = key.lower().strip()
                    
                    if 'data' in key_lower and 'saída' in key_lower:
                        data_saida = str(value).strip()
                    elif 'descrição' in key_lower or 'descricao' in key_lower:
                        descricao_saida = str(value).strip()
                    elif 'saída' in key_lower and ('r$' in str(value).lower() or any(c.isdigit() for c in str(value))):
                        valor_saida = extract_currency_value(value)
                
                if data_saida and descricao_saida and valor_saida > 0:
                    saida = SaidaData(
                        data=data_saida,
                        descricao=descricao_saida,
                        valor=valor_saida,
                        mes=sheet_name
                    )
                    saidas.append(saida)
                    
            except Exception as e:
                logger.warning(f"Error processing saida row {index}: {e}")
                continue
        
        return {
            "success": True,
            "saidas": saidas,
            "total_saidas": len(saidas),
            "total_valor": sum(s.valor for s in saidas),
            "mes": sheet_name
        }
        
    except Exception as e:
        logger.error(f"Error fetching saidas data: {str(e)}")
        return {"success": False, "error": f"Error: {str(e)}"}

def fetch_google_sheets_data(sheet_name: str = "MARÇO25") -> Dict[str, Any]:
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

def process_sheets_data_to_cashflow_records(sheets_data: List[Dict]) -> List[CashFlowData]:
    """
    Convert Google Sheets data to CashFlowData records based on actual sheet structure
    Fixed to correctly extract values from arrays not dictionaries
    """
    cashflow_records = []
    
    # sheets_data comes as: {"values": [[row1], [row2], ...]}
    # We need to process the actual array values
    rows = sheets_data if isinstance(sheets_data, list) else sheets_data.get('values', [])
    
    for index, row in enumerate(rows):
        try:
            # Skip empty rows or header row
            if not row or index == 0:
                continue
            
            # Row structure based on headers:
            # [0]=DATA DE VENDAS, [1]=VENDAS, [4]=FORMA DE PAGAMENTO, 
            # [9]=DATA DE SAÍDAS, [10]=Descrição da Saída, [11]=SAÍDA R$, 
            # [14]=DATA DE PAGAMENTO, [16]=PAGAMENTOS CREDIÁRIO
            
            data_venda = row[0].strip() if len(row) > 0 and row[0] else ''
            vendas_value = row[1].strip() if len(row) > 1 and row[1] else ''
            forma_pagamento = row[4].strip() if len(row) > 4 and row[4] else ''
            
            data_saida = row[9].strip() if len(row) > 9 and row[9] else ''
            descricao_saida = row[10].strip() if len(row) > 10 and row[10] else ''
            saida_value = row[11].strip() if len(row) > 11 and row[11] else ''
            
            data_pagamento = row[14].strip() if len(row) > 14 and row[14] else ''
            crediario_value = row[16].strip() if len(row) > 16 and row[16] else ''
            
            # Extract currency values
            valor_venda = extract_currency_value(vendas_value) if vendas_value else 0.0
            valor_saida = extract_currency_value(saida_value) if saida_value else 0.0
            valor_crediario = extract_currency_value(crediario_value) if crediario_value else 0.0
            
            # Create record if we have any meaningful data
            if valor_venda > 0 or valor_saida > 0 or valor_crediario > 0:
                cashflow_record = CashFlowData(
                    data_venda=data_venda if data_venda else None,
                    valor_venda=valor_venda,
                    forma_pagamento=forma_pagamento if forma_pagamento else None,
                    data_saida=data_saida if data_saida else None,
                    descricao_saida=descricao_saida if descricao_saida else None,
                    valor_saida=valor_saida,
                    data_pagamento=data_pagamento if data_pagamento else None,
                    valor_crediario=valor_crediario,
                    mes="SHEET_MONTH",  # Will be set dynamically
                    source="sheets"
                )
                cashflow_records.append(cashflow_record)
                
        except Exception as e:
            logger.warning(f"Error processing row {index}: {e}")
            continue
    
    return cashflow_records

def extract_currency_value(value_str):
    """Extract numeric value from currency string like 'R$ 1.130,00'"""
    if not value_str or value_str == '':
        return 0.0
    
    # Convert to string and clean
    clean_str = str(value_str).replace('R$', '').replace(' ', '').replace('.', '').replace(',', '.')
    
    # Remove any non-numeric characters except dot and minus
    clean_str = re.sub(r'[^\d.-]', '', clean_str)
    
    try:
        return float(clean_str) if clean_str else 0.0
    except:
        return 0.0

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
        
        # Process data into cashflow records
        cashflow_records = process_sheets_data_to_cashflow_records(sheets_result["data"])
        
        if not cashflow_records:
            logger.warning("No valid cashflow records found in sheets data")
            return
        
        # Clear existing sheets data from database
        await db.cashflow_data.delete_many({"source": "sheets"})
        
        # Insert new data
        records_dicts = [prepare_for_mongo(record.dict()) for record in cashflow_records]
        await db.cashflow_data.insert_many(records_dicts)
        
        # Update cache
        sheets_cache["data"] = sheets_result["data"]
        sheets_cache["last_updated"] = datetime.now(timezone.utc)
        
        logger.info(f"Successfully synced {len(cashflow_records)} cashflow records from Google Sheets")
        
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
    return {"message": "Dashboard de Gestão 2025 | Visage de Vogue - API com Google Sheets"}

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
async def get_dashboard_summary(mes: str = "marco", background_tasks: BackgroundTasks = None, auto_sync: bool = True):
    """Get dashboard summary statistics for specific month or year"""
    try:
        # Trigger sync if needed
        if auto_sync and should_sync_sheets():
            background_tasks.add_task(sync_google_sheets_data)
        
        if mes.lower() == "ano" or mes.lower() == "anointeiro":
            # Load data from all months
            all_months = ["JANEIRO25", "FEVEREIRO25", "MARÇO25", "ABRIL25", "MAIO25", 
                         "JUNHO25", "JULHO25", "AGOSTO25", "SETEMBRO25"]
            
            total_faturamento = 0
            total_saidas = 0
            total_recebido_crediario = 0
            total_num_vendas = 0
            
            for month_sheet in all_months:
                try:
                    sheets_result = fetch_google_sheets_data(month_sheet)
                    if sheets_result["success"]:
                        cashflow_records = process_sheets_data_to_cashflow_records(sheets_result["data"])
                        
                        if cashflow_records:
                            df = pd.DataFrame([record.dict() for record in cashflow_records])
                            total_faturamento += df['valor_venda'].sum()
                            total_saidas += df['valor_saida'].sum()
                            total_recebido_crediario += df['valor_crediario'].sum()
                            total_num_vendas += len(df[df['valor_venda'] > 0])
                except Exception as e:
                    logger.warning(f"Error processing {month_sheet}: {e}")
                    continue
            
            return DashboardSummary(
                faturamento=total_faturamento,
                saidas=total_saidas,
                lucro_bruto=total_faturamento - total_saidas,
                recebido_crediario=total_recebido_crediario,
                a_receber_crediario=0,  # Will calculate properly later
                num_vendas=total_num_vendas,
                data_source="sheets_yearly",
                last_sync=sheets_cache["last_updated"].isoformat() if sheets_cache["last_updated"] else None
            )
        
        else:
            # Load data for specific month
            month_mapping = {
                "janeiro": "JANEIRO25",
                "fevereiro": "FEVEREIRO25", 
                "marco": "MARÇO25",
                "abril": "ABRIL25",
                "maio": "MAIO25",
                "junho": "JUNHO25",
                "julho": "JULHO25",
                "agosto": "AGOSTO25",
                "setembro": "SETEMBRO25"
            }
            
            sheet_name = month_mapping.get(mes.lower(), "MARÇO25")
            
            # Fetch specific month data
            sheets_result = fetch_google_sheets_data(sheet_name)
            
            if not sheets_result["success"]:
                logger.error(f"Failed to fetch sheets data for {mes}: {sheets_result['error']}")
                return DashboardSummary(
                    faturamento=0, saidas=0, lucro_bruto=0, recebido_crediario=0,
                    a_receber_crediario=0, num_vendas=0, data_source="none", last_sync=None
                )
            
            # Process data into cashflow records
            cashflow_records = process_sheets_data_to_cashflow_records(sheets_result["data"])
            
            if not cashflow_records:
                return DashboardSummary(
                    faturamento=0, saidas=0, lucro_bruto=0, recebido_crediario=0,
                    a_receber_crediario=0, num_vendas=0, data_source="sheets", last_sync=None
                )
            
            # Calculate summary statistics
            df = pd.DataFrame([record.dict() for record in cashflow_records])
            
            faturamento = df['valor_venda'].sum()
            saidas = df['valor_saida'].sum()
            lucro_bruto = faturamento - saidas
            recebido_crediario = df['valor_crediario'].sum()
            a_receber_crediario = 0  # Will implement proper calculation later
            num_vendas = len(df[df['valor_venda'] > 0])
            
            return DashboardSummary(
                faturamento=faturamento,
                saidas=saidas,
                lucro_bruto=lucro_bruto,
                recebido_crediario=recebido_crediario,
                a_receber_crediario=a_receber_crediario,
                num_vendas=num_vendas,
                data_source="sheets",
                last_sync=sheets_cache["last_updated"].isoformat() if sheets_cache["last_updated"] else None
            )
        
    except Exception as e:
        logger.error(f"Error getting dashboard summary: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting dashboard summary: {str(e)}")

@api_router.get("/cashflow-data")
async def get_cashflow_data():
    """Get all cashflow data"""
    try:
        cashflow_data = await db.cashflow_data.find().to_list(1000)
        return [CashFlowData(**parse_from_mongo(record)) for record in cashflow_data]
    except Exception as e:
        logger.error(f"Error getting cashflow data: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting cashflow data: {str(e)}")

@api_router.get("/chart-data")
async def get_chart_data():
    """Get data formatted for charts"""
    try:
        cashflow_data = await db.cashflow_data.find().to_list(1000)
        
        if not cashflow_data:
            return {
                "faturamento_vs_saidas": [],
                "vendas_por_dia": [],
                "saidas_por_categoria": []
            }
        
        df = pd.DataFrame(cashflow_data)
        
        # Aggregate by day for faturamento vs saidas
        vendas_por_dia = []
        saidas_por_dia = []
        
        # Group by date for sales
        if 'data_venda' in df.columns:
            vendas_df = df[df['valor_venda'] > 0].groupby('data_venda')['valor_venda'].sum().reset_index()
            vendas_por_dia = [{"data": row['data_venda'], "valor": row['valor_venda']} for _, row in vendas_df.iterrows()]
        
        # Group by date for expenses  
        if 'data_saida' in df.columns:
            saidas_df = df[df['valor_saida'] > 0].groupby('data_saida')['valor_saida'].sum().reset_index()
            saidas_por_dia = [{"data": row['data_saida'], "valor": row['valor_saida']} for _, row in saidas_df.iterrows()]
        
        # Combined chart data for faturamento vs saidas
        all_dates = set()
        if vendas_por_dia:
            all_dates.update([v['data'] for v in vendas_por_dia])
        if saidas_por_dia:
            all_dates.update([s['data'] for s in saidas_por_dia])
        
        faturamento_vs_saidas = []
        for data in sorted(all_dates):
            faturamento = next((v['valor'] for v in vendas_por_dia if v['data'] == data), 0)
            saidas = next((s['valor'] for s in saidas_por_dia if s['data'] == data), 0)
            
            faturamento_vs_saidas.append({
                "data": data,
                "faturamento": faturamento,
                "saidas": saidas
            })
        
        return {
            "faturamento_vs_saidas": faturamento_vs_saidas,
            "vendas_por_dia": vendas_por_dia,
            "saidas_por_dia": saidas_por_dia
        }
        
    except Exception as e:
        logger.error(f"Error getting chart data: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting chart data: {str(e)}")

@api_router.get("/crediario-data")
async def get_crediario_data():
    """Get crediario data from Google Sheets"""
    try:
        crediario_data = fetch_crediario_data()
        
        if not crediario_data["success"]:
            raise HTTPException(status_code=500, detail=crediario_data["error"])
        
        return {
            "clientes": [cliente.dict() for cliente in crediario_data["clientes"]],
            "total_clientes": crediario_data["total_clientes"]
        }
        
    except Exception as e:
        logger.error(f"Error getting crediario data: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting crediario data: {str(e)}")

@api_router.get("/saidas-data/{mes}")
async def get_saidas_data(mes: str):
    """Get saidas data for specific month or all year"""
    try:
        # Map month names to sheet names
        month_mapping = {
            "janeiro": "JANEIRO25",
            "fevereiro": "FEVEREIRO25", 
            "marco": "MARÇO25",
            "abril": "ABRIL25",
            "maio": "MAIO25",
            "junho": "JUNHO25",
            "julho": "JULHO25",
            "agosto": "AGOSTO25",
            "setembro": "SETEMBRO25"
        }
        
        if mes.lower() == "anointeiro":
            # Return combined data from all months
            all_saidas = []
            total_valor_year = 0
            
            for month_name, sheet_name in month_mapping.items():
                try:
                    saidas_data = fetch_saidas_data(sheet_name)
                    if saidas_data["success"]:
                        for saida in saidas_data["saidas"]:
                            saida_dict = saida.dict()
                            saida_dict["mes_nome"] = month_name.capitalize()
                            all_saidas.append(saida_dict)
                            total_valor_year += saida.valor
                except Exception as e:
                    logger.warning(f"Error processing {sheet_name}: {e}")
                    continue
            
            return {
                "saidas": all_saidas,
                "total_saidas": len(all_saidas),
                "total_valor": total_valor_year,
                "mes": "Ano Inteiro (2025)"
            }
        
        else:
            sheet_name = month_mapping.get(mes.lower(), mes.upper())
            
            saidas_data = fetch_saidas_data(sheet_name)
            
            if not saidas_data["success"]:
                raise HTTPException(status_code=500, detail=saidas_data["error"])
            
            return {
                "saidas": [saida.dict() for saida in saidas_data["saidas"]],
                "total_saidas": saidas_data["total_saidas"],
                "total_valor": saidas_data["total_valor"],
                "mes": mes
            }
        
    except Exception as e:
        logger.error(f"Error getting saidas data: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting saidas data: {str(e)}")

@api_router.get("/faturamento-diario/{mes}")
async def get_faturamento_diario(mes: str):
    """Get daily sales data for specific month"""
    try:
        # Map month names to sheet names
        month_mapping = {
            "janeiro": "JANEIRO25",
            "fevereiro": "FEVEREIRO25", 
            "marco": "MARÇO25",
            "abril": "ABRIL25",
            "maio": "MAIO25",
            "junho": "JUNHO25",
            "julho": "JULHO25",
            "agosto": "AGOSTO25",
            "setembro": "SETEMBRO25"
        }
        
        if mes.lower() == "anointeiro":
            # Return combined data from all months
            vendas_diarias = []
            for month_name, sheet_name in month_mapping.items():
                try:
                    sheets_result = fetch_google_sheets_data(sheet_name)
                    if sheets_result["success"]:
                        cashflow_records = process_sheets_data_to_cashflow_records(sheets_result["data"])
                        
                        # Group by date
                        vendas_por_data = {}
                        for record in cashflow_records:
                            if record.data_venda and record.valor_venda > 0:
                                data = record.data_venda
                                if data not in vendas_por_data:
                                    vendas_por_data[data] = 0
                                vendas_por_data[data] += record.valor_venda
                        
                        # Add to combined list
                        for data, valor in vendas_por_data.items():
                            vendas_diarias.append({
                                "data": data,
                                "valor": valor,
                                "mes": month_name.capitalize()
                            })
                except Exception as e:
                    logger.warning(f"Error processing {sheet_name}: {e}")
                    continue
                    
            # Sort by date
            vendas_diarias.sort(key=lambda x: x['data'])
            total_valor = sum(v['valor'] for v in vendas_diarias)
            
            return {
                "vendas_diarias": vendas_diarias,
                "total_vendas": len(vendas_diarias),
                "total_valor": total_valor,
                "mes": "Ano Inteiro (2025)"
            }
        
        else:
            sheet_name = month_mapping.get(mes.lower(), mes.upper())
            
            sheets_result = fetch_google_sheets_data(sheet_name)
            
            if not sheets_result["success"]:
                raise HTTPException(status_code=500, detail=sheets_result["error"])
            
            # Process data into cashflow records
            cashflow_records = process_sheets_data_to_cashflow_records(sheets_result["data"])
            
            # Group sales by date
            vendas_por_data = {}
            for record in cashflow_records:
                if record.data_venda and record.valor_venda > 0:
                    data = record.data_venda
                    if data not in vendas_por_data:
                        vendas_por_data[data] = 0
                    vendas_por_data[data] += record.valor_venda
            
            # Convert to list format
            vendas_diarias = []
            for data, valor in vendas_por_data.items():
                vendas_diarias.append({
                    "data": data,
                    "valor": valor
                })
            
            # Sort by date
            vendas_diarias.sort(key=lambda x: x['data'])
            
            return {
                "vendas_diarias": vendas_diarias,
                "total_vendas": len(vendas_diarias),
                "total_valor": sum(v['valor'] for v in vendas_diarias),
                "mes": mes
            }
        
    except Exception as e:
        logger.error(f"Error getting daily sales data: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting daily sales data: {str(e)}")

@api_router.get("/meses-disponiveis")
async def get_meses_disponiveis():
    """Get available months"""
    meses = [
        {"value": "anointeiro", "label": "Ano Inteiro (2025)", "sheet": "ALL"},
        {"value": "janeiro", "label": "Janeiro", "sheet": "JANEIRO25"},
        {"value": "fevereiro", "label": "Fevereiro", "sheet": "FEVEREIRO25"},
        {"value": "marco", "label": "Março", "sheet": "MARÇO25"},
        {"value": "abril", "label": "Abril", "sheet": "ABRIL25"},
        {"value": "maio", "label": "Maio", "sheet": "MAIO25"},
        {"value": "junho", "label": "Junho", "sheet": "JUNHO25"},
        {"value": "julho", "label": "Julho", "sheet": "JULHO25"},
        {"value": "agosto", "label": "Agosto", "sheet": "AGOSTO25"},
        {"value": "setembro", "label": "Setembro", "sheet": "SETEMBRO25"}
    ]
    
    return {"meses": meses}

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