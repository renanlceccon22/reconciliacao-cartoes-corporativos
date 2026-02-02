
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

    // Storage
    async uploadFile(file: File, bucket: string, path: string): Promise<string> {
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, { upsert: true });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
        return publicUrl;
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
    async saveInvoice(cardName: string, competencia: string, totalAmount: number, transactions: Transaction[], filePath?: string) {
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
            .insert([{ card_name: cardName, competencia, total_amount: totalAmount, file_path: filePath }])
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

    async getInvoice(cardName: string, competencia: string) {
        const { data: invoice, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('card_name', cardName)
            .eq('competencia', competencia)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            return null; // Handle other errors gracefully or throw
        }

        const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('*')
            .eq('invoice_id', invoice.id);

        if (txError) throw txError;

        // Map transactions back to frontend format
        const formattedTxs: Transaction[] = transactions.map(t => {
            // date is YYYY-MM-DD from DB
            const [year, month, day] = t.date.split('-');
            return {
                id: t.id,
                date: `${day}/${month}/${year}`,
                description: t.description,
                amount: t.amount
            };
        });

        return { ...invoice, transactions: formattedTxs };
    },

    // Allocations
    async saveAllocationReport(cardName: string, competencia: string, totalAmount: number, allocations: Allocation[], filePath?: string) {
        // 1. Create Report Header
        const { data: report, error: repError } = await supabase
            .from('allocations_reports')
            .insert([{ card_name: cardName, competencia, total_amount: totalAmount, file_path: filePath }])
            .select()
            .single();

        if (repError) throw repError;

        const normalizeDate = (d: string) => {
            if (d && d.includes('/')) {
                const [day, month, year] = d.split('/');
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            return d;
        };

        // 2. Create Allocations
        const allocsToInsert = allocations.map(a => ({
            report_id: report.id,
            date: normalizeDate(a.date),
            posting_date: normalizeDate(a.postingDate || ''),
            description: a.description,
            amount: Math.abs(a.amount),
            cost_center: a.costCenter
        }));

        const { error: allocError } = await supabase
            .from('allocations')
            .insert(allocsToInsert);

        if (allocError) throw allocError;
        return report.id;
    },

    async getAllocationReport(cardName: string, competencia: string) {
        const { data: report, error } = await supabase
            .from('allocations_reports')
            .select('*')
            .eq('card_name', cardName)
            .eq('competencia', competencia)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            return null;
        }

        const { data: allocations, error: allocError } = await supabase
            .from('allocations')
            .select('*')
            .eq('report_id', report.id);

        if (allocError) throw allocError;

        const formattedAllocs: Allocation[] = allocations.map(a => {
            const [year, month, day] = a.date.split('-');
            let postingFormatted = '';
            if (a.posting_date) {
                const [py, pm, pd] = a.posting_date.split('-');
                postingFormatted = `${pd}/${pm}/${py}`;
            }
            return {
                id: a.id,
                date: `${day}/${month}/${year}`,
                postingDate: postingFormatted,
                description: a.description,
                amount: a.amount,
                costCenter: a.cost_center,
                project: '' // Assuming project is not stored or mapped
            };
        });

        return { ...report, allocations: formattedAllocs };
    }
};
