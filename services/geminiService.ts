
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
    const { data, error } = await supabase.functions.invoke('gemini-extract', {
      body: { prompt, files }
    });

    if (error) throw error;
    return data as ExtractionResult;
  } catch (error) {
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
    const { data, error } = await supabase.functions.invoke('gemini-extract', {
      body: { prompt, files }
    });

    if (error) throw error;
    return data as AllocationExtractionResult;
  } catch (error) {
    console.error("Gemini Allocation Extraction Error:", error);
    throw error;
  }
};
