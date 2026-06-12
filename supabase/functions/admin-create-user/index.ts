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

    const body = await req.json()
    if (!body.email || !body.password) throw new Error('Correo y contraseña son obligatorios')
    const role = body.role === 'admin' ? 'admin' : 'member'
    const plan = ['basico','premium','admin'].includes(body.plan) ? body.plan : 'basico'
    const { data, error } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.full_name || '', company: body.company || '', role, plan }
    })
    if (error) throw error
    await admin.from('profiles').upsert({
      id: data.user.id,
      email: body.email,
      full_name: body.full_name || '',
      company: body.company || '',
      role,
      plan,
      status: body.status || 'activo'
    })
    return new Response(JSON.stringify({ ok: true, user_id: data.user.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
