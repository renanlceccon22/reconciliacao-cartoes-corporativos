
import React, { useState } from 'react';
import { AccountingParameter, Card } from '../types';
import FileUploader from './FileUploader';

interface ParametersManagerProps {
  parameters: AccountingParameter[];
  cards: Card[];
  onAddParameter: (param: AccountingParameter) => void;
  onBulkAdd: (params: AccountingParameter[]) => void;
  onRemoveParameter: (id: string) => void;
  onExtract: (files: File[]) => void;
  isLoading: boolean;
}

const ParametersManager: React.FC<ParametersManagerProps> = ({
  parameters, cards, onAddParameter, onBulkAdd, onRemoveParameter, onExtract, isLoading
}) => {
  const [newParam, setNewParam] = useState<Partial<AccountingParameter>>({
    cartao: '',
    motivo: '',
    contaDebito: '',
    contaCredito: '',
    subcontaDebito: '',
    subcontaCredito: '',
    fundo: '',
    departamentoDebito: '',
    departamentoCredito: '',
    restricaoDebito: '',
    restricaoCredito: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewParam(prev => ({ ...prev, [name]: value }));
  };

  const handleAdd = () => {
    const id = Math.random().toString(36).substr(2, 9);
    onAddParameter({ ...newParam, id } as AccountingParameter);
    setNewParam({
      cartao: '',
      motivo: '',
      contaDebito: '',
      contaCredito: '',
      subcontaDebito: '',
      subcontaCredito: '',
      fundo: '',
      departamentoDebito: '',
      departamentoCredito: '',
      restricaoDebito: '',
      restricaoCredito: ''
    });
  };

  const downloadTemplateCSV = () => {
    const headers = "Cartao,Motivo,ContaDebito,ContaCredito,SubcontaDebito,SubcontaCredito,Fundo,DepartamentoDebito,DepartamentoCredito,RestricaoDebito,RestricaoCredito\n";
    const exampleCard = cards.length > 0 ? cards[0].name : "Bradesco Infinite - COAG";
    const exampleRow = `${exampleCard},Lançar na prestação de contas,2139009,2139090,767902,767902,10,1310001,1310001,0A,0A`;
    const blob = new Blob([headers + exampleRow], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_parametros_contabeis.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <section className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-[#003B71] flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Importação Local (CSV / Excel)
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              Importante: A primeira coluna deve conter o <b>nome exato</b> de um cartão cadastrado na aba "Cadastro".
            </p>
          </div>
          <button
            onClick={downloadTemplateCSV}
            className="bg-white text-[#003B71] border border-blue-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Baixar Template CSV
          </button>
        </div>
      </section>

      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-[#003B71]">Configurar Parâmetros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="lg:col-span-1">
            <label className="block text-xs font-bold text-[#003B71] uppercase mb-1 ml-1">Cartão (Cadastrado)</label>
            <select
              name="cartao"
              value={newParam.cartao}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-white text-slate-900 border border-blue-200 rounded-lg focus:ring-2 focus:ring-[#FDB913] focus:border-transparent outline-none transition-all text-sm font-semibold"
            >
              <option value="">Selecione um cartão...</option>
              {cards.map(card => (
                <option key={card.name} value={card.name}>
                  {card.subaccount} - {card.name}
                </option>
              ))}
            </select>
            {cards.length === 0 && <p className="text-[10px] text-red-500 mt-1">Cadastre cartões na aba Cadastro primeiro.</p>}
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Motivo / Descrição</label>
            <select
              name="motivo"
              value={newParam.motivo}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-white text-slate-900 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-[#FDB913] focus:border-transparent outline-none transition-all text-sm font-medium"
            >
              <option value="">Selecione o motivo...</option>
              <option value="Lançar na prestação de contas">Lançar na prestação de contas</option>
              <option value="Devolver para cartões corporativos">Devolver para cartões corporativos</option>
              <option value="Deixar na pendente">Deixar na pendente</option>
              <option value="Nota lançada, acertar pendente">Nota lançada, acertar pendente</option>
            </select>
          </div>
          {Object.entries(newParam).filter(([k]) => k !== 'cartao' && k !== 'motivo').map(([key, value]) => (
            <div key={key}>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">{key.replace(/([A-Z])/g, ' $1')}</label>
              <input
                type="text"
                name={key}
                value={value as string}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-white text-slate-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FDB913] focus:border-transparent outline-none transition-all text-sm"
                placeholder="..."
              />
            </div>
          ))}
          <div className="flex items-end lg:col-span-4 md:col-span-2">
            <button
              onClick={handleAdd}
              disabled={!newParam.contaDebito || !newParam.cartao}
              className="w-full bg-[#003B71] text-white py-2 rounded-lg font-bold hover:bg-blue-800 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Adicionar Manual</span>
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <p className="text-sm text-gray-500 mb-4 font-medium italic">Importe uma planilha (CSV / Excel):</p>
          <FileUploader
            onFilesSelect={onExtract}
            isLoading={isLoading}
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            title="Anexar Planilha de Parâmetros"
            subtitle="Cartões não cadastrados serão ignorados automaticamente."
          />
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <h4 className="font-bold text-gray-700">Tabela de Parâmetros Atuais</h4>
          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">{parameters.length} Registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-[10px] text-gray-400 uppercase tracking-tighter">
                <th className="px-4 py-3 text-left bg-blue-50/50">Cartão</th>
                <th className="px-4 py-3 text-left bg-yellow-50/30">Motivo</th>
                <th className="px-4 py-3 text-left">C. Débito</th>
                <th className="px-4 py-3 text-left">C. Crédito</th>
                <th className="px-4 py-3 text-left">Sub Débito</th>
                <th className="px-4 py-3 text-left">Sub Crédito</th>
                <th className="px-4 py-3 text-left">Fundo</th>
                <th className="px-4 py-3 text-left">Dep. Débito</th>
                <th className="px-4 py-3 text-left">Dep. Crédito</th>
                <th className="px-4 py-3 text-left">Rest. Débito</th>
                <th className="px-4 py-3 text-left">Rest. Crédito</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {parameters.map((p) => (
                <tr key={p.id} className="text-xs hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-[#003B71] bg-blue-50/20 whitespace-nowrap">{p.cartao}</td>
                  <td className="px-4 py-3 text-gray-600 bg-yellow-50/10 font-medium">{p.motivo}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.contaDebito}</td>
                  <td className="px-4 py-3 text-gray-700">{p.contaCredito}</td>
                  <td className="px-4 py-3 text-gray-700">{p.subcontaDebito}</td>
                  <td className="px-4 py-3 text-gray-700">{p.subcontaCredito}</td>
                  <td className="px-4 py-3 text-gray-700">{p.fundo}</td>
                  <td className="px-4 py-3 text-gray-700">{p.departamentoDebito}</td>
                  <td className="px-4 py-3 text-gray-700">{p.departamentoCredito}</td>
                  <td className="px-4 py-3 text-gray-700">{p.restricaoDebito}</td>
                  <td className="px-4 py-3 text-gray-700">{p.restricaoCredito}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => onRemoveParameter(p.id)} className="text-red-400 hover:text-red-600 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {parameters.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-gray-400 italic">Nenhum parâmetro cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ParametersManager;
