
export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
}

export interface Allocation {
  id: string;
  date: string;
  description: string;
  amount: number;
  costCenter?: string;
}

export interface Card {
  name: string;
  subaccount: string;
}

export interface AccountingParameter {
  id: string;
  cartao: string;
  motivo: string;
  contaDebito: string;
  contaCredito: string;
  subcontaDebito: string;
  subcontaCredito: string;
  fundo: string;
  departamentoDebito: string;
  departamentoCredito: string;
  restricaoDebito: string;
  restricaoCredito: string;
}

export interface AccountingEntry {
  data: string;
  historico: string;
  valor: number;
  contaDebito: string;
  contaCredito: string;
  subcontaDebito: string;
  subcontaCredito: string;
  fundo: string;
  departamentoDebito: string;
  departamentoCredito: string;
  restricaoDebito: string;
  restricaoCredito: string;
}

export interface ExtractionResult {
  transactions: Transaction[];
  totalAmount: number;
  statementPeriod?: string;
  cartaoVenculado?: string;
  competencia?: string;
}

export interface AllocationExtractionResult {
  allocations: Allocation[];
  totalAmount: number;
  period?: string;
  cartaoVenculado?: string;
  competencia?: string;
}

export interface ParametersExtractionResult {
  parameters: AccountingParameter[];
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface SourceFile {
  base64: string;
  mimeType: string;
  name: string;
}

export type TabType = 'faturas' | 'alocacoes' | 'conciliacao' | 'parametros' | 'cadastro';

export interface ReconciledPair {
  transaction: Transaction;
  allocation: Allocation;
  matchScore: number;
}
