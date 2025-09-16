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
from rapidfuzz import fuzz, process

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

# Data cache for Google Sheets sync - improved with sheet-specific caching
sheets_cache = {
    "data": None,
    "last_updated": None,
    "update_interval": 300,  # 5 minutes
    "is_syncing": False,
    "sheet_cache": {},  # Cache for individual sheets
    "crediario_cache": {
        "data": None,
        "last_updated": None,
        "ttl": 600  # 10 minutes TTL for crediario
    }
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
    if not value_str or value_str == '' or str(value_str).strip() == '':
        return 0.0
    
    # Convert to string and clean
    clean_str = str(value_str).replace('R$', '').replace(' ', '')
    
    # Handle Brazilian number format: 1.234,56 -> 1234.56
    if ',' in clean_str and '.' in clean_str:
        # Format like 1.234,56
        clean_str = clean_str.replace('.', '').replace(',', '.')
    elif ',' in clean_str and '.' not in clean_str:
        # Format like 1234,56
        clean_str = clean_str.replace(',', '.')
    # If only dots, assume it's thousands separator: 1.234 -> 1234
    elif '.' in clean_str and len(clean_str.split('.')[-1]) == 3:
        clean_str = clean_str.replace('.', '')
    
    # Remove any remaining non-numeric characters except dot and minus
    clean_str = re.sub(r'[^\d.-]', '', clean_str)
    
    try:
        return float(clean_str) if clean_str else 0.0
    except:
        return 0.0

async def fetch_crediario_data() -> Dict[str, Any]:
    """
    Fetch crediario data from Google Sheets with purchase history - cached version
    Gets purchase history from CREDIARIO POR CONTRATO and saldo devedor from CREDIARIO
    """
    current_time = datetime.now(timezone.utc)
    
    # Check if we have cached crediario data
    cache = sheets_cache["crediario_cache"]
    if cache["data"] and cache["last_updated"]:
        elapsed = (current_time - cache["last_updated"]).total_seconds()
        if elapsed < cache["ttl"]:  # 10 minutes TTL
            logger.info("Using cached crediario data")
            return cache["data"]
    
    try:
        # First, get saldo devedor from CREDIARIO sheet
        crediario_url = f"https://sheets.googleapis.com/v4/spreadsheets/{GOOGLE_SHEETS_ID}/values/CREDIARIO?key={GOOGLE_SHEETS_API_KEY}"
        time.sleep(0.5)
        
        crediario_response = requests.get(crediario_url, timeout=30)
        crediario_response.raise_for_status()
        crediario_data = crediario_response.json()
        crediario_values = crediario_data.get('values', [])
        
        # Extract saldo devedor by client name from CREDIARIO sheet
        saldos_devedores = {}
        for i, row in enumerate(crediario_values):
            try:
                if not row or len(row) < 3 or i == 0:  # Skip header
                    continue
                
                nome_cell = str(row[0]).strip() if row[0] else ''
                vendas_cell = str(row[1]).strip() if len(row) > 1 and row[1] else ''
                saldo_cell = str(row[2]).strip() if len(row) > 2 and row[2] else ''
                
                # Check if this is a client row
                if (nome_cell and 
                    len(nome_cell) > 2 and 
                    nome_cell not in ['NOME', '', 'PAGAMENTOS CREDIÁRIO', 'Valor pago'] and
                    'TOTAL' not in nome_cell.upper() and
                    'SALDO DEVEDOR' not in nome_cell.upper() and
                    'R$' in vendas_cell and 'R$' in saldo_cell):
                    
                    vendas_totais = extract_currency_value(vendas_cell)
                    saldo_devedor = extract_currency_value(saldo_cell)
                    
                    saldos_devedores[nome_cell.upper()] = {
                        "vendas_totais": vendas_totais,
                        "saldo_devedor": saldo_devedor
                    }
            except Exception as e:
                logger.warning(f"Error processing crediario saldo row {i}: {e}")
                continue
        
        # Now get purchase history from CREDIARIO POR CONTRATO
        contrato_url = f"https://sheets.googleapis.com/v4/spreadsheets/{GOOGLE_SHEETS_ID}/values/CREDIARIO%20POR%20CONTRATO?key={GOOGLE_SHEETS_API_KEY}"
        time.sleep(0.5)
        
        response = requests.get(contrato_url, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        values = data.get('values', [])
        
        if not values or len(values) < 4:
            error_result = {"success": False, "error": "No data found in crediario por contrato sheet"}
            cache["data"] = error_result
            cache["last_updated"] = current_time
            return error_result
        
        clientes = {}
        
        # Extract client names and totals from row 4
        if len(values) > 3:
            client_row = values[3]  # Row 4 (index 3)
            
            # Process each group of 3 columns (NOME, DATA, COMPRA)
            for col_group in range(0, len(client_row), 3):
                if col_group + 2 >= len(client_row):
                    break
                
                nome_cell = str(client_row[col_group]).strip() if client_row[col_group] else ''
                valor_total_cell = str(client_row[col_group + 2]).strip() if len(client_row) > col_group + 2 and client_row[col_group + 2] else ''
                
                # If we have a client name and total value
                if nome_cell and valor_total_cell and 'R$' in valor_total_cell:
                    valor_total = extract_currency_value(valor_total_cell)
                    
                    if valor_total > 0:
                        # Look for saldo devedor in CREDIARIO sheet
                        nome_upper = nome_cell.upper()
                        saldo_info = saldos_devedores.get(nome_upper, {
                            "vendas_totais": valor_total,
                            "saldo_devedor": valor_total  # fallback to total if not found
                        })
                        
                        clientes[col_group] = {
                            "nome": nome_cell,
                            "vendas_totais": saldo_info["vendas_totais"],
                            "saldo_devedor": saldo_info["saldo_devedor"],
                            "compras": []
                        }
        
        # Extract purchase details from subsequent rows
        for row_index in range(4, len(values)):  # Start from row 5 (index 4)
            row = values[row_index]
            
            try:
                # Process each group of 3 columns
                for col_group in range(0, len(row), 3):
                    if col_group + 2 >= len(row):
                        break
                    
                    # Skip if this column group doesn't have a client
                    if col_group not in clientes:
                        continue
                    
                    data_cell = str(row[col_group + 1]).strip() if len(row) > col_group + 1 and row[col_group + 1] else ''
                    valor_cell = str(row[col_group + 2]).strip() if len(row) > col_group + 2 and row[col_group + 2] else ''
                    
                    # If we have a date and value, this is a purchase
                    if data_cell and valor_cell and 'R$' in valor_cell:
                        valor_compra = extract_currency_value(valor_cell)
                        
                        if valor_compra > 0:
                            clientes[col_group]["compras"].append({
                                "data": data_cell,
                                "valor": valor_compra
                            })
                            
            except Exception as e:
                logger.warning(f"Error processing crediario row {row_index}: {e}")
                continue
        
        # Convert dict to list and sort purchases by date
        clientes_list = []
        for cliente_data in clientes.values():
            # Sort purchases by date (newest first)
            try:
                cliente_data["compras"].sort(key=lambda x: x['data'], reverse=True)
            except:
                pass
            
            cliente = ClienteCrediario(**cliente_data)
            clientes_list.append(cliente)
        
        result = {
            "success": True,
            "clientes": clientes_list,
            "total_clientes": len(clientes_list)
        }
        
        # Cache the result
        cache["data"] = result
        cache["last_updated"] = current_time
        
        logger.info(f"Found {len(clientes_list)} clients in CREDIARIO POR CONTRATO with saldo from CREDIARIO")
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching crediario data: {str(e)}")
        
        # Return cached data if available
        if cache["data"]:
            logger.warning("Returning cached crediario data due to error")
            return cache["data"]
        
        return {"success": False, "error": f"Error: {str(e)}"}

async def get_client_purchase_history(client_name: str) -> List[Dict[str, Any]]:
    """
    Get purchase history for a specific client from sales sheets using fuzzy matching
    """
    compras = []
    
    # Normalize client name for better matching
    client_name_normalized = client_name.strip().casefold()
    
    # Search through all monthly sheets for this client's purchases
    months = ["JANEIRO25", "FEVEREIRO25", "MARÇO25", "ABRIL25", "MAIO25", 
              "JUNHO25", "JULHO25", "AGOSTO25", "SETEMBRO25"]
    
    logger.info(f"Searching for purchases for client: '{client_name}' (normalized: '{client_name_normalized}')")
    
    for month_sheet in months:
        try:
            sheets_result = fetch_google_sheets_data(month_sheet)
            if sheets_result["success"]:
                rows = sheets_result["data"]
                
                for row_index, row in enumerate(rows):
                    if row_index == 0 or len(row) < 17:  # Skip header and incomplete rows
                        continue
                    
                    try:
                        # Check for sales rows with actual data
                        data_venda = str(row[0]).strip() if len(row) > 0 and row[0] else ''
                        valor_venda_str = str(row[1]).strip() if len(row) > 1 and row[1] else ''
                        
                        # Skip rows without valid sale data
                        if not data_venda or not valor_venda_str or 'R$' not in valor_venda_str:
                            continue
                        
                        # Look for client name in multiple columns where it might appear
                        # Common columns that might contain client names: 2, 3, 4, 5, 6, etc.
                        potential_client_columns = [2, 3, 4, 5, 6, 7, 8]
                        
                        client_found = False
                        for col_index in potential_client_columns:
                            if len(row) > col_index and row[col_index]:
                                cell_value = str(row[col_index]).strip().casefold()
                                
                                # Multiple matching strategies
                                # 1. Exact match (case insensitive)
                                if client_name_normalized == cell_value:
                                    client_found = True
                                    break
                                
                                # 2. Partial match (client name contains or is contained in cell)
                                elif (client_name_normalized in cell_value or 
                                      cell_value in client_name_normalized):
                                    client_found = True
                                    break
                                
                                # 3. Fuzzy match (similarity > 80%)
                                elif len(client_name_normalized) > 3 and len(cell_value) > 3:
                                    similarity = fuzz.ratio(client_name_normalized, cell_value)
                                    if similarity > 80:
                                        client_found = True
                                        logger.info(f"Fuzzy match found: '{client_name}' ~ '{row[col_index]}' (similarity: {similarity}%)")
                                        break
                        
                        if client_found:
                            # Extract purchase value
                            valor_venda = extract_currency_value(valor_venda_str)
                            
                            if valor_venda > 0:
                                compras.append({
                                    "data": data_venda,
                                    "valor": valor_venda
                                })
                                logger.info(f"Added purchase for {client_name}: {data_venda} - R$ {valor_venda}")
                            
                    except Exception as e:
                        logger.warning(f"Error processing row {row_index} in {month_sheet} for {client_name}: {e}")
                        continue
                            
        except Exception as e:
            logger.warning(f"Error searching {month_sheet} for {client_name}: {e}")
            continue
    
    # Sort purchases by date (newest first) and deduplicate
    unique_compras = []
    seen_purchases = set()
    
    for compra in compras:
        key = f"{compra['data']}_{compra['valor']}"
        if key not in seen_purchases:
            seen_purchases.add(key)
            unique_compras.append(compra)
    
    try:
        unique_compras.sort(key=lambda x: x['data'], reverse=True)
    except:
        pass  # If date sorting fails, keep original order
    
    logger.info(f"Found {len(unique_compras)} unique purchases for client '{client_name}'")
    return unique_compras

async def get_client_purchase_history_simple(client_name: str) -> List[Dict[str, Any]]:
    """
    Simplified version of get_client_purchase_history to avoid quota issues
    Returns empty list to prevent API rate limiting
    """
    # For now, return empty list to avoid Google Sheets API quota issues
    # This can be enhanced later with better rate limiting or local caching
    logger.info(f"Simplified purchase history lookup for client: '{client_name}' - returning empty for rate limiting")
    return []

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

def fetch_google_sheets_data_cached(sheet_name: str = "MARÇO25") -> Dict[str, Any]:
    """
    Fetch data from Google Sheets with caching to avoid rate limits
    """
    current_time = datetime.now(timezone.utc)
    
    # Check if we have cached data for this sheet
    if sheet_name in sheets_cache["sheet_cache"]:
        cache_entry = sheets_cache["sheet_cache"][sheet_name]
        if cache_entry["last_updated"]:
            elapsed = (current_time - cache_entry["last_updated"]).total_seconds()
            if elapsed < 300:  # 5 minutes cache
                logger.info(f"Using cached data for sheet {sheet_name}")
                return cache_entry["data"]
    
    # Fetch fresh data
    try:
        time.sleep(0.5)  # Rate limiting delay
        result = fetch_google_sheets_data(sheet_name)
        
        # Cache the result
        sheets_cache["sheet_cache"][sheet_name] = {
            "data": result,
            "last_updated": current_time
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching {sheet_name}: {e}")
        # Return cached data if available, even if expired
        if (sheet_name in sheets_cache["sheet_cache"] and 
            sheets_cache["sheet_cache"][sheet_name]["data"]):
            logger.warning(f"Returning expired cache for {sheet_name}")
            return sheets_cache["sheet_cache"][sheet_name]["data"]
        
        return {"success": False, "error": str(e)}

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
        
        # Return raw values array instead of converting to dict
        return {
            "success": True,
            "data": values,  # Raw array data
            "headers": values[0] if values else [],
            "total_rows": len(values),
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
    Extract individual transactions correctly - with simplified filtering logic matching extract_current_month_data
    """
    cashflow_records = []
    
    # sheets_data comes as: {"values": [[row1], [row2], ...]}
    rows = sheets_data if isinstance(sheets_data, list) else sheets_data.get('values', [])
    
    for index, row in enumerate(rows):
        try:
            if not row or index == 0:
                continue
            
            # Apply same simplified filtering logic as extract_current_month_data
            data_cell = str(row[0]).strip() if len(row) > 0 and row[0] else ''
            
            # Check for total/sum keywords in the entire row
            row_text = ' '.join([str(cell).upper() for cell in row if cell]).strip()
            if ('TOTAL' in row_text or 'SOMA' in row_text or 'SUBTOTAL' in row_text or 
                'SALDO DEVEDOR' in row_text or 'SALDO INICIAL' in row_text):
                continue
            
            # Validate date format - must be DD/MM/YYYY or DD/MM/YY
            if not data_cell or not is_valid_date_format(data_cell):
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
            
            # Extract currency values with simple filtering
            valor_venda = 0.0
            valor_saida = 0.0
            valor_crediario = 0.0
            
            # Vendas - simple filtering
            if vendas_value and 'R$' in vendas_value and 'R$  -' not in vendas_value:
                valor_venda = extract_currency_value(vendas_value)
                if valor_venda <= 0:
                    valor_venda = 0.0
            
            # Saidas - simple filtering
            if saida_value and 'R$' in saida_value and 'R$  -' not in saida_value:
                valor_saida = extract_currency_value(saida_value)
                if valor_saida <= 0:
                    valor_saida = 0.0
            
            # Crediario - simple filtering
            if crediario_value and 'R$' in crediario_value and 'R$  -' not in crediario_value:
                valor_crediario = extract_currency_value(crediario_value)
                if valor_crediario <= 0:
                    valor_crediario = 0.0
            
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
                    mes="SHEET_MONTH",
                    source="sheets"
                )
                cashflow_records.append(cashflow_record)
                
        except Exception as e:
            logger.warning(f"Error processing row {index}: {e}")
            continue
    
    return cashflow_records

def extract_currency_value(value_str):
    """Extract numeric value from currency string like 'R$ 1.130,00'"""
    if not value_str or value_str == '' or str(value_str).strip() == '':
        return 0.0
    
    # Convert to string and clean
    clean_str = str(value_str).replace('R$', '').replace(' ', '')
    
    # Handle Brazilian number format: 1.234,56 -> 1234.56
    if ',' in clean_str and '.' in clean_str:
        # Format like 1.234,56
        clean_str = clean_str.replace('.', '').replace(',', '.')
    elif ',' in clean_str and '.' not in clean_str:
        # Format like 1234,56
        clean_str = clean_str.replace(',', '.')
    # If only dots, assume it's thousands separator: 1.234 -> 1234
    elif '.' in clean_str and len(clean_str.split('.')[-1]) == 3:
        clean_str = clean_str.replace('.', '')
    
    # Remove any remaining non-numeric characters except dot and minus
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

def is_valid_date_format(date_str: str) -> bool:
    """
    Check if a string is in valid date format (DD/MM/YYYY or DD/MM/YY)
    """
    try:
        if not date_str or '/' not in date_str:
            return False
        
        parts = date_str.split('/')
        if len(parts) < 2:
            return False
        
        day = int(parts[0])
        month = int(parts[1])
        
        # Basic validation
        if not (1 <= day <= 31 and 1 <= month <= 12):
            return False
            
        return True
    except:
        return False

def extract_current_month_data(sheet_name: str) -> Dict[str, Any]:
    """
    Extract and calculate KPIs from a specific month's sheet
    Using the proven logic that worked for Janeiro - simple but effective
    """
    try:
        sheets_result = fetch_google_sheets_data(sheet_name)
        
        if not sheets_result["success"]:
            return {
                "faturamento": 0,
                "saidas": 0,
                "recebido_crediario": 0,
                "num_vendas": 0,
                "error": sheets_result["error"]
            }
        
        rows = sheets_result["data"]
        
        if not rows:
            return {
                "faturamento": 0,
                "saidas": 0,
                "recebido_crediario": 0,
                "num_vendas": 0
            }
        
        # Initialize totals
        total_faturamento = 0
        total_saidas = 0
        total_recebido_crediario = 0
        num_vendas = 0
        
        # Process each row using the logic that worked for Janeiro
        for row_index, row in enumerate(rows):
            if row_index == 0 or not row:  # Skip header
                continue
                
            try:
                # Get date from column 0 for validation
                data_cell = str(row[0]).strip().lower() if len(row) > 0 and row[0] else ''
                
                # Skip total rows, empty dates, and non-date entries
                # This is the logic that worked correctly for Janeiro
                if (not data_cell or 
                    'total' in data_cell or 
                    'soma' in data_cell or 
                    'subtotal' in data_cell or
                    not ('/' in data_cell and any(c.isdigit() for c in data_cell))):
                    continue
                
                # Column 1: VENDAS (faturamento) - only count if row has valid date and non-zero value
                vendas_str = str(row[1]).strip() if len(row) > 1 and row[1] else ''
                if vendas_str and 'R$' in vendas_str and 'R$  -' not in vendas_str:
                    valor_venda = extract_currency_value(vendas_str)
                    if valor_venda > 0:
                        total_faturamento += valor_venda
                        num_vendas += 1
                        logger.debug(f"Added venda: {data_cell} - {vendas_str} -> {valor_venda} (row {row_index})")
                
                # Column 11: SAÍDA R$ (saídas) - only count if row has valid date and non-zero value
                # Exclude very high values that are likely totals (>15000 for safety)
                saidas_str = str(row[11]).strip() if len(row) > 11 and row[11] else ''
                if saidas_str and 'R$' in saidas_str and 'R$  -' not in saidas_str:
                    valor_saida = extract_currency_value(saidas_str)
                    if valor_saida > 0 and valor_saida < 15000:  # Exclude very high values that are totals
                        total_saidas += valor_saida
                        logger.debug(f"Added saida: {data_cell} - {saidas_str} -> {valor_saida} (row {row_index})")
                    elif valor_saida >= 15000:
                        logger.debug(f"Skipped large saida (likely total): {data_cell} - {saidas_str} -> {valor_saida} (row {row_index})")
                
                # Column 16: PAGAMENTOS CREDIÁRIO (recebido crediário) - only count if row has valid date and non-zero value
                # Exclude high values that are likely totals (>4000 for safety)
                crediario_str = str(row[16]).strip() if len(row) > 16 and row[16] else ''
                if crediario_str and 'R$' in crediario_str and 'R$  -' not in crediario_str:
                    valor_crediario = extract_currency_value(crediario_str)
                    if valor_crediario > 0 and valor_crediario < 4000:  # Exclude high values that are totals
                        total_recebido_crediario += valor_crediario
                        logger.debug(f"Added crediario: {data_cell} - {crediario_str} -> {valor_crediario} (row {row_index})")
                    elif valor_crediario >= 4000:
                        logger.debug(f"Skipped large crediario (likely total): {data_cell} - {crediario_str} -> {valor_crediario} (row {row_index})")
                        
            except Exception as e:
                logger.warning(f"Error processing row {row_index} in {sheet_name}: {e}")
                continue
        
        logger.info(f"Sheet {sheet_name} totals: Faturamento={total_faturamento}, Saidas={total_saidas}, Crediario={total_recebido_crediario}, Vendas={num_vendas}")
        
        return {
            "faturamento": total_faturamento,
            "saidas": total_saidas,
            "recebido_crediario": total_recebido_crediario,
            "num_vendas": num_vendas
        }
        
    except Exception as e:
        logger.error(f"Error extracting data from {sheet_name}: {e}")
        return {
            "faturamento": 0,
            "saidas": 0,
            "recebido_crediario": 0,
            "num_vendas": 0,
            "error": str(e)
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
                    month_data = extract_current_month_data(month_sheet)
                    total_faturamento += month_data["faturamento"]
                    total_saidas += month_data["saidas"]
                    total_recebido_crediario += month_data["recebido_crediario"]
                    total_num_vendas += month_data["num_vendas"]
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
            
            # Extract month data using improved function
            month_data = extract_current_month_data(sheet_name)
            
            if "error" in month_data:
                logger.error(f"Failed to extract data for {mes}: {month_data['error']}")
                return DashboardSummary(
                    faturamento=0, saidas=0, lucro_bruto=0, recebido_crediario=0,
                    a_receber_crediario=0, num_vendas=0, data_source="none", last_sync=None
                )
            
            return DashboardSummary(
                faturamento=month_data["faturamento"],
                saidas=month_data["saidas"],
                lucro_bruto=month_data["faturamento"] - month_data["saidas"],
                recebido_crediario=month_data["recebido_crediario"],
                a_receber_crediario=0,  # Will implement proper calculation later
                num_vendas=month_data["num_vendas"],
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
        crediario_data = await fetch_crediario_data()
        
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