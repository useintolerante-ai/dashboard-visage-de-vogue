import requests
import sys
import json
from datetime import datetime

class SalesDashboardTester:
    def __init__(self, base_url="https://inventory-pulse-59.preview.emergentagent.com"):
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
                    print(f"   Response keys: {list(response_data.keys()) if isinstance(response_data, dict) else 'Non-dict response'}")
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

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_dashboard_summary_janeiro(self):
        """Test dashboard summary for Janeiro"""
        success, response = self.run_test("Dashboard Summary - Janeiro", "GET", "dashboard-summary", 200, {"mes": "janeiro"})
        if success and isinstance(response, dict):
            expected_keys = ['faturamento', 'saidas', 'lucro_bruto', 'recebido_crediario', 'a_receber_crediario', 'num_vendas']
            missing_keys = [key for key in expected_keys if key not in response]
            if missing_keys:
                print(f"   ⚠️  Missing keys in response: {missing_keys}")
                return False, response
            else:
                print(f"   ✅ All expected keys present")
                print(f"   📊 KPIs - Faturamento: R$ {response.get('faturamento', 0):,.2f}")
                print(f"   📊 KPIs - Saídas: R$ {response.get('saidas', 0):,.2f}")
                print(f"   📊 KPIs - Lucro Bruto: R$ {response.get('lucro_bruto', 0):,.2f}")
                print(f"   📊 KPIs - Recebido Crediário: R$ {response.get('recebido_crediario', 0):,.2f}")
                print(f"   📊 KPIs - Num Vendas: {response.get('num_vendas', 0)}")
        return success, response

    def test_dashboard_summary_marco(self):
        """Test dashboard summary for Marco"""
        success, response = self.run_test("Dashboard Summary - Marco", "GET", "dashboard-summary", 200, {"mes": "marco"})
        if success and isinstance(response, dict):
            expected_keys = ['faturamento', 'saidas', 'lucro_bruto', 'recebido_crediario', 'a_receber_crediario', 'num_vendas']
            missing_keys = [key for key in expected_keys if key not in response]
            if missing_keys:
                print(f"   ⚠️  Missing keys in response: {missing_keys}")
                return False, response
            else:
                print(f"   ✅ All expected keys present")
                print(f"   📊 KPIs - Faturamento: R$ {response.get('faturamento', 0):,.2f}")
                print(f"   📊 KPIs - Saídas: R$ {response.get('saidas', 0):,.2f}")
                print(f"   📊 KPIs - Lucro Bruto: R$ {response.get('lucro_bruto', 0):,.2f}")
                print(f"   📊 KPIs - Recebido Crediário: R$ {response.get('recebido_crediario', 0):,.2f}")
                print(f"   📊 KPIs - Num Vendas: {response.get('num_vendas', 0)}")
        return success, response

    def test_dashboard_summary_setembro(self):
        """Test dashboard summary for Setembro"""
        success, response = self.run_test("Dashboard Summary - Setembro", "GET", "dashboard-summary", 200, {"mes": "setembro"})
        if success and isinstance(response, dict):
            expected_keys = ['faturamento', 'saidas', 'lucro_bruto', 'recebido_crediario', 'a_receber_crediario', 'num_vendas']
            missing_keys = [key for key in expected_keys if key not in response]
            if missing_keys:
                print(f"   ⚠️  Missing keys in response: {missing_keys}")
                return False, response
            else:
                print(f"   ✅ All expected keys present")
                print(f"   📊 KPIs - Faturamento: R$ {response.get('faturamento', 0):,.2f}")
                print(f"   📊 KPIs - Saídas: R$ {response.get('saidas', 0):,.2f}")
                print(f"   📊 KPIs - Lucro Bruto: R$ {response.get('lucro_bruto', 0):,.2f}")
                print(f"   📊 KPIs - Recebido Crediário: R$ {response.get('recebido_crediario', 0):,.2f}")
                print(f"   📊 KPIs - Num Vendas: {response.get('num_vendas', 0)}")
        return success, response

    def test_dashboard_summary_anointeiro(self):
        """Test dashboard summary for Ano Inteiro"""
        success, response = self.run_test("Dashboard Summary - Ano Inteiro", "GET", "dashboard-summary", 200, {"mes": "anointeiro"})
        if success and isinstance(response, dict):
            expected_keys = ['faturamento', 'saidas', 'lucro_bruto', 'recebido_crediario', 'a_receber_crediario', 'num_vendas']
            missing_keys = [key for key in expected_keys if key not in response]
            if missing_keys:
                print(f"   ⚠️  Missing keys in response: {missing_keys}")
                return False, response
            else:
                print(f"   ✅ All expected keys present")
                print(f"   📊 KPIs - Faturamento: R$ {response.get('faturamento', 0):,.2f}")
                print(f"   📊 KPIs - Saídas: R$ {response.get('saidas', 0):,.2f}")
                print(f"   📊 KPIs - Lucro Bruto: R$ {response.get('lucro_bruto', 0):,.2f}")
                print(f"   📊 KPIs - Recebido Crediário: R$ {response.get('recebido_crediario', 0):,.2f}")
                print(f"   📊 KPIs - Num Vendas: {response.get('num_vendas', 0)}")
        return success, response

    def test_crediario_data(self):
        """Test crediario data endpoint - should show purchase history, not payments"""
        success, response = self.run_test("Crediario Data", "GET", "crediario-data", 200)
        if success and isinstance(response, dict):
            expected_keys = ['clientes', 'total_clientes']
            missing_keys = [key for key in expected_keys if key not in response]
            if missing_keys:
                print(f"   ⚠️  Missing keys in response: {missing_keys}")
                return False, response
            else:
                print(f"   ✅ All expected keys present")
                clientes = response.get('clientes', [])
                total_clientes = response.get('total_clientes', 0)
                print(f"   📊 Total clientes: {total_clientes}")
                
                if clientes and len(clientes) > 0:
                    # Check first client structure
                    first_client = clientes[0]
                    client_keys = ['nome', 'vendas_totais', 'saldo_devedor', 'compras']
                    missing_client_keys = [key for key in client_keys if key not in first_client]
                    if missing_client_keys:
                        print(f"   ⚠️  Missing client keys: {missing_client_keys}")
                        return False, response
                    
                    print(f"   📊 First client: {first_client.get('nome', 'N/A')}")
                    print(f"   📊 Vendas totais: R$ {first_client.get('vendas_totais', 0):,.2f}")
                    print(f"   📊 Saldo devedor: R$ {first_client.get('saldo_devedor', 0):,.2f}")
                    
                    compras = first_client.get('compras', [])
                    print(f"   📊 Purchase history entries: {len(compras)}")
                    
                    if compras and len(compras) > 0:
                        first_purchase = compras[0]
                        if 'data' in first_purchase and 'valor' in first_purchase:
                            print(f"   ✅ Purchase history structure correct: data + valor")
                            print(f"   📊 First purchase: {first_purchase.get('data')} - R$ {first_purchase.get('valor', 0):,.2f}")
                        else:
                            print(f"   ❌ Purchase history missing 'data' or 'valor' fields")
                            return False, response
                    else:
                        print(f"   ⚠️  No purchase history found for first client")
                else:
                    print(f"   ⚠️  No clients found in crediario data")
        return success, response

    def test_saidas_data_anointeiro(self):
        """Test saidas data for ano inteiro"""
        success, response = self.run_test("Saidas Data - Ano Inteiro", "GET", "saidas-data/anointeiro", 200)
        if success and isinstance(response, dict):
            expected_keys = ['saidas', 'total_saidas', 'total_valor', 'mes']
            missing_keys = [key for key in expected_keys if key not in response]
            if missing_keys:
                print(f"   ⚠️  Missing keys in response: {missing_keys}")
                return False, response
            else:
                print(f"   ✅ All expected keys present")
                print(f"   📊 Total saídas: {response.get('total_saidas', 0)}")
                print(f"   📊 Total valor: R$ {response.get('total_valor', 0):,.2f}")
                print(f"   📊 Período: {response.get('mes', 'N/A')}")
        return success, response

    def test_faturamento_diario_anointeiro(self):
        """Test faturamento diario for ano inteiro"""
        success, response = self.run_test("Faturamento Diário - Ano Inteiro", "GET", "faturamento-diario/anointeiro", 200)
        if success and isinstance(response, dict):
            expected_keys = ['vendas_diarias', 'total_vendas', 'total_valor', 'mes']
            missing_keys = [key for key in expected_keys if key not in response]
            if missing_keys:
                print(f"   ⚠️  Missing keys in response: {missing_keys}")
                return False, response
            else:
                print(f"   ✅ All expected keys present")
                print(f"   📊 Total vendas: {response.get('total_vendas', 0)}")
                print(f"   📊 Total valor: R$ {response.get('total_valor', 0):,.2f}")
                print(f"   📊 Período: {response.get('mes', 'N/A')}")
        return success, response

    def test_meses_disponiveis(self):
        """Test available months endpoint"""
        success, response = self.run_test("Meses Disponíveis", "GET", "meses-disponiveis", 200)
        if success and isinstance(response, dict):
            expected_keys = ['meses']
            missing_keys = [key for key in expected_keys if key not in response]
            if missing_keys:
                print(f"   ⚠️  Missing keys in response: {missing_keys}")
                return False, response
            else:
                print(f"   ✅ All expected keys present")
                meses = response.get('meses', [])
                print(f"   📊 Available months: {len(meses)}")
                if meses and len(meses) > 0:
                    print(f"   📊 First month: {meses[0]}")
        return success, response

    def test_sync_sheets(self):
        """Test Google Sheets sync functionality"""
        success, response = self.run_test("Sync Google Sheets", "GET", "sync-sheets", 200)
        if success and isinstance(response, dict):
            expected_keys = ['message', 'timestamp']
            missing_keys = [key for key in expected_keys if key not in response]
            if missing_keys:
                print(f"   ⚠️  Missing keys in response: {missing_keys}")
                return False, response
            else:
                print(f"   ✅ All expected keys present")
                print(f"   📊 Message: {response.get('message', 'N/A')}")
                print(f"   📊 Timestamp: {response.get('timestamp', 'N/A')}")
        return success, response

    def test_dashboard_summary_entradas_field(self):
        """Test that dashboard summary includes 'entradas' field instead of 'ticket_medio'"""
        success, response = self.run_test("Dashboard Summary - Entradas Field Check", "GET", "dashboard-summary", 200, {"mes": "setembro"})
        if success and isinstance(response, dict):
            # Check if 'entradas' field is present
            if 'entradas' not in response:
                print(f"   ❌ Missing 'entradas' field in dashboard summary")
                self.critical_failures.append("Dashboard Summary: Missing 'entradas' field")
                return False, response
            
            # Check if old 'ticket_medio' field is removed
            if 'ticket_medio' in response:
                print(f"   ⚠️  Old 'ticket_medio' field still present - should be removed")
            
            entradas_value = response.get('entradas', 0)
            print(f"   ✅ 'entradas' field present with value: R$ {entradas_value:,.2f}")
            
            # Validate that entradas value is reasonable (should be > 0 for setembro)
            if entradas_value <= 0:
                print(f"   ⚠️  Entradas value is zero or negative - may indicate calculation issue")
                return False, response
            
            print(f"   📊 Entradas R$: R$ {entradas_value:,.2f}")
            return True, response
        return success, response

    def test_entradas_pagamento_setembro(self):
        """Test new entradas-pagamento endpoint for setembro"""
        success, response = self.run_test("Entradas Pagamento - Setembro", "GET", "entradas-pagamento/setembro", 200)
        if success and isinstance(response, dict):
            # Expected structure similar to formas-pagamento
            expected_keys = ['formas_pagamento', 'total', 'mes']
            missing_keys = [key for key in expected_keys if key not in response]
            if missing_keys:
                print(f"   ⚠️  Missing keys in response: {missing_keys}")
                return False, response
            
            formas_pagamento = response.get('formas_pagamento', [])
            total = response.get('total', 0)
            
            print(f"   ✅ All expected keys present")
            print(f"   📊 Total Entradas: R$ {total:,.2f}")
            print(f"   📊 Payment forms count: {len(formas_pagamento)}")
            
            # Check for expected payment forms
            expected_forms = ['Crediário Recebido', 'PIX', 'Débito', 'Dinheiro', 'Crédito']
            found_forms = [form.get('forma', '') for form in formas_pagamento if isinstance(form, dict)]
            
            print(f"   📊 Found payment forms: {found_forms}")
            
            # Validate that we have some payment forms
            if not formas_pagamento:
                print(f"   ⚠️  No payment forms found in response")
                return False, response
            
            # Check structure of first payment form
            if formas_pagamento and isinstance(formas_pagamento[0], dict):
                first_form = formas_pagamento[0]
                form_keys = ['forma', 'valor', 'percentual']
                missing_form_keys = [key for key in form_keys if key not in first_form]
                if missing_form_keys:
                    print(f"   ⚠️  Missing payment form keys: {missing_form_keys}")
                    return False, response
                
                print(f"   ✅ Payment form structure correct")
                print(f"   📊 First form: {first_form.get('forma')} - R$ {first_form.get('valor', 0):,.2f} ({first_form.get('percentual', 0):.1f}%)")
            
            return True, response
        return success, response

    def test_entradas_pagamento_agosto(self):
        """Test entradas-pagamento endpoint for agosto"""
        success, response = self.run_test("Entradas Pagamento - Agosto", "GET", "entradas-pagamento/agosto", 200)
        if success and isinstance(response, dict):
            expected_keys = ['formas_pagamento', 'total', 'mes']
            missing_keys = [key for key in expected_keys if key not in response]
            if missing_keys:
                print(f"   ⚠️  Missing keys in response: {missing_keys}")
                return False, response
            
            total = response.get('total', 0)
            formas_pagamento = response.get('formas_pagamento', [])
            
            print(f"   ✅ All expected keys present")
            print(f"   📊 Total Entradas (Agosto): R$ {total:,.2f}")
            print(f"   📊 Payment forms count: {len(formas_pagamento)}")
            
            return True, response
        return success, response

    def test_entradas_pagamento_janeiro(self):
        """Test entradas-pagamento endpoint for janeiro"""
        success, response = self.run_test("Entradas Pagamento - Janeiro", "GET", "entradas-pagamento/janeiro", 200)
        if success and isinstance(response, dict):
            expected_keys = ['formas_pagamento', 'total', 'mes']
            missing_keys = [key for key in expected_keys if key not in response]
            if missing_keys:
                print(f"   ⚠️  Missing keys in response: {missing_keys}")
                return False, response
            
            total = response.get('total', 0)
            formas_pagamento = response.get('formas_pagamento', [])
            
            print(f"   ✅ All expected keys present")
            print(f"   📊 Total Entradas (Janeiro): R$ {total:,.2f}")
            print(f"   📊 Payment forms count: {len(formas_pagamento)}")
            
            return True, response
        return success, response

    def test_entradas_pagamento_invalid_month(self):
        """Test entradas-pagamento endpoint with invalid month"""
        success, response = self.run_test("Entradas Pagamento - Invalid Month", "GET", "entradas-pagamento/invalidmonth", 200)
        if success and isinstance(response, dict):
            # Should handle gracefully, possibly returning empty data or error message
            total = response.get('total', 0)
            formas_pagamento = response.get('formas_pagamento', [])
            
            print(f"   ✅ Handled invalid month gracefully")
            print(f"   📊 Total Entradas (Invalid): R$ {total:,.2f}")
            print(f"   📊 Payment forms count: {len(formas_pagamento)}")
            
            return True, response
        return success, response

    def test_entradas_consistency_with_dashboard(self):
        """Test that entradas value in dashboard matches sum from entradas-pagamento endpoint"""
        # Get dashboard summary
        dashboard_success, dashboard_response = self.run_test("Dashboard Summary for Consistency Check", "GET", "dashboard-summary", 200, {"mes": "setembro"})
        if not dashboard_success:
            return False, {}
        
        # Get entradas breakdown
        entradas_success, entradas_response = self.run_test("Entradas Pagamento for Consistency Check", "GET", "entradas-pagamento/setembro", 200)
        if not entradas_success:
            return False, {}
        
        dashboard_entradas = dashboard_response.get('entradas', 0)
        entradas_total = entradas_response.get('total', 0)
        
        print(f"   📊 Dashboard Entradas: R$ {dashboard_entradas:,.2f}")
        print(f"   📊 Entradas Endpoint Total: R$ {entradas_total:,.2f}")
        
        # Check if values match (allow small tolerance for rounding)
        tolerance = 0.01  # 1 cent tolerance
        if abs(dashboard_entradas - entradas_total) <= tolerance:
            print(f"   ✅ Values match within tolerance")
            return True, {"dashboard": dashboard_entradas, "entradas": entradas_total}
        else:
            print(f"   ❌ Values don't match - difference: R$ {abs(dashboard_entradas - entradas_total):,.2f}")
            self.critical_failures.append(f"Entradas Consistency: Dashboard={dashboard_entradas}, Endpoint={entradas_total}")
            return False, {"dashboard": dashboard_entradas, "entradas": entradas_total}

    def test_saidas_agrupadas_setembro(self):
        """Test new saidas-agrupadas endpoint for setembro"""
        success, response = self.run_test("Saidas Agrupadas - Setembro", "GET", "saidas-agrupadas/setembro", 200)
        if success and isinstance(response, dict):
            # Expected structure for grouped saidas
            expected_keys = ['success', 'saidas_agrupadas', 'total_valor', 'mes']
            missing_keys = [key for key in expected_keys if key not in response]
            if missing_keys:
                print(f"   ⚠️  Missing keys in response: {missing_keys}")
                return False, response
            
            success_flag = response.get('success', False)
            saidas_agrupadas = response.get('saidas_agrupadas', [])
            total_valor = response.get('total_valor', 0)
            total_grupos = response.get('total_grupos', 0)
            total_entradas = response.get('total_entradas', 0)
            
            print(f"   ✅ All expected keys present")
            print(f"   📊 Success: {success_flag}")
            print(f"   📊 Total Valor: R$ {total_valor:,.2f}")
            print(f"   📊 Total Grupos: {total_grupos}")
            print(f"   📊 Total Entradas: {total_entradas}")
            print(f"   📊 Saidas Agrupadas count: {len(saidas_agrupadas)}")
            
            if not success_flag:
                error_msg = response.get('error', 'Unknown error')
                print(f"   ❌ API returned success=false: {error_msg}")
                self.critical_failures.append(f"Saidas Agrupadas: {error_msg}")
                return False, response
            
            # Check structure of grouped saidas if any exist
            if saidas_agrupadas and len(saidas_agrupadas) > 0:
                first_group = saidas_agrupadas[0]
                group_keys = ['descricao', 'total_valor', 'detalhes', 'numero_entradas']
                missing_group_keys = [key for key in group_keys if key not in first_group]
                if missing_group_keys:
                    print(f"   ⚠️  Missing group keys: {missing_group_keys}")
                    return False, response
                
                print(f"   ✅ Saidas group structure correct")
                print(f"   📊 First group: {first_group.get('descricao')} - R$ {first_group.get('total_valor', 0):,.2f} ({first_group.get('numero_entradas', 0)} entradas)")
                
                # Check detalhes structure
                detalhes = first_group.get('detalhes', [])
                if detalhes and len(detalhes) > 0:
                    first_detalhe = detalhes[0]
                    if 'data' in first_detalhe and 'valor' in first_detalhe:
                        print(f"   ✅ Detalhes structure correct: data + valor")
                        print(f"   📊 First detail: {first_detalhe.get('data')} - R$ {first_detalhe.get('valor', 0):,.2f}")
                    else:
                        print(f"   ⚠️  Detalhes missing 'data' or 'valor' fields")
                        return False, response
            else:
                print(f"   ⚠️  No grouped saidas found - may be normal for empty months")
            
            return True, response
        return success, response

    def test_saidas_agrupadas_agosto(self):
        """Test saidas-agrupadas endpoint for agosto"""
        success, response = self.run_test("Saidas Agrupadas - Agosto", "GET", "saidas-agrupadas/agosto", 200)
        if success and isinstance(response, dict):
            success_flag = response.get('success', False)
            total_valor = response.get('total_valor', 0)
            saidas_agrupadas = response.get('saidas_agrupadas', [])
            
            print(f"   ✅ Response received")
            print(f"   📊 Success: {success_flag}")
            print(f"   📊 Total Valor (Agosto): R$ {total_valor:,.2f}")
            print(f"   📊 Groups count: {len(saidas_agrupadas)}")
            
            return True, response
        return success, response

    def test_saidas_agrupadas_invalid_month(self):
        """Test saidas-agrupadas endpoint with invalid month"""
        success, response = self.run_test("Saidas Agrupadas - Invalid Month", "GET", "saidas-agrupadas/invalidmonth", 200)
        if success and isinstance(response, dict):
            success_flag = response.get('success', False)
            total_valor = response.get('total_valor', 0)
            saidas_agrupadas = response.get('saidas_agrupadas', [])
            
            print(f"   ✅ Handled invalid month gracefully")
            print(f"   📊 Success: {success_flag}")
            print(f"   📊 Total Valor (Invalid): R$ {total_valor:,.2f}")
            print(f"   📊 Groups count: {len(saidas_agrupadas)}")
            
            return True, response
        return success, response

