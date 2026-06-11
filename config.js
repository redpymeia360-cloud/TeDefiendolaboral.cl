// config.js - Conexión opcional a Supabase. En GitHub Pages funciona sin configurar esto.
window.TDL_CONFIG = {
  useSupabase: false,
  supabaseUrl: '',
  supabaseAnonKey: '',
  tables: {
    leads: 'tdl_leads',
    members: 'tdl_networking',
    newsletter: 'tdl_newsletter',
    questions: 'tdl_questions'
  }
};
