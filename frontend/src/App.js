import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

// Simple Card components to avoid import issues
const Card = ({ children, className = "" }) => (
  <div className={`rounded-xl border bg-gray-800 text-white shadow ${className}`}>
    {children}
  </div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={`p-6 pt-0 ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children, className = "" }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children, className = "" }) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`}>
    {children}
  </h3>
);

const CardDescription = ({ children, className = "" }) => (
  <p className={`text-sm text-gray-400 ${className}`}>
    {children}
  </p>
);

const Button = ({ children, onClick, disabled = false, className = "", size = "default" }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
      size === "sm" ? "h-9 px-3" : "h-10 px-4 py-2"
    } ${className}`}
  >
    {children}
  </button>
);

const Badge = ({ children, className = "" }) => (
  <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
    {children}
  </div>
);

// Simple icons
const RefreshCw = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const Cloud = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8a3 3 0 016 0v1a3 3 0 110 6h-1a3 3 0 01-3-3v-1z" />
  </svg>
);

const DollarSign = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
);

const TrendingUp = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TrendingDown = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

const ShoppingCart = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m.6 8L5 4H3m4 9v6a1 1 0 001 1h10a1 1 0 001-1v-6m-1 0V9a1 1 0 00-1-1H7a1 1 0 00-1 1v4h12z" />
  </svg>
);

const CreditCard = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const Target = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  console.log('App component starting...');
  
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
  const [saidasModalData, setSaidasModalData] = useState(null);
  const [showSaidasModal, setShowSaidasModal] = useState(false);
  const [metasData, setMetasData] = useState(null);
  
  // Drag and Drop states
  const [isDragMode, setIsDragMode] = useState(false);
  const [draggedKPI, setDraggedKPI] = useState(null);
  const [dragTimer, setDragTimer] = useState(null);
  const [kpiOrder, setKpiOrder] = useState(() => {
    // Load saved order from localStorage or use default
    const savedOrder = localStorage.getItem('kpiOrder');
    return savedOrder ? JSON.parse(savedOrder) : [
      'faturamento', 'lucro', 'entradas', 'saidas', 'aberto', 'recebido'
    ];
  });

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

      // If dashboard data is empty due to rate limiting, try to get entradas separately
      if (summaryResponse.data.data_source === "none" || summaryResponse.data.entradas === 0) {
        console.log('Dashboard data empty, trying to load entradas separately...');
        try {
          const entradasResponse = await axios.get(`${API}/entradas-pagamento/${mes}`);
          if (entradasResponse.data.success && entradasResponse.data.total > 0) {
            summaryResponse.data.entradas = entradasResponse.data.total;
            console.log('Entradas loaded separately:', entradasResponse.data.total);
          }
        } catch (entradasError) {
          console.error('Error loading entradas separately:', entradasError);
        }
      }

      setDashboardData(summaryResponse.data);
      
      console.log('Dashboard data loaded for month:', mes, summaryResponse.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }

  async function forceRefreshData() {
    console.log('Force refresh triggered...');
    setIsLoading(true);
    
    try {
      // Clear existing data first to prevent cache issues
      setDashboardData({
        faturamento: 0,
        saidas: 0,
        lucro_bruto: 0,
        recebido_crediario: 0,
        entradas: 0
      });
      
      // Load fresh data for current month
      await loadDashboardData(selectedMonth);
      await loadSheetsStatus();
      await loadFaturamentoDiario(selectedMonth);
      await loadClientesAtrasados();
      await loadMetasData(selectedMonth);
      
      // If we're in crediario view, refresh that too
      if (activeView === 'crediario') {
        await loadCrediarioData();
      }
      
      console.log('Force refresh completed');
    } catch (error) {
      console.error('Error during force refresh:', error);
    } finally {
      setIsLoading(false);
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
    setIsLoading(true);
    
    const loadInitialData = async () => {
      try {
        await loadDashboardData();
        await loadSheetsStatus();
        await loadMesesDisponiveis();
        await loadFaturamentoDiario();
        await loadClientesAtrasados();
        await loadMetasData();
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();
    
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
      const response = await axios.get(`${API}/saidas-agrupadas/${mes}`);
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

  async function loadMetasData(mes = selectedMonth) {
    try {
      const response = await axios.get(`${API}/metas/${mes}`);
      setMetasData(response.data);
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
    }
  }

  async function toggleMetaStatus(metaId, mes = selectedMonth) {
    try {
      const response = await axios.post(`${API}/metas/${mes}/toggle/${metaId}`);
      if (response.data.success) {
        // Reload metas data
        loadMetasData(mes);
      }
    } catch (error) {
      console.error('Erro ao alterar status da meta:', error);
    }
  }

  async function loadMesesDisponiveis() {
    try {
      // Try automatic detection first
      const response = await axios.get(`${API}/meses-disponiveis-auto`);
      if (response.data.success && response.data.meses.length > 0) {
        // Transform data for the dropdown
        const mesesFormatted = response.data.meses.map(mes => ({
          label: mes.display_name,
          value: mes.value
        }));
        setMesesDisponiveis(mesesFormatted);
        console.log('Meses detected automatically:', mesesFormatted);
      } else {
        // Fallback to manual list
        throw new Error('Auto detection failed');
      }
    } catch (error) {
      console.error('Erro ao carregar meses disponíveis:', error);
      // Fallback to current static months
      const fallbackMeses = [
        { label: "Janeiro", value: "janeiro" },
        { label: "Fevereiro", value: "fevereiro" },
        { label: "Março", value: "marco" },
        { label: "Abril", value: "abril" },
        { label: "Maio", value: "maio" },
        { label: "Junho", value: "junho" },
        { label: "Julho", value: "julho" },
        { label: "Agosto", value: "agosto" },
        { label: "Setembro", value: "setembro" },
        { label: "Ano Inteiro", value: "anointeiro" }
      ];
      setMesesDisponiveis(fallbackMeses);
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
    } else if (viewName === 'metas') {
      loadMetasData(selectedMonth);
    }
  };

  const handleMonthChange = async (newMonth) => {
    console.log('Month changing to:', newMonth);
    setSelectedMonth(newMonth);
    
    if (newMonth) {
      // Force complete data reset
      setIsLoading(true);
      
      // Clear ALL existing data first to prevent cache issues
      setDashboardData({
        faturamento: 0,
        saidas: 0,
        lucro_bruto: 0,
        recebido_crediario: 0,
        a_receber_crediario: 0,
        num_vendas: 0,
        entradas: 0,
        data_source: "none"
      });
      
      // Add small delay to ensure state is cleared
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        // Load fresh data sequentially to avoid race conditions
        await loadDashboardData(newMonth);
        await loadCrediarioData(newMonth);
        await loadFaturamentoDiario(newMonth);
        await loadClientesAtrasados();
        await loadMetasData(newMonth);
        
        console.log(`Data loaded for ${newMonth}`);
      } catch (error) {
        console.error(`Error loading data for ${newMonth}:`, error);
      } finally {
        setIsLoading(false);
      }
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
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/formas-pagamento/${apiMonth}`);
      const data = await response.json();
      setPaymentFormsData(data);
    } catch (error) {
      console.error('Error fetching payment forms:', error);
      setPaymentFormsData({ success: false, error: 'Erro ao carregar formas de pagamento' });
    }
  };

  // Handle Saídas KPI click
  const handleSaidasClick = async () => {
    setShowSaidasModal(true);
    setSaidasModalData(null); // Reset data first
    
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
      'outubro': 'outubro',
      'anointeiro': 'anointeiro'
    };
    
    const apiMonth = monthMapping[selectedMonth] || selectedMonth;
    
    console.log('Loading saidas data for month:', apiMonth);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/saidas-agrupadas/${apiMonth}`);
      const data = await response.json();
      console.log('Saidas data received:', data);
      setSaidasModalData(data);
    } catch (error) {
      console.error('Error fetching saidas data:', error);
      setSaidasModalData({ success: false, error: 'Erro ao carregar saídas' });
    }
  };

  // Handle Entradas R$ KPI click
  const handleEntradasClick = async () => {
    setShowEntradasModal(true);
    setEntradasFormsData(null); // Reset data first
    
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
    
    console.log('Loading entradas data for month:', apiMonth);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/entradas-pagamento/${apiMonth}`);
      const data = await response.json();
      console.log('Entradas data received:', data);
      setEntradasFormsData(data);
    } catch (error) {
      console.error('Error fetching entradas forms:', error);
      setEntradasFormsData({ success: false, error: 'Erro ao carregar formas de entrada' });
    }
  };

  // Drag and Drop functions
  const handleMouseDown = (kpiId) => {
    const timer = setTimeout(() => {
      setIsDragMode(true);
      setDraggedKPI(kpiId);
      console.log('Drag mode activated for:', kpiId);
    }, 2000); // 2 seconds instead of 3
    setDragTimer(timer);
  };

  const handleMouseUp = () => {
    if (dragTimer) {
      clearTimeout(dragTimer);
      setDragTimer(null);
    }
  };

  const handleMouseLeave = () => {
    if (dragTimer) {
      clearTimeout(dragTimer);
      setDragTimer(null);
    }
  };

  const handleDragStart = (e, kpiId) => {
    setDraggedKPI(kpiId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetKpiId) => {
    e.preventDefault();
    if (draggedKPI && draggedKPI !== targetKpiId) {
      const newOrder = [...kpiOrder];
      const dragIndex = newOrder.indexOf(draggedKPI);
      const targetIndex = newOrder.indexOf(targetKpiId);
      
      // Remove dragged item and insert at target position
      newOrder.splice(dragIndex, 1);
      newOrder.splice(targetIndex, 0, draggedKPI);
      
      setKpiOrder(newOrder);
      localStorage.setItem('kpiOrder', JSON.stringify(newOrder));
      console.log('New KPI order:', newOrder);
    }
    setDraggedKPI(null);
    setIsDragMode(false);
  };

  const handleDragEnd = () => {
    setDraggedKPI(null);
    setIsDragMode(false);
  };

  // Function to render individual KPI
  const renderKPI = (kpiId) => {
    const kpiConfig = {
      faturamento: {
        icon: getKPIIcon('faturamento'),
        label: 'FATURAMENTO',
        value: dashboardData?.faturamento ? formatCurrency(dashboardData.faturamento) : 'R$ 12.785,85',
        color: 'text-orange-400',
        clickable: true,
        onClick: handleFaturamentoClick,
        badge: '📊'
      },
      saidas: {
        icon: getKPIIcon('saidas'),
        label: 'SAÍDAS',
        value: formatCurrency(dashboardData.saidas),
        color: 'text-green-400',
        clickable: true,
        onClick: handleSaidasClick,
        badge: '📊'
      },
      lucro: {
        icon: getKPIIcon('lucro'),
        label: 'LUCRO BRUTO',
        value: formatCurrency(dashboardData.lucro_bruto),
        color: 'text-blue-400',
        valueColor: getKPIColor(dashboardData.lucro_bruto, 'lucro')
      },
      recebido: {
        icon: getKPIIcon('recebido'),
        label: 'RECEBIDO CRED.',
        value: formatCurrency(dashboardData.recebido_crediario),
        color: 'text-cyan-400'
      },
      aberto: {
        icon: getKPIIcon('vendas'),
        label: 'EM ABERTO',
        value: crediarioData ? formatCurrency(crediarioData.clientes.reduce((sum, cliente) => sum + cliente.saldo_devedor, 0)) : '...',
        color: 'text-purple-400'
      },
      entradas: {
        icon: getKPIIcon('faturamento'),
        label: 'ENTRADAS',
        value: formatCurrency(dashboardData.entradas || 0),
        color: 'text-yellow-400',
        clickable: true,
        onClick: handleEntradasClick,
        badge: '📊'
      }
    };

    const config = kpiConfig[kpiId];
    if (!config) return null;

    const isDragging = draggedKPI === kpiId;
    const isClickable = config.clickable && !isDragMode;

    return (
      <div
        key={kpiId}
        className={`bg-gray-800 p-4 rounded-lg text-center transition-all duration-200 relative select-none ${
          isClickable ? 'cursor-pointer hover:bg-gray-700' : ''
        } ${isDragMode ? 'cursor-move' : ''} ${
          isDragging ? 'opacity-50 transform scale-105 shadow-lg' : ''
        } ${isDragMode && !isDragging ? 'hover:bg-gray-600' : ''}`}
        draggable={isDragMode}
        onMouseDown={() => !isDragMode && handleMouseDown(kpiId)}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDragStart={(e) => handleDragStart(e, kpiId)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, kpiId)}
        onDragEnd={handleDragEnd}
        onClick={isClickable ? config.onClick : undefined}
      >
        {isDragMode && (
          <div className="absolute top-1 right-1 text-xs bg-blue-500 text-white px-2 py-1 rounded">
            ⚡ Arrastar
          </div>
        )}
        <div className="flex items-center justify-center gap-2 mb-2">
          {config.icon}
          <span className={`${config.color} text-xs font-medium uppercase`}>{config.label}</span>
          {config.badge && <span className="text-gray-400 text-xs">{config.badge}</span>}
        </div>
        <div className={`text-lg font-bold ${config.valueColor || 'text-white'}`}>
          {config.value}
        </div>
      </div>
    );
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

  // Debug: Simple test render
  console.log('About to render, isLoading:', isLoading, 'dashboardData:', dashboardData);
  
  // Add loading state for initial render
  if (isLoading && !dashboardData) {
    console.log('Rendering loading state');
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

  console.log('Rendering main dashboard');
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