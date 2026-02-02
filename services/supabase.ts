
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ubrxstvpfwfhdotlvnor.supabase.co';
const supabaseKey = 'sb_publishable_-TZ8pcakA54YaMuIVKIQ8A_-0hp4wfM';

export const supabase = createClient(supabaseUrl, supabaseKey);