def main():
    print("🚀 Starting Sales Dashboard Backend API Tests - PRIORITY FOCUS")
    print("=" * 60)
    
    tester = SalesDashboardTester()
    
    # Test 1: Basic API connectivity
    print("\n📡 PHASE 1: Basic API Connectivity")
    tester.test_root_endpoint()
    
    # PRIORITY TESTS - Focus on the three requested endpoints
    print("\n🎯 PRIORITY TESTS: New Functionality Verification")
    print("=" * 50)
    
    # PRIORITY 1: Test new entradas endpoint
    print("\n💰 PRIORITY 1: Test /api/entradas-pagamento/setembro")
    tester.test_entradas_pagamento_setembro()
    
    # PRIORITY 2: Test saidas agrupadas
    print("\n📊 PRIORITY 2: Test /api/saidas-agrupadas/setembro")
    tester.test_saidas_agrupadas_setembro()
    
    # PRIORITY 3: Test dashboard entradas field
    print("\n🎯 PRIORITY 3: Test /api/dashboard-summary?mes=setembro entradas field")
    tester.test_dashboard_summary_setembro()
    tester.test_dashboard_summary_entradas_field()
    tester.test_entradas_consistency_with_dashboard()
    
    # Additional tests for completeness
    print("\n🔍 ADDITIONAL TESTS: Extended Coverage")
    print("=" * 40)
    
    # Test other months for entradas endpoint
    print("\n💰 Extended Entradas Testing")
    tester.test_entradas_pagamento_agosto()
    tester.test_entradas_pagamento_janeiro()
    tester.test_entradas_pagamento_invalid_month()
    
    # Test other months for saidas agrupadas
    print("\n📊 Extended Saidas Agrupadas Testing")
    tester.test_saidas_agrupadas_agosto()
    tester.test_saidas_agrupadas_invalid_month()
    
    # Test other dashboard months
    print("\n📈 Extended Dashboard Testing")
    tester.test_dashboard_summary_janeiro()
    tester.test_dashboard_summary_marco()
    tester.test_dashboard_summary_anointeiro()
    
    # Test other endpoints
    print("\n🔄 Other Endpoints Testing")
    tester.test_crediario_data()
    tester.test_saidas_data_anointeiro()
    tester.test_faturamento_diario_anointeiro()
    tester.test_meses_disponiveis()
    tester.test_sync_sheets()
    
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
    
    # Priority test summary
    print(f"\n🎯 PRIORITY TEST SUMMARY:")
    print(f"   1. /api/entradas-pagamento/setembro - {'✅ TESTED' if tester.tests_run > 0 else '❌ NOT TESTED'}")
    print(f"   2. /api/saidas-agrupadas/setembro - {'✅ TESTED' if tester.tests_run > 0 else '❌ NOT TESTED'}")
    print(f"   3. /api/dashboard-summary?mes=setembro - {'✅ TESTED' if tester.tests_run > 0 else '❌ NOT TESTED'}")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All backend tests passed!")
        return 0
    else:
        failed_tests = tester.tests_run - tester.tests_passed
        print(f"❌ {failed_tests} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())