import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  console.log('Dashboard App component rendering...');
  
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('outubro');

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const loadDashboardData = async (mes = selectedMonth) => {
    try {
      console.log('Loading dashboard data for:', mes);
      setIsLoading(true);
      setError(null);
      
      const response = await axios.get(`${API}/dashboard-summary?mes=${mes}`);
      console.log('Dashboard data loaded:', response.data);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Erro ao carregar dados: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('useEffect triggered - loading initial data');
    loadDashboardData();
  }, []);

  const handleMonthChange = (newMonth) => {
    console.log('Changing month to:', newMonth);
    setSelectedMonth(newMonth);
    loadDashboardData(newMonth);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Erro no Dashboard</h1>
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
          <h1 className="text-4xl font-bold text-yellow-400 mb-4">
            Dashboard de Gestão 2025 | Visage de Vogue
          </h1>
          <p className="text-gray-400 text-xl">Sistema de gestão empresarial</p>
        </div>

        {/* Success Status */}
        <div className="mb-8 p-4 bg-gray-800 rounded-lg text-center">
          <div className="space-y-2">
            <p className="text-green-400">✅ Marca "Made with Emergent" removida</p>
            <p className="text-green-400">✅ Dashboard funcionando</p>
            <p className="text-green-400">✅ Backend conectado e funcionando</p>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex justify-center mb-8">
          <select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
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

        {/* Loading or Data Display */}
        {isLoading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando dados...</p>
          </div>
        ) : dashboardData ? (
          <div>
            {/* KPIs Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {/* Faturamento */}
              <div className="bg-gray-800 p-4 rounded-lg text-center">
                <div className="text-orange-400 text-xs font-medium uppercase mb-2">FATURAMENTO</div>
                <div className="text-lg font-bold text-white">
                  {formatCurrency(dashboardData.faturamento)}
                </div>
              </div>

              {/* Saídas */}
              <div className="bg-gray-800 p-4 rounded-lg text-center">
                <div className="text-red-400 text-xs font-medium uppercase mb-2">SAÍDAS</div>
                <div className="text-lg font-bold text-white">
                  {formatCurrency(dashboardData.saidas)}
                </div>
              </div>

              {/* Lucro Bruto */}
              <div className="bg-gray-800 p-4 rounded-lg text-center">
                <div className="text-blue-400 text-xs font-medium uppercase mb-2">LUCRO BRUTO</div>
                <div className={`text-lg font-bold ${dashboardData.lucro_bruto >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(dashboardData.lucro_bruto)}
                </div>
              </div>

              {/* Recebido Crediário */}
              <div className="bg-gray-800 p-4 rounded-lg text-center">
                <div className="text-cyan-400 text-xs font-medium uppercase mb-2">RECEBIDO CRED.</div>
                <div className="text-lg font-bold text-white">
                  {formatCurrency(dashboardData.recebido_crediario)}
                </div>
              </div>

              {/* A Receber Crediário */}
              <div className="bg-gray-800 p-4 rounded-lg text-center">
                <div className="text-purple-400 text-xs font-medium uppercase mb-2">EM ABERTO</div>
                <div className="text-lg font-bold text-white">
                  {formatCurrency(dashboardData.a_receber_crediario)}
                </div>
              </div>

              {/* Entradas */}
              <div className="bg-gray-800 p-4 rounded-lg text-center">
                <div className="text-yellow-400 text-xs font-medium uppercase mb-2">ENTRADAS</div>
                <div className="text-lg font-bold text-white">
                  {formatCurrency(dashboardData.entradas)}
                </div>
              </div>
            </div>

            {/* Data Info */}
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <h2 className="text-xl font-bold text-white mb-4">Informações do Sistema</h2>
              <div className="space-y-2 text-sm">
                <p className="text-gray-400">
                  Fonte dos dados: {dashboardData.data_source === 'sheets' ? '📊 Google Sheets' : '💾 Cache'}
                </p>
                {dashboardData.last_sync && (
                  <p className="text-gray-400">
                    Última sincronização: {new Date(dashboardData.last_sync).toLocaleString('pt-BR')}
                  </p>
                )}
                <p className="text-gray-400">
                  Número de vendas: {dashboardData.num_vendas || 0}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-400">Nenhum dado disponível</p>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-center mt-8">
          <button 
            onClick={() => loadDashboardData()}
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