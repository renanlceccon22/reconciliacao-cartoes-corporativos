
import React, { useState } from 'react';
import { Card } from '../types';
import FileUploader from './FileUploader';

interface CardsManagerProps {
  cards: Card[];
  onAddCard: (name: string, subaccount: string) => void;
  onRemoveCard: (name: string) => void;
  onImportCards: (files: File[]) => void;
  isLoading: boolean;
}

const CardsManager: React.FC<CardsManagerProps> = ({ cards, onAddCard, onRemoveCard, onImportCards, isLoading }) => {
  const [newName, setNewName] = useState('');
  const [newSub, setNewSub] = useState('');

  const handleAdd = () => {
    if (newName.trim() && newSub.trim()) {
      onAddCard(newName.trim(), newSub.trim());
      setNewName('');
      setNewSub('');
    }
  };

  const downloadTemplateCSV = () => {
    const headers = "Nome,Subconta\n";
    const exampleRows = "Bradesco Infinite - COAG,767902\nSantander - Sede,6637\nBradesco Corporativo - EAC,867900";
    const blob = new Blob([headers + exampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_cadastro_cartoes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn space-y-8">
      {/* Importação em Massa */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-[#003B71]">Importação em Massa</h3>
            <p className="text-sm text-gray-500 mt-1">
              Carregue uma lista de cartões através de um arquivo CSV ou Excel.
            </p>
          </div>
          <button
            onClick={downloadTemplateCSV}
            className="text-[#003B71] text-xs font-bold hover:underline flex items-center bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Baixar Modelo CSV
          </button>
        </div>

        <FileUploader
          onFilesSelect={onImportCards}
          isLoading={isLoading}
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          title="Importar Lista de Cartões"
          subtitle="Selecione o arquivo com os dados dos cartões"
        />
      </section>

      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-[#003B71] mb-4">Cadastro Individual</h3>
        <div className="flex flex-col md:flex-row items-end gap-3">
          <div className="flex-grow">
            <label className="block text-xs font-bold text-[#003B71] uppercase mb-1">Nome do Cartão</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-4 py-2 bg-white text-slate-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FDB913] outline-none"
              placeholder="Ex: Bradesco Infinite"
            />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-xs font-bold text-[#003B71] uppercase mb-1">Subconta</label>
            <input
              type="text"
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              className="w-full px-4 py-2 bg-white text-slate-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FDB913] outline-none"
              placeholder="Ex: 767902"
            />
          </div>
          <button
            onClick={handleAdd}
            className="w-full md:w-auto bg-[#003B71] text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-800 transition-colors whitespace-nowrap"
          >
            Adicionar
          </button>
        </div>
      </section>

      {/* Lista de Cartões Ativos */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <h4 className="font-bold text-gray-700">Cartões Ativos</h4>
          <span className="bg-[#FDB913] text-[#003B71] text-xs px-2.5 py-1 rounded-full font-bold">{cards.length} Registrados</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-[10px] text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-3 text-left font-bold">Nome</th>
                <th className="px-6 py-3 text-left font-bold">Subconta</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {cards.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-400 italic">Nenhum cartão cadastrado ainda.</td>
                </tr>
              ) : (
                cards.map((card, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-bold text-[#003B71]">{card.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600 font-medium">{card.subaccount}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onRemoveCard(card.name)}
                        className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all"
                        title="Remover Cartão"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default CardsManager;
