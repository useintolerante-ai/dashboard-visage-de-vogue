import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// UI Components (simple inline definitions)
const Card = ({ children, className }) => (
  <div className={`rounded-lg border ${className}`}>{children}</div>
);

const CardHeader = ({ children }) => (
  <div className="p-6 pb-2">{children}</div>
);

const CardTitle = ({ children, className }) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`}>{children}</h3>
);

const CardDescription = ({ children, className }) => (
  <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>
);

const CardContent = ({ children }) => (
  <div className="p-6 pt-0">{children}</div>
);

// Environment variables
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [activeView, setActiveView] = useState('visao-geral');
  const [selectedMonth, setSelectedMonth] = useState('setembro');
  const [dashboardData, setDashboardData] = useState(null);
  const [crediarioData, setCrediarioData] = useState(null);
  const [saidasData, setSaidasData] = useState(null);
  const [clientesAtrasados, setClientesAtrasados] = useState(null);
  const [faturamentoDiario, setFaturamentoDiario] = useState(null);
  const [mesesDisponiveis, setMesesDisponiveis] = useState([
    { label: "Janeiro", value: "janeiro" },
    { label: "Fevereiro", value: "fevereiro" },
    { label: "Março", value: "marco" },
    { label: "Abril", value: "abril" },
    { label: "Maio", value: "maio" },
    { label: "Junho", value: "junho" },
    { label: "Julho", value: "julho" },
    { label: "Agosto", value: "agosto" },
    { label: "Setembro", value: "setembro" },
    { label: "Outubro", value: "outubro" },
    { label: "Ano Inteiro", value: "anointeiro" }
  ]);

  useEffect(() => {
    loadDashboardData();
    loadCrediarioData();
    loadSaidasData();
    loadClientesAtrasados();
    loadFaturamentoDiario();
  }, [selectedMonth]);

  async function loadDashboardData(mes = selectedMonth) {
    try {
      const response = await axios.get(`${API}/dashboard-summary?mes=${mes}`);
      setDashboardData(response.data);
      console.log('Dashboard data loaded for month:', mes, response.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }

  async function loadCrediarioData(mes = selectedMonth) {
    try {
      const response = await axios.get(`${API}/crediario-data/${mes}`);
      setCrediarioData(response.data);
    } catch (error) {
      console.error('Erro ao carregar dados do crediário:', error);
    }
  }

  async function loadSaidasData(mes = selectedMonth) {
    try {
      const response = await axios.get(`${API}/saidas-data/${mes}`);
      setSaidasData(response.data);
    } catch (error) {
      console.error('Erro ao carregar dados de saídas:', error);
    }
  }

  async function loadClientesAtrasados() {
    try {
      const response = await axios.get(`${API}/clientes-atrasados`);
      setClientesAtrasados(response.data);
    } catch (error) {
      console.error('Erro ao carregar clientes atrasados:', error);
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

  const handleMonthChange = (newMonth) => {
    setSelectedMonth(newMonth);
    loadDashboardData(newMonth);
    loadCrediarioData(newMonth);
    loadSaidasData(newMonth);
    loadFaturamentoDiario(newMonth);
  };

  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  }

  function getKPIIcon(type) {
    const icons = {
      faturamento: '💰',
      saidas: '📉',
      lucro: '📈',
      recebido: '💳',
      vendas: '🛒',
      ticket: '🎟️'
    };
    return <span className="text-xl">{icons[type] || '📊'}</span>;
  }

  function getKPIColor(value, type) {
    if (type === 'lucro') {
      return value >= 0 ? 'text-green-400' : 'text-red-400';
    }
    return 'text-white';
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-xl">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Dashboard Financeiro - Visage de Vogue
          </h1>
          
          <div className="flex items-center space-x-4">
            <select 
              value={selectedMonth} 
              onChange={(e) => handleMonthChange(e.target.value)}
              className="bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              {mesesDisponiveis.map((mes) => (
                <option key={mes.value} value={mes.value}>{mes.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-gray-800 rounded-lg p-1 space-x-1">
            {[
              { id: 'visao-geral', label: 'Visão Geral', icon: '📊' },
              { id: 'crediario', label: 'Crediário', icon: '💳' },
              { id: 'saidas', label: 'Saídas', icon: '📉' },
              { id: 'dias-sem-pagamento', label: 'Dias s/ Pagamento', icon: '⏰' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`px-6 py-3 rounded-md font-medium transition-colors ${
                  activeView === tab.id 
                    ? 'bg-pink-600 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visão Geral View */}
        {activeView === 'visao-geral' && (
          <div className="space-y-6">
            {/* KPIs Grid */}
            <Card className="bg-gray-900 border-gray-700 mb-6">
              <CardHeader>
                <CardTitle className="text-white text-lg">Indicadores Financeiros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {/* Faturamento */}
                  <div className="bg-gray-800 p-4 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {getKPIIcon('faturamento')}
                      <span className="text-orange-400 text-xs font-medium uppercase">Faturamento</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                      {formatCurrency(dashboardData.faturamento)}
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

                  {/* Ticket Médio */}
                  <div className="bg-gray-800 p-4 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {getKPIIcon('ticket')}
                      <span className="text-yellow-400 text-xs font-medium uppercase">Ticket Médio</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                      {formatCurrency(dashboardData.ticket_medio || 0)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Crediário View */}
        {activeView === 'crediario' && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-xl">Detalhamento do Crediário</CardTitle>
              <CardDescription className="text-gray-400">
                Lista de clientes com saldo em aberto
              </CardDescription>
            </CardHeader>
            <CardContent>
              {crediarioData && crediarioData.clientes ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left p-3 text-gray-300 font-medium">Cliente</th>
                        <th className="text-right p-3 text-gray-300 font-medium">Saldo Devedor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {crediarioData.clientes.map((cliente, index) => (
                        <tr key={index} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                          <td className="p-3 text-white">{cliente.nome}</td>
                          <td className="p-3 text-right text-red-400 font-semibold">
                            {formatCurrency(cliente.saldo_devedor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400">Carregando dados do crediário...</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Saídas View */}
        {activeView === 'saidas' && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-xl">Detalhamento de Saídas</CardTitle>
              <CardDescription className="text-gray-400">
                Análise detalhada de todas as saídas do mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              {saidasData && saidasData.saidas ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left p-3 text-gray-300 font-medium">Data</th>
                        <th className="text-left p-3 text-gray-300 font-medium">Descrição</th>
                        <th className="text-right p-3 text-gray-300 font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saidasData.saidas.map((saida, index) => (
                        <tr key={index} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                          <td className="p-3 text-white">{saida.data}</td>
                          <td className="p-3 text-white">{saida.descricao}</td>
                          <td className="p-3 text-right text-red-400 font-semibold">
                            {formatCurrency(saida.valor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400">Carregando dados de saídas...</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dias sem Pagamento View */}
        {activeView === 'dias-sem-pagamento' && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-xl">Clientes com Dias sem Pagamento</CardTitle>
              <CardDescription className="text-gray-400">
                Clientes que estão com pagamentos atrasados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clientesAtrasados && clientesAtrasados.clientes ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left p-3 text-gray-300 font-medium">Cliente</th>
                        <th className="text-right p-3 text-gray-300 font-medium">Dias sem Pagamento</th>
                        <th className="text-right p-3 text-gray-300 font-medium">Saldo Devedor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientesAtrasados.clientes.map((cliente, index) => (
                        <tr key={index} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                          <td className="p-3 text-white">{cliente.nome}</td>
                          <td className="p-3 text-right text-orange-400 font-semibold">
                            {cliente.dias_sem_pagamento} dias
                          </td>
                          <td className="p-3 text-right text-red-400 font-semibold">
                            {formatCurrency(cliente.saldo_devedor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400">Carregando clientes atrasados...</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!['visao-geral', 'crediario', 'saidas', 'dias-sem-pagamento'].includes(activeView) && (
          <Card className="bg-gray-900 border-gray-700 text-center py-12">
            <CardContent>
              <p className="text-gray-400">Acompanhamento de atividades e objetivos mensais</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default App;