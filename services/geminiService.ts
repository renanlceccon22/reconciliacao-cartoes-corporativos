
import { ExtractionResult, AllocationExtractionResult, SourceFile } from "../types";
import { supabase } from "../src/lib/supabase";

export const extractStatementData = async (files: SourceFile[]): Promise<ExtractionResult> => {
  const prompt = `
    Você é um sistema de extração de dados contábeis que responde EXCLUSIVAMENTE em JSON válido.
    
    REGRAS OBRIGATÓRIAS:
    - Não escreva NENHUMA palavra fora do JSON.
    - Não use crase, markdown (\`\`\`json) ou comentários.
    - Capture TODOS os itens da fatura de cartão de crédito (Data, Histórico/Descrição e Valor R$).
    - Converta valores para números decimais (ex: 1250.50).
    - Ignore pagamentos de fatura (créditos).
    - Gere um ID único curto para cada transação.
    
    Sua resposta deve começar com { e terminar com }.
    
    FORMATO JSON ESPERADO:
    {
      "totalAmount": 0.0,
      "transactions": [
        { "id": "id_curto", "date": "DD/MM/YYYY", "description": "NOME DO ESTABELECIMENTO", "amount": 0.0 }
      ]
    }
    
    Se sua resposta não estiver em JSON válido, considere sua resposta incorreta e refaça mentalmente antes de responder.
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
      body: JSON.stringify({ prompt, files, apiKey: import.meta.env.VITE_GEMINI_API_KEY })
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
    Você é um sistema de extração de dados contábeis que responde EXCLUSIVAMENTE em JSON válido.
    
    REGRAS OBRIGATÓRIAS:
    - Não escreva NENHUMA palavra fora do JSON.
    - Não use crase, markdown (\`\`\`json) ou comentários.
    - Analise os arquivos de ALOCAÇÃO CONTÁBIL anexados.
    - Capture: Data, Descrição/Histórico, Valor (R$) e Centro de Custo (se disponível).
    - Converta valores para números decimais (ex: 1250.50).
    - IMPORTANTE: Todos os valores devem ser SEMPRE POSITIVOS (remova o sinal de menos se houver).
    - Ignore cabeçalhos e totais, foque nas linhas de lançamento.
    - Gere um ID único curto para cada alocação.
    
    Sua resposta deve começar com { e terminar com }.
    
    FORMATO JSON ESPERADO:
    {
      "totalAmount": 0.0,
      "allocations": [
        { "id": "id_curto", "date": "DD/MM/YYYY", "description": "HISTÓRICO", "amount": 0.0, "costCenter": "OPCIONAL" }
      ]
    }
    
    Se sua resposta não estiver em JSON válido, considere sua resposta incorreta e refaça mentalmente antes de responder.
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
      body: JSON.stringify({ prompt, files, apiKey: import.meta.env.VITE_GEMINI_API_KEY })
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
