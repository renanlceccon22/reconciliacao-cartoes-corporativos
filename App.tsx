
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FileUploader from './components/FileUploader';
import TransactionTable from './components/TransactionTable';
import AllocationTable from './components/AllocationTable';
import ReconciliationView from './components/ReconciliationView';
import ParametersManager from './components/ParametersManager';
import CardsManager from './components/CardsManager';
import { ExtractionResult, AllocationExtractionResult, AppStatus, SourceFile, TabType, AccountingParameter, Card } from './types';
import { extractStatementData, extractAllocationData } from './services/geminiService';
import { dbService } from './services/dbService';
import { supabase } from './src/lib/supabase';
import { Session } from '@supabase/supabase-js';
import Login from './components/Login';
import Footer from './components/Footer';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    return (localStorage.getItem('reconciliacao_active_tab') as TabType) || 'cadastro';
  });
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Registered Cards
  const [cards, setCards] = useState<Card[]>(() => {
    const saved = localStorage.getItem('reconciliacao_cards_v2');
    return saved ? JSON.parse(saved) : [];
  });

  // Selected Card and Period
  const [selectedUploadCard, setSelectedUploadCard] = useState<string>(() => {
    return localStorage.getItem('reconciliacao_selected_card') || '';
  });
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const saved = localStorage.getItem('reconciliacao_selected_period');
    if (saved) return saved;
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${month}`;
  });

  // States for Invoice Data
  const [invoiceResult, setInvoiceResult] = useState<ExtractionResult | null>(() => {
    const saved = localStorage.getItem('reconciliacao_invoice_result');
    return saved ? JSON.parse(saved) : null;
  });

  // States for Allocation Data
  const [allocationResult, setAllocationResult] = useState<AllocationExtractionResult | null>(() => {
    const saved = localStorage.getItem('reconciliacao_allocation_result');
    return saved ? JSON.parse(saved) : null;
  });

  // States for Parameters
  const [parameters, setParameters] = useState<AccountingParameter[]>(() => {
    const saved = localStorage.getItem('reconciliacao_params_v1');
    return saved ? JSON.parse(saved) : [];
  });

  // Load data from Supabase on mount
  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    const loadInitialData = async () => {
      try {
        const [dbCards, dbParams] = await Promise.all([
          dbService.getCards(),
          dbService.getParameters()
        ]);
        setCards(dbCards);
        setParameters(dbParams);
      } catch (err) {
        console.error("Erro ao carregar dados do Supabase:", err);
      }
    };

    loadInitialData();

    return () => subscription.unsubscribe();
  }, []);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('reconciliacao_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('reconciliacao_cards_v2', JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem('reconciliacao_params_v1', JSON.stringify(parameters));
  }, [parameters]);

  useEffect(() => {
    localStorage.setItem('reconciliacao_selected_card', selectedUploadCard);
  }, [selectedUploadCard]);

  useEffect(() => {
    localStorage.setItem('reconciliacao_selected_period', selectedPeriod);
  }, [selectedPeriod]);

  useEffect(() => {
    if (invoiceResult) localStorage.setItem('reconciliacao_invoice_result', JSON.stringify(invoiceResult));
    else localStorage.removeItem('reconciliacao_invoice_result');
  }, [invoiceResult]);

  useEffect(() => {
    if (allocationResult) localStorage.setItem('reconciliacao_allocation_result', JSON.stringify(allocationResult));
    else localStorage.removeItem('reconciliacao_allocation_result');
  }, [allocationResult]);

  const fileToSourceFile = (file: File): Promise<SourceFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result?.toString().split(',')[1];
        if (base64String) {
          resolve({ base64: base64String, mimeType: file.type, name: file.name });
        }
        else reject(new Error("Falha ao converter arquivo"));
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleInvoiceUpload = async (files: File[]) => {
    if (!selectedUploadCard) {
      setErrorMessage("Por favor, selecione um cartão antes de enviar a fatura.");
      return;
    }
    setStatus(AppStatus.LOADING);
    setErrorMessage(null);
    try {
      const sourceFiles = await Promise.all(files.map(fileToSourceFile));
      const data = await extractStatementData(sourceFiles);
      const fullResult = {
        ...data,
        cartaoVenculado: selectedUploadCard,
        competencia: selectedPeriod
      };
      setInvoiceResult(fullResult);

      // Save to Supabase
      try {
        await dbService.saveInvoice(selectedUploadCard, selectedPeriod, fullResult.totalAmount, fullResult.transactions);
      } catch (saveErr) {
        console.error("Erro ao salvar fatura no banco de dados:", saveErr);
      }

      setStatus(AppStatus.SUCCESS);
      setActiveTab('faturas');
    } catch (error: any) {
      console.error("Erro no processamento:", error);
      setErrorMessage(error.message || "Erro ao processar faturas.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleAllocationUpload = async (files: File[]) => {
    if (!selectedUploadCard) {
      setErrorMessage("Por favor, selecione um cartão antes de enviar a alocação.");
      return;
    }
    setStatus(AppStatus.LOADING);
    setErrorMessage(null);
    try {
      const sourceFiles = await Promise.all(files.map(fileToSourceFile));
      const data = await extractAllocationData(sourceFiles);
      const fullAllocResult = {
        ...data,
        cartaoVenculado: selectedUploadCard,
        competencia: selectedPeriod
      };
      setAllocationResult(fullAllocResult);

      // Save to Supabase
      try {
        await dbService.saveAllocationReport(selectedUploadCard, selectedPeriod, fullAllocResult.totalAmount, fullAllocResult.allocations);
      } catch (saveErr) {
        console.error("Erro ao salvar alocação no banco de dados:", saveErr);
      }

      setStatus(AppStatus.SUCCESS);
      setActiveTab('alocacoes');
    } catch (error: any) {
      console.error("Erro no processamento de alocações:", error);
      setErrorMessage(error.message || "Erro ao processar alocações.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleCardsImport = async (files: File[]) => {
    setStatus(AppStatus.LOADING);
    setErrorMessage(null);
    const file = files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/);
        const newCards: Card[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const separator = line.includes(';') ? ';' : ',';
          const cols = line.split(separator);
          if (cols.length >= 2) {
            const cardName = cols[0].replace(/"/g, '').trim();
            const subaccount = cols[1].replace(/"/g, '').trim();
            if (cardName && subaccount && !cards.some(c => c.name === cardName)) {
              newCards.push({ name: cardName, subaccount });
            }
          }
        }
        if (newCards.length > 0) {
          await dbService.addCards(newCards);
          setCards(prev => [...prev, ...newCards]);
          setStatus(AppStatus.SUCCESS);
        }
      } catch (error: any) {
        setErrorMessage("Erro ao importar cartões.");
        setStatus(AppStatus.ERROR);
      }
    };
    reader.readAsText(file, 'ISO-8859-1');
  };

  const handleParametersExtract = async (files: File[]) => {
    setStatus(AppStatus.LOADING);
    setErrorMessage(null);
    const file = files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/);
        const newParams: AccountingParameter[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const separator = line.includes(';') ? ';' : ',';
          const cols = line.split(separator);
          if (cols.length >= 11) {
            const cartaoLido = cols[0].replace(/"/g, '').trim();
            if (cards.some(c => c.name === cartaoLido)) {
              newParams.push({
                id: Math.random().toString(36).substr(2, 9),
                cartao: cartaoLido,
                motivo: cols[1].replace(/"/g, '').trim(),
                contaDebito: cols[2].replace(/"/g, '').trim(),
                contaCredito: cols[3].replace(/"/g, '').trim(),
                subcontaDebito: cols[4].replace(/"/g, '').trim(),
                subcontaCredito: cols[5].replace(/"/g, '').trim(),
                fundo: cols[6].replace(/"/g, '').trim(),
                departamentoDebito: cols[7].replace(/"/g, '').trim(),
                departamentoCredito: cols[8].replace(/"/g, '').trim(),
                restricaoDebito: cols[9].replace(/"/g, '').trim(),
                restricaoCredito: cols[10].replace(/"/g, '').trim(),
              });
            }
          }
        }
        if (newParams.length > 0) {
          await dbService.addParameters(newParams);
          setParameters(prev => [...prev, ...newParams]);
          setStatus(AppStatus.SUCCESS);
        }
      } catch (error: any) {
        setErrorMessage("Erro ao processar parâmetros.");
        setStatus(AppStatus.ERROR);
      }
    };
    reader.readAsText(file, 'ISO-8859-1');
  };

  const handleAddCard = async (name: string, subaccount: string) => {
    if (!cards.some(c => c.name === name)) {
      const newCard = { name, subaccount };
      try {
        await dbService.addCard(newCard);
        setCards(prev => [...prev, newCard]);
      } catch (err) {
        setErrorMessage("Erro ao salvar cartão no banco de dados.");
      }
    }
  };

  const handleRemoveCard = async (name: string) => {
    try {
      await dbService.removeCard(name);
      setCards(prev => prev.filter(c => c.name !== name));
    } catch (err) {
      setErrorMessage("Erro ao remover cartão do banco de dados.");
    }
  };

  const handleReset = () => {
    setStatus(AppStatus.IDLE);
    setErrorMessage(null);
  };

  const formatCompetencia = (comp?: string) => {
    if (!comp) return '';
    const [year, month] = comp.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(month) - 1]} / ${year}`;
  };

  if (!session) {
    return <Login />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-4 max-w-4xl">
        <div className="flex border-b border-gray-200 mb-6 space-x-2 md:space-x-6 justify-center overflow-x-auto">
          <button
            onClick={() => setActiveTab('cadastro')}
            className={`pb-3 px-3 text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap
              ${activeTab === 'cadastro' ? 'border-[#003B71] text-[#003B71]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            0. Cadastro
          </button>
          <button
            onClick={() => setActiveTab('parametros')}
            className={`pb-3 px-3 text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap
              ${activeTab === 'parametros' ? 'border-[#003B71] text-[#003B71]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            1. Parâmetros
          </button>
          <button
            onClick={() => setActiveTab('faturas')}
            className={`pb-3 px-3 text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap
              ${activeTab === 'faturas' ? 'border-[#003B71] text-[#003B71]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            2. Faturas
          </button>
          <button
            onClick={() => setActiveTab('alocacoes')}
            className={`pb-3 px-3 text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap
              ${activeTab === 'alocacoes' ? 'border-[#003B71] text-[#003B71]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            3. Alocações
          </button>
          <button
            onClick={() => setActiveTab('conciliacao')}
            className={`pb-3 px-3 text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap
              ${activeTab === 'conciliacao' ? 'border-[#FDB913] text-[#003B71] bg-yellow-50/50' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            4. Conciliação
          </button>
        </div>

        {activeTab === 'cadastro' && (
          <CardsManager
            cards={cards}
            onAddCard={handleAddCard}
            onRemoveCard={handleRemoveCard}
            onImportCards={handleCardsImport}
            isLoading={status === AppStatus.LOADING}
          />
        )}

        {activeTab === 'parametros' && (
          <ParametersManager
            parameters={parameters}
            cards={cards}
            onAddParameter={async (p) => {
              try {
                await dbService.addParameter(p);
                setParameters(prev => [...prev, p]);
              } catch (err) {
                setErrorMessage("Erro ao salvar parâmetro no banco de dados.");
              }
            }}
            onBulkAdd={async (params) => {
              try {
                await dbService.addParameters(params);
                setParameters(prev => [...prev, ...params]);
              } catch (err) {
                setErrorMessage("Erro ao salvar parâmetros no banco de dados.");
              }
            }}
            onRemoveParameter={async (id) => {
              try {
                await dbService.removeParameter(id);
                setParameters(prev => prev.filter(p => p.id !== id));
              } catch (err) {
                setErrorMessage("Erro ao remover parâmetro do banco de dados.");
              }
            }}
            onExtract={handleParametersExtract}
            isLoading={status === AppStatus.LOADING}
          />
        )}

        {(activeTab === 'faturas' || activeTab === 'alocacoes') && (
          <div className="animate-fadeIn max-w-2xl mx-auto">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#003B71] uppercase mb-2">Cartão</label>
                  <select
                    value={selectedUploadCard}
                    onChange={(e) => setSelectedUploadCard(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#003B71] outline-none font-medium text-slate-900 bg-white"
                  >
                    <option value="">Selecione o cartão...</option>
                    {cards.map(c => (
                      <option key={c.name} value={c.name}>
                        {c.subaccount} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#003B71] uppercase mb-2">Competência</label>
                  <input
                    type="month"
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#003B71] outline-none font-medium text-slate-900 bg-white"
                  />
                </div>
              </div>
              {cards.length === 0 && <p className="text-xs text-red-500 mt-2">Você precisa cadastrar um cartão primeiro na aba "Cadastro".</p>}
            </div>

            {activeTab === 'faturas' && (
              <div className="space-y-6">
                <FileUploader
                  onFilesSelect={handleInvoiceUpload}
                  isLoading={status === AppStatus.LOADING}
                  title="Anexar Faturas (PDF/Imagem)"
                  subtitle={selectedUploadCard ? `Importando para: ${selectedUploadCard} (${formatCompetencia(selectedPeriod)})` : "Selecione o cartão acima primeiro"}
                />
                {invoiceResult && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-green-800 text-sm font-medium text-center">
                    ✓ Fatura já carregada no sistema ({invoiceResult.transactions.length} transações).
                  </div>
                )}
              </div>
            )}

            {activeTab === 'alocacoes' && (
              <div className="space-y-6">
                <FileUploader
                  onFilesSelect={handleAllocationUpload}
                  isLoading={status === AppStatus.LOADING}
                  title="Anexar Alocações (PDF/Imagem)"
                  subtitle={selectedUploadCard ? `Importando para: ${selectedUploadCard} (${formatCompetencia(selectedPeriod)})` : "Selecione o cartão acima primeiro"}
                />
                {allocationResult && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-yellow-800 text-sm font-medium text-center">
                    ✓ Alocação já carregada no sistema ({allocationResult.allocations.length} itens).
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'faturas' && invoiceResult && (
          <div className="mt-8 space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Fatura: {invoiceResult.cartaoVenculado}</h3>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="bg-blue-100 text-[#003B71] text-xs font-bold px-3 py-1 rounded-full uppercase">Competência: {formatCompetencia(invoiceResult.competencia)}</span>
                  <p className="text-sm text-gray-500">{invoiceResult.transactions.length} transações detectadas</p>
                </div>
              </div>
              <button onClick={() => { setInvoiceResult(null); }} className="text-xs text-red-600 font-bold hover:underline">LIMPAR DADOS DA FATURA</button>
            </div>
            <TransactionTable transactions={invoiceResult.transactions} />
          </div>
        )}

        {activeTab === 'alocacoes' && allocationResult && (
          <div className="mt-8 space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Alocação: {allocationResult.cartaoVenculado}</h3>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="bg-yellow-100 text-[#003B71] text-xs font-bold px-3 py-1 rounded-full uppercase">Competência: {formatCompetencia(allocationResult.competencia)}</span>
                  <p className="text-sm text-gray-500">{allocationResult.allocations.length} itens detectados</p>
                </div>
              </div>
              <button onClick={() => { setAllocationResult(null); }} className="text-xs text-red-600 font-bold hover:underline">LIMPAR DADOS DE ALOCAÇÃO</button>
            </div>
            <AllocationTable allocations={allocationResult.allocations} />
          </div>
        )}

        {activeTab === 'conciliacao' && (
          <div className="space-y-6">
            {(invoiceResult || allocationResult) && (
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-[#003B71]">Resumo da Sessão</h2>
                  <p className="text-xs text-gray-500">
                    {invoiceResult?.cartaoVenculado || allocationResult?.cartaoVenculado} |
                    Competência: {formatCompetencia(invoiceResult?.competencia || allocationResult?.competencia)}
                  </p>
                </div>
                <div className="flex space-x-2">
                  {!invoiceResult && <span className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded">Fatura Ausente</span>}
                  {!allocationResult && <span className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded">Alocação Ausente</span>}
                </div>
              </div>
            )}
            <ReconciliationView
              transactions={invoiceResult?.transactions || []}
              allocations={allocationResult?.allocations || []}
              parameters={parameters}
              cardName={invoiceResult?.cartaoVenculado || allocationResult?.cartaoVenculado || ''}
            />
          </div>
        )}

        {status === AppStatus.ERROR && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 animate-fadeIn">
            {errorMessage}
            <button onClick={handleReset} className="ml-4 font-bold underline text-xs">FECHAR</button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default App;
