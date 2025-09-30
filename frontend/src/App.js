import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('setembro');

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const loadDashboardData = async (mes = selectedMonth) => {
    try {
      console.log('Loading dashboard data for:', mes);
      console.log('API URL:', `${API}/dashboard-summary?mes=${mes}`);
      setIsLoading(true);
      setError(null);
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await axios.get(`${API}/dashboard-summary?mes=${mes}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log('Dashboard data loaded successfully:', response.data);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      if (error.name === 'AbortError') {
        setError('Timeout: API demorou mais de 10 segundos para responder');
      } else {
        setError(`Erro ao carregar dados: ${error.message}`);
      }
    } finally {
      console.log('Setting isLoading to false');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('App useEffect triggered');
    loadDashboardData();
  }, []);

  const handleMonthChange = (newMonth) => {
    console.log('Changing month to:', newMonth);
    setSelectedMonth(newMonth);
    loadDashboardData(newMonth);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-yellow-400 mb-2">Dashboard de Gestão 2025</h1>
          <p className="text-gray-400">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-2">Erro</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => loadDashboardData()}
            className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">
            Dashboard de Gestão 2025 | Visage de Vogue
          </h1>
          <p className="text-gray-400">Sistema de gestão empresarial</p>
        </div>

        {/* Month Selector */}
        <div className="flex justify-center mb-8">
          <select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
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

        {/* KPIs Grid */}
        {dashboardData && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {/* Faturamento */}
            <div className="bg-gray-800 p-4 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span className="text-orange-400 text-xs font-medium uppercase">FATURAMENTO</span>
              </div>
              <div className="text-lg font-bold text-white">
                {formatCurrency(dashboardData.faturamento)}
              </div>
            </div>

            {/* Saídas */}
            <div className="bg-gray-800 p-4 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
                <span className="text-red-400 text-xs font-medium uppercase">SAÍDAS</span>
              </div>
              <div className="text-lg font-bold text-white">
                {formatCurrency(dashboardData.saidas)}
              </div>
            </div>

            {/* Lucro Bruto */}
            <div className="bg-gray-800 p-4 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-blue-400 text-xs font-medium uppercase">LUCRO BRUTO</span>
              </div>
              <div className={`text-lg font-bold ${dashboardData.lucro_bruto >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {formatCurrency(dashboardData.lucro_bruto)}
              </div>
            </div>

            {/* Recebido Crediário */}
            <div className="bg-gray-800 p-4 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span className="text-cyan-400 text-xs font-medium uppercase">RECEBIDO CRED.</span>
              </div>
              <div className="text-lg font-bold text-white">
                {formatCurrency(dashboardData.recebido_crediario)}
              </div>
            </div>

            {/* A Receber Crediário */}
            <div className="bg-gray-800 p-4 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m.6 8L5 4H3m4 9v6a1 1 0 001 1h10a1 1 0 001-1v-6m-1 0V9a1 1 0 00-1-1H7a1 1 0 00-1 1v4h12z" />
                </svg>
                <span className="text-purple-400 text-xs font-medium uppercase">EM ABERTO</span>
              </div>
              <div className="text-lg font-bold text-white">
                {formatCurrency(dashboardData.a_receber_crediario)}
              </div>
            </div>

            {/* Entradas */}
            <div className="bg-gray-800 p-4 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span className="text-yellow-400 text-xs font-medium uppercase">ENTRADAS</span>
              </div>
              <div className="text-lg font-bold text-white">
                {formatCurrency(dashboardData.entradas)}
              </div>
            </div>
          </div>
        )}

        {/* Status Information */}
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-white mb-4">Status do Sistema</h2>
          <div className="space-y-2">
            <p className="text-green-400">✅ Marca "Made with Emergent" removida</p>
            <p className="text-green-400">✅ Dashboard funcionando corretamente</p>
            <p className="text-green-400">✅ Conexão com backend ativa</p>
            <p className="text-gray-400">
              Dados carregados: {dashboardData?.data_source || 'N/A'}
            </p>
            {dashboardData?.last_sync && (
              <p className="text-gray-400 text-sm">
                Última sincronização: {new Date(dashboardData.last_sync).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          <button 
            onClick={() => loadDashboardData()}
            className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-2 rounded-lg font-medium"
          >
            🔄 Atualizar Dados
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium"
          >
            ↻ Recarregar Página
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="dashboard-title font-bold mb-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">
            Dashboard de Gestão 2025 | Visage de Vogue
          </h1>
          
          {/* Sync Status */}
          <div className="flex items-center justify-center gap-4 mb-6">
            {sheetsStatus && (
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-green-500" />
                <span className="text-green-500 text-sm">Google Sheets: Conectado</span>
                <span className="text-gray-400 text-xs">
                  ({formatDate(sheetsStatus.last_sync)})
                </span>
              </div>
            )}
            <Button 
              onClick={syncGoogleSheets} 
              disabled={isSyncing}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Atualizar'}
            </Button>
          </div>
        </div>

        {/* Navigation Tabs - Compact Single Line */}
        <div className="flex justify-center mb-4 px-2">
          <div className="bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 rounded-xl p-1 shadow-xl border border-gray-600">
            <div className="flex justify-center gap-1">
              {[
                { id: 'visaoGeral', label: 'Visão Geral', icon: '📊', gradient: 'from-blue-500 to-purple-600' },
                { id: 'crediario', label: 'Crediário', icon: '💳', gradient: 'from-green-500 to-emerald-600' },
                { id: 'diasPagamento', label: 'Pagamentos', icon: '⏰', gradient: 'from-orange-500 to-red-600' },
                { id: 'metas', label: 'Metas', icon: '🎯', gradient: 'from-purple-500 to-pink-600' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => showView(tab.id)}
                  className={`group relative px-3 py-2 rounded-lg font-medium text-xs transition-all duration-300 ${
                    activeView === tab.id 
                      ? `bg-gradient-to-r ${tab.gradient} text-white shadow-md` 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  {/* Icon and Label in one line */}
                  <div className="flex items-center gap-1">
                    <span className={`text-sm ${activeView === tab.id ? 'animate-pulse' : ''}`}>
                      {tab.icon}
                    </span>
                    <span className="hidden xs:inline sm:inline">
                      {tab.label}
                    </span>
                  </div>
                  
                  {/* Active Indicator */}
                  {activeView === tab.id && (
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-white/10 to-transparent pointer-events-none"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Month Filter */}
        <div className="flex justify-center items-center gap-4 mb-8">
          <select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            {mesesDisponiveis.map(month => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
          
          {/* Refresh Button Removed */}
        </div>

        {/* All Sections View - Single Page Layout */}
        <div className="space-y-8">
          {/* KPIs Grid - Always Visible */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">
                Indicadores Financeiros
                {isDragMode && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                      Modo Arrastar Ativo - Arraste para reordenar
                    </span>
                    <button
                      onClick={() => setIsDragMode(false)}
                      className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                    >
                      Sair do Modo Arrastar
                    </button>
                  </div>
                )}
              </CardTitle>
              <div className="text-gray-400 text-sm">
                {!isDragMode && "Segue qualquer KPI por 2 segundos para ativar modo reordenar"}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 relative">
                {kpiOrder.map(kpiId => renderKPI(kpiId))}
              </div>
            </CardContent>
          </Card>

          {/* Faturamento Diário Table */}
          {faturamentoDiario && faturamentoDiario.vendas_diarias && faturamentoDiario.vendas_diarias.length > 0 && (
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-xl">
                  Faturamento Diário - {faturamentoDiario.mes === "Ano Inteiro (2025)" ? faturamentoDiario.mes : mesesDisponiveis.find(m => m.value === selectedMonth)?.label || selectedMonth}
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Detalhamento do faturamento por dia
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-4 bg-gray-800 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Total do Faturamento:</span>
                    <span className="text-green-400 font-bold text-xl">
                      {formatCurrency(faturamentoDiario.total_valor)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-gray-300">Dias com Vendas:</span>
                    <span className="text-white font-semibold">
                      {faturamentoDiario.total_vendas}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-gray-900">
                      <tr className="border-b border-gray-700">
                        <th 
                          className="text-left p-3 text-gray-300 font-medium cursor-pointer hover:text-white transition-colors"
                          onClick={() => handleSort('data', 'string')}
                        >
                          Data {getSortIcon('data')}
                        </th>
                        <th 
                          className="text-right p-3 text-gray-300 font-medium cursor-pointer hover:text-white transition-colors"
                          onClick={() => handleSort('valor', 'currency')}
                        >
                          Faturamento {getSortIcon('valor')}
                        </th>
                        {faturamentoDiario.mes === "Ano Inteiro (2025)" && (
                          <th 
                            className="text-left p-3 text-gray-300 font-medium cursor-pointer hover:text-white transition-colors"
                            onClick={() => handleSort('mes', 'string')}
                          >
                            Mês {getSortIcon('mes')}
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {sortData(faturamentoDiario.vendas_diarias, sortConfig.key, sortConfig.key === 'valor' ? 'currency' : 'string')
                        .map((venda, index) => (
                        <tr key={index} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                          <td className="p-3 text-white">{venda.data}</td>
                          <td className="p-3 text-right text-green-400 font-semibold">
                            {formatCurrency(venda.valor)}
                          </td>
                          {faturamentoDiario.mes === "Ano Inteiro (2025)" && (
                            <td className="p-3 text-cyan-400">{venda.mes}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-600 bg-gray-800">
                        <td className="p-3 text-white font-bold">TOTAL</td>
                        <td className="p-3 text-right text-green-400 font-bold text-lg">
                          {formatCurrency(faturamentoDiario.total_valor)}
                        </td>
                        {faturamentoDiario.mes === "Ano Inteiro (2025)" && (
                          <td className="p-3"></td>
                        )}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Crediário Section */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-xl">Clientes Crediário</CardTitle>
              <CardDescription className="text-gray-400">
                Gestão de clientes e histórico de compras
              </CardDescription>
            </CardHeader>
            <CardContent>
              {crediarioData ? (
                <div className="space-y-4">
                  <div className="text-gray-300 mb-4">
                    Total de clientes: <span className="text-white font-semibold">{crediarioData.total_clientes}</span>
                  </div>
                  
                  {/* Column Headers */}
                  <div className="bg-gray-900 p-3 rounded-lg border border-gray-600">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <button 
                          className="text-gray-300 font-medium hover:text-white transition-colors cursor-pointer"
                          onClick={() => handleSort('nome', 'string')}
                        >
                          Clientes {getSortIcon('nome')}
                        </button>
                      </div>
                      <div className="text-right">
                        <button 
                          className="text-gray-300 font-medium hover:text-white transition-colors cursor-pointer"
                          onClick={() => handleSort('saldo_devedor', 'currency')}
                        >
                          Saldo Devedor {getSortIcon('saldo_devedor')}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {sortCrediarioData(crediarioData.clientes, sortConfig.key, sortConfig.key === 'vendas_totais' || sortConfig.key === 'saldo_devedor' ? 'currency' : sortConfig.key === 'compras' ? 'number' : 'string')
                      .slice(0, 10).map((cliente) => (
                      <div key={cliente.id} className="bg-gray-800 rounded-lg border border-gray-700">
                        {/* Client Header */}
                        <div 
                          className="p-3 hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-700"
                          onClick={() => setExpandedCliente(expandedCliente === cliente.id ? null : cliente.id)}
                        >
                          <div className="flex justify-between items-center">
                            {/* Client Name */}
                            <div className="flex-1">
                              <h3 className="text-white font-semibold text-sm">{cliente.nome}</h3>
                            </div>
                            
                            {/* Outstanding Balance */}
                            <div className="text-right">
                              <div className="text-red-400 font-bold text-sm">
                                {formatCurrency(cliente.saldo_devedor)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {crediarioData.clientes.length > 10 && (
                      <div className="text-center text-gray-400 text-sm">
                        Mostrando 10 de {crediarioData.clientes.length} clientes. Acesse a aba Crediário para ver todos.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400">Carregando dados do crediário...</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dias s/ Pagamento Section */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-xl">Dias s/ Pagamento</CardTitle>
              <CardDescription className="text-gray-400">
                Clientes com mais de 30 dias sem pagamento (para cobrança)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clientesAtrasados ? (
                clientesAtrasados.clientes && clientesAtrasados.clientes.length > 0 ? (
                  <div>
                    <div className="mb-4 p-4 bg-gray-800 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Total de Clientes em Atraso:</span>
                        <span className="text-red-400 font-bold text-xl">
                          {clientesAtrasados.clientes.length}
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-64">
                      <table className="w-full border-collapse">
                        <thead className="sticky top-0 bg-gray-900">
                          <tr className="border-b border-gray-700">
                            <th 
                              className="text-left p-3 text-gray-300 font-medium cursor-pointer hover:text-white transition-colors"
                              onClick={() => handleSortAtraso('nome')}
                            >
                              Cliente {getSortIconAtraso('nome')}
                            </th>
                            <th 
                              className="text-right p-3 text-gray-300 font-medium cursor-pointer hover:text-white transition-colors"
                              onClick={() => handleSortAtraso('dias_sem_pagamento')}
                            >
                              Dias s/ Pagamento {getSortIconAtraso('dias_sem_pagamento')}
                            </th>
                            <th className="text-right p-3 text-gray-300 font-medium">
                              Saldo Devedor
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortClientesAtrasados(clientesAtrasados.clientes, sortConfigAtraso.key, sortConfigAtraso.direction)
                            .slice(0, 5).map((cliente, index) => (
                            <tr key={index} className="border-b border-gray-700 hover:bg-gray-800">
                              <td className="p-3 text-white text-sm">{cliente.nome}</td>
                              <td className="p-3 text-right">
                                <span className={`font-bold text-sm ${
                                  cliente.dias_sem_pagamento > 90 ? 'text-red-600' : 
                                  cliente.dias_sem_pagamento > 60 ? 'text-red-400' : 
                                  'text-orange-400'
                                }`}>
                                  {cliente.dias_sem_pagamento} dias
                                </span>
                              </td>
                              <td className="p-3 text-right text-yellow-400 font-semibold text-sm">
                                {formatCurrency(cliente.saldo_devedor)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {clientesAtrasados.clientes.length > 5 && (
                        <div className="text-center text-gray-400 text-sm mt-2">
                          Mostrando 5 de {clientesAtrasados.clientes.length} clientes em atraso. Acesse a aba Pagamentos para ver todos.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-green-400 text-lg font-semibold">
                      🎉 Nenhum cliente com atraso!
                    </div>
                    <div className="text-gray-400 mt-2">
                      Todos os clientes estão em dia.
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400">Carregando dados de atraso...</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metas Section */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-xl">
                Metas - {mesesDisponiveis.find(m => m.value === selectedMonth)?.label || selectedMonth}
              </CardTitle>
              <CardDescription className="text-gray-400">
                Acompanhamento de metas mensais
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metasData ? (
                metasData.success && metasData.metas && metasData.metas.length > 0 ? (
                  <div className="space-y-4 max-h-64 overflow-y-auto">
                    {metasData.metas.slice(0, 3).map((meta, index) => (
                      <div key={index} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="text-white font-semibold text-lg mb-1">{meta.titulo}</h3>
                            {meta.descricao && (
                              <p className="text-gray-400 text-sm">{meta.descricao}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleMetaStatus(meta.id, selectedMonth)}
                              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                meta.concluida 
                                  ? 'bg-green-600 text-white hover:bg-green-700' 
                                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                              }`}
                            >
                              {meta.concluida ? '✓ Concluída' : 'Pendente'}
                            </button>
                          </div>
                        </div>
                        
                        {meta.valor_meta && (
                          <div className="mb-3">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-gray-300 text-sm">Progresso:</span>
                              <span className="text-white font-semibold">
                                {formatCurrency(meta.valor_atual || 0)} / {formatCurrency(meta.valor_meta)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-3">
                              <div 
                                className={`h-3 rounded-full transition-all duration-300 ${
                                  meta.concluida ? 'bg-green-500' : 'bg-blue-500'
                                }`}
                                style={{ 
                                  width: `${Math.min(((meta.valor_atual || 0) / meta.valor_meta) * 100, 100)}%` 
                                }}
                              ></div>
                            </div>
                            <div className="text-right mt-1">
                              <span className={`text-sm font-medium ${
                                meta.concluida ? 'text-green-400' : 'text-blue-400'
                              }`}>
                                {Math.round(((meta.valor_atual || 0) / meta.valor_meta) * 100)}%
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {meta.prazo && (
                          <div className="text-gray-400 text-sm">
                            <span>Prazo: {meta.prazo}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {metasData.metas.length > 3 && (
                      <div className="text-center text-gray-400 text-sm">
                        Mostrando 3 de {metasData.metas.length} metas. Acesse a aba Metas para ver todas.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-lg mb-2">
                      Nenhuma meta encontrada para este período.
                    </div>
                    <div className="text-gray-500 text-sm">
                      As metas podem não estar configuradas para este mês.
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400">Carregando metas...</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modal de Saídas Expandível */}
        {showSaidasModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg border border-gray-600 max-w-5xl w-full max-h-[85vh] overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    Saídas por Categoria - {selectedMonth === 'anointeiro' ? 'Ano Inteiro' : 
                      mesesDisponiveis.find(m => m.value === selectedMonth)?.label || selectedMonth}
                  </h2>
                  <button
                    onClick={() => setShowSaidasModal(false)}
                    className="text-gray-400 hover:text-white text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
                
                {saidasModalData ? (
                  saidasModalData.success && saidasModalData.saidas_agrupadas && saidasModalData.saidas_agrupadas.length > 0 ? (
                    <div>
                      <div className="mb-4 p-4 bg-gray-800 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">Total de Saídas:</span>
                          <span className="text-red-400 font-bold text-xl">
                            {formatCurrency(saidasModalData.total_valor)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-gray-300">Categorias:</span>
                          <span className="text-white font-semibold">
                            {saidasModalData.total_grupos}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-gray-300">Total de Entradas:</span>
                          <span className="text-gray-400 font-semibold">
                            {saidasModalData.total_entradas}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {saidasModalData.saidas_agrupadas.map((grupo) => (
                          <div key={grupo.id} className="bg-gray-800 rounded-lg border border-gray-700">
                            {/* Group Header - Clickable */}
                            <div 
                              className="p-3 hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-700"
                              onClick={() => setExpandedSaida(expandedSaida === grupo.id ? null : grupo.id)}
                            >
                              <div className="flex justify-between items-center">
                                {/* Description */}
                                <div className="flex-1">
                                  <h3 className="text-white font-semibold text-sm">{grupo.descricao}</h3>
                                  <div className="text-gray-400 text-xs mt-1">
                                    {grupo.numero_entradas} entrada{grupo.numero_entradas !== 1 ? 's' : ''}
                                    {expandedSaida === grupo.id ? ' (clique para recolher)' : ' (clique para expandir)'}
                                  </div>
                                </div>
                                
                                {/* Total Value */}
                                <div className="text-right">
                                  <div className="text-red-400 font-bold text-sm">
                                    {formatCurrency(grupo.total_valor)}
                                  </div>
                                  <div className="text-gray-500 text-xs">
                                    {((grupo.total_valor / saidasModalData.total_valor) * 100).toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Expanded Details */}
                            {expandedSaida === grupo.id && (
                              <div className="border-t border-gray-700 p-4 bg-gray-850">
                                <h4 className="text-white font-semibold mb-3">Detalhamento por Data:</h4>
                                {grupo.detalhes && grupo.detalhes.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                      <thead>
                                        <tr className="border-b border-gray-600">
                                          <th className="text-left p-3 text-gray-300 font-medium">Data</th>
                                          <th className="text-right p-3 text-gray-300 font-medium">Valor</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {grupo.detalhes.map((detalhe, index) => (
                                          <tr key={index} className="border-b border-gray-700 last:border-b-0">
                                            <td className="p-3 text-white">{detalhe.data}</td>
                                            <td className="p-3 text-right text-red-400 font-semibold">
                                              {formatCurrency(detalhe.valor)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                      <tfoot>
                                        <tr className="border-t-2 border-gray-600 bg-gray-800">
                                          <td className="p-3 text-white font-bold">TOTAL</td>
                                          <td className="p-3 text-right text-red-400 font-bold text-lg">
                                            {formatCurrency(grupo.total_valor)}
                                          </td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-gray-400 text-center py-4">
                                    Nenhum detalhe encontrado para esta categoria.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-lg mb-2">
                        {saidasModalData.message || "Nenhuma saída encontrada para este período."}
                      </div>
                      <div className="text-gray-500 text-sm">
                        Os dados de saídas podem não estar preenchidos para este mês.
                      </div>
                    </div>
                  )
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400">Carregando saídas...</div>
                  </div>
                )}
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowSaidasModal(false)}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!dashboardData && !isLoading && (
          <Card className="bg-gray-900 border-gray-700 text-center py-12">
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-gray-800 rounded-full">
                  <Cloud className="h-12 w-12 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Carregando dados...</h3>
                  <p className="text-gray-400">
                    Aguarde enquanto sincronizamos com o Google Sheets
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Modal de Formas de Pagamento */}
      {showFormasPagamento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-600 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Formas de Pagamento - {selectedMonth === 'anointeiro' ? 'Ano Inteiro' : 
                    mesesDisponiveis.find(m => m.value === selectedMonth)?.label || selectedMonth}
                </h2>
                <button
                  onClick={() => setShowFormasPagamento(false)}
                  className="text-gray-400 hover:text-white text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              {paymentFormsData ? (
                paymentFormsData.success && paymentFormsData.formas_pagamento.length > 0 ? (
                  <div>
                    <div className="mb-4 p-4 bg-gray-800 rounded-lg">
                      <div className="text-gray-300 text-sm mb-2">Total Faturamento:</div>
                      <div className="text-2xl font-bold text-orange-400">
                        {formatCurrency(paymentFormsData.total)}
                      </div>
                    </div>
                    
                    <div className="grid gap-4">
                      {paymentFormsData.formas_pagamento.map((forma, index) => (
                        <div key={index} className="bg-gray-800 p-4 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-white font-semibold text-lg">
                              {forma.forma}
                            </div>
                            <div className="text-right">
                              <div className="text-green-400 font-bold text-lg">
                                {formatCurrency(forma.valor)}
                              </div>
                              <div className="text-gray-400 text-sm">
                                {forma.percentual}% do total
                              </div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-orange-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${forma.percentual}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-lg mb-2">
                      {paymentFormsData.message || "Nenhuma forma de pagamento encontrada para este período."}
                    </div>
                    <div className="text-gray-500 text-sm">
                      Os dados de formas de pagamento podem não estar preenchidos para este mês.
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400">Carregando formas de pagamento...</div>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowFormasPagamento(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Entradas R$ */}
      {showEntradasModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-600 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Entradas - {selectedMonth === 'anointeiro' ? 'Ano Inteiro' : 
                    mesesDisponiveis.find(m => m.value === selectedMonth)?.label || selectedMonth}
                </h2>
                <button
                  onClick={() => setShowEntradasModal(false)}
                  className="text-gray-400 hover:text-white text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              {entradasFormsData ? (
                entradasFormsData.success && entradasFormsData.formas_pagamento && entradasFormsData.formas_pagamento.length > 0 ? (
                  <div>
                    <div className="mb-4 p-4 bg-gray-800 rounded-lg">
                      <div className="text-gray-300 text-sm mb-2">Total Entradas:</div>
                      <div className="text-2xl font-bold text-yellow-400">
                        {formatCurrency(entradasFormsData.total)}
                      </div>
                    </div>
                    
                    <div className="grid gap-4">
                      {entradasFormsData.formas_pagamento.map((forma, index) => (
                        <div key={index} className="bg-gray-800 p-4 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-white font-semibold text-lg">
                              {forma.forma}
                            </div>
                            <div className="text-right">
                              <div className="text-green-400 font-bold text-lg">
                                {formatCurrency(forma.valor)}
                              </div>
                              <div className="text-gray-400 text-sm">
                                {forma.percentual}% do total
                              </div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-yellow-500 to-green-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${forma.percentual}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-lg mb-2">
                      {entradasFormsData.message || "Nenhuma entrada encontrada para este período."}
                    </div>
                    <div className="text-gray-500 text-sm">
                      Os dados de entradas podem não estar preenchidos para este mês.
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400">Carregando entradas...</div>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowEntradasModal(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;