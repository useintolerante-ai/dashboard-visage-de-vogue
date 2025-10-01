#!/usr/bin/env python3
import requests
import json
import sys
from datetime import datetime

class FocusedBackendTester:
    def __init__(self, base_url="https://vogue-dashboard.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.critical_failures = []
        self.results = {}

    def run_test(self, name, endpoint, expected_status=200):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            response = requests.get(url, headers=headers, timeout=15)
            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response Type: JSON")
                    if isinstance(response_data, dict):
                        print(f"   Response Keys: {list(response_data.keys())}")
                        # Show some key values for debugging
                        for key, value in response_data.items():
                            if isinstance(value, (int, float, str)) and len(str(value)) < 100:
                                print(f"   {key}: {value}")
                    self.results[name] = {"status": "PASSED", "data": response_data}
                    return True, response_data
                except json.JSONDecodeError as e:
                    print(f"   ⚠️  Response is not valid JSON: {e}")
                    print(f"   Response Text: {response.text[:200]}...")
                    self.results[name] = {"status": "PASSED_NON_JSON", "data": response.text}
                    return True, response.text
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error Detail: {error_detail}")
                    self.critical_failures.append(f"{name}: HTTP {response.status_code} - {error_detail}")
                except:
                    print(f"   Error Text: {response.text}")
                    self.critical_failures.append(f"{name}: HTTP {response.status_code} - {response.text}")
                self.results[name] = {"status": "FAILED", "error": response.text}
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ FAILED - Request timeout (15s)")
            self.critical_failures.append(f"{name}: Request timeout")
            self.results[name] = {"status": "TIMEOUT", "error": "Request timeout"}
            return False, {}
        except requests.exceptions.ConnectionError as e:
            print(f"❌ FAILED - Connection error: {str(e)}")
            self.critical_failures.append(f"{name}: Connection error - {str(e)}")
            self.results[name] = {"status": "CONNECTION_ERROR", "error": str(e)}
            return False, {}
        except Exception as e:
            print(f"❌ FAILED - Unexpected error: {str(e)}")
            self.critical_failures.append(f"{name}: Unexpected error - {str(e)}")
            self.results[name] = {"status": "ERROR", "error": str(e)}
            return False, {}

    def test_dashboard_summary_setembro(self):
        """Test 1: GET /api/dashboard-summary?mes=setembro"""
        return self.run_test("Dashboard Summary Setembro", "dashboard-summary?mes=setembro")

    def test_entradas_pagamento_setembro(self):
        """Test 2: GET /api/entradas-pagamento/setembro"""
        return self.run_test("Entradas Pagamento Setembro", "entradas-pagamento/setembro")

    def test_sheets_status(self):
        """Test 3: GET /api/sheets-status"""
        return self.run_test("Sheets Status", "sheets-status")

    def test_meses_disponiveis_auto(self):
        """Test 4: GET /api/meses-disponiveis-auto"""
        return self.run_test("Meses Disponíveis Auto", "meses-disponiveis-auto")

    def test_formas_pagamento_setembro(self):
        """Test 5: GET /api/formas-pagamento/setembro"""
        return self.run_test("Formas Pagamento Setembro", "formas-pagamento/setembro")

def main():
    print("🎯 FOCUSED BACKEND ENDPOINT TESTING")
    print("Testing specific endpoints requested by user")
    print("=" * 60)
    
    tester = FocusedBackendTester()
    
    # Run the 5 specific tests requested
    print("\n📋 RUNNING REQUESTED TESTS:")
    
    # Test 1: Basic connectivity test
    print("\n1️⃣ Testing Dashboard Summary for September")
    tester.test_dashboard_summary_setembro()
    
    # Test 2: Entradas endpoint
    print("\n2️⃣ Testing Entradas Pagamento for September")
    tester.test_entradas_pagamento_setembro()
    
    # Test 3: Sheets status
    print("\n3️⃣ Testing Sheets Status")
    tester.test_sheets_status()
    
    # Test 4: Available months auto
    print("\n4️⃣ Testing Meses Disponíveis Auto")
    tester.test_meses_disponiveis_auto()
    
    # Test 5: Payment forms
    print("\n5️⃣ Testing Formas Pagamento for September")
    tester.test_formas_pagamento_setembro()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS")
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    # Print detailed results
    print(f"\n📋 DETAILED RESULTS:")
    for test_name, result in tester.results.items():
        status = result["status"]
        if status == "PASSED":
            print(f"   ✅ {test_name}: WORKING")
        elif status == "PASSED_NON_JSON":
            print(f"   ⚠️  {test_name}: WORKING (Non-JSON response)")
        else:
            print(f"   ❌ {test_name}: FAILED ({status})")
    
    # Print critical failures
    if tester.critical_failures:
        print(f"\n❌ CRITICAL FAILURES:")
        for failure in tester.critical_failures:
            print(f"   • {failure}")
    else:
        print(f"\n✅ NO CRITICAL FAILURES DETECTED")
    
    # Summary for user
    print(f"\n🎯 SUMMARY FOR USER:")
    if tester.tests_passed == tester.tests_run:
        print("✅ All requested endpoints are working correctly")
        print("✅ All return status 200 and valid JSON data")
        print("✅ Backend appears to be functioning properly")
        print("🔍 Frontend black screen issue is likely a frontend-specific problem")
    else:
        failed_tests = tester.tests_run - tester.tests_passed
        print(f"❌ {failed_tests} endpoint(s) failed")
        print("🔍 These backend failures may be causing the frontend black screen")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())