import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = "sb_publishable_-TZ8pcakA54YaMuIVKIQ8A_-0hp4wfM"

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Variáveis de ambiente do Supabase não configuradas. ' +
        'Verifique VITE_SUPABASE_URL.'
    )
}

export const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        },
        global: {
            headers: {
                'x-application-name': 'reconciliacao-cartoes'
            }
        }
    }
)
