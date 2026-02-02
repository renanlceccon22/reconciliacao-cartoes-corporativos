
import { supabase } from '../src/lib/supabase';
import { Card, AccountingParameter, Transaction, Allocation } from '../types';

export const dbService = {
    // Cards
    async getCards() {
        const { data, error } = await supabase
            .from('cards')
            .select('*')
            .order('name');
        if (error) throw error;
        return data as Card[];
    },

    async addCard(card: Card) {
        const { error } = await supabase
            .from('cards')
            .insert([card]);
        if (error) throw error;
    },

    async addCards(cards: Card[]) {
        const { error } = await supabase
            .from('cards')
            .insert(cards);
        if (error) throw error;
    },

    async removeCard(name: string) {
        const { error } = await supabase
            .from('cards')
            .delete()
            .eq('name', name);
        if (error) throw error;
    },

    // Accounting Parameters
    async getParameters() {
        const { data, error } = await supabase
            .from('accounting_parameters')
            .select('*')
            .order('created_at');
        if (error) throw error;

        // Map database names to frontend names
        return data.map(p => ({
            id: p.id,
            cartao: p.card_name,
            motivo: p.motivo,
            contaDebito: p.conta_debito,
            contaCredito: p.conta_credito,
            subcontaDebito: p.subconta_debito,
            subcontaCredito: p.subconta_credito,
            fundo: p.fundo,
            departamentoDebito: p.departamento_debito,
            departamentoCredito: p.departamento_credito,
            restricaoDebito: p.restricao_debito,
            restricaoCredito: p.restricao_credito
        })) as AccountingParameter[];
    },

    async addParameter(p: AccountingParameter) {
        const { error } = await supabase
            .from('accounting_parameters')
            .insert([{
                card_name: p.cartao,
                motivo: p.motivo,
                conta_debito: p.contaDebito,
                conta_credito: p.contaCredito,
                subconta_debito: p.subcontaDebito,
                subconta_credito: p.subcontaCredito,
                fundo: p.fundo,
                departamento_debito: p.departamentoDebito,
                departamento_credito: p.departamentoCredito,
                restricao_debito: p.restricaoDebito,
                restricao_credito: p.restricaoCredito
            }]);
        if (error) throw error;
    },

    async addParameters(params: AccountingParameter[]) {
        const mapped = params.map(p => ({
            card_name: p.cartao,
            motivo: p.motivo,
            conta_debito: p.contaDebito,
            conta_credito: p.contaCredito,
            subconta_debito: p.subcontaDebito,
            subconta_credito: p.subcontaCredito,
            fundo: p.fundo,
            departamento_debito: p.departamentoDebito,
            departamento_credito: p.departamentoCredito,
            restricao_debito: p.restricaoDebito,
            restricao_credito: p.restricaoCredito
        }));
        const { error } = await supabase
            .from('accounting_parameters')
            .insert(mapped);
        if (error) throw error;
    },

    async removeParameter(id: string) {
        const { error } = await supabase
            .from('accounting_parameters')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // Invoices & Transactions
    async saveInvoice(cardName: string, competencia: string, totalAmount: number, transactions: Transaction[]) {
        const normalizeDate = (d: string) => {
            if (d && d.includes('/')) {
                const [day, month, year] = d.split('/');
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            return d;
        };

        // 1. Create Invoice Header
        const { data: invoice, error: invError } = await supabase
            .from('invoices')
            .insert([{ card_name: cardName, competencia, total_amount: totalAmount }])
            .select()
            .single();

        if (invError) throw invError;

        // 2. Create Transactions
        const txsToInsert = transactions.map(t => ({
            invoice_id: invoice.id,
            date: normalizeDate(t.date),
            description: t.description,
            amount: t.amount
        }));

        const { error: txError } = await supabase
            .from('transactions')
            .insert(txsToInsert);

        if (txError) throw txError;
        return invoice.id;
    },

    // Allocations
    async saveAllocationReport(cardName: string, competencia: string, totalAmount: number, allocations: Allocation[]) {
        // 1. Create Report Header
        const { data: report, error: repError } = await supabase
            .from('allocations_reports')
            .insert([{ card_name: cardName, competencia, total_amount: totalAmount }])
            .select()
            .single();

        if (repError) throw repError;

        // 2. Create Allocations
        const allocsToInsert = allocations.map(a => ({
            report_id: report.id,
            date: a.date && a.date.includes('/') ?
                `${a.date.split('/')[2]}-${a.date.split('/')[1].padStart(2, '0')}-${a.date.split('/')[0].padStart(2, '0')}` :
                a.date,
            description: a.description,
            amount: Math.abs(a.amount),
            cost_center: a.costCenter
        }));

        const { error: allocError } = await supabase
            .from('allocations')
            .insert(allocsToInsert);

        if (allocError) throw allocError;
        return report.id;
    }
};
