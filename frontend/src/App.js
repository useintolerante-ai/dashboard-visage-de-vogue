import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Upload, TrendingUp, TrendingDown, BarChart3, FileSpreadsheet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [dashboardData, setDashboardData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileUpload,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  async function handleFileUpload(acceptedFiles) {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('file', file);

    setIsLoading(true);
    setUploadStatus("Processando planilha...");

    try {
      const response = await axios.post(`${API}/upload-excel`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadStatus(`✅ ${response.data.message}`);
      await loadDashboardData();
    } catch (error) {
      console.error('Erro no upload:', error);
      setUploadStatus("❌ Erro ao processar planilha");
    } finally {
      setIsLoading(false);
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercent = (value) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Dashboard de Vendas</h1>
          <p className="text-slate-600">Análise completa de performance por departamento</p>
        </div>

        {/* Upload Area */}
        <Card className="mb-8 border-dashed border-2 border-slate-300 hover:border-violet-400 transition-colors">
          <CardContent className="p-8">
            <div {...getRootProps()} className="cursor-pointer text-center">
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-violet-100 rounded-full">
                  <Upload className="h-8 w-8 text-violet-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-700">
                    {isDragActive
                      ? "Solte a planilha aqui..."
                      : "Clique ou arraste sua planilha Excel (.xlsx)"}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Formatos suportados: .xlsx, .xls
                  </p>
                </div>
                {isLoading && (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-600"></div>
                    <span className="text-sm text-slate-600">Processando...</span>
                  </div>
                )}
                {uploadStatus && (
                  <Badge variant={uploadStatus.includes("✅") ? "default" : "destructive"}>
                    {uploadStatus}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Content */}
        {dashboardData && chartData && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium opacity-90">Vendas Totais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatCurrency(dashboardData.total_vendas)}</div>
                  <div className="flex items-center mt-2">
                    <BarChart3 className="h-4 w-4 opacity-70 mr-1" />
                    <span className="text-sm opacity-90">{dashboardData.departamentos_count} departamentos</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium opacity-90">Margem 2025</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatPercent(dashboardData.margem_media_25)}</div>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 opacity-70 mr-1" />
                    <span className="text-sm opacity-90">Margem atual</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium opacity-90">Margem 2024</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatPercent(dashboardData.margem_media_24)}</div>
                  <div className="flex items-center mt-2">
                    <FileSpreadsheet className="h-4 w-4 opacity-70 mr-1" />
                    <span className="text-sm opacity-90">Comparativo</span>
                  </div>
                </CardContent>
              </Card>

              <Card className={`text-white ${dashboardData.variacao_total >= 0 
                ? 'bg-gradient-to-br from-emerald-500 to-green-600' 
                : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium opacity-90">Variação Média</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatPercent(dashboardData.variacao_total)}</div>
                  <div className="flex items-center mt-2">
                    {dashboardData.variacao_total >= 0 
                      ? <TrendingUp className="h-4 w-4 opacity-70 mr-1" />
                      : <TrendingDown className="h-4 w-4 opacity-70 mr-1" />
                    }
                    <span className="text-sm opacity-90">
                      {dashboardData.variacao_total >= 0 ? 'Crescimento' : 'Redução'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Sales by Department */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl text-slate-800">Vendas por Departamento</CardTitle>
                  <CardDescription>Volume de vendas em R$ por departamento</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.vendas_por_departamento}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="departamento" stroke="#64748b" />
                      <YAxis stroke="#64748b" tickFormatter={formatCurrency} />
                      <Tooltip formatter={(value) => [formatCurrency(value), 'Vendas']} />
                      <Bar dataKey="venda_rs" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Margin Comparison */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl text-slate-800">Comparativo de Margens</CardTitle>
                  <CardDescription>Margem 2024 vs 2025 por departamento</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData.comparativo_margens}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="departamento" stroke="#64748b" />
                      <YAxis stroke="#64748b" tickFormatter={formatPercent} />
                      <Tooltip formatter={(value) => [formatPercent(value), '']} />
                      <Line type="monotone" dataKey="margem_24" stroke="#06b6d4" strokeWidth={3} name="Margem 2024" />
                      <Line type="monotone" dataKey="margem_25" stroke="#10b981" strokeWidth={3} name="Margem 2025" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Variation Chart */}
            <Card className="shadow-lg mb-8">
              <CardHeader>
                <CardTitle className="text-xl text-slate-800">Variação % por Departamento</CardTitle>
                <CardDescription>Percentual de variação nas vendas</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.variacao_departamentos}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="departamento" stroke="#64748b" />
                    <YAxis stroke="#64748b" tickFormatter={formatPercent} />
                    <Tooltip formatter={(value) => [formatPercent(value), 'Variação']} />
                    <Bar 
                      dataKey="variacao_percent" 
                      fill={(entry) => entry?.variacao_percent >= 0 ? '#10b981' : '#ef4444'}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Departments */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-slate-800">Top 5 Departamentos</CardTitle>
                <CardDescription>Departamentos com maior volume de vendas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.top_departamentos.map((dept, index) => (
                    <div key={dept.departamento} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold`}
                             style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">Departamento {dept.departamento}</p>
                          <p className="text-sm text-slate-600">Margem: {formatPercent(dept.margem_25)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCurrency(dept.venda_rs)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Empty State */}
        {!dashboardData && !isLoading && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-slate-100 rounded-full">
                  <FileSpreadsheet className="h-12 w-12 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">Nenhum dado carregado</h3>
                  <p className="text-slate-500">Faça o upload da sua planilha Excel para visualizar o dashboard</p>
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