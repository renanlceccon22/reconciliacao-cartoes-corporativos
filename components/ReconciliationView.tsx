import React, { useMemo, useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, Allocation, ReconciledPair, AccountingParameter, AccountingEntry } from '../types';
import { dbService } from '../services/dbService';

interface ReconciliationViewProps {
  transactions: Transaction[];
  allocations: Allocation[];
  parameters: AccountingParameter[];
  cardName: string;
  competencia: string;
}

const ReconciliationView: React.FC<ReconciliationViewProps> = ({ transactions, allocations, parameters, cardName, competencia }) => {
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [selectedAllocIds, setSelectedAllocIds] = useState<Set<string>>(new Set());
  const [selectedOutCompIds, setSelectedOutCompIds] = useState<Set<string>>(new Set());
  const [exportedIds, setExportedIds] = useState<Set<string>>(new Set());

  // persistent loading of ignored items per card/comp
  useEffect(() => {
    const loadIgnored = async () => {
      if (!cardName || !competencia) return;
      try {
        const ids = await dbService.getIgnoredIds(cardName, competencia);
        setIgnoredIds(new Set(ids));
      } catch (err) {
        console.error("Erro ao carregar itens ignorados:", err);
      }
    };
    loadIgnored();
  }, [cardName, competencia]);
  const formatCompText = (comp: string) => {
    if (!comp) return '';
    const [year, month] = comp.split('-');
    const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    return `${months[parseInt(month) - 1]}_${year}`;
  };

  const getNextCompetencia = (comp: string) => {
    if (!comp) return '';
    let [year, month] = comp.split('-').map(Number);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
    return `${year}-${month.toString().padStart(2, '0')}`;
  };
  const reconciliation = useMemo(() => {
    const reconciled: ReconciledPair[] = [];
    const unmatchedTransactions: Transaction[] = transactions.filter(tx => !ignoredIds.has(tx.id));
    const unmatchedAllocations: Allocation[] = allocations.filter(al => !ignoredIds.has(al.id));

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

    const isSameMonth = (dateStr: string, compStr: string) => {
      if (!dateStr || !compStr) return true;
      const parts = dateStr.split('/');
      if (parts.length !== 3) return false;

      const [day, month, year] = parts;
      const normalizedYear = year.length === 2 ? `20${year}` : year;

      const [compYear, compMonth] = compStr.split('-');
      return month === compMonth && normalizedYear === compYear;
    };

    const outOfCompAllocations = unmatchedAllocations.filter(al => !isSameMonth(al.postingDate || al.date, competencia));
    const finalUnmatchedAllocations = unmatchedAllocations.filter(al => isSameMonth(al.postingDate || al.date, competencia));

    return {
      reconciled,
      unmatchedTransactions,
      unmatchedAllocations: finalUnmatchedAllocations,
      outOfCompAllocations
    };
  }, [transactions, allocations, ignoredIds, competencia]);

  const exportToCSV = (entries: AccountingEntry[], filename: string, isFromFatura: boolean) => {
    if (entries.length === 0) return;

    // Conforme solicitado: Célula A1 com valor fixo 1322
    const a1Line = "1322\n";

    // Montagem das linhas (2 linhas por lançamento: Débito e Crédito)
    const rows = entries.flatMap(e => {
      const valorInteiro = Math.round(e.valor * 100);
      const valorPositivo = valorInteiro.toString();
      const valorNegativo = `-${valorInteiro}`;

      const historicoFinal = isFromFatura
        ? `Cartão Corporativo - ${e.data} - ${e.historico}`
        : e.historico;

      const cleanHistorico = historicoFinal.replace(/"/g, '""');

      const lineDebit = `${e.contaDebito};${e.subcontaDebito};${e.fundo};${e.departamentoDebito};${e.restricaoDebito};${valorPositivo};N;"${cleanHistorico}"`;
      const lineCredit = `${e.contaCredito};${e.subcontaCredito};${e.fundo};${e.departamentoCredito};${e.restricaoCredito};${valorNegativo};N;"${cleanHistorico}"`;

      return [lineDebit, lineCredit];
    }).join("\n");

    // Blob com BOM (\uFEFF) para garantir colunas e acentuação correta no Excel Brasil
    const blob = new Blob(["\uFEFF" + a1Line + rows], { type: 'text/csv;charset=utf-8;' });
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

    // Filter out already exported items
    const notExportedEntries = entries.filter((_, idx) => !exportedIds.has(reconciliation.unmatchedTransactions[idx].id));

    if (notExportedEntries.length === 0) {
      if (entries.length > 0) alert("Todos os itens já foram exportados anteriormente.");
      else alert(`Erro: Não foram encontrados parâmetros contábeis configurados para o cartão "${cardName}" com o motivo contendo "Pendente".`);
      return;
    }

    const compFormatted = formatCompText(competencia);
    exportToCSV(notExportedEntries, `${cardName.replace(/\s/g, '_')} - ${compFormatted}`, true);

    // Mark as exported
    const newExported = new Set(exportedIds);
    reconciliation.unmatchedTransactions.forEach(tx => newExported.add(tx.id));
    setExportedIds(newExported);
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

    // Filter out already exported items
    const notExportedEntries = entries.filter((_, idx) => !exportedIds.has(reconciliation.unmatchedAllocations[idx].id));

    if (notExportedEntries.length === 0) {
      if (entries.length > 0) alert("Todos os itens já foram exportados anteriormente.");
      else alert(`Erro: Não foram encontrados parâmetros contábeis configurados para o cartão "${cardName}" com o motivo contendo "Prestação" ou "Alocação".`);
      return;
    }

    const compFormatted = formatCompText(competencia);
    exportToCSV(notExportedEntries, `${cardName.replace(/\s/g, '_')} - ${compFormatted}`, false);

    // Mark as exported
    const newExported = new Set(exportedIds);
    reconciliation.unmatchedAllocations.forEach(al => newExported.add(al.id));
    setExportedIds(newExported);
  };

  const handleExportDevolverAllocations = () => {
    const entries: AccountingEntry[] = reconciliation.unmatchedAllocations.map(al => {
      const param = parameters.find(p =>
        p.cartao.trim().toLowerCase() === cardName.trim().toLowerCase() &&
        p.motivo.toLowerCase().includes("devolver")
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

    // Filter out already exported items
    const notExportedEntries = entries.filter((_, idx) => !exportedIds.has(reconciliation.unmatchedAllocations[idx].id));

    if (notExportedEntries.length === 0) {
      if (entries.length > 0) alert("Todos os itens já foram exportados anteriormente.");
      else alert(`Erro: Não foram encontrados parâmetros contábeis configurados para o cartão "${cardName}" com o motivo contendo "Devolver".`);
      return;
    }

    const futureComp = getNextCompetencia(competencia);
    const compFormatted = formatCompText(futureComp);
    exportToCSV(notExportedEntries, `${cardName.replace(/\s/g, '_')} - ${compFormatted} FUTURO`, false);

    // Mark as exported
    const newExported = new Set(exportedIds);
    reconciliation.unmatchedAllocations.forEach(al => newExported.add(al.id));
    setExportedIds(newExported);
  };

  const exportToPDF = (items: any[], title: string, filenameSuffix: string, showBatchColumn: boolean = false) => {
    const doc = new jsPDF();
    const compText = formatCompText(competencia);

    // Design Profissional - Cabeçalho
    doc.setFontSize(22);
    doc.setTextColor(0, 59, 113); // Navy Blue (#003B71)
    doc.text("Relatório Contábil", 14, 25);

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`EMITIDO EM: ${new Date().toLocaleString('pt-BR')}`, 14, 32);

    doc.setDrawColor(0, 59, 113);
    doc.setLineWidth(0.5);
    doc.line(14, 35, 196, 35);

    // Informações do Relatório
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), 14, 45);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Cartão Corporativo: ${cardName}`, 14, 52);
    doc.text(`Competência: ${compText}`, 14, 58);

    const tableHeaders = [["DATA", "DESCRIÇÃO / HISTÓRICO", "VALOR"]];
    if (showBatchColumn) {
      tableHeaders[0].push("LOTE CONTÁBIL");
    }

    const tableData = items.map(item => {
      const row = [
        item.date,
        item.description,
        item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      ];
      if (showBatchColumn) {
        row.push(item.batch || "N/A");
      }
      return row;
    });

    autoTable(doc, {
      startY: 65,
      head: tableHeaders,
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [0, 59, 113],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'center' }
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: [245, 247, 249]
      },
      margin: { top: 50, left: 14, right: 14 },
      didDrawPage: (data) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Página ${data.pageNumber} de ${pageCount} - Gerado por Antigravity Finance`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }
    });

    const compFormatted = formatCompText(competencia);
    doc.save(`${cardName.replace(/\s/g, '_')} - ${filenameSuffix} - ${compFormatted}.pdf`);
  };

  const handleToggleIgnore = async (id: string) => {
    const isIgnoring = !ignoredIds.has(id);

    setIgnoredIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

    try {
      if (isIgnoring) {
        await dbService.saveIgnoredId(cardName, competencia, id);
      } else {
        await dbService.removeIgnoredId(cardName, competencia, id);
      }
    } catch (err) {
      console.error("Erro ao persistir status de ignorado:", err);
    }
  };

  const handleToggleSelectTx = (id: string) => {
    setSelectedTxIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAlloc = (id: string) => {
    setSelectedAllocIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectOutComp = (id: string) => {
    setSelectedOutCompIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExportOutComp = (motiveType: 'presta' | 'devolver' | 'abater') => {
    const items = reconciliation.outOfCompAllocations.filter(al => selectedOutCompIds.has(al.id));
    const entriesToExport = (items.length > 0 ? items : reconciliation.outOfCompAllocations).map(al => {
      const param = parameters.find(p =>
        p.cartao.trim().toLowerCase() === cardName.trim().toLowerCase() &&
        p.motivo.toLowerCase().includes(
          motiveType === 'presta' ? "presta" :
            motiveType === 'devolver' ? "devolver" :
              "acertar" // "Nota lançada, acertar pendente"
        )
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
    }).filter(e => e && e.contaDebito !== '') as AccountingEntry[];

    // Filter out filtered by exportedIds logic above (already null)
    const notExportedEntries = entriesToExport;

    if (notExportedEntries.length === 0) {
      alert(`Parâmetros não encontrados para movito: ${motiveType}`);
      return;
    }

    const compFormatted = formatCompText(competencia);
    const suffix = motiveType === 'presta' ? 'PRESTACAO' : (motiveType === 'devolver' ? 'DEVOLVER' : 'ABATER');
    exportToCSV(notExportedEntries, `${cardName.replace(/\s/g, '_')} - FORA_COMPETENCIA_${suffix} - ${compFormatted}`, false);
    setSelectedOutCompIds(new Set());

    // Mark as exported
    const newExported = new Set(exportedIds);
    items.forEach(al => newExported.add(al.id));
    setExportedIds(newExported);
  };

  const handleExportGrouped = (source: 'fatura' | 'alocacao' | 'fora') => {
    let selectedIds: Set<string>;
    let items: any[];
    let isFromFatura = false;
    let motivoMatch = "presta";

    if (source === 'fatura') {
      selectedIds = selectedTxIds;
      items = transactions.filter(t => selectedIds.has(t.id));
      isFromFatura = true;
      motivoMatch = "pendente";
    } else if (source === 'alocacao') {
      selectedIds = selectedAllocIds;
      items = allocations.filter(a => selectedIds.has(a.id));
      motivoMatch = "presta";
    } else {
      selectedIds = selectedOutCompIds;
      items = allocations.filter(a => selectedIds.has(a.id));
      motivoMatch = "presta";
    }

    if (items.length === 0) return;

    const totalAmount = items.reduce((acc, curr) => acc + curr.amount, 0);
    const firstItem = items[0];

    // For simplicity, let's use the first item's date and a combined description
    const entry: AccountingEntry = {
      data: firstItem.date,
      historico: `AGRUPADO: ${items.map(i => i.description).join(' / ')}`.substring(0, 200),
      valor: totalAmount,
      contaDebito: '', contaCredito: '', subcontaDebito: '', subcontaCredito: '',
      fundo: '', departamentoDebito: '', departamentoCredito: '', restricaoDebito: '', restricaoCredito: ''
    };

    // Find parameters (using first item as reference for card matching)
    const param = parameters.find(p =>
      p.cartao.trim().toLowerCase() === cardName.trim().toLowerCase() &&
      p.motivo.toLowerCase().includes(motivoMatch)
    );

    if (param) {
      entry.contaDebito = param.contaDebito;
      entry.contaCredito = param.contaCredito;
      entry.subcontaDebito = param.subcontaDebito;
      entry.subcontaCredito = param.subcontaCredito;
      entry.fundo = param.fundo;
      entry.departamentoDebito = param.departamentoDebito;
      entry.departamentoCredito = param.departamentoCredito;
      entry.restricaoDebito = param.restricaoDebito;
      entry.restricaoCredito = param.restricaoCredito;
    }

    if (!entry.contaDebito) {
      alert("Parâmetros contábeis não encontrados para este grupo.");
      return;
    }

    const compFormatted = formatCompText(competencia);
    const filenameSuffix = source === 'fatura' ? 'FATURA' : (source === 'alocacao' ? 'ALOCACAO' : 'FORA_COMP');
    exportToCSV([entry], `${cardName.replace(/\s/g, '_')} - AGRUPADO_${filenameSuffix} - ${compFormatted}`, isFromFatura);

    // Clear selection after export
    if (source === 'fatura') setSelectedTxIds(new Set());
    else if (source === 'alocacao') setSelectedAllocIds(new Set());
    else setSelectedOutCompIds(new Set());

    // Mark as exported
    const newExported = new Set(exportedIds);
    items.forEach(i => newExported.add(i.id));
    setExportedIds(newExported);
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
                <tr key={idx} className="text-sm group">
                  <td className="px-4 py-3 text-gray-900">{pair.transaction.description}</td>
                  <td className="px-4 py-3 text-gray-600">{pair.allocation.description}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">
                    <div className="flex items-center justify-end space-x-2">
                      <span>{pair.transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      <button
                        onClick={() => {
                          handleToggleIgnore(pair.transaction.id);
                          handleToggleIgnore(pair.allocation.id);
                        }}
                        className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        title="Desconsiderar Match"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      </button>
                    </div>
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
            <div className="flex items-center space-x-2">
              {selectedTxIds.size > 0 && (
                <button
                  onClick={() => handleExportGrouped('fatura')}
                  className="text-[10px] bg-[#003B71] text-white font-bold px-3 py-1.5 rounded-lg hover:bg-blue-800 transition-colors flex items-center shadow-md active:scale-95"
                >
                  Agrupar Selecionados ({selectedTxIds.size})
                </button>
              )}
              {reconciliation.unmatchedTransactions.length > 0 && (
                <button
                  onClick={handleExportUnmatchedTransactions}
                  className="text-[10px] bg-orange-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-orange-700 transition-colors flex items-center shadow-md active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  CSV Atual
                </button>
              )}
              {reconciliation.unmatchedTransactions.length > 0 && (
                <button
                  onClick={() => exportToPDF(reconciliation.unmatchedTransactions, "Pendentes Fatura", "PENDENTES_FATURA")}
                  className="text-[10px] bg-gray-700 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors flex items-center shadow-md active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  PDF
                </button>
              )}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-h-[400px] overflow-y-auto">
            {reconciliation.unmatchedTransactions.map((tx, idx) => {
              const isExported = exportedIds.has(tx.id);
              return (
                <div key={idx} className={`p-3 border-b border-gray-50 last:border-0 flex justify-between items-center group ${isExported ? 'bg-gray-100 opacity-60' : 'hover:bg-orange-50/20'}`}>
                  <div className="flex items-center space-x-3 truncate">
                    <input
                      type="checkbox"
                      checked={selectedTxIds.has(tx.id)}
                      onChange={() => handleToggleSelectTx(tx.id)}
                      className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                      disabled={isExported}
                    />
                    <div className="truncate pr-4">
                      <p className={`text-sm font-bold truncate ${isExported ? 'text-gray-500' : 'text-gray-800'}`}>
                        {isExported ? `(BAIXADO) ${tx.description}` : tx.description}
                      </p>
                      <p className="text-[10px] text-gray-400">{tx.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <p className="font-bold text-gray-900 text-sm whitespace-nowrap">{tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <button
                      onClick={() => handleToggleIgnore(tx.id)}
                      className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      title="Desconsiderar Lançamento"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
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
              <div className="flex items-center space-x-2">
                {selectedAllocIds.size > 0 && (
                  <button
                    onClick={() => handleExportGrouped('alocacao')}
                    className="text-[10px] bg-[#003B71] text-white font-bold px-3 py-1.5 rounded-lg hover:bg-blue-800 transition-colors flex items-center shadow-md active:scale-95"
                  >
                    Agrupar ({selectedAllocIds.size})
                  </button>
                )}
                <div className="flex space-x-2">
                  <button
                    onClick={handleExportUnmatchedAllocations}
                    className="text-[9px] bg-red-600 text-white font-bold px-2 py-1 rounded-lg hover:bg-red-700 transition-colors flex items-center shadow-md active:scale-95 whitespace-nowrap"
                    title="Exportar Prestação de Contas (Competência Atual)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    CSV Atual
                  </button>
                  <button
                    onClick={handleExportDevolverAllocations}
                    className="text-[9px] bg-indigo-600 text-white font-bold px-2 py-1 rounded-lg hover:bg-indigo-700 transition-colors flex items-center shadow-md active:scale-95 whitespace-nowrap"
                    title="Exportar Devolução para Cartões (Próxima Competência)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    CSV Futuro
                  </button>
                  <button
                    onClick={() => exportToPDF(reconciliation.unmatchedAllocations, "Pendentes Alocação", "PENDENTES_ALOCACAO", true)}
                    className="text-[9px] bg-red-800 text-white font-bold px-2 py-1 rounded-lg hover:bg-red-900 transition-colors flex items-center shadow-md active:scale-95 whitespace-nowrap"
                  >
                    PDF Relatório
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-h-[400px] overflow-y-auto">
            {reconciliation.unmatchedAllocations.map((al, idx) => {
              const isExported = exportedIds.has(al.id);
              return (
                <div key={idx} className={`p-3 border-b border-gray-50 last:border-0 flex justify-between items-center group ${isExported ? 'bg-gray-100 opacity-60' : 'hover:bg-red-50/20'}`}>
                  <div className="flex items-center space-x-3 truncate">
                    <input
                      type="checkbox"
                      checked={selectedAllocIds.has(al.id)}
                      onChange={() => handleToggleSelectAlloc(al.id)}
                      className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      disabled={isExported}
                    />
                    <div className="truncate pr-4">
                      <p className={`text-sm font-bold truncate ${isExported ? 'text-gray-500' : 'text-gray-800'}`}>
                        {isExported ? `(BAIXADO) ${al.description}` : al.description}
                      </p>
                      <div className="flex space-x-2 items-center text-[10px] text-gray-400">
                        <span>{al.date}</span>
                        {al.postingDate && <span className="text-red-500/70 font-semibold">({al.postingDate})</span>}
                        {al.batch && <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-bold ml-1">LOTE: {al.batch}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <p className="font-bold text-gray-900 text-sm whitespace-nowrap">{al.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <button
                      onClick={() => handleToggleIgnore(al.id)}
                      className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      title="Desconsiderar Lançamento"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
            {reconciliation.unmatchedAllocations.length === 0 && (
              <div className="p-8 text-center text-gray-300">Sem sobras de alocação.</div>
            )}
          </div>
        </section>
      </div>

      {/* Fora de Competência */}
      {reconciliation.outOfCompAllocations.length > 0 && (
        <section className="animate-fadeIn mt-8">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-bold text-gray-700 flex items-center">
              <span className="w-2 h-6 bg-purple-500 rounded-full mr-2"></span>
              Fora de Competência (Alocação)
            </h4>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-purple-600 font-medium px-2 py-1 bg-purple-50 rounded-lg">
                {reconciliation.outOfCompAllocations.length} itens detectados
              </span>
              <div className="flex space-x-1">
                <button
                  onClick={() => handleExportOutComp('presta')}
                  className="text-[9px] bg-purple-600 text-white font-bold px-2 py-1.5 rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                  title="CSV Prestação de Contas"
                >
                  CSV Prestação
                </button>
                <button
                  onClick={() => handleExportOutComp('devolver')}
                  className="text-[9px] bg-indigo-600 text-white font-bold px-2 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                  title="CSV Devolver Cartões"
                >
                  CSV Devolver
                </button>
                <button
                  onClick={() => handleExportOutComp('abater')}
                  className="text-[9px] bg-teal-600 text-white font-bold px-2 py-1.5 rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
                  title="CSV Nota Lançada / Abater"
                >
                  CSV Abater
                </button>
                <button
                  onClick={() => exportToPDF(reconciliation.outOfCompAllocations, "Fora de Competência", "FORA_COMPETENCIA", true)}
                  className="text-[9px] bg-purple-800 text-white font-bold px-2 py-1.5 rounded-lg hover:bg-purple-900 transition-colors shadow-sm whitespace-nowrap"
                >
                  PDF
                </button>
              </div>
              {selectedOutCompIds.size > 0 && (
                <button
                  onClick={() => handleExportGrouped('fora')}
                  className="text-[10px] bg-[#003B71] text-white font-bold px-3 py-1.5 rounded-lg hover:bg-blue-800 transition-colors flex items-center shadow-md active:scale-95"
                >
                  Agrupar ({selectedOutCompIds.size})
                </button>
              )}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-h-[300px] overflow-y-auto">
            {reconciliation.outOfCompAllocations.map((al, idx) => {
              const isExported = exportedIds.has(al.id);
              return (
                <div key={idx} className={`p-3 border-b border-gray-50 last:border-0 flex justify-between items-center group ${isExported ? 'bg-gray-100 opacity-60' : 'hover:bg-purple-50/20'}`}>
                  <div className="flex items-center space-x-3 truncate">
                    <input
                      type="checkbox"
                      checked={selectedOutCompIds.has(al.id)}
                      onChange={() => handleToggleSelectOutComp(al.id)}
                      className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      disabled={isExported}
                    />
                    <div className="truncate pr-4">
                      <p className={`text-sm font-bold truncate ${isExported ? 'text-gray-500' : 'text-gray-800'}`}>
                        {isExported ? `(BAIXADO) ${al.description}` : al.description}
                      </p>
                      <div className="flex space-x-2 items-center text-[10px] text-gray-400">
                        <span>Fato: {al.date}</span>
                        {al.postingDate && <span className="text-purple-500 font-bold">Lançamento: {al.postingDate}</span>}
                        {al.batch && <span className="bg-purple-50 px-1.5 py-0.5 rounded text-purple-600 font-bold ml-1">LOTE: {al.batch}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <p className="font-bold text-gray-900 text-sm whitespace-nowrap">{al.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <button
                      onClick={() => handleToggleIgnore(al.id)}
                      className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      title="Desconsiderar Lançamento"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default ReconciliationView;
