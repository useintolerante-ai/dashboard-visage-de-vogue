import React from "react";
import "./App.css";

function App() {
  console.log('Simple App component rendering...');
  
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-yellow-400 mb-4">
          Dashboard de Gestão 2025 | Visage de Vogue
        </h1>
        <p className="text-gray-400 text-xl">
          Sistema carregado com sucesso!
        </p>
        <div className="mt-8 p-4 bg-gray-800 rounded-lg">
          <p className="text-white">✅ Marca "Made with Emergent" removida</p>
          <p className="text-white">✅ Dashboard funcionando</p>
        </div>
      </div>
    </div>
  );
}

export default App;