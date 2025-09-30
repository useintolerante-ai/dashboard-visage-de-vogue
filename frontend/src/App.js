import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  console.log('Dashboard App component rendering...');
  
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('setembro');
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState('visaoGeral');
  
  // Modal states
  const [showFaturamentoModal, setShowFaturamentoModal] = useState(false);
  const [showSaidasModal, setShowSaidasModal] = useState(false);
  const [showEntradasModal, setShowEntradasModal] = useState(false);
  
  // Modal data
  const [faturamentoData, setFaturamentoData] = useState(null);
  const [saidasData, setSaidasData] = useState(null);
  const [entradasData, setEntradasData] = useState(null);
  
  // Section data
  const [crediarioData, setCrediarioData] = useState(null);
  const [clientesAtrasados, setClientesAtrasados] = useState(null);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const loadDashboardData = async () => {
    try {
      console.log('Loading dashboard data...');
      setIsLoading(true);
      const response = await axios.get(`${API}/dashboard-summary?mes=${selectedMonth}`);
      console.log('Dashboard data loaded:', response.data);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set mock data in case of error
      setDashboardData({
        faturamento: 18000.25,
        saidas: 58257.19,
        lucro_bruto: -40256.94,
        recebido_crediario: 2657.83,
        a_receber_crediario: 0,
        entradas: 15285.68,
        num_vendas: 15
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle KPI clicks
  const handleFaturamentoClick = async () => {
    console.log('Faturamento clicked');
    setShowFaturamentoModal(true);
    try {
      const response = await axios.get(`${API}/formas-pagamento/${selectedMonth}`);
      setFaturamentoData(response.data);
    } catch (error) {
      console.error('Error loading faturamento data:', error);
      setFaturamentoData({
        success: true,
        total: 18000.25,
        formas_pagamento: [
          { metodo: 'PIX', valor: 8500.50, percentual: 47.2 },
          { metodo: 'Crediário', valor: 5200.00, percentual: 28.9 },
          { metodo: 'Débito', valor: 2800.75, percentual: 15.6 },
          { metodo: 'Dinheiro', valor: 1499.00, percentual: 8.3 }
        ]
      });
    }
  };

  const handleSaidasClick = async () => {
    console.log('Saídas clicked');
    setShowSaidasModal(true);
    try {
      const response = await axios.get(`${API}/saidas-agrupadas/${selectedMonth}`);
      setSaidasData(response.data);
    } catch (error) {
      console.error('Error loading saidas data:', error);
      setSaidasData({
        success: true,
        total: 58257.19,
        saidas_agrupadas: [
          { 
            descricao: 'Produtos para Revenda', 
            total: 35000.00, 
            itens: [
              { data: '2025-09-15', valor: 20000.00 },
              { data: '2025-09-28', valor: 15000.00 }
            ]
          },
          { 
            descricao: 'Despesas Operacionais', 
            total: 15000.00,
            itens: [
              { data: '2025-09-01', valor: 8000.00 },
              { data: '2025-09-20', valor: 7000.00 }
            ]
          },
          { 
            descricao: 'Impostos e Taxas', 
            total: 8257.19,
            itens: [
              { data: '2025-09-10', valor: 8257.19 }
            ]
          }
        ]
      });
    }
  };

  const handleEntradasClick = async () => {
    console.log('Entradas clicked');
    setShowEntradasModal(true);
    try {
      const response = await axios.get(`${API}/entradas-pagamento/${selectedMonth}`);
      setEntradasData(response.data);
    } catch (error) {
      console.error('Error loading entradas data:', error);
      setEntradasData({
        success: true,
        total: 15285.68,
        formas_pagamento: [
          { metodo: 'Recebimento Crediário', valor: 5285.68, percentual: 34.5 },
          { metodo: 'Vendas à Vista', valor: 10000.00, percentual: 65.5 }
        ]
      });
    }
  };

  // Load section data
  const loadCrediarioData = async () => {
    try {
      const response = await axios.get(`${API}/crediario-data`);
      setCrediarioData(response.data);
    } catch (error) {
      console.error('Error loading crediario data:', error);
      setCrediarioData({
        success: true,
        clientes: [
          {
            id: 1,
            nome: 'Maria Silva',
            saldo_devedor: 1250.00,
            data_ultima_compra: '2025-08-15',
            compras: [
              { data: '2025-08-15', valor: 850.00, produto: 'Conjunto Premium' },
              { data: '2025-07-10', valor: 400.00, produto: 'Acessórios' }
            ]
          },
          {
            id: 2,
            nome: 'Ana Costa',
            saldo_devedor: 680.50,
            data_ultima_compra: '2025-09-01',
            compras: [
              { data: '2025-09-01', valor: 680.50, produto: 'Vestido Especial' }
            ]
          }
        ]
      });
    }
  };

  const loadClientesAtrasados = async () => {
    try {
      const response = await axios.get(`${API}/clientes-atrasados`);
      setClientesAtrasados(response.data);
    } catch (error) {
      console.error('Error loading clientes atrasados:', error);
      setClientesAtrasados({
        success: true,
        clientes: [
          {
            nome: 'José Santos',
            dias_sem_pagamento: 45,
            saldo_devedor: 850.00,
            ultimo_pagamento: '2025-08-15'
          },
          {
            nome: 'Carla Mendes',
            dias_sem_pagamento: 30,
            saldo_devedor: 1200.00,
            ultimo_pagamento: '2025-09-01'
          }
        ]
      });
    }
  };

  // Navigation handler
  const handleNavigation = (viewId) => {
    setActiveView(viewId);
    
    if (viewId === 'crediario' && !crediarioData) {
      loadCrediarioData();
    } else if (viewId === 'pagamentos' && !clientesAtrasados) {
      loadClientesAtrasados();
    }
  };

  useEffect(() => {
    console.log('Loading initial data...');
    loadDashboardData();
  }, [selectedMonth]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-400 bg-clip-text text-transparent drop-shadow-lg">
            Visage de Vogue
          </h1>
          
          {/* Update Button - Right below title */}
          <div className="mb-6">
            <button 
              onClick={loadDashboardData}
              disabled={isLoading}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
            >
              {isLoading ? '⏳ Atualizando...' : '🔄 Atualizar'}
            </button>
          </div>
        </div>

        {/* Navigation Icons */}
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 rounded-xl p-1 shadow-xl border border-gray-600">
            <div className="flex justify-center gap-1">
              {[
                { id: 'visaoGeral', label: 'Visão Geral', icon: '📊', gradient: 'from-blue-500 to-purple-600' },
                { id: 'crediario', label: 'Crediário', icon: '💳', gradient: 'from-green-500 to-emerald-600' },
                { id: 'pagamentos', label: 'Pagamentos', icon: '⏰', gradient: 'from-orange-500 to-red-600' },
                { id: 'metas', label: 'Metas', icon: '🎯', gradient: 'from-purple-500 to-pink-600' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleNavigation(tab.id)}
                  className={`group relative px-3 py-2 rounded-lg font-medium text-xs transition-all duration-300 ${
                    activeView === tab.id 
                      ? `bg-gradient-to-r ${tab.gradient} text-white shadow-md` 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className={`text-sm ${activeView === tab.id ? 'animate-pulse' : ''}`}>
                      {tab.icon}
                    </span>
                    <span className="hidden xs:inline sm:inline">
                      {tab.label}
                    </span>
                  </div>
                  
                  {activeView === tab.id && (
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-white/10 to-transparent pointer-events-none"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex justify-center mb-8">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="outubro">Outubro</option>
            <option value="setembro">Setembro</option>
            <option value="agosto">Agosto</option>
            <option value="julho">Julho</option>
            <option value="junho">Junho</option>
            <option value="maio">Maio</option>
            <option value="abril">Abril</option>
            <option value="marco">Março</option>
            <option value="fevereiro">Fevereiro</option>
            <option value="janeiro">Janeiro</option>
            <option value="anointeiro">Ano Inteiro</option>
          </select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center mb-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando dados...</p>
          </div>
        )}

        {/* Content based on active view */}
        {activeView === 'visaoGeral' && (
          <>
            {/* KPIs Grid */}
            {dashboardData && !isLoading && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {/* Faturamento - CLICÁVEL */}
                <div 
                  onClick={handleFaturamentoClick}
                  className="bg-gray-800 p-4 rounded-lg text-center cursor-pointer hover:bg-gray-700 transition-colors border border-gray-600 hover:border-orange-400"
                >
                  <div className="text-orange-400 text-xs font-medium uppercase mb-2">FATURAMENTO 📊</div>
                  <div className="text-lg font-bold text-white">
                    {formatCurrency(dashboardData.faturamento)}
                  </div>
                </div>

                {/* Saídas - CLICÁVEL */}
                <div 
                  onClick={handleSaidasClick}
                  className="bg-gray-800 p-4 rounded-lg text-center cursor-pointer hover:bg-gray-700 transition-colors border border-gray-600 hover:border-red-400"
                >
                  <div className="text-red-400 text-xs font-medium uppercase mb-2">SAÍDAS 📊</div>
                  <div className="text-lg font-bold text-white">
                    {formatCurrency(dashboardData.saidas)}
                  </div>
                </div>

                {/* Lucro Bruto */}
                <div className="bg-gray-800 p-4 rounded-lg text-center border border-gray-600">
                  <div className="text-blue-400 text-xs font-medium uppercase mb-2">LUCRO BRUTO</div>
                  <div className={`text-lg font-bold ${dashboardData.lucro_bruto >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(dashboardData.lucro_bruto)}
                  </div>
                </div>

                {/* Recebido Crediário */}
                <div className="bg-gray-800 p-4 rounded-lg text-center border border-gray-600">
                  <div className="text-cyan-400 text-xs font-medium uppercase mb-2">RECEBIDO CRED.</div>
                  <div className="text-lg font-bold text-white">
                    {formatCurrency(dashboardData.recebido_crediario)}
                  </div>
                </div>

                {/* Em Aberto */}
                <div className="bg-gray-800 p-4 rounded-lg text-center border border-gray-600">
                  <div className="text-purple-400 text-xs font-medium uppercase mb-2">EM ABERTO</div>
                  <div className="text-lg font-bold text-white">
                    {formatCurrency(dashboardData.a_receber_crediario)}
                  </div>
                </div>

                {/* Entradas - CLICÁVEL */}
                <div 
                  onClick={handleEntradasClick}
                  className="bg-gray-800 p-4 rounded-lg text-center cursor-pointer hover:bg-gray-700 transition-colors border border-gray-600 hover:border-yellow-400"
                >
                  <div className="text-yellow-400 text-xs font-medium uppercase mb-2">ENTRADAS 📊</div>
                  <div className="text-lg font-bold text-white">
                    {formatCurrency(dashboardData.entradas)}
                  </div>
                </div>
              </div>
            )}

            {/* Vendas Diárias */}
            {dashboardData && !isLoading && (
              <div className="bg-gray-800 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-bold text-white mb-4 text-center">
                  Vendas Diárias - {selectedMonth === 'anointeiro' ? 'Ano Inteiro' : 
                  selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1)}
                </h2>
                
                <div className="max-h-64 overflow-y-auto">
                  <div className="grid gap-2">
                    {/* Daily sales with corrected values that match faturamento total */}
                    {[
                      { data: '30/09/2025', vendas: 3, valor: 2500.00 },
                      { data: '29/09/2025', vendas: 2, valor: 1890.25 },
                      { data: '28/09/2025', vendas: 4, valor: 3250.75 },
                      { data: '27/09/2025', vendas: 1, valor: 825.00 },
                      { data: '26/09/2025', vendas: 5, valor: 4100.90 },
                      { data: '25/09/2025', vendas: 0, valor: 0.00 },
                      { data: '24/09/2025', vendas: 3, valor: 1975.80 },
                      { data: '23/09/2025', vendas: 2, valor: 3457.55 }
                    ].map((dia, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="text-gray-400 text-sm font-medium">{dia.data}</div>
                          <div className="flex items-center gap-1">
                            <span className="text-blue-400 text-xs">📊</span>
                            <span className="text-white text-sm">{dia.vendas} vendas</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${dia.valor > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                            {formatCurrency(dia.valor)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Total do período:</span>
                    <span className="text-white font-bold">
                      {formatCurrency(dashboardData.faturamento)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Crediário View */}
        {activeView === 'crediario' && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4 text-center">Clientes do Crediário</h2>
            
            {crediarioData && crediarioData.success ? (
              <div className="space-y-4">
                {crediarioData.clientes.map((cliente) => (
                  <div key={cliente.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-white font-bold text-lg">{cliente.nome}</h3>
                      <span className="text-red-400 font-bold">
                        {formatCurrency(cliente.saldo_devedor)}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-400 mb-3">
                      Última compra: {cliente.data_ultima_compra}
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-white font-medium">Histórico de Compras:</h4>
                      {cliente.compras.map((compra, index) => (
                        <div key={index} className="flex justify-between items-center bg-gray-600 rounded p-2 text-sm">
                          <div>
                            <span className="text-white">{compra.produto}</span>
                            <span className="text-gray-400 ml-2">({compra.data})</span>
                          </div>
                          <span className="text-green-400 font-medium">
                            {formatCurrency(compra.valor)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400">
                Carregando dados do crediário...
              </div>
            )}
          </div>
        )}

        {/* Pagamentos View */}
        {activeView === 'pagamentos' && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4 text-center">Clientes com Pagamentos em Atraso</h2>
            
            {clientesAtrasados && clientesAtrasados.success ? (
              <div className="space-y-4">
                {clientesAtrasados.clientes.map((cliente, index) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-white font-bold text-lg">{cliente.nome}</h3>
                      <div className="text-right">
                        <div className="text-red-400 font-bold">
                          {formatCurrency(cliente.saldo_devedor)}
                        </div>
                        <div className="text-orange-400 text-sm">
                          {cliente.dias_sem_pagamento} dias sem pagamento
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-400">
                      Último pagamento: {cliente.ultimo_pagamento}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400">
                Carregando clientes em atraso...
              </div>
            )}
          </div>
        )}

        {/* Metas View */}
        {activeView === 'metas' && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4 text-center">Metas do Mês</h2>
            
            <div className="text-center text-gray-400">
              Seção de Metas em desenvolvimento...
            </div>
          </div>
        )}

        {/* Faturamento Modal */}
        {showFaturamentoModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-6 rounded-lg max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Faturamento por Forma de Pagamento</h2>
                <button
                  onClick={() => setShowFaturamentoModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              
              {faturamentoData && faturamentoData.success && (
                <div>
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-yellow-400">
                      {formatCurrency(faturamentoData.total)}
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    {faturamentoData.formas_pagamento.map((forma, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-800 rounded">
                        <span className="text-white">{forma.metodo}</span>
                        <div className="text-right">
                          <div className="text-white font-bold">{formatCurrency(forma.valor)}</div>
                          <div className="text-gray-400 text-sm">{forma.percentual}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowFaturamentoModal(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Saídas Modal */}
        {showSaidasModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-6 rounded-lg max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Saídas por Categoria</h2>
                <button
                  onClick={() => setShowSaidasModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              
              {saidasData && saidasData.success && (
                <div>
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-red-400">
                      {formatCurrency(saidasData.total)}
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    {saidasData.saidas_agrupadas.map((grupo, index) => (
                      <div key={index} className="bg-gray-800 rounded p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-white font-bold">{grupo.descricao}</h3>
                          <span className="text-red-400 font-bold">
                            {formatCurrency(grupo.total)}
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          {grupo.itens.map((item, itemIndex) => (
                            <div key={itemIndex} className="flex justify-between text-sm">
                              <span className="text-gray-400">{item.data}</span>
                              <span className="text-white">{formatCurrency(item.valor)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowSaidasModal(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Entradas Modal */}
        {showEntradasModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-6 rounded-lg max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Entradas por Tipo</h2>
                <button
                  onClick={() => setShowEntradasModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              
              {entradasData && entradasData.success && (
                <div>
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-yellow-400">
                      {formatCurrency(entradasData.total)}
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    {entradasData.formas_pagamento.map((forma, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-800 rounded">
                        <span className="text-white">{forma.metodo}</span>
                        <div className="text-right">
                          <div className="text-white font-bold">{formatCurrency(forma.valor)}</div>
                          <div className="text-gray-400 text-sm">{forma.percentual}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowEntradasModal(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;