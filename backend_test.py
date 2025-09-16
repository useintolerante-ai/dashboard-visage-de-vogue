import requests
import sys
import json
import io
import pandas as pd
from datetime import datetime

class SalesDashboardTester:
    def __init__(self, base_url="https://sales-dashboard-83.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {}
        
        if files is None:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=10)

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response keys: {list(response_data.keys()) if isinstance(response_data, dict) else 'Non-dict response'}")
                    return True, response_data
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_dashboard_summary_empty(self):
        """Test dashboard summary with no data"""
        success, response = self.run_test("Dashboard Summary (Empty)", "GET", "dashboard-summary", 200)
        if success and isinstance(response, dict):
            expected_keys = ['total_vendas', 'margem_media_24', 'margem_media_25', 'variacao_total', 'departamentos_count', 'top_departamentos']
            missing_keys = [key for key in expected_keys if key not in response]
            if missing_keys:
                print(f"   ⚠️  Missing keys in response: {missing_keys}")
            else:
                print(f"   ✅ All expected keys present")
                print(f"   📊 Empty state values: vendas={response.get('total_vendas')}, deps={response.get('departamentos_count')}")
        return success, response

    def test_chart_data_empty(self):
        """Test chart data with no data"""
        success, response = self.run_test("Chart Data (Empty)", "GET", "chart-data", 200)
        if success and isinstance(response, dict):
            expected_keys = ['vendas_por_departamento', 'comparativo_margens', 'variacao_departamentos']
            missing_keys = [key for key in expected_keys if key not in response]
            if missing_keys:
                print(f"   ⚠️  Missing keys in response: {missing_keys}")
            else:
                print(f"   ✅ All expected keys present")
        return success, response

    def test_sales_data_empty(self):
        """Test sales data with no data"""
        return self.run_test("Sales Data (Empty)", "GET", "sales-data", 200)

    def create_mock_excel_file(self):
        """Create a mock Excel file for testing"""
        data = {
            'Departamento': [101, 102, 103, 104, 105],
            'Custo Médio': [50.0, 75.0, 100.0, 125.0, 150.0],
            'D. Estoque': [30, 45, 60, 75, 90],
            'PMP': [60.0, 90.0, 120.0, 150.0, 180.0],
            'Meta IA': [1000, 1500, 2000, 2500, 3000],
            'Venda R$': [5000.0, 7500.0, 10000.0, 12500.0, 15000.0],
            'Margem 24': [0.20, 0.25, 0.30, 0.35, 0.40],
            'Margem 25': [0.22, 0.27, 0.32, 0.37, 0.42],
            '% Variação': [0.10, 0.08, 0.067, 0.057, 0.05]
        }
        
        df = pd.DataFrame(data)
        
        # Create Excel file in memory
        excel_buffer = io.BytesIO()
        df.to_excel(excel_buffer, index=False, engine='openpyxl')
        excel_buffer.seek(0)
        
        return excel_buffer

    def test_excel_upload(self):
        """Test Excel file upload"""
        try:
            excel_file = self.create_mock_excel_file()
            files = {'file': ('test_sales.xlsx', excel_file, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            
            success, response = self.run_test("Excel Upload", "POST", "upload-excel", 200, files=files)
            
            if success and isinstance(response, dict):
                records_count = response.get('records_count', 0)
                print(f"   📊 Processed {records_count} records")
                if records_count > 0:
                    print(f"   ✅ Upload successful with data")
                    return True, response
                else:
                    print(f"   ⚠️  Upload successful but no records processed")
                    return False, response
            return success, response
            
        except Exception as e:
            print(f"❌ Failed to create or upload Excel file: {str(e)}")
            return False, {}

    def test_dashboard_summary_with_data(self):
        """Test dashboard summary after uploading data"""
        success, response = self.run_test("Dashboard Summary (With Data)", "GET", "dashboard-summary", 200)
        if success and isinstance(response, dict):
            total_vendas = response.get('total_vendas', 0)
            departamentos_count = response.get('departamentos_count', 0)
            print(f"   📊 Total vendas: R$ {total_vendas:,.2f}")
            print(f"   📊 Departamentos: {departamentos_count}")
            print(f"   📊 Margem 2024: {response.get('margem_media_24', 0):.2%}")
            print(f"   📊 Margem 2025: {response.get('margem_media_25', 0):.2%}")
            
            if total_vendas > 0 and departamentos_count > 0:
                print(f"   ✅ Dashboard populated with data")
            else:
                print(f"   ⚠️  Dashboard may not be properly populated")
        return success, response

    def test_chart_data_with_data(self):
        """Test chart data after uploading data"""
        success, response = self.run_test("Chart Data (With Data)", "GET", "chart-data", 200)
        if success and isinstance(response, dict):
            vendas_count = len(response.get('vendas_por_departamento', []))
            margens_count = len(response.get('comparativo_margens', []))
            variacao_count = len(response.get('variacao_departamentos', []))
            
            print(f"   📊 Vendas data points: {vendas_count}")
            print(f"   📊 Margens data points: {margens_count}")
            print(f"   📊 Variação data points: {variacao_count}")
            
            if vendas_count > 0 and margens_count > 0 and variacao_count > 0:
                print(f"   ✅ Chart data populated")
            else:
                print(f"   ⚠️  Chart data may be incomplete")
        return success, response

def main():
    print("🚀 Starting Sales Dashboard Backend API Tests")
    print("=" * 60)
    
    tester = SalesDashboardTester()
    
    # Test 1: Basic API connectivity
    print("\n📡 PHASE 1: Basic API Connectivity")
    tester.test_root_endpoint()
    
    # Test 2: Empty state endpoints
    print("\n📊 PHASE 2: Empty State Testing")
    tester.test_dashboard_summary_empty()
    tester.test_chart_data_empty()
    tester.test_sales_data_empty()
    
    # Test 3: Excel upload functionality
    print("\n📤 PHASE 3: Excel Upload Testing")
    upload_success, _ = tester.test_excel_upload()
    
    # Test 4: Data populated endpoints (only if upload was successful)
    if upload_success:
        print("\n📈 PHASE 4: Data Population Testing")
        tester.test_dashboard_summary_with_data()
        tester.test_chart_data_with_data()
        tester.run_test("Sales Data (With Data)", "GET", "sales-data", 200)
    else:
        print("\n⚠️  PHASE 4: Skipped (Upload failed)")
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS")
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All backend tests passed!")
        return 0
    else:
        failed_tests = tester.tests_run - tester.tests_passed
        print(f"❌ {failed_tests} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())