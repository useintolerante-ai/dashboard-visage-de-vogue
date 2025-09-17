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
    loadDashboardData();
    loadSheetsStatus();
    loadMesesDisponiveis();
    loadFaturamentoDiario();
    loadClientesAtrasados();
    
    // Auto refresh every 5 minutes
    const interval = setInterval(() => {
      loadDashboardData();
      loadSheetsStatus();
      loadFaturamentoDiario();
      loadClientesAtrasados();
    }, 300000); // 5 minutes
    
    return () => clearInterval(interval);
  }, []);

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Faturamento */}
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    {getKPIIcon('faturamento')}
                    <span className="text-orange-400 text-sm font-medium uppercase tracking-wide">Faturamento</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(dashboardData.faturamento)}
                  </div>
                </CardContent>
              </Card>

              {/* Saídas */}
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    {getKPIIcon('saidas')}
                    <span className="text-green-400 text-sm font-medium uppercase tracking-wide">Saídas</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(dashboardData.saidas)}
                  </div>
                </CardContent>
              </Card>

              {/* Lucro Bruto */}
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    {getKPIIcon('lucro')}
                    <span className="text-blue-400 text-sm font-medium uppercase tracking-wide">Lucro Bruto</span>
                  </div>
                  <div className={`text-2xl font-bold ${getKPIColor(dashboardData.lucro_bruto, 'lucro')}`}>
                    {formatCurrency(dashboardData.lucro_bruto)}
                  </div>
                </CardContent>
              </Card>

              {/* Recebido (Cred.) */}
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    {getKPIIcon('recebido')}
                    <span className="text-cyan-400 text-sm font-medium uppercase tracking-wide">Recebido (Cred.)</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(dashboardData.recebido_crediario)}
                  </div>
                </CardContent>
              </Card>

              {/* Total em Aberto Cred. */}
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    {getKPIIcon('vendas')}
                    <span className="text-purple-400 text-sm font-medium uppercase tracking-wide">Total em Aberto Cred.</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {crediarioData ? formatCurrency(crediarioData.clientes.reduce((sum, cliente) => sum + cliente.saldo_devedor, 0)) : '...'}
                  </div>
                </CardContent>
              </Card>
            </div>

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
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                      <div className="md:col-span-1">
                        <button 
                          className="text-gray-300 font-medium hover:text-white transition-colors cursor-pointer"
                          onClick={() => handleSort('nome', 'string')}
                        >
                          Clientes {getSortIcon('nome')}
                        </button>
                      </div>
                      <div className="md:col-span-1 text-center">
                        <button 
                          className="text-gray-300 font-medium hover:text-white transition-colors cursor-pointer"
                          onClick={() => handleSort('vendas_totais', 'currency')}
                        >
                          Total Vendas {getSortIcon('vendas_totais')}
                        </button>
                      </div>
                      <div className="md:col-span-1 text-center">
                        <button 
                          className="text-gray-300 font-medium hover:text-white transition-colors cursor-pointer"
                          onClick={() => handleSort('compras', 'number')}
                        >
                          Compras {getSortIcon('compras')}
                        </button>
                      </div>
                      <div className="md:col-span-1 text-center">
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
                          className="p-4 hover:bg-gray-700 cursor-pointer transition-colors"
                          onClick={() => setExpandedCliente(expandedCliente === cliente.id ? null : cliente.id)}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                            {/* Client Name */}
                            <div className="md:col-span-1">
                              <h3 className="text-white font-semibold text-lg">{cliente.nome}</h3>
                            </div>
                            
                            {/* Total Sales */}
                            <div className="md:col-span-1 text-center">
                              <div className="text-gray-400 text-sm">Total Vendas</div>
                              <div className="text-green-400 font-bold text-lg">
                                {formatCurrency(cliente.vendas_totais)}
                              </div>
                            </div>
                            
                            {/* Purchases Count */}
                            <div className="md:col-span-1 text-center">
                              <div className="text-gray-400 text-sm">Nº Compras</div>
                              <div className="text-blue-400 font-bold text-lg">
                                {cliente.compras.length}
                              </div>
                            </div>
                            
                            {/* Outstanding Balance */}
                            <div className="md:col-span-1 text-center">
                              <div className="text-gray-400 text-sm">Saldo Devedor</div>
                              <div className="text-red-400 font-bold text-lg">
                                {formatCurrency(cliente.saldo_devedor)}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Expanded Purchase & Payment History */}
                        {expandedCliente === cliente.id && (
                          <div className="border-t border-gray-700 p-4 bg-gray-850">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Histórico de Compras */}
                              <div>
                                <h4 className="text-white font-semibold mb-3">Histórico de Compras:</h4>
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
                                          <td className="p-3 text-white font-bold">TOTAL COMPRAS</td>
                                          <td className="p-3 text-right text-green-400 font-bold text-lg">
                                            {formatCurrency(cliente.compras.reduce((sum, compra) => sum + compra.valor, 0))}
                                          </td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-gray-400 text-center py-4">
                                    Nenhuma compra registrada para este cliente.
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
    </div>
  );
}

export default App;