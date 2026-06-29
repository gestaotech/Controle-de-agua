let supabase = null;

function initSupabase() {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        supabase = window.supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
        return true;
    }
    return false;
}

function getSupabase() {
    if (!supabase) {
        initSupabase();
    }
    return supabase;
}
