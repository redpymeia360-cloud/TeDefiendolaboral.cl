(function(){
  const DB_NAME='tdl_crm_demo_supabase';
  const DB_VERSION=2;
  const STORES=['users','profiles','categories','posts','notices','files','labor_cases','content_items','chat_messages','notifications','leads','settings'];
  const now=()=>new Date().toISOString();
  const uid=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;

  function open(){
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{
        const db=request.result;
        STORES.forEach(name=>{
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath:'id'});
            store.createIndex('created_at','created_at',{unique:false});
          }
        });
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }
  async function list(store){
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,'readonly');
      const req=tx.objectStore(store).getAll();
      req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||''))));
      req.onerror=()=>reject(req.error);
    });
  }
  async function get(store,id){
    const db=await open();
    return new Promise((resolve,reject)=>{
      const req=db.transaction(store,'readonly').objectStore(store).get(id);
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>reject(req.error);
    });
  }
  async function put(store,item){
    const db=await open();
    const record={...item,id:item.id||uid(),updated_at:now(),created_at:item.created_at||now()};
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,'readwrite');
      tx.objectStore(store).put(record);
      tx.oncomplete=()=>resolve(record);
      tx.onerror=()=>reject(tx.error);
    });
  }
  async function remove(store,id){
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,'readwrite');
      tx.objectStore(store).delete(id);
      tx.oncomplete=()=>resolve(true);
      tx.onerror=()=>reject(tx.error);
    });
  }
  async function clear(store){
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,'readwrite');
      tx.objectStore(store).clear();
      tx.oncomplete=()=>resolve(true);
      tx.onerror=()=>reject(tx.error);
    });
  }
  async function findOne(store,predicate){return (await list(store)).find(predicate)||null}
  async function seed(){
    if((await list('users')).length)return;
    const admin={id:'u-admin',full_name:'Administrador Te Defiendo Laboral',email:'admin@tedefiendolaboral.cl',password:'admin123',role:'admin',plan:'admin',status:'activo',company:'Te Defiendo Laboral.cl'};
    const basic={id:'u-basic',full_name:'Integrante Básico Demo',email:'basico@demo.cl',password:'basico123',role:'member',plan:'basico',status:'activo',company:'Pyme Básica Demo'};
    const premium={id:'u-premium',full_name:'Integrante Premium Demo',email:'premium@demo.cl',password:'premium123',role:'member',plan:'premium',status:'activo',company:'Consultora Premium Demo'};
    for(const user of [admin,basic,premium])await put('users',user);
    await put('profiles',{id:'p-premium',user_id:'u-premium',display_name:'Consultora Premium Demo',company:'Partner Premium',email:'premium@demo.cl',whatsapp:'+56911111111',about:'Perfil premium de demostración para networking profesional.',social_url:'https://www.linkedin.com/',youtube_url:'https://www.youtube.com/',agenda_url:'https://calendar.google.com/',sponsor:'Pyme Partner'});
    const cats=[
      ['Contratación','laboral','Contratos, cláusulas mínimas, anexos y jornadas.'],
      ['Despido y finiquito','laboral','Cartas de despido, causales, finiquitos y remuneraciones.'],
      ['Ley Karin','laboral','Protocolos, canal de denuncia, investigación y medidas de resguardo.'],
      ['Networking','publicacion','Alianzas, colaboración y oportunidades entre integrantes.'],
      ['Emprendimiento','publicacion','Iniciativas y proyectos sujetos a aprobación.'],
      ['Kit de soluciones','archivo','Plantillas, checklists y herramientas descargables.']
    ];
    for(const [name,type,description] of cats)await put('categories',{name,type,description,active:true,created_by:'u-admin'});
    await put('notices',{title:'Bienvenida al CRM Networking',body:'Este espacio reúne avisos, archivos, publicaciones, formularios y herramientas para la comunidad profesional.',audience:'todos',created_by:'u-admin',published:true});
    await put('posts',{title:'Ejemplo de publicación premium',body:'Publicación aprobada para mostrar a integrantes del CRM.',status:'aprobado',visibility:'premium',created_by:'u-premium',featured:true});
    await put('files',{title:'Checklist despido y finiquito',description:'Plantilla demostrativa para revisar antecedentes antes de firmar.',access_level:'premium',file_name:'checklist-demo.txt',mime_type:'text/plain',file_blob:new Blob(['Checklist demostrativo: carta, causal, contrato, liquidaciones, vacaciones, horas extras y reserva de derechos.'],{type:'text/plain'}),created_by:'u-admin'});
    await put('content_items',{content_type:'faq',title:'¿Debo firmar un finiquito si tengo dudas?',body:'Conviene revisar montos, causal, descuentos y reserva de derechos antes de firmar.',access_level:'todos',status:'publicado',created_by:'u-admin'});
    await put('content_items',{content_type:'caso',title:'Despido con carta incompleta',body:'Caso demostrativo para ordenar antecedentes y preparar una revisión inicial.',access_level:'premium',status:'publicado',created_by:'u-admin'});
    await put('content_items',{content_type:'objecion',title:'No necesito asesoría porque el documento parece correcto',body:'Una revisión preventiva puede detectar omisiones, pagos pendientes o riesgos antes de firmar.',access_level:'premium',status:'publicado',created_by:'u-admin'});
    await put('content_items',{content_type:'proyecto',title:'Proyecto de capacitación laboral para pymes',body:'Iniciativa colaborativa pendiente de evaluación por el administrador.',access_level:'premium',status:'pendiente',created_by:'u-premium'});
    await put('chat_messages',{user_id:'u-admin',display_name:'Administrador',message:'Bienvenidos al chat interno. Compartan dudas, enlaces, archivos y oportunidades respetando las normas de comunidad.'});
    await put('notifications',{title:'Nuevo contenido publicado',body:'Se agregó un checklist premium de despido y finiquito.',audience:'premium',created_by:'u-admin'});
  }
  async function exportAll(){const data={exported_at:now(),stores:{}};for(const s of STORES)data.stores[s]=await list(s);return data}
  window.TDL_LOCAL_DB={open,list,get,put,remove,clear,findOne,seed,exportAll,uid,now,STORES};
})();
