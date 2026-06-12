(function(){
  const TABLES={
    users:'profiles', profiles:'profiles', categories:'categories', posts:'posts', notices:'notices', files:'files',
    labor_cases:'labor_cases', content_items:'content_items', chat_messages:'chat_messages', notifications:'notifications', leads:'leads'
  };
  const STORAGE_KEY='tdl_supabase_runtime_config';
  let client=null;
  let mode='local';
  let sessionUser=null;
  let currentProfile=null;

  function runtimeConfig(){
    let saved={};
    try{saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{}
    const cfg={...(window.TDL_CONFIG||{}),...saved};
    return {
      supabaseUrl:String(cfg.supabaseUrl||'').trim(),
      supabaseAnonKey:String(cfg.supabaseAnonKey||'').trim(),
      storageBucket:cfg.storageBucket||'crm-files',
      mode:cfg.mode||'local'
    };
  }
  function saveRuntimeConfig(cfg){localStorage.setItem(STORAGE_KEY,JSON.stringify(cfg));}
  function hasSupabaseConfig(){const c=runtimeConfig();return /^https:\/\/.+\.supabase\.co$/i.test(c.supabaseUrl)&&c.supabaseAnonKey.length>20}
  function initSupabase(){
    if(!hasSupabaseConfig()||!window.supabase?.createClient){client=null;return null;}
    const c=runtimeConfig();
    client=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return client;
  }
  async function init(){
    await window.TDL_LOCAL_DB.seed();
    const cfg=runtimeConfig();
    mode=cfg.mode==='supabase'&&hasSupabaseConfig()?'supabase':'local';
    if(mode==='supabase')initSupabase();
    return {mode,configured:hasSupabaseConfig()};
  }
  function setMode(newMode){mode=newMode==='supabase'?'supabase':'local';const cfg=runtimeConfig();saveRuntimeConfig({...cfg,mode});if(mode==='supabase')initSupabase();}
  function getMode(){return mode}
  function getClient(){return client||initSupabase()}

  async function login(email,password){
    if(mode==='local'){
      const user=await window.TDL_LOCAL_DB.findOne('users',u=>u.email.toLowerCase()===String(email).toLowerCase()&&u.password===password&&u.status==='activo');
      if(!user)throw new Error('Credenciales incorrectas o usuario inactivo.');
      sessionUser=user;currentProfile=user;sessionStorage.setItem('tdl_local_user_id',user.id);return user;
    }
    const sb=getClient();if(!sb)throw new Error('Supabase no está configurado.');
    const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;
    sessionUser=data.user;
    const {data:profile,error:profileError}=await sb.from('profiles').select('*').eq('id',data.user.id).single();
    if(profileError)throw new Error('El usuario existe en Auth, pero no tiene perfil CRM. Ejecuta el esquema SQL o crea el perfil.');
    currentProfile=profile;return profile;
  }
  async function restoreSession(){
    if(mode==='local'){
      const id=sessionStorage.getItem('tdl_local_user_id');if(!id)return null;
      const user=await window.TDL_LOCAL_DB.get('users',id);if(user?.status==='activo'){sessionUser=user;currentProfile=user;return user}return null;
    }
    const sb=getClient();if(!sb)return null;
    const {data}=await sb.auth.getSession();if(!data.session)return null;
    sessionUser=data.session.user;
    const {data:profile}=await sb.from('profiles').select('*').eq('id',sessionUser.id).maybeSingle();currentProfile=profile||null;return currentProfile;
  }
  async function logout(){if(mode==='supabase'&&getClient())await getClient().auth.signOut();sessionStorage.removeItem('tdl_local_user_id');sessionUser=null;currentProfile=null;}
  function user(){return currentProfile}
  function isAdmin(){return currentProfile?.role==='admin'||currentProfile?.plan==='admin'}
  function isPremium(){return isAdmin()||currentProfile?.plan==='premium'}

  function normalizeLocal(store,row){
    if(store==='users')return row;
    return row;
  }
  async function list(store,opts={}){
    if(mode==='local'){
      let rows=await window.TDL_LOCAL_DB.list(store);
      if(opts.eq)Object.entries(opts.eq).forEach(([k,v])=>rows=rows.filter(r=>String(r[k])===String(v)));
      if(opts.limit)rows=rows.slice(0,opts.limit);
      return rows.map(r=>normalizeLocal(store,r));
    }
    const table=TABLES[store]||store;let query=getClient().from(table).select(opts.select||'*');
    if(opts.eq)Object.entries(opts.eq).forEach(([k,v])=>query=query.eq(k,v));
    const defaultOrder=['chat_messages','notifications'].includes(table)?'created_at':'updated_at';query=query.order(opts.orderBy||defaultOrder,{ascending:false});if(opts.limit)query=query.limit(opts.limit);
    const {data,error}=await query;if(error)throw error;return data||[];
  }
  async function get(store,id){
    if(mode==='local')return window.TDL_LOCAL_DB.get(store,id);
    const {data,error}=await getClient().from(TABLES[store]||store).select('*').eq('id',id).single();if(error)throw error;return data;
  }
  async function save(store,item){
    if(mode==='local')return window.TDL_LOCAL_DB.put(store,item);
    const table=TABLES[store]||store;
    const payload={...item};delete payload.file_blob;delete payload.password;
    let result;
    if(payload.id){result=await getClient().from(table).update(payload).eq('id',payload.id).select().single();}
    else{delete payload.id;result=await getClient().from(table).insert(payload).select().single();}
    if(result.error)throw result.error;return result.data;
  }
  async function remove(store,id){
    if(mode==='local')return window.TDL_LOCAL_DB.remove(store,id);
    const {error}=await getClient().from(TABLES[store]||store).delete().eq('id',id);if(error)throw error;return true;
  }
  async function uploadFile(file,ownerId){
    if(!file||!file.size)return null;
    if(mode==='local')return {file_name:file.name,mime_type:file.type||'application/octet-stream',size_bytes:file.size,file_blob:file};
    const cfg=runtimeConfig();const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'-');const path=`${ownerId}/${Date.now()}-${safe}`;
    const {error}=await getClient().storage.from(cfg.storageBucket).upload(path,file,{upsert:false,contentType:file.type||undefined});if(error)throw error;
    return {file_name:file.name,mime_type:file.type||'application/octet-stream',size_bytes:file.size,storage_path:path};
  }
  async function fileUrl(record){
    if(!record)return '';
    if(mode==='local'&&record.file_blob)return URL.createObjectURL(record.file_blob);
    if(mode==='supabase'&&record.storage_path){const cfg=runtimeConfig();const {data,error}=await getClient().storage.from(cfg.storageBucket).createSignedUrl(record.storage_path,3600);if(error)throw error;return data.signedUrl;}
    return record.url||'';
  }
  async function deleteStoredFile(record){
    if(mode==='supabase'&&record?.storage_path){const cfg=runtimeConfig();const {error}=await getClient().storage.from(cfg.storageBucket).remove([record.storage_path]);if(error)throw error;}
  }
  async function createUser(payload){
    if(mode==='local')return save('users',{...payload,id:payload.id||window.TDL_LOCAL_DB.uid(),role:payload.role||'member',status:payload.status||'activo'});
    if(!isAdmin())throw new Error('Solo el administrador puede crear usuarios.');
    const {data,error}=await getClient().functions.invoke('admin-create-user',{body:payload});if(error)throw error;return data;
  }
  async function updateUser(payload){
    if(mode==='local')return save('users',payload);
    if(!isAdmin())throw new Error('Solo el administrador puede actualizar usuarios.');
    const clean={...payload};delete clean.password;return save('profiles',clean);
  }
  async function deleteUser(id){
    if(mode==='local')return remove('users',id);
    if(!isAdmin())throw new Error('Solo el administrador puede eliminar usuarios.');
    const {data,error}=await getClient().functions.invoke('admin-delete-user',{body:{user_id:id}});if(error)throw error;return data;
  }
  async function exportAll(){
    if(mode==='local')return window.TDL_LOCAL_DB.exportAll();
    const out={exported_at:new Date().toISOString(),mode:'supabase',tables:{}};
    for(const s of Object.keys(TABLES)){try{out.tables[s]=await list(s)}catch(e){out.tables[s]={error:e.message}}}return out;
  }
  async function ping(){
    if(mode==='local')return {ok:true,message:'Base interna IndexedDB activa'};
    const sb=getClient();if(!sb)return {ok:false,message:'Falta configuración de Supabase'};
    const {error}=await sb.from('categories').select('id').limit(1);return error?{ok:false,message:error.message}:{ok:true,message:'Supabase conectado'};
  }
  async function saveLead(data){
    if(mode==='supabase'&&getClient()){
      const {error}=await getClient().from('leads').insert({full_name:`${data.nombre||''} ${data.apellido||''}`.trim(),email:data.correo,phone:data.telefono,client_type:data.tipoCliente,service:data.servicio,message:data.comentario});if(!error)return true;
    }
    await window.TDL_LOCAL_DB.put('leads',{full_name:`${data.nombre||''} ${data.apellido||''}`.trim(),email:data.correo,phone:data.telefono,client_type:data.tipoCliente,service:data.servicio,message:data.comentario});return true;
  }
  window.TDL_DATA={init,setMode,getMode,runtimeConfig,saveRuntimeConfig,hasSupabaseConfig,login,restoreSession,logout,user,isAdmin,isPremium,list,get,save,remove,uploadFile,fileUrl,deleteStoredFile,createUser,updateUser,deleteUser,exportAll,ping,saveLead,getClient};
})();
