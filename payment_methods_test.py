import requests
import sys
import json
from datetime import datetime

class PaymentMethodsTester:
    def __init__(self, base_url="https://vogue-dashboard.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.critical_failures = []

    def run_test(self, name, method, endpoint, expected_status, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if params:
            print(f"   Params: {params}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=15)
            elif method == 'POST':
                response = requests.post(url, headers=headers, timeout=15)

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    return True, response_data
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                    self.critical_failures.append(f"{name}: {error_detail}")
                except:
                    print(f"   Error: {response.text}")
                    self.critical_failures.append(f"{name}: {response.text}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            self.critical_failures.append(f"{name}: Request timeout")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.critical_failures.append(f"{name}: {str(e)}")
            return False, {}

    def test_formas_pagamento_setembro(self):
        """Test /api/formas-pagamento/setembro endpoint - should return all 5 payment methods"""
        success, response = self.run_test("Formas Pagamento - Setembro", "GET", "formas-pagamento/setembro", 200)
        
        if not success:
            return False, response
            
        if not isinstance(response, dict):
            print(f"   ❌ Response is not a dictionary")
            self.critical_failures.append("Formas Pagamento Setembro: Response is not JSON object")
            return False, response
        
        print(f"   📊 Response structure: {list(response.keys())}")
        
        # Check for expected keys
        expected_keys = ['formas_pagamento', 'total']
        missing_keys = [key for key in expected_keys if key not in response]
        if missing_keys:
            print(f"   ❌ Missing keys in response: {missing_keys}")
            self.critical_failures.append(f"Formas Pagamento Setembro: Missing keys {missing_keys}")
            return False, response
        
        formas_pagamento = response.get('formas_pagamento', [])
        total = response.get('total', 0)
        
        print(f"   📊 Total: R$ {total:,.2f}")
        print(f"   📊 Payment methods count: {len(formas_pagamento)}")
        
        # Expected payment methods according to user request
        expected_methods = ["Dinheiro", "Crediário", "Crédito", "PIX", "Débito"]
        
        if not formas_pagamento:
            print(f"   ❌ No payment methods found in response")
            self.critical_failures.append("Formas Pagamento Setembro: No payment methods in response")
            return False, response
        
        # Check each payment method structure and presence
        found_methods = []
        for forma in formas_pagamento:
            if not isinstance(forma, dict):
                print(f"   ❌ Payment method is not a dictionary: {forma}")
                continue
                
            metodo = forma.get('metodo', forma.get('forma', ''))
            valor = forma.get('valor', 0)
            percentual = forma.get('percentual', 0)
            
            found_methods.append(metodo)
            print(f"   📊 {metodo}: R$ {valor:,.2f} ({percentual:.1f}%)")
            
            # Check if structure matches expected format
            required_fields = ['metodo', 'valor', 'percentual'] if 'metodo' in forma else ['forma', 'valor', 'percentual']
            missing_fields = [field for field in required_fields if field not in forma]
            if missing_fields:
                print(f"   ⚠️  Payment method {metodo} missing fields: {missing_fields}")
        
        # Check if all 5 expected methods are present
        missing_methods = []
        for expected_method in expected_methods:
            # Check for exact match or similar variations
            found = False
            for found_method in found_methods:
                if (expected_method.lower() in found_method.lower() or 
                    found_method.lower() in expected_method.lower() or
                    expected_method == found_method):
                    found = True
                    break
            if not found:
                missing_methods.append(expected_method)
        
        print(f"   📊 Found methods: {found_methods}")
        print(f"   📊 Expected methods: {expected_methods}")
        
        if missing_methods:
            print(f"   ❌ Missing payment methods: {missing_methods}")
            self.critical_failures.append(f"Formas Pagamento Setembro: Missing methods {missing_methods}")
            return False, response
        
        # Check if R$ 0,00 values are included
        zero_value_methods = [forma for forma in formas_pagamento if forma.get('valor', 0) == 0]
        if zero_value_methods:
            print(f"   ✅ R$ 0,00 values are included: {len(zero_value_methods)} methods with zero values")
            for zero_method in zero_value_methods:
                metodo = zero_method.get('metodo', zero_method.get('forma', ''))
                print(f"      • {metodo}: R$ 0,00")
        else:
            print(f"   ⚠️  No R$ 0,00 values found - all methods have positive values")
        
        print(f"   ✅ All 5 payment methods found with correct structure")
        return True, response

    def test_entradas_pagamento_setembro(self):
        """Test /api/entradas-pagamento/setembro endpoint - should return all forms of entrada/recebimento"""
        success, response = self.run_test("Entradas Pagamento - Setembro", "GET", "entradas-pagamento/setembro", 200)
        
        if not success:
            return False, response
            
        if not isinstance(response, dict):
            print(f"   ❌ Response is not a dictionary")
            self.critical_failures.append("Entradas Pagamento Setembro: Response is not JSON object")
            return False, response
        
        print(f"   📊 Response structure: {list(response.keys())}")
        
        # Check for expected keys
        expected_keys = ['formas_pagamento', 'total']
        missing_keys = [key for key in expected_keys if key not in response]
        if missing_keys:
            print(f"   ❌ Missing keys in response: {missing_keys}")
            self.critical_failures.append(f"Entradas Pagamento Setembro: Missing keys {missing_keys}")
            return False, response
        
        formas_pagamento = response.get('formas_pagamento', [])
        total = response.get('total', 0)
        
        print(f"   📊 Total: R$ {total:,.2f}")
        print(f"   📊 Payment forms count: {len(formas_pagamento)}")
        
        if not formas_pagamento:
            print(f"   ❌ No payment forms found in response")
            self.critical_failures.append("Entradas Pagamento Setembro: No payment forms in response")
            return False, response
        
        # Check each payment form structure
        for forma in formas_pagamento:
            if not isinstance(forma, dict):
                print(f"   ❌ Payment form is not a dictionary: {forma}")
                continue
                
            forma_name = forma.get('forma', forma.get('metodo', ''))
            valor = forma.get('valor', 0)
            percentual = forma.get('percentual', 0)
            
            print(f"   📊 {forma_name}: R$ {valor:,.2f} ({percentual:.1f}%)")
            
            # Check if structure has required fields
            required_fields = ['forma', 'valor', 'percentual'] if 'forma' in forma else ['metodo', 'valor', 'percentual']
            missing_fields = [field for field in required_fields if field not in forma]
            if missing_fields:
                print(f"   ⚠️  Payment form {forma_name} missing fields: {missing_fields}")
        
        # Check if R$ 0,00 values are included
        zero_value_forms = [forma for forma in formas_pagamento if forma.get('valor', 0) == 0]
        if zero_value_forms:
            print(f"   ✅ R$ 0,00 values are included: {len(zero_value_forms)} forms with zero values")
            for zero_form in zero_value_forms:
                forma_name = zero_form.get('forma', zero_form.get('metodo', ''))
                print(f"      • {forma_name}: R$ 0,00")
        else:
            print(f"   ⚠️  No R$ 0,00 values found - all forms have positive values")
        
        print(f"   ✅ Entradas pagamento endpoint working with correct structure")
        return True, response

    def compare_endpoints_consistency(self):
        """Compare both endpoints to check for consistency in data structure and naming"""
        print(f"\n🔍 COMPARING ENDPOINTS CONSISTENCY")
        print("=" * 50)
        
        # Get data from both endpoints
        formas_success, formas_response = self.test_formas_pagamento_setembro()
        entradas_success, entradas_response = self.test_entradas_pagamento_setembro()
        
        if not (formas_success and entradas_success):
            print(f"   ❌ Cannot compare - one or both endpoints failed")
            return False
        
        # Compare structure
        formas_methods = formas_response.get('formas_pagamento', [])
        entradas_methods = entradas_response.get('formas_pagamento', [])
        
        print(f"\n📊 STRUCTURE COMPARISON:")
        print(f"   Formas Pagamento methods: {len(formas_methods)}")
        print(f"   Entradas Pagamento methods: {len(entradas_methods)}")
        
        # Check naming consistency
        formas_names = [m.get('metodo', m.get('forma', '')) for m in formas_methods]
        entradas_names = [m.get('forma', m.get('metodo', '')) for m in entradas_methods]
        
        print(f"   Formas names: {formas_names}")
        print(f"   Entradas names: {entradas_names}")
        
        # Check if naming is standardized
        naming_issues = []
        for formas_name in formas_names:
            similar_found = False
            for entradas_name in entradas_names:
                if (formas_name.lower() in entradas_name.lower() or 
                    entradas_name.lower() in formas_name.lower()):
                    similar_found = True
                    if formas_name != entradas_name:
                        naming_issues.append(f"'{formas_name}' vs '{entradas_name}'")
                    break
        
        if naming_issues:
            print(f"   ⚠️  Naming inconsistencies found: {naming_issues}")
        else:
            print(f"   ✅ Payment method names are consistent between endpoints")
        
        return True

def main():
    print("🚀 Testing Payment Methods Endpoints - FOCUSED TEST")
    print("=" * 60)
    print("Testing specifically requested endpoints:")
    print("1. /api/formas-pagamento/setembro")
    print("2. /api/entradas-pagamento/setembro")
    print("=" * 60)
    
    tester = PaymentMethodsTester()
    
    # Test the two specific endpoints requested
    print("\n🎯 ENDPOINT 1: /api/formas-pagamento/setembro")
    print("Should return: Dinheiro, Crediário, Crédito, PIX, Débito (even with R$ 0,00)")
    formas_success, formas_data = tester.test_formas_pagamento_setembro()
    
    print("\n🎯 ENDPOINT 2: /api/entradas-pagamento/setembro")
    print("Should return: All forms of entrada/recebimento")
    entradas_success, entradas_data = tester.test_entradas_pagamento_setembro()
    
    # Compare endpoints for consistency
    print("\n🔍 CONSISTENCY CHECK")
    tester.compare_endpoints_consistency()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS")
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    # Print critical failures
    if tester.critical_failures:
        print(f"\n❌ CRITICAL FAILURES:")
        for failure in tester.critical_failures:
            print(f"   • {failure}")
    else:
        print(f"\n✅ No critical failures found")
    
    # Specific findings summary
    print(f"\n🎯 SPECIFIC FINDINGS:")
    if formas_success:
        print(f"   ✅ /api/formas-pagamento/setembro - Working")
        if formas_data and 'formas_pagamento' in formas_data:
            methods_count = len(formas_data['formas_pagamento'])
            print(f"      • Found {methods_count} payment methods")
            total = formas_data.get('total', 0)
            print(f"      • Total: R$ {total:,.2f}")
    else:
        print(f"   ❌ /api/formas-pagamento/setembro - Failed")
    
    if entradas_success:
        print(f"   ✅ /api/entradas-pagamento/setembro - Working")
        if entradas_data and 'formas_pagamento' in entradas_data:
            methods_count = len(entradas_data['formas_pagamento'])
            print(f"      • Found {methods_count} payment forms")
            total = entradas_data.get('total', 0)
            print(f"      • Total: R$ {total:,.2f}")
    else:
        print(f"   ❌ /api/entradas-pagamento/setembro - Failed")
    
    if tester.tests_passed == tester.tests_run:
        print("\n🎉 All payment methods tests passed!")
        return 0
    else:
        failed_tests = tester.tests_run - tester.tests_passed
        print(f"\n❌ {failed_tests} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())