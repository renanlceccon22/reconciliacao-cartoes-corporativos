
import { ExtractionResult, AllocationExtractionResult, SourceFile } from "../types";
import { supabase } from "../src/lib/supabase";

export const extractStatementData = async (files: SourceFile[]): Promise<ExtractionResult> => {
  const prompt = `
    Analise os arquivos anexados de uma fatura de cartão de crédito corporativo.
    Extraia TODOS os dados de transações.
    Capture: Data, Histórico/Descrição e Valor (R$).
    Converta valores para números decimais.
    Ignore pagamentos de fatura.
    Gere um ID único curto para cada transação.
  `;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_-TZ8pcakA54YaMuIVKIQ8A_-0hp4wfM";

    const response = await fetch(`${supabaseUrl}/functions/v1/gemini-extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${session?.access_token || anonKey}`
      },
      body: JSON.stringify({ prompt, files })
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Sessão expirada ou acesso negado (401). Recarregue a página e tente novamente.");
      }
      const errData = await response.json().catch(() => ({}));
      console.error("Fetch Error Details:", errData);
      throw new Error(`Erro na IA (Status ${response.status}): ${errData.error || 'Falha na comunicação'}`);
    }

    const data = await response.json();
    return data as ExtractionResult;
  } catch (error: any) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
};

export const extractAllocationData = async (files: SourceFile[]): Promise<AllocationExtractionResult> => {
  const prompt = `
    Analise os arquivos de ALOCAÇÃO CONTÁBIL anexados.
    Extraia a lista de lançamentos previstos ou alocados.
    Capture: Data, Descrição/Histórico, Valor (R$) e se disponível o Centro de Custo.
    Ignore cabeçalhos e totais, foque nas linhas de lançamento.
    Gere um ID único curto para cada alocação.
  `;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_-TZ8pcakA54YaMuIVKIQ8A_-0hp4wfM";

    const response = await fetch(`${supabaseUrl}/functions/v1/gemini-extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${session?.access_token || anonKey}`
      },
      body: JSON.stringify({ prompt, files })
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Sessão expirada (Alocação). Recarregue a página.");
      }
      const errData = await response.json().catch(() => ({}));
      console.error("Fetch Allocation Error Details:", errData);
      throw new Error(`Erro na IA Alocação (Status ${response.status}): ${errData.error || 'Falha na comunicação'}`);
    }

    const data = await response.json();
    return data as AllocationExtractionResult;
  } catch (error: any) {
    console.error("Gemini Allocation Extraction Error:", error);
    throw error;
  }
};
