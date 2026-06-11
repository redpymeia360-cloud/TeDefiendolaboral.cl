// db.js - Base de datos local IndexedDB + sincronización opcional con Supabase REST
(function(){
  const DB_NAME = 'te_defiendo_laboral_app';
  const DB_VERSION = 1;
  const STORES = ['leads','members','newsletter','questions'];

  function openDb(){
    return new Promise((resolve, reject)=>{
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (event)=>{
        const db = event.target.result;
        STORES.forEach(store=>{
          if(!db.objectStoreNames.contains(store)){
            const os = db.createObjectStore(store,{keyPath:'id'});
            os.createIndex('createdAt','createdAt',{unique:false});
            os.createIndex('synced','synced',{unique:false});
          }
        });
      };
      req.onsuccess = ()=>resolve(req.result);
      req.onerror = ()=>reject(req.error);
    });
  }

  async function add(store, data){
    const db = await openDb();
    const now = new Date().toISOString();
    const item = {id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, createdAt: now, updatedAt: now, synced:false, ...data};
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(store,'readwrite');
      tx.objectStore(store).put(item);
      tx.oncomplete = async ()=>{
        try{ await trySync(store, item); }catch(e){ console.warn('No sincronizado:', e.message); }
        resolve(item);
      };
      tx.onerror = ()=>reject(tx.error);
    });
  }

  async function put(store, item){
    const db = await openDb();
    item.updatedAt = new Date().toISOString();
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(store,'readwrite');
      tx.objectStore(store).put(item);
      tx.oncomplete = ()=>resolve(item);
      tx.onerror = ()=>reject(tx.error);
    });
  }

  async function all(store){
    const db = await openDb();
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(store,'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = ()=>resolve((req.result||[]).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')));
      req.onerror = ()=>reject(req.error);
    });
  }

  async function clear(store){
    const db = await openDb();
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(store,'readwrite');
      tx.objectStore(store).clear();
      tx.oncomplete = resolve;
      tx.onerror = ()=>reject(tx.error);
    });
  }

  async function clearAll(){
    for(const s of STORES) await clear(s);
  }

  async function exportAll(){
    const out = {exportedAt:new Date().toISOString(), app:'Te Defiendo Laboral App', data:{}};
    for(const s of STORES){ out.data[s] = await all(s); }
    return out;
  }

  function download(filename, text, mime='application/json'){
    const blob = new Blob([text], {type:mime});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function toCsv(rows){
    if(!rows.length) return '';
    const keys = [...new Set(rows.flatMap(r=>Object.keys(r)))];
    const esc = v => `"${String(v ?? '').replace(/"/g,'""').replace(/\n/g,' ')}"`;
    return [keys.join(','), ...rows.map(row=>keys.map(k=>esc(row[k])).join(','))].join('\n');
  }

  async function trySync(store, item){
    const cfg = window.TDL_CONFIG || {};
    if(!cfg.useSupabase || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return false;
    const table = (cfg.tables && cfg.tables[store]) || store;
    const url = `${cfg.supabaseUrl.replace(/\/$/,'')}/rest/v1/${table}`;
    const res = await fetch(url, {
      method:'POST',
      headers:{
        apikey: cfg.supabaseAnonKey,
        Authorization: `Bearer ${cfg.supabaseAnonKey}`,
        'Content-Type':'application/json',
        Prefer:'return=minimal'
      },
      body: JSON.stringify(item)
    });
    if(!res.ok) throw new Error(`Supabase ${res.status}`);
    await put(store, {...item, synced:true});
    return true;
  }

  async function seedDemo(){
    const leads = await all('leads');
    if(leads.length) return;
    await add('leads',{nombre:'Cliente',apellido:'Demo',telefono:'+56900000000',correo:'cliente.demo@correo.cl',tipoCliente:'Persona',servicio:'Despido y finiquito',comentario:'Necesito revisar carta de despido antes de firmar.'});
    await add('members',{nombre:'Profesional',apellido:'Networking',telefono:'+56911111111',correo:'networking@correo.cl',profesion:'Abogado/a laboral',participacion:'Membresía mensual $30.000',comentario:'Interés en participar en comunidad profesional.'});
    await add('questions',{nombre:'María',correo:'maria@correo.cl',pregunta:'¿Debo firmar el finiquito si tengo dudas?',respuesta:'Se recomienda revisar el documento antes de firmar y consultar si existen pagos pendientes, descuentos, horas extras o reserva de derechos.'});
  }

  window.TDL_DB = {add, put, all, clear, clearAll, exportAll, download, toCsv, seedDemo, STORES};
})();
