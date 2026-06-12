import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization') || ''
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
    const admin = createClient(url, service)

    const { data: authData, error: authError } = await caller.auth.getUser()
    if (authError || !authData.user) throw new Error('Sesión no válida')
    const { data: profile } = await admin.from('profiles').select('role,plan').eq('id', authData.user.id).single()
    if (!profile || (profile.role !== 'admin' && profile.plan !== 'admin')) throw new Error('No autorizado')

    const { user_id } = await req.json()
    if (!user_id) throw new Error('Falta user_id')
    if (user_id === authData.user.id) throw new Error('No puedes eliminar tu propia cuenta desde esta función')
    const { error } = await admin.auth.admin.deleteUser(user_id)
    if (error) throw error
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
