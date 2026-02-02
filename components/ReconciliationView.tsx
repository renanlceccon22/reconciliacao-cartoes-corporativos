
import React, { useMemo } from 'react';
import { Transaction, Allocation, ReconciledPair, AccountingParameter, AccountingEntry } from '../types';

interface ReconciliationViewProps {
  transactions: Transaction[];
  allocations: Allocation[];
  parameters: AccountingParameter[];
  cardName: string;
}

const ReconciliationView: React.FC<ReconciliationViewProps> = ({ transactions, allocations, parameters, cardName }) => {
  const reconciliation = useMemo(() => {
    const reconciled: ReconciledPair[] = [];
    const unmatchedTransactions: Transaction[] = [...transactions];
    const unmatchedAllocations: Allocation[] = [...allocations];

    // Lógica de Match Simples: Mesmo valor
    for (let i = unmatchedTransactions.length - 1; i >= 0; i--) {
      const tx = unmatchedTransactions[i];
      const matchIdx = unmatchedAllocations.findIndex(al => 
        Math.abs(al.amount - tx.amount) < 0.01
      );

      if (matchIdx !== -1) {
        const al = unmatchedAllocations[matchIdx];
        reconciled.push({
          transaction: tx,
          allocation: al,
          matchScore: 100
        });
        unmatchedTransactions.splice(i, 1);
        unmatchedAllocations.splice(matchIdx, 1);
      }
    }

    return { reconciled, unmatchedTransactions, unmatchedAllocations };
  }, [transactions, allocations]);

  const exportToCSV = (entries: AccountingEntry[], filename: string, isFromFatura: boolean) => {
    if (entries.length === 0) return;
    
    // Conforme solicitado: Célula A1 com valor fixo 1322
    const a1Line = "1322\n";
    
    // Novo Cabeçalho: Conta;Subconta;Fundo;Departamento;Restricao;Valor;Referencia;Historico
    const headers = "Conta;Subconta;Fundo;Departamento;Restricao;Valor;Referencia;Historico\n";
    
    // Montagem das linhas (2 linhas por lançamento: Débito e Crédito)
    const rows = entries.flatMap(e => {
      const valorInteiro = Math.round(e.valor * 100);
      const valorPositivo = valorInteiro.toString();
      const valorNegativo = `-${valorInteiro}`;
      
      // Lógica de Histórico diferenciada
      // Fatura: Cartão Corporativo - (data) - (Historico fatura)
      // Alocação: Mantém o histórico original da alocação
      const historicoFinal = isFromFatura 
        ? `Cartão Corporativo - ${e.data} - ${e.historico}`
        : e.historico;
      
      const cleanHistorico = historicoFinal.replace(/"/g, '""');

      // Linha 1: Débito
      // Ordem: Conta;Subconta;Fundo;Departamento;Restricao;Valor;Referencia;Historico
      const lineDebit = `${e.contaDebito};${e.subcontaDebito};${e.fundo};${e.departamentoDebito};${e.restricaoDebito};${valorPositivo};N;"${cleanHistorico}"`;
      
      // Linha 2: Crédito
      const lineCredit = `${e.contaCredito};${e.subcontaCredito};${e.fundo};${e.departamentoCredito};${e.restricaoCredito};${valorNegativo};N;"${cleanHistorico}"`;
      
      return [lineDebit, lineCredit];
    }).join("\n");
    
    // Blob com BOM para UTF-8 para garantir acentuação no Excel
    const blob = new Blob(["\uFEFF" + a1Line + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    
    // Limpeza
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const handleExportUnmatchedTransactions = () => {
    const entries: AccountingEntry[] = reconciliation.unmatchedTransactions.map(tx => {
      const param = parameters.find(p => 
        p.cartao.trim().toLowerCase() === cardName.trim().toLowerCase() && 
        p.motivo.toLowerCase().includes("pendente")
      );

      return {
        data: tx.date,
        historico: tx.description,
        valor: tx.amount,
        contaDebito: param?.contaDebito || '',
        contaCredito: param?.contaCredito || '',
        subcontaDebito: param?.subcontaDebito || '',
        subcontaCredito: param?.subcontaCredito || '',
        fundo: param?.fundo || '',
        departamentoDebito: param?.departamentoDebito || '',
        departamentoCredito: param?.departamentoCredito || '',
        restricaoDebito: param?.restricaoDebito || '',
        restricaoCredito: param?.restricaoCredito || '',
      };
    }).filter(e => e.contaDebito !== '');

    if (entries.length === 0) {
      alert(`Erro: Não foram encontrados parâmetros contábeis configurados para o cartão "${cardName}" com o motivo contendo "Pendente".`);
      return;
    }

    exportToCSV(entries, `importar_fatura_pendentes_${cardName.replace(/\s/g, '_')}`, true);
  };

  const handleExportUnmatchedAllocations = () => {
    const entries: AccountingEntry[] = reconciliation.unmatchedAllocations.map(al => {
      const param = parameters.find(p => 
        p.cartao.trim().toLowerCase() === cardName.trim().toLowerCase() && 
        (p.motivo.toLowerCase().includes("presta") || p.motivo.toLowerCase().includes("aloca"))
      );

      return {
        data: al.date,
        historico: al.description,
        valor: al.amount,
        contaDebito: param?.contaDebito || '',
        contaCredito: param?.contaCredito || '',
        subcontaDebito: param?.subcontaDebito || '',
        subcontaCredito: param?.subcontaCredito || '',
        fundo: param?.fundo || '',
        departamentoDebito: param?.departamentoDebito || '',
        departamentoCredito: param?.departamentoCredito || '',
        restricaoDebito: param?.restricaoDebito || '',
        restricaoCredito: param?.restricaoCredito || '',
      };
    }).filter(e => e.contaDebito !== '');

    if (entries.length === 0) {
      alert(`Erro: Não foram encontrados parâmetros contábeis configurados para o cartão "${cardName}" com o motivo contendo "Prestação" ou "Alocação".`);
      return;
    }

    exportToCSV(entries, `importar_prestacao_contas_${cardName.replace(/\s/g, '_')}`, false);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Resumo visual rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 p-4 rounded-xl border border-green-200 shadow-sm">
          <p className="text-[10px] text-green-700 uppercase font-bold tracking-widest">Conciliados</p>
          <p className="text-2xl font-black text-green-800">{reconciliation.reconciled.length}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 shadow-sm">
          <p className="text-[10px] text-orange-700 uppercase font-bold tracking-widest">Pend. Fatura</p>
          <p className="text-2xl font-black text-orange-800">{reconciliation.unmatchedTransactions.length}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm">
          <p className="text-[10px] text-red-700 uppercase font-bold tracking-widest">Pend. Alocação</p>
          <p className="text-2xl font-black text-red-800">{reconciliation.unmatchedAllocations.length}</p>
        </div>
      </div>

      {/* Tabela de Conciliados */}
      <section>
        <h4 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
          <span className="w-2 h-6 bg-green-500 rounded-full mr-2"></span>
          Matches Automáticos
        </h4>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-[10px] text-gray-400 uppercase">
                <th className="px-4 py-2 text-left">Fatura</th>
                <th className="px-4 py-2 text-left">Alocação</th>
                <th className="px-4 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reconciliation.reconciled.map((pair, idx) => (
                <tr key={idx} className="text-sm">
                  <td className="px-4 py-3 text-gray-900">{pair.transaction.description}</td>
                  <td className="px-4 py-3 text-gray-600">{pair.allocation.description}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">
                    {pair.transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                </tr>
              ))}
              {reconciliation.reconciled.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400 italic">Nenhuma conciliação automática possível.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Divisão de Pendências com Botões de Exportação */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pendentes Fatura */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-bold text-gray-700 flex items-center">
              <span className="w-2 h-6 bg-orange-500 rounded-full mr-2"></span>
              Pendentes Fatura
            </h4>
            {reconciliation.unmatchedTransactions.length > 0 && (
              <button 
                onClick={handleExportUnmatchedTransactions}
                className="text-[10px] bg-orange-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-orange-700 transition-colors flex items-center shadow-md active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Baixar CSV Importação
              </button>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-h-[400px] overflow-y-auto">
            {reconciliation.unmatchedTransactions.map((tx, idx) => (
              <div key={idx} className="p-3 border-b border-gray-50 last:border-0 flex justify-between items-center hover:bg-orange-50/20">
                <div className="truncate pr-4">
                  <p className="text-sm font-bold text-gray-800 truncate">{tx.description}</p>
                  <p className="text-[10px] text-gray-400">{tx.date}</p>
                </div>
                <p className="font-bold text-gray-900 text-sm whitespace-nowrap">{tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
            ))}
            {reconciliation.unmatchedTransactions.length === 0 && (
              <div className="p-8 text-center text-gray-300">Tudo ok na fatura.</div>
            )}
          </div>
        </section>

        {/* Pendentes Alocação */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-bold text-gray-700 flex items-center">
              <span className="w-2 h-6 bg-red-500 rounded-full mr-2"></span>
              Pendentes Alocação
            </h4>
            {reconciliation.unmatchedAllocations.length > 0 && (
              <button 
                onClick={handleExportUnmatchedAllocations}
                className="text-[10px] bg-red-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors flex items-center shadow-md active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Baixar CSV Importação
              </button>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-h-[400px] overflow-y-auto">
            {reconciliation.unmatchedAllocations.map((al, idx) => (
              <div key={idx} className="p-3 border-b border-gray-50 last:border-0 flex justify-between items-center hover:bg-red-50/20">
                <div className="truncate pr-4">
                  <p className="text-sm font-bold text-gray-800 truncate">{al.description}</p>
                  <p className="text-[10px] text-gray-400">{al.date}</p>
                </div>
                <p className="font-bold text-gray-900 text-sm whitespace-nowrap">{al.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
            ))}
            {reconciliation.unmatchedAllocations.length === 0 && (
              <div className="p-8 text-center text-gray-300">Sem sobras de alocação.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ReconciliationView;
