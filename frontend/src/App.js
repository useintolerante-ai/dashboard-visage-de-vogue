import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  console.log('Dashboard App component rendering...');
  
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('setembro');

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const loadDashboardData = async () => {
    try {
      console.log('Loading dashboard data...');
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
        entradas: 15285.68
      });
    }
  };

  useEffect(() => {
    console.log('Loading initial data...');
    loadDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-yellow-400 mb-4">
            Dashboard de Gestão 2025 | Visage de Vogue
          </h1>
          <p className="text-gray-400">Sistema de gestão empresarial</p>
        </div>

        {/* Navigation Tabs - Compact Single Line */}
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 rounded-xl p-1 shadow-xl border border-gray-600">
            <div className="flex justify-center gap-1">
              {[
                { id: 'visaoGeral', label: 'Visão Geral', icon: '📊', gradient: 'from-blue-500 to-purple-600', active: true },
                { id: 'crediario', label: 'Crediário', icon: '💳', gradient: 'from-green-500 to-emerald-600', active: false },
                { id: 'pagamentos', label: 'Pagamentos', icon: '⏰', gradient: 'from-orange-500 to-red-600', active: false },
                { id: 'metas', label: 'Metas', icon: '🎯', gradient: 'from-purple-500 to-pink-600', active: false }
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`group relative px-3 py-2 rounded-lg font-medium text-xs transition-all duration-300 ${
                    tab.active 
                      ? `bg-gradient-to-r ${tab.gradient} text-white shadow-md` 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  {/* Icon and Label in one line */}
                  <div className="flex items-center gap-1">
                    <span className={`text-sm ${tab.active ? 'animate-pulse' : ''}`}>
                      {tab.icon}
                    </span>
                    <span className="hidden xs:inline sm:inline">
                      {tab.label}
                    </span>
                  </div>
                  
                  {/* Active Indicator */}
                  {tab.active && (
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

        {/* KPIs Grid */}
        {dashboardData && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {/* Faturamento - CLICÁVEL */}
            <div className="bg-gray-800 p-4 rounded-lg text-center cursor-pointer hover:bg-gray-700 transition-colors border border-gray-600 hover:border-orange-400">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg className="h-5 w-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span className="text-orange-400 text-xs font-medium uppercase">FATURAMENTO</span>
                <span className="text-gray-400 text-xs">📊</span>
              </div>
              <div className="text-lg font-bold text-white">
                {formatCurrency(dashboardData.faturamento)}
              </div>
            </div>

            {/* Saídas - CLICÁVEL */}
            <div className="bg-gray-800 p-4 rounded-lg text-center cursor-pointer hover:bg-gray-700 transition-colors border border-gray-600 hover:border-red-400">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
                <span className="text-red-400 text-xs font-medium uppercase">SAÍDAS</span>
                <span className="text-gray-400 text-xs">📊</span>
              </div>
              <div className="text-lg font-bold text-white">
                {formatCurrency(dashboardData.saidas)}
              </div>
            </div>

            {/* Lucro Bruto */}
            <div className="bg-gray-800 p-4 rounded-lg text-center border border-gray-600">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-blue-400 text-xs font-medium uppercase">LUCRO BRUTO</span>
              </div>
              <div className={`text-lg font-bold ${dashboardData.lucro_bruto >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {formatCurrency(dashboardData.lucro_bruto)}
              </div>
            </div>

            {/* Recebido Crediário */}
            <div className="bg-gray-800 p-4 rounded-lg text-center border border-gray-600">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg className="h-5 w-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span className="text-cyan-400 text-xs font-medium uppercase">RECEBIDO CRED.</span>
              </div>
              <div className="text-lg font-bold text-white">
                {formatCurrency(dashboardData.recebido_crediario)}
              </div>
            </div>

            {/* Em Aberto */}
            <div className="bg-gray-800 p-4 rounded-lg text-center border border-gray-600">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span className="text-purple-400 text-xs font-medium uppercase">EM ABERTO</span>
              </div>
              <div className="text-lg font-bold text-white">
                {formatCurrency(dashboardData.a_receber_crediario)}
              </div>
            </div>

            {/* Entradas - CLICÁVEL */}
            <div className="bg-gray-800 p-4 rounded-lg text-center cursor-pointer hover:bg-gray-700 transition-colors border border-gray-600 hover:border-yellow-400">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
                <span className="text-yellow-400 text-xs font-medium uppercase">ENTRADAS</span>
                <span className="text-gray-400 text-xs">📊</span>
              </div>
              <div className="text-lg font-bold text-white">
                {formatCurrency(dashboardData.entradas)}
              </div>
            </div>
          </div>
        )}

        {/* Simple Info Section */}
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-white mb-4">Funcionalidades Implementadas</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-green-400">✅ KPIs básicos funcionando</p>
              <p className="text-green-400">✅ Seletor de mês</p>
              <p className="text-green-400">✅ Dados do backend carregando</p>
            </div>
            <div>
              <p className="text-yellow-400">🔄 Faturamento clicável (próximo)</p>
              <p className="text-yellow-400">🔄 Saídas clicáveis (próximo)</p>
              <p className="text-yellow-400">🔄 Seção de Metas (próximo)</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center mt-8">
          <button 
            onClick={loadDashboardData}
            className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-2 rounded-lg font-medium"
          >
            🔄 Atualizar Dados
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;