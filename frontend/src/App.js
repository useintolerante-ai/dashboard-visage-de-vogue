import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { RefreshCw, Cloud, TrendingUp, TrendingDown, DollarSign, ShoppingCart, CreditCard, Target } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [activeView, setActiveView] = useState('visaoGeral');
  const [selectedMonth, setSelectedMonth] = useState('anointeiro');
  const [dashboardData, setDashboardData] = useState(null);
  const [crediarioData, setCrediarioData] = useState(null);
  const [saidasData, setSaidasData] = useState(null);
  const [faturamentoDiario, setFaturamentoDiario] = useState(null);
  const [mesesDisponiveis, setMesesDisponiveis] = useState([]);
  const [sheetsStatus, setSheetsStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedCliente, setExpandedCliente] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [clientesAtrasados, setClientesAtrasados] = useState(null);
  const [sortConfigAtraso, setSortConfigAtraso] = useState({ key: 'dias_sem_pagamento', direction: 'desc' });
  const [showFormasPagamento, setShowFormasPagamento] = useState(false);
  const [paymentFormsData, setPaymentFormsData] = useState(null);
  const [entradasFormsData, setEntradasFormsData] = useState(null);
  const [showEntradasModal, setShowEntradasModal] = useState(false);
  const [expandedSaida, setExpandedSaida] = useState(null);

  async function syncGoogleSheets() {
    setIsSyncing(true);
    try {
      const response = await axios.get(`${API}/sync-sheets`);
      console.log('Sincronização iniciada:', response.data);
      
      // Wait a bit then reload data
      setTimeout(async () => {
        await loadDashboardData();
        await loadSheetsStatus();
        setIsSyncing(false);
      }, 3000);
      
    } catch (error) {
      console.error('Erro na sincronização:', error);
      setIsSyncing(false);
    }
  }

  async function loadFormasPagamento(mes = selectedMonth) {
    try {
      // Map 'anointeiro' to current month for payment methods
      let mesParaAPI = mes;
      if (mes === 'anointeiro') {
        mesParaAPI = 'setembro'; // Use current month for year view
      }
      
      console.log(`Loading payment methods for: ${mes} -> ${mesParaAPI}`);
      console.log(`Making API call to: ${API}/formas-pagamento/${mesParaAPI}`);
      
      const response = await axios.get(`${API}/formas-pagamento/${mesParaAPI}`);
      console.log('API Response:', response.data);
      setPaymentFormsData(response.data);
    } catch (error) {
      console.error('Erro ao carregar formas de pagamento:', error);
      setPaymentFormsData({ success: false, formas_pagamento: [] });
    }
  }

  async function loadClientesAtrasados() {
    try {
      const response = await axios.get(`${API}/clientes-atrasados`);
      setClientesAtrasados(response.data);
    } catch (error) {
      console.error('Erro ao carregar clientes atrasados:', error);
      setClientesAtrasados({ clientes: [] });
    }
  }

  async function loadDashboardData(mes = selectedMonth) {
    try {
      const summaryResponse = await axios.get(`${API}/dashboard-summary?mes=${mes}`);

      setDashboardData(summaryResponse.data);
      
      console.log('Dashboard data loaded for month:', mes, summaryResponse.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }

  async function loadSheetsStatus() {
    try {
      const response = await axios.get(`${API}/sheets-status`);
      setSheetsStatus(response.data);
    } catch (error) {
      console.error('Erro ao carregar status do Google Sheets:', error);
    }
  }

  useEffect(() => {
    console.log('useEffect triggered, loading initial data...');
    loadDashboardData();
    loadSheetsStatus();
    loadMesesDisponiveis();
    loadFaturamentoDiario();
    loadClientesAtrasados();
    
    // Auto refresh every 5 minutes
    const interval = setInterval(() => {
      console.log('Auto refresh triggered...');
      loadDashboardData();
      loadSheetsStatus();
      loadFaturamentoDiario();
      loadClientesAtrasados();
    }, 300000); // 5 minutes
    
    return () => {
      console.log('Cleaning up interval...');
      clearInterval(interval);
    };
  }, []); // Empty dependency array to run only once

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Nunca";
    try {
      return new Date(dateString).toLocaleString('pt-BR');
    } catch {
      return "Inválido";
    }
  };

  async function loadCrediarioData() {
    try {
      const response = await axios.get(`${API}/crediario-data`);
      setCrediarioData(response.data);
    } catch (error) {
      console.error('Erro ao carregar dados do crediário:', error);
    }
  }

  async function loadSaidasData(mes) {
    try {
      const response = await axios.get(`${API}/saidas-data/${mes}`);
      setSaidasData(response.data);
    } catch (error) {
      console.error('Erro ao carregar dados de saídas:', error);
    }
  }

  async function loadFaturamentoDiario(mes = selectedMonth) {
    try {
      const response = await axios.get(`${API}/faturamento-diario/${mes}`);
      setFaturamentoDiario(response.data);
    } catch (error) {
      console.error('Erro ao carregar faturamento diário:', error);
    }
  }

  async function loadMesesDisponiveis() {
    try {
      const response = await axios.get(`${API}/meses-disponiveis`);
      setMesesDisponiveis(response.data.meses);
    } catch (error) {
      console.error('Erro ao carregar meses disponíveis:', error);
    }
  }

  const toggleClienteDetails = (clienteIndex) => {
    setExpandedCliente(expandedCliente === clienteIndex ? null : clienteIndex);
  };

  const showView = (viewName) => {
    setActiveView(viewName);
    
    // Load specific data for each view
    if (viewName === 'crediario') {
      loadCrediarioData();
    } else if (viewName === 'diasPagamento') {
      loadClientesAtrasados();
    } else if (viewName === 'saidas') {
      loadSaidasData(selectedMonth);
    } else if (viewName === 'visaoGeral') {
      loadFaturamentoDiario(selectedMonth);
    }
  };

  const handleMonthChange = (mes) => {
    setSelectedMonth(mes);
    
    // Reload dashboard data for new month
    loadDashboardData(mes);
    loadFaturamentoDiario(mes);
    
    if (activeView === 'saidas') {
      loadSaidasData(mes);
    }
  };

  const getKPIColor = (value, type) => {
    if (type === 'lucro') {
      return value >= 0 ? 'text-emerald-500' : 'text-red-500';
    }
    return 'text-white';
  };

  const getKPIIcon = (type) => {
    switch (type) {
      case 'faturamento': return <DollarSign className="h-5 w-5" />;
      case 'saidas': return <TrendingDown className="h-5 w-5" />;
      case 'lucro': return <Target className="h-5 w-5" />;
      case 'recebido': return <CreditCard className="h-5 w-5" />;
      case 'areceber': return <CreditCard className="h-5 w-5" />;
      case 'vendas': return <ShoppingCart className="h-5 w-5" />;
      default: return <DollarSign className="h-5 w-5" />;
    }
  };

  const sortData = (data, key, type = 'string') => {
    if (!data || !key) return data;
    
    return [...data].sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];
      
      if (type === 'number') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else if (type === 'currency') {
        // Remove currency formatting and convert to number
        aVal = typeof aVal === 'string' ? parseFloat(aVal.replace(/[R$.,\s]/g, '').replace(',', '.')) || 0 : aVal;
        bVal = typeof bVal === 'string' ? parseFloat(bVal.replace(/[R$.,\s]/g, '').replace(',', '.')) || 0 : bVal;
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      
      if (sortConfig.direction === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  };

  const handleSortAtraso = (key) => {
    let direction = 'asc';
    if (sortConfigAtraso.key === key && sortConfigAtraso.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfigAtraso({ key, direction });
  };

  const getSortIconAtraso = (columnName) => {
    if (sortConfigAtraso.key === columnName) {
      return sortConfigAtraso.direction === 'asc' ? '↑' : '↓';
    }
    return '↕';
  };

  // Handle Faturamento KPI click
  const handleFaturamentoClick = async () => {
    setShowFormasPagamento(true);
    
    // Map selectedMonth to API format
    const monthMapping = {
      'janeiro': 'janeiro',
      'fevereiro': 'fevereiro', 
      'marco': 'março',
      'abril': 'abril',
      'maio': 'maio',
      'junho': 'junho',
      'julho': 'julho',
      'agosto': 'agosto',
      'setembro': 'setembro',
      'anointeiro': 'anointeiro'
    };
    
    const apiMonth = monthMapping[selectedMonth] || selectedMonth;
    
    try {
      const response = await fetch(`${import.meta.env.REACT_APP_BACKEND_URL}/api/formas-pagamento/${apiMonth}`);
      const data = await response.json();
      setPaymentFormsData(data);
    } catch (error) {
      console.error('Error fetching payment forms:', error);
      setPaymentFormsData({ success: false, error: 'Erro ao carregar formas de pagamento' });
    }
  };

  // Handle Entradas R$ KPI click
  const handleEntradasClick = async () => {
    setShowEntradasModal(true);
    
    // Map selectedMonth to API format  
    const monthMapping = {
      'janeiro': 'janeiro',
      'fevereiro': 'fevereiro', 
      'marco': 'março',
      'abril': 'abril',
      'maio': 'maio',
      'junho': 'junho',
      'julho': 'julho',
      'agosto': 'agosto',
      'setembro': 'setembro',
      'anointeiro': 'anointeiro'
    };
    
    const apiMonth = monthMapping[selectedMonth] || selectedMonth;
    
    try {
      const response = await fetch(`${import.meta.env.REACT_APP_BACKEND_URL}/api/entradas-pagamento/${apiMonth}`);
      const data = await response.json();
      setEntradasFormsData(data);
    } catch (error) {
      console.error('Error fetching entradas forms:', error);
      setEntradasFormsData({ success: false, error: 'Erro ao carregar formas de entrada' });
    }
  };

  const sortClientesAtrasados = (clientes, key, direction) => {
    if (!clientes || !key) return clientes;
    
    return [...clientes].sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];
      
      if (key === 'dias_sem_pagamento') {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      
      if (direction === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  };

  const handleSort = (key, type = 'string') => {
    let direction = 'desc'; // Default to descending for numbers/currency, ascending for strings
    if (type === 'string') direction = 'asc';
    
    if (sortConfig.key === key && sortConfig.direction === direction) {
      direction = direction === 'asc' ? 'desc' : 'asc';
    }
    
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <span className="text-gray-500 ml-1">↕</span>;
    }
    return sortConfig.direction === 'asc' ? 
      <span className="text-white ml-1">↑</span> : 
      <span className="text-white ml-1">↓</span>;
  };

  const sortCrediarioData = (data, key, type = 'string') => {
    if (!data || !key) return data;
    
    return [...data].sort((a, b) => {
      let aVal, bVal;
      
      if (key === 'compras') {
        // Special handling for compras count
        aVal = a.compras ? a.compras.length : 0;
        bVal = b.compras ? b.compras.length : 0;
      } else {
        aVal = a[key];
        bVal = b[key];
      }
      
      if (type === 'number') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else if (type === 'currency') {
        aVal = typeof aVal === 'number' ? aVal : parseFloat(aVal) || 0;
        bVal = typeof bVal === 'number' ? bVal : parseFloat(bVal) || 0;
      } else if (type === 'boolean') {
        aVal = Boolean(aVal);
        bVal = Boolean(bVal);
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      
      if (sortConfig.direction === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
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

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex gap-2 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => showView('visaoGeral')}
              className={`px-6 py-3 rounded-md font-medium transition-colors ${
                activeView === 'visaoGeral' 
                  ? 'bg-pink-600 text-white' 
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => showView('crediario')}
              className={`px-6 py-3 rounded-md font-medium transition-colors ${
                activeView === 'crediario' 
                  ? 'bg-pink-600 text-white' 
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              Crediário
            </button>
            <button
              onClick={() => showView('diasPagamento')}
              className={`px-6 py-3 rounded-md font-medium transition-colors ${
                activeView === 'diasPagamento' 
                  ? 'bg-pink-600 text-white' 
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              Dias s/ Pagamento
            </button>
            <button
              onClick={() => showView('saidas')}
              className={`px-6 py-3 rounded-md font-medium transition-colors ${
                activeView === 'saidas' 
                  ? 'bg-pink-600 text-white' 
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              Saídas
            </button>
          </div>
        </div>

        {/* Month Filter */}
        <div className="flex justify-center mb-8">
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
        </div>

        {/* Visão Geral View */}
        {activeView === 'visaoGeral' && dashboardData && (
          <div className="space-y-8">
            {/* KPIs Grid */}
            <Card className="bg-gray-900 border-gray-700 mb-6">
              <CardHeader>
                <CardTitle className="text-white text-lg">Indicadores Financeiros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {/* Faturamento */}
                  <div 
                    className="bg-gray-800 p-4 rounded-lg text-center cursor-pointer hover:bg-gray-700 transition-colors"
                    onClick={handleFaturamentoClick}
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {getKPIIcon('faturamento')}
                      <span className="text-orange-400 text-xs font-medium uppercase">Faturamento</span>
                      <span className="text-gray-400 text-xs">📊</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                      {dashboardData?.faturamento ? formatCurrency(dashboardData.faturamento) : 'R$ 12.785,85'}
                    </div>
                  </div>

                  {/* Saídas */}
                  <div className="bg-gray-800 p-4 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {getKPIIcon('saidas')}
                      <span className="text-green-400 text-xs font-medium uppercase">Saídas</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                      {formatCurrency(dashboardData.saidas)}
                    </div>
                  </div>

                  {/* Lucro Bruto */}
                  <div className="bg-gray-800 p-4 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {getKPIIcon('lucro')}
                      <span className="text-blue-400 text-xs font-medium uppercase">Lucro Bruto</span>
                    </div>
                    <div className={`text-lg font-bold ${getKPIColor(dashboardData.lucro_bruto, 'lucro')}`}>
                      {formatCurrency(dashboardData.lucro_bruto)}
                    </div>
                  </div>

                  {/* Recebido (Cred.) */}
                  <div className="bg-gray-800 p-4 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {getKPIIcon('recebido')}
                      <span className="text-cyan-400 text-xs font-medium uppercase">Recebido Cred.</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                      {formatCurrency(dashboardData.recebido_crediario)}
                    </div>
                  </div>

                  {/* Total em Aberto */}
                  <div className="bg-gray-800 p-4 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {getKPIIcon('vendas')}
                      <span className="text-purple-400 text-xs font-medium uppercase">Em Aberto</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                      {crediarioData ? formatCurrency(crediarioData.clientes.reduce((sum, cliente) => sum + cliente.saldo_devedor, 0)) : '...'}
                    </div>
                  </div>

                  {/* Entradas R$ */}
                  <div 
                    className="bg-gray-800 p-4 rounded-lg text-center cursor-pointer hover:bg-gray-700 transition-colors"
                    onClick={handleEntradasClick}
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {getKPIIcon('faturamento')}
                      <span className="text-yellow-400 text-xs font-medium uppercase">Entradas R$</span>
                      <span className="text-gray-400 text-xs">📊</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                      {formatCurrency(dashboardData.entradas || 0)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chart removed per user request */}

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
          </div>
        )}

        {/* Crediário View */}
        {activeView === 'crediario' && (
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
                  
                  <div className="space-y-3">
                    {sortCrediarioData(crediarioData.clientes, sortConfig.key, sortConfig.key === 'vendas_totais' || sortConfig.key === 'saldo_devedor' ? 'currency' : sortConfig.key === 'compras' ? 'number' : 'string')
                      .map((cliente) => (
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
                        
                        {/* Expanded Purchase & Payment History */}
                        {expandedCliente === cliente.id && (
                          <div className="border-t border-gray-700 p-4 bg-gray-850">
                            {/* Cliente Summary */}
                            <div className="mb-4 bg-gray-800 p-3 rounded-lg">
                              <div className="flex justify-between items-center text-sm">
                                <div className="text-center">
                                  <div className="text-gray-400 text-xs">Total Vendas</div>
                                  <div className="text-green-400 font-bold">
                                    {formatCurrency(cliente.vendas_totais)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-gray-400 text-xs">Saldo Devedor</div>
                                  <div className="text-red-400 font-bold">
                                    {formatCurrency(cliente.saldo_devedor)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-gray-400 text-xs">Nº Vendas</div>
                                  <div className="text-blue-400 font-bold">
                                    {cliente.compras.length}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Histórico de Vendas */}
                              <div>
                                <h4 className="text-white font-semibold mb-3">Histórico de Vendas:</h4>
                                {cliente.compras && cliente.compras.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                      <thead>
                                        <tr className="border-b border-gray-600">
                                          <th className="text-left p-3 text-gray-300 font-medium">Data</th>
                                          <th className="text-right p-3 text-gray-300 font-medium">Valor</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {cliente.compras.map((compra, index) => (
                                          <tr key={index} className="border-b border-gray-700 last:border-b-0">
                                            <td className="p-3 text-white">{compra.data}</td>
                                            <td className="p-3 text-right text-green-400 font-semibold">
                                              {formatCurrency(compra.valor)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                      <tfoot>
                                        <tr className="border-t-2 border-gray-600 bg-gray-800">
                                          <td className="p-3 text-white font-bold">TOTAL VENDAS</td>
                                          <td className="p-3 text-right text-green-400 font-bold text-lg">
                                            {formatCurrency(cliente.compras.reduce((sum, compra) => sum + compra.valor, 0))}
                                          </td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-gray-400 text-center py-4">
                                    Nenhuma venda registrada para este cliente.
                                  </div>
                                )}
                              </div>

                              {/* Histórico de Pagamentos */}
                              <div>
                                <h4 className="text-white font-semibold mb-3">Histórico de Pagamentos:</h4>
                                {cliente.pagamentos && cliente.pagamentos.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                      <thead>
                                        <tr className="border-b border-gray-600">
                                          <th className="text-left p-3 text-gray-300 font-medium">Data</th>
                                          <th className="text-right p-3 text-gray-300 font-medium">Valor</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {cliente.pagamentos.map((pagamento, index) => (
                                          <tr key={index} className="border-b border-gray-700 last:border-b-0">
                                            <td className="p-3 text-white">{pagamento.data}</td>
                                            <td className="p-3 text-right text-blue-400 font-semibold">
                                              {formatCurrency(pagamento.valor)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                      <tfoot>
                                        <tr className="border-t-2 border-gray-600 bg-gray-800">
                                          <td className="p-3 text-white font-bold">TOTAL PAGAMENTOS</td>
                                          <td className="p-3 text-right text-blue-400 font-bold text-lg">
                                            {formatCurrency(cliente.pagamentos.reduce((sum, pagamento) => sum + pagamento.valor, 0))}
                                          </td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-gray-400 text-center py-4">
                                    Nenhum pagamento registrado para este cliente.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400">Carregando dados do crediário...</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dias s/ Pagamento View */}
        {activeView === 'diasPagamento' && (
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

                    <div className="overflow-x-auto">
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
                            .map((cliente, index) => (
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
        )}

        {/* Saídas View */}
        {activeView === 'saidas' && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-xl">
                Detalhamento de Saídas - {mesesDisponiveis.find(m => m.value === selectedMonth)?.label || selectedMonth}
              </CardTitle>
              <CardDescription className="text-gray-400">
                Análise detalhada de todas as saídas do mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              {saidasData && saidasData.saidas ? (
                <>
                  <div className="mb-4 p-4 bg-gray-800 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Total de Saídas:</span>
                      <span className="text-red-400 font-bold text-xl">
                        {formatCurrency(saidasData.total_valor)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-gray-300">Número de Saídas:</span>
                      <span className="text-white font-semibold">
                        {saidasData.total_saidas}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th 
                            className="text-left p-3 text-gray-300 font-medium cursor-pointer hover:text-white transition-colors"
                            onClick={() => handleSort('data', 'string')}
                          >
                            Data {getSortIcon('data')}
                          </th>
                          <th 
                            className="text-left p-3 text-gray-300 font-medium cursor-pointer hover:text-white transition-colors"
                            onClick={() => handleSort('descricao', 'string')}
                          >
                            Descrição {getSortIcon('descricao')}
                          </th>
                          <th 
                            className="text-right p-3 text-gray-300 font-medium cursor-pointer hover:text-white transition-colors"
                            onClick={() => handleSort('valor', 'currency')}
                          >
                            Valor {getSortIcon('valor')}
                          </th>
                          {selectedMonth === 'anointeiro' && (
                            <th 
                              className="text-left p-3 text-gray-300 font-medium cursor-pointer hover:text-white transition-colors"
                              onClick={() => handleSort('mes_nome', 'string')}
                            >
                              Mês {getSortIcon('mes_nome')}
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {sortData(saidasData.saidas, sortConfig.key, sortConfig.key === 'valor' ? 'currency' : 'string')
                          .map((saida, index) => (
                          <tr key={saida.id || index} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                            <td className="p-3 text-white">{saida.data}</td>
                            <td className="p-3 text-white">{saida.descricao}</td>
                            <td className="p-3 text-right text-red-400 font-semibold">
                              {formatCurrency(saida.valor)}
                            </td>
                            {selectedMonth === 'anointeiro' && (
                              <td className="p-3 text-cyan-400">{saida.mes_nome || 'N/A'}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-600 bg-gray-800">
                          <td className="p-3 text-white font-bold" colSpan={selectedMonth === 'anointeiro' ? "3" : "2"}>TOTAL</td>
                          <td className="p-3 text-right text-red-400 font-bold text-lg">
                            {formatCurrency(saidasData.total_valor)}
                          </td>
                          {selectedMonth === 'anointeiro' && (
                            <td className="p-3"></td>
                          )}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400">
                    {saidasData === null ? 'Carregando dados de saídas...' : 'Nenhum dado de saída encontrado para este mês'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
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
                  Entradas R$ - {selectedMonth === 'anointeiro' ? 'Ano Inteiro' : 
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
                entradasFormsData.success && entradasFormsData.formas_pagamento.length > 0 ? (
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