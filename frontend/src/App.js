import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { RefreshCw, Cloud, TrendingUp, TrendingDown, DollarSign, ShoppingCart, CreditCard, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [activeView, setActiveView] = useState('visaoGeral');
  const [selectedMonth, setSelectedMonth] = useState('setembro');
  const [dashboardData, setDashboardData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [crediarioData, setCrediarioData] = useState(null);
  const [saidasData, setSaidasData] = useState(null);
  const [mesesDisponiveis, setMesesDisponiveis] = useState([]);
  const [sheetsStatus, setSheetsStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedCliente, setExpandedCliente] = useState(null);

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

  async function loadDashboardData() {
    try {
      const [summaryResponse, chartResponse] = await Promise.all([
        axios.get(`${API}/dashboard-summary`),
        axios.get(`${API}/chart-data`)
      ]);

      setDashboardData(summaryResponse.data);
      setChartData(chartResponse.data);
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
    
    // Auto refresh every 5 minutes
    const interval = setInterval(() => {
      loadDashboardData();
      loadSheetsStatus();
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

  const showView = (viewName) => {
    setActiveView(viewName);
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

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">
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
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            {months.map(month => (
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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

              {/* A Receber (Cred.) */}
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    {getKPIIcon('areceber')}
                    <span className="text-blue-400 text-sm font-medium uppercase tracking-wide">A Receber (Cred.)</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(dashboardData.a_receber_crediario)}
                  </div>
                </CardContent>
              </Card>

              {/* Nº de Vendas */}
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    {getKPIIcon('vendas')}
                    <span className="text-purple-400 text-sm font-medium uppercase tracking-wide">Nº de Vendas</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {dashboardData.num_vendas}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            {chartData && chartData.faturamento_vs_saidas && chartData.faturamento_vs_saidas.length > 0 && (
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-xl">Faturamento vs Saídas</CardTitle>
                  <CardDescription className="text-gray-400">
                    Comparativo de entrada e saída por período
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData.faturamento_vs_saidas}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="data" 
                        stroke="#9CA3AF"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="#9CA3AF"
                        fontSize={12}
                        tickFormatter={formatCurrency}
                      />
                      <Tooltip 
                        formatter={(value, name) => [formatCurrency(value), name === 'faturamento' ? 'Faturamento' : 'Saídas']}
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#FFFFFF'
                        }}
                      />
                      <Bar dataKey="faturamento" fill="#EC4899" name="faturamento" />
                      <Bar dataKey="saidas" fill="#6B7280" name="saidas" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Crediário View */}
        {activeView === 'crediario' && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-xl">Análise de Crediário</CardTitle>
              <CardDescription className="text-gray-400">
                Controle de pagamentos e recebimentos do crediário
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <p className="text-gray-400">
                  Dados de crediário em desenvolvimento...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Saídas View */}
        {activeView === 'saidas' && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-xl">Detalhamento de Saídas</CardTitle>
              <CardDescription className="text-gray-400">
                Análise detalhada de todas as saídas por categoria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <p className="text-gray-400">
                  Detalhamento de saídas em desenvolvimento...
                </p>
              </div>
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