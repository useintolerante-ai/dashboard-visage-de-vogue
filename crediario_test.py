#!/usr/bin/env python3
"""
Focused test for /api/crediario-data endpoint
Testing specific requirements from review request:
1. Endpoint functionality
2. Data includes "compras" array for each client
3. Each "compras" item has both "data" and "valor"
4. Dates are in correct format
5. Data is extracted correctly from "CREDIARIO POR CONTRATO" sheet
"""

import requests
import json
import re
from datetime import datetime

class CrediarioDataTester:
    def __init__(self, base_url="https://vogue-dashboard.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.results = {
            "endpoint_working": False,
            "has_compras_array": False,
            "compras_have_data_valor": False,
            "dates_correct_format": False,
            "data_extraction_working": False,
            "total_clients": 0,
            "sample_client_data": None,
            "errors": []
        }

    def is_valid_date_format(self, date_str):
        """Check if date is in DD/MM/YYYY format"""
        if not date_str:
            return False
        
        # Check for DD/MM/YYYY or DD/MM/YY format
        pattern = r'^\d{1,2}/\d{1,2}/\d{2,4}$'
        if not re.match(pattern, date_str):
            return False
        
        try:
            # Try to parse the date to ensure it's valid
            parts = date_str.split('/')
            day, month = int(parts[0]), int(parts[1])
            year = int(parts[2])
            
            # Basic validation
            if not (1 <= day <= 31 and 1 <= month <= 12):
                return False
            
            # If 2-digit year, assume 20xx
            if year < 100:
                year += 2000
            
            # Try to create a date object to validate
            datetime(year, month, day)
            return True
        except (ValueError, IndexError):
            return False

    def test_crediario_data_endpoint(self):
        """Test the /api/crediario-data endpoint comprehensively"""
        print("🔍 Testing /api/crediario-data endpoint...")
        print("=" * 60)
        
        url = f"{self.api_url}/crediario-data"
        print(f"📡 URL: {url}")
        
        try:
            # Make the request
            response = requests.get(url, timeout=30)
            print(f"📊 Status Code: {response.status_code}")
            
            if response.status_code != 200:
                self.results["errors"].append(f"HTTP {response.status_code}: {response.text}")
                print(f"❌ Endpoint failed with status {response.status_code}")
                return False
            
            # Parse JSON response
            try:
                data = response.json()
                print(f"✅ Endpoint is working - Status 200, valid JSON")
                self.results["endpoint_working"] = True
            except json.JSONDecodeError as e:
                self.results["errors"].append(f"Invalid JSON response: {e}")
                print(f"❌ Invalid JSON response: {e}")
                return False
            
            # Check basic structure
            if not isinstance(data, dict):
                self.results["errors"].append("Response is not a dictionary")
                print(f"❌ Response is not a dictionary")
                return False
            
            print(f"📋 Response keys: {list(data.keys())}")
            
            # Check for required keys
            if "clientes" not in data:
                self.results["errors"].append("Missing 'clientes' key in response")
                print(f"❌ Missing 'clientes' key in response")
                return False
            
            if "total_clientes" not in data:
                self.results["errors"].append("Missing 'total_clientes' key in response")
                print(f"❌ Missing 'total_clientes' key in response")
                return False
            
            clientes = data.get("clientes", [])
            total_clientes = data.get("total_clientes", 0)
            
            print(f"📊 Total clientes: {total_clientes}")
            print(f"📊 Clientes array length: {len(clientes)}")
            
            self.results["total_clients"] = total_clientes
            
            if not clientes or len(clientes) == 0:
                self.results["errors"].append("No clients found in response")
                print(f"❌ No clients found in response")
                return False
            
            print(f"✅ Found {len(clientes)} clients")
            
            # Test each requirement with the first few clients
            self.test_compras_array_requirement(clientes)
            self.test_data_valor_requirement(clientes)
            self.test_date_format_requirement(clientes)
            self.test_data_extraction_requirement(clientes)
            
            # Store sample client data for analysis
            if clientes:
                self.results["sample_client_data"] = clientes[0]
            
            return True
            
        except requests.exceptions.Timeout:
            self.results["errors"].append("Request timeout")
            print(f"❌ Request timeout")
            return False
        except Exception as e:
            self.results["errors"].append(f"Unexpected error: {str(e)}")
            print(f"❌ Unexpected error: {str(e)}")
            return False

    def test_compras_array_requirement(self, clientes):
        """Test requirement: Data includes 'compras' array for each client"""
        print(f"\n🛒 Testing requirement: 'compras' array for each client")
        
        clients_with_compras = 0
        clients_without_compras = 0
        
        for i, cliente in enumerate(clientes[:5]):  # Test first 5 clients
            nome = cliente.get("nome", f"Client {i}")
            
            if "compras" not in cliente:
                print(f"   ❌ Client '{nome}' missing 'compras' array")
                clients_without_compras += 1
                continue
            
            compras = cliente.get("compras", [])
            if not isinstance(compras, list):
                print(f"   ❌ Client '{nome}' 'compras' is not an array")
                clients_without_compras += 1
                continue
            
            print(f"   ✅ Client '{nome}' has 'compras' array with {len(compras)} items")
            clients_with_compras += 1
        
        if clients_with_compras > 0:
            self.results["has_compras_array"] = True
            print(f"✅ PASSED: {clients_with_compras} clients have 'compras' array")
        else:
            self.results["errors"].append("No clients have 'compras' array")
            print(f"❌ FAILED: No clients have 'compras' array")

    def test_data_valor_requirement(self, clientes):
        """Test requirement: Each 'compras' item has both 'data' and 'valor'"""
        print(f"\n📅 Testing requirement: Each 'compras' item has 'data' and 'valor'")
        
        valid_compras_count = 0
        invalid_compras_count = 0
        
        for i, cliente in enumerate(clientes[:5]):  # Test first 5 clients
            nome = cliente.get("nome", f"Client {i}")
            compras = cliente.get("compras", [])
            
            if not compras:
                print(f"   ⚠️  Client '{nome}' has no compras to test")
                continue
            
            client_valid_compras = 0
            client_invalid_compras = 0
            
            for j, compra in enumerate(compras[:3]):  # Test first 3 compras per client
                has_data = "data" in compra
                has_valor = "valor" in compra
                
                if has_data and has_valor:
                    data_value = compra.get("data")
                    valor_value = compra.get("valor")
                    print(f"   ✅ Client '{nome}' compra {j+1}: data='{data_value}', valor={valor_value}")
                    client_valid_compras += 1
                    valid_compras_count += 1
                else:
                    missing_fields = []
                    if not has_data:
                        missing_fields.append("data")
                    if not has_valor:
                        missing_fields.append("valor")
                    print(f"   ❌ Client '{nome}' compra {j+1} missing: {', '.join(missing_fields)}")
                    client_invalid_compras += 1
                    invalid_compras_count += 1
            
            if client_valid_compras > 0:
                print(f"   📊 Client '{nome}': {client_valid_compras} valid, {client_invalid_compras} invalid compras")
        
        if valid_compras_count > 0 and invalid_compras_count == 0:
            self.results["compras_have_data_valor"] = True
            print(f"✅ PASSED: All tested compras have 'data' and 'valor' fields")
        elif valid_compras_count > 0:
            self.results["compras_have_data_valor"] = True
            print(f"⚠️  PARTIAL: {valid_compras_count} valid, {invalid_compras_count} invalid compras")
        else:
            self.results["errors"].append("No compras have both 'data' and 'valor' fields")
            print(f"❌ FAILED: No compras have both 'data' and 'valor' fields")

    def test_date_format_requirement(self, clientes):
        """Test requirement: Dates are in correct format"""
        print(f"\n📆 Testing requirement: Dates are in correct format")
        
        valid_dates_count = 0
        invalid_dates_count = 0
        
        for i, cliente in enumerate(clientes[:5]):  # Test first 5 clients
            nome = cliente.get("nome", f"Client {i}")
            compras = cliente.get("compras", [])
            
            if not compras:
                continue
            
            for j, compra in enumerate(compras[:3]):  # Test first 3 compras per client
                data_value = compra.get("data")
                
                if not data_value:
                    print(f"   ⚠️  Client '{nome}' compra {j+1}: no date value")
                    continue
                
                if self.is_valid_date_format(str(data_value)):
                    print(f"   ✅ Client '{nome}' compra {j+1}: valid date '{data_value}'")
                    valid_dates_count += 1
                else:
                    print(f"   ❌ Client '{nome}' compra {j+1}: invalid date format '{data_value}'")
                    invalid_dates_count += 1
        
        if valid_dates_count > 0 and invalid_dates_count == 0:
            self.results["dates_correct_format"] = True
            print(f"✅ PASSED: All {valid_dates_count} dates are in correct format")
        elif valid_dates_count > 0:
            self.results["dates_correct_format"] = True
            print(f"⚠️  PARTIAL: {valid_dates_count} valid, {invalid_dates_count} invalid dates")
        else:
            self.results["errors"].append("No dates are in correct format")
            print(f"❌ FAILED: No dates are in correct format")

    def test_data_extraction_requirement(self, clientes):
        """Test requirement: Data is extracted correctly from CREDIARIO POR CONTRATO sheet"""
        print(f"\n📊 Testing requirement: Data extraction from CREDIARIO POR CONTRATO")
        
        # Look for the specific client mentioned in the review request: ALIEZE NASCIMENTO
        alieze_found = False
        alieze_data = None
        
        for cliente in clientes:
            nome = cliente.get("nome", "").upper()
            if "ALIEZE" in nome and "NASCIMENTO" in nome:
                alieze_found = True
                alieze_data = cliente
                break
        
        if alieze_found:
            print(f"✅ Found ALIEZE NASCIMENTO in client list")
            
            # Check the expected data from the review request
            vendas_totais = alieze_data.get("vendas_totais", 0)
            saldo_devedor = alieze_data.get("saldo_devedor", 0)
            compras = alieze_data.get("compras", [])
            
            print(f"   📊 Vendas totais: R$ {vendas_totais:,.2f}")
            print(f"   📊 Saldo devedor: R$ {saldo_devedor:,.2f}")
            print(f"   📊 Number of compras: {len(compras)}")
            
            # Expected from review request:
            # Total: R$ 2.367,00
            # Compras: 03/10/2024: R$ 598,00, 04/12/2024: R$ 549,00, 16/08/2025: R$ 1.220,00
            
            expected_total = 2367.00
            expected_compras = [
                {"data": "03/10/2024", "valor": 598.00},
                {"data": "04/12/2024", "valor": 549.00},
                {"data": "16/08/2025", "valor": 1220.00}
            ]
            
            # Check if total matches (allow some tolerance)
            total_tolerance = 50.0  # R$ 50 tolerance
            if abs(vendas_totais - expected_total) <= total_tolerance:
                print(f"   ✅ Total vendas matches expected: R$ {expected_total:,.2f}")
            else:
                print(f"   ⚠️  Total vendas differs from expected: got R$ {vendas_totais:,.2f}, expected R$ {expected_total:,.2f}")
            
            # Check compras details
            print(f"   📋 Compras details:")
            for i, compra in enumerate(compras):
                data = compra.get("data", "N/A")
                valor = compra.get("valor", 0)
                print(f"      {i+1}. {data}: R$ {valor:,.2f}")
            
            # Check if we have the expected compras (at least some of them)
            found_expected_compras = 0
            for expected_compra in expected_compras:
                for compra in compras:
                    if (compra.get("data") == expected_compra["data"] and 
                        abs(compra.get("valor", 0) - expected_compra["valor"]) < 1.0):
                        found_expected_compras += 1
                        break
            
            if found_expected_compras > 0:
                print(f"   ✅ Found {found_expected_compras}/{len(expected_compras)} expected compras")
                self.results["data_extraction_working"] = True
            else:
                print(f"   ⚠️  No expected compras found - data may have changed or extraction needs review")
                
        else:
            print(f"   ⚠️  ALIEZE NASCIMENTO not found in client list")
            print(f"   📋 Available clients (first 10):")
            for i, cliente in enumerate(clientes[:10]):
                nome = cliente.get("nome", f"Client {i}")
                print(f"      {i+1}. {nome}")
        
        # General data extraction validation
        clients_with_data = 0
        for cliente in clientes[:10]:  # Check first 10 clients
            nome = cliente.get("nome", "")
            vendas_totais = cliente.get("vendas_totais", 0)
            saldo_devedor = cliente.get("saldo_devedor", 0)
            compras = cliente.get("compras", [])
            
            if vendas_totais > 0 and len(compras) > 0:
                clients_with_data += 1
        
        if clients_with_data > 0:
            print(f"✅ Data extraction appears to be working: {clients_with_data} clients have sales data and compras")
            self.results["data_extraction_working"] = True
        else:
            self.results["errors"].append("No clients have meaningful sales data and compras")
            print(f"❌ Data extraction may not be working: no clients have meaningful data")

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 CREDIARIO DATA ENDPOINT TEST SUMMARY")
        print("=" * 60)
        
        print(f"1. ✅ Endpoint working: {'YES' if self.results['endpoint_working'] else 'NO'}")
        print(f"2. ✅ Has compras array: {'YES' if self.results['has_compras_array'] else 'NO'}")
        print(f"3. ✅ Compras have data+valor: {'YES' if self.results['compras_have_data_valor'] else 'NO'}")
        print(f"4. ✅ Dates correct format: {'YES' if self.results['dates_correct_format'] else 'NO'}")
        print(f"5. ✅ Data extraction working: {'YES' if self.results['data_extraction_working'] else 'NO'}")
        
        print(f"\n📊 Total clients found: {self.results['total_clients']}")
        
        if self.results["errors"]:
            print(f"\n❌ ERRORS FOUND:")
            for error in self.results["errors"]:
                print(f"   • {error}")
        
        # Overall assessment
        requirements_met = sum([
            self.results['endpoint_working'],
            self.results['has_compras_array'],
            self.results['compras_have_data_valor'],
            self.results['dates_correct_format'],
            self.results['data_extraction_working']
        ])
        
        print(f"\n🎯 OVERALL ASSESSMENT: {requirements_met}/5 requirements met")
        
        if requirements_met == 5:
            print("🎉 ALL REQUIREMENTS PASSED - Endpoint is working correctly!")
            return True
        elif requirements_met >= 3:
            print("⚠️  MOSTLY WORKING - Some issues need attention")
            return True
        else:
            print("❌ CRITICAL ISSUES - Endpoint needs significant fixes")
            return False

def main():
    print("🚀 CREDIARIO DATA ENDPOINT FOCUSED TEST")
    print("Testing specific requirements from review request")
    print("=" * 60)
    
    tester = CrediarioDataTester()
    
    # Run the comprehensive test
    success = tester.test_crediario_data_endpoint()
    
    # Print summary
    overall_success = tester.print_summary()
    
    return 0 if overall_success else 1

if __name__ == "__main__":
    exit(main())