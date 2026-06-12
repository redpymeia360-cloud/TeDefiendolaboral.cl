const $=(s,el=document)=>el.querySelector(s);
const $$=(s,el=document)=>[...el.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const bool=v=>v===true||v==='true'||v==='on';
let currentUser=null;
let activeView='dashboard';
let realtimeChannel=null;
const cache={};

const MENU=[
  ['dashboard','🏠','Inicio','all'],['perfil','👤','Mi perfil','all'],['publicaciones','📝','Publicaciones','all'],['avisos','📣','Avisos','all'],
  ['archivos','📁','Kit y archivos','premium'],['laboral','⚖️','Claves laborales','premium'],['contenidos','📚','Contenido','premium'],['chat','💬','Chat','premium'],
  ['usuarios','🛡️','Usuarios','admin'],['categorias','🏷️','Categorías','admin'],['leads','📨','Consultas','admin'],['conexion','🔌','Conexión','admin']
];
const PLAN_RANK={basico:1,premium:2,admin:3};
function isAdmin(){return TDL_DATA.isAdmin()}
function isPremium(){return TDL_DATA.isPremium()}
function canAccess(level){if(level==='all')return true;if(level==='admin')return isAdmin();if(level==='premium')return isPremium();return false}
function toast(message,type='ok'){const t=$('#toast');t.textContent=message;t.style.background=type==='error'?'#8f2e18':'#071d32';t.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.hidden=true,3600)}
function formatDate(v){if(!v)return '—';try{return new Date(v).toLocaleString('es-CL',{dateStyle:'short',timeStyle:'short'})}catch{return v}}
function downloadJson(name,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)}
function formObject(form){const fd=new FormData(form);const o={};for(const [k,v] of fd.entries()){if(v instanceof File){continue}o[k]=v}return o}
function fillForm(form,record){form.reset();Object.entries(record||{}).forEach(([k,v])=>{const el=form.elements[k];if(!el)return;if(el.type==='checkbox')el.checked=Boolean(v);else el.value=v??''});form.scrollIntoView({behavior:'smooth',block:'start'})}
function resetForm(form){form.reset();if(form.elements.id)form.elements.id.value='';if(form.elements.existing_storage_path)form.elements.existing_storage_path.value=''}
function planLabel(p){return p==='admin'?'Administrador':p==='premium'?'Premium':'Básico'}
function badge(text,klass=''){return `<span class="badge ${klass}">${esc(text)}</span>`}
function actionButtons(store,id,{edit=true,del=true,approve=false}={}){return `<div class="item-actions">${edit?`<button data-action="edit" data-store="${store}" data-id="${id}">Editar</button>`:''}${approve?`<button data-action="approve" data-store="${store}" data-id="${id}">Aprobar</button>`:''}${del?`<button class="danger" data-action="delete" data-store="${store}" data-id="${id}">Eliminar</button>`:''}</div>`}

async function init(){
  const info=await TDL_DATA.init();
  bindGlobal();
  updateConnectionStatus(info);
  const restored=await TDL_DATA.restoreSession();
  if(restored){currentUser=restored;await enterCRM()}
}
function bindGlobal(){
  $$('.mode-switch button').forEach(btn=>btn.addEventListener('click',async()=>{
    $$('.mode-switch button').forEach(x=>x.classList.toggle('active',x===btn));
    const mode=btn.dataset.mode;TDL_DATA.setMode(mode);$('#demoUsers').hidden=mode!=='local';
    if(mode==='supabase'&&!TDL_DATA.hasSupabaseConfig())$('#connectionDialog').showModal();
    await updateConnectionStatus();
  }));
  $$('.demo-users button').forEach(btn=>btn.addEventListener('click',()=>{const [e,p]=btn.dataset.demo.split('|');$('#loginForm [name=email]').value=e;$('#loginForm [name=password]').value=p}));
  $('#loginForm').addEventListener('submit',handleLogin);
  $('#logoutBtn').addEventListener('click',async()=>{await TDL_DATA.logout();location.reload()});
  $('#openConnection').addEventListener('click',openConnectionDialog);
  $('#connectionForm').addEventListener('submit',saveConnection);
  $('#testConnection').addEventListener('click',testConnection);
  $('#switchLocal')?.addEventListener('click',async()=>{TDL_DATA.setMode('local');await TDL_DATA.logout();toast('Base interna activada');setTimeout(()=>location.reload(),700)});
  $('#switchSupabase')?.addEventListener('click',async()=>{if(!TDL_DATA.hasSupabaseConfig())return openConnectionDialog();TDL_DATA.setMode('supabase');await TDL_DATA.logout();toast('Modo Supabase activado');setTimeout(()=>location.reload(),700)});
  $('#exportData')?.addEventListener('click',async()=>downloadJson(`tdl-crm-${Date.now()}.json`,await TDL_DATA.exportAll()));
  document.addEventListener('click',handleActionClick);
  bindForms();
}
async function handleLogin(e){e.preventDefault();try{const fd=new FormData(e.currentTarget);currentUser=await TDL_DATA.login(fd.get('email'),fd.get('password'));await enterCRM()}catch(err){toast(err.message,'error')}}
async function enterCRM(){
  $('#loginView').hidden=true;$('#crmApp').hidden=false;$('#logoutBtn').hidden=false;
  $('#currentUserName').textContent=currentUser.full_name||currentUser.display_name||currentUser.email||'Usuario';
  $('#currentUserPlan').textContent=`Plan ${planLabel(currentUser.plan)}`;
  $('#userAvatar').textContent=(currentUser.full_name||currentUser.email||'U').charAt(0).toUpperCase();
  renderMenu();await showView('dashboard');setupRealtime();
}
function renderMenu(){
  $('#crmMenu').innerHTML=MENU.filter(m=>canAccess(m[3])).map(([id,icon,label])=>`<button data-view-target="${id}" class="${id===activeView?'active':''}">${icon} ${label}</button>`).join('');
  $$('#crmMenu button').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.viewTarget)));
}
async function showView(view){
  const def=MENU.find(m=>m[0]===view);if(def&&!canAccess(def[3])){toast('Tu plan no tiene permiso para este módulo.','error');return}
  activeView=view;$$('.crm-view').forEach(v=>v.classList.toggle('active',v.dataset.view===view));$$('#crmMenu button').forEach(b=>b.classList.toggle('active',b.dataset.viewTarget===view));
  try{await renderView(view)}catch(err){console.error(err);toast(err.message,'error')}
}
async function renderView(view){
  const map={dashboard:renderDashboard,conexion:renderConnection,usuarios:renderUsers,perfil:renderProfiles,categorias:renderCategories,publicaciones:renderPosts,archivos:renderFiles,avisos:renderNotices,laboral:renderLaborCases,contenidos:renderContent,chat:renderChat,leads:renderLeads};
  if(map[view])await map[view]();
}
async function updateConnectionStatus(){
  const result=await TDL_DATA.ping();const pill=$('#connectionPill');const status=$('#backendStatus');
  pill.textContent=TDL_DATA.getMode()==='supabase'?'Supabase':'Base interna';pill.className=`status-pill ${TDL_DATA.getMode()==='supabase'?'cloud':''} ${result.ok?'':'error'}`;
  if(status){status.textContent=result.message;status.className=`backend-status ${result.ok?'connection-good':'connection-bad'}`}
}
function openConnectionDialog(){const cfg=TDL_DATA.runtimeConfig();const f=$('#connectionForm');f.supabaseUrl.value=cfg.supabaseUrl||'';f.supabaseAnonKey.value=cfg.supabaseAnonKey||'';f.storageBucket.value=cfg.storageBucket||'crm-files';$('#connectionDialog').showModal()}
async function saveConnection(e){e.preventDefault();const o=formObject(e.currentTarget);TDL_DATA.saveRuntimeConfig({...TDL_DATA.runtimeConfig(),...o,mode:'supabase'});TDL_DATA.setMode('supabase');$('#connectionDialog').close();await updateConnectionStatus();toast('Configuración guardada. Inicia sesión con un usuario de Supabase.')}
async function testConnection(){const o=formObject($('#connectionForm'));TDL_DATA.saveRuntimeConfig({...TDL_DATA.runtimeConfig(),...o,mode:'supabase'});TDL_DATA.setMode('supabase');const r=await TDL_DATA.ping();toast(r.message,r.ok?'ok':'error')}
async function renderConnection(){const r=await TDL_DATA.ping();$('#connectionDetail').innerHTML=`<b>Modo:</b> ${TDL_DATA.getMode()}<br><b>Estado:</b> <span class="${r.ok?'connection-good':'connection-bad'}">${esc(r.message)}</span><br><b>Configurado:</b> ${TDL_DATA.hasSupabaseConfig()?'Sí':'No'}`}

async function renderDashboard(){
  const [users,posts,files,notices,cases]=await Promise.all([TDL_DATA.list('users'),TDL_DATA.list('posts'),TDL_DATA.list('files'),TDL_DATA.list('notices'),TDL_DATA.list('labor_cases')]);
  Object.assign(cache,{users,posts,files,notices,labor_cases:cases});
  $('#statsGrid').innerHTML=[['Usuarios',users.length],['Publicaciones',posts.length],['Archivos',files.length],['Casos laborales',cases.length]].map(([l,v])=>`<article class="stat-card"><b>${v}</b><span>${l}</span></article>`).join('');
  $('#latestNotices').innerHTML=notices.slice(0,5).map(n=>`<div class="small-item"><b>${esc(n.title)}</b><span>${esc(n.body)}</span><small>${formatDate(n.created_at)}</small></div>`).join('')||'<div class="empty-state">Sin avisos</div>';
  const activity=[...posts.map(x=>({...x,_type:'Publicación'})),...files.map(x=>({...x,_type:'Archivo'})),...cases.map(x=>({...x,_type:'Caso'}))].sort((a,b)=>String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||''))).slice(0,6);
  $('#latestActivity').innerHTML=activity.map(x=>`<div class="small-item"><b>${esc(x._type)}: ${esc(x.title||x.case_name||'Registro')}</b><small>${formatDate(x.updated_at||x.created_at)}</small></div>`).join('')||'<div class="empty-state">Sin actividad</div>';
}
async function renderUsers(){if(!isAdmin())return;const rows=await TDL_DATA.list('users');cache.users=rows;$('#usersTable').innerHTML=`<thead><tr><th>Nombre</th><th>Correo</th><th>Empresa</th><th>Plan</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${rows.map(u=>`<tr><td>${esc(u.full_name||u.display_name)}</td><td>${esc(u.email)}</td><td>${esc(u.company)}</td><td>${badge(planLabel(u.plan),u.plan)}</td><td>${esc(u.status)}</td><td>${actionButtons('users',u.id)}</td></tr>`).join('')}</tbody>`}
async function renderProfiles(){const rows=await TDL_DATA.list('profiles');cache.profiles=rows;const own=rows.find(p=>(p.user_id||p.id)===currentUser.id);if(own&&!$('#profileForm [name=id]').value)fillForm($('#profileForm'),own);const cards=await Promise.all(rows.map(async p=>{let logo='';if(p.logo_blob)logo=URL.createObjectURL(p.logo_blob);else if(p.logo_storage_path){try{logo=await TDL_DATA.fileUrl({storage_path:p.logo_storage_path})}catch{}}else if(p.logo_url)logo=p.logo_url;return `<article class="profile-card">${logo?`<img class="profile-logo" src="${esc(logo)}">`:'<div class="avatar">🏢</div>'}<h3>${esc(p.display_name||p.company||p.full_name||'Perfil')}</h3><p>${esc(p.about||'Sin descripción')}</p><div class="meta-row">${p.whatsapp?badge('WhatsApp'):''}${p.social_url?badge('Redes'):''}${p.sponsor?badge(`Partner: ${p.sponsor}`):''}</div>${isAdmin()||(p.user_id||p.id)===currentUser.id?actionButtons('profiles',p.id,{del:isAdmin()}):''}</article>`}));$('#profilesGrid').innerHTML=cards.join('')||'<div class="empty-state">Sin perfiles</div>'}
async function renderCategories(){if(!isAdmin())return;const rows=await TDL_DATA.list('categories');cache.categories=rows;$('#categoriesTable').innerHTML=`<thead><tr><th>Nombre</th><th>Tipo</th><th>Descripción</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${rows.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.type)}</td><td>${esc(c.description)}</td><td>${bool(c.active)?'Activa':'Inactiva'}</td><td>${actionButtons('categories',c.id)}</td></tr>`).join('')}</tbody>`;await renderCategorySelects(rows)}
async function renderCategorySelects(rows){if(!rows)rows=await TDL_DATA.list('categories');const options='<option value="">Sin categoría</option>'+rows.filter(c=>bool(c.active)).map(c=>`<option value="${c.id}">${esc(c.name)} · ${esc(c.type)}</option>`).join('');['#postCategorySelect','#fileCategorySelect'].forEach(id=>{const el=$(id);if(el)el.innerHTML=options})}
function visibleByPlan(row,field='visibility'){const v=row[field]||'todos';return isAdmin()||v==='todos'||v===currentUser.plan||(currentUser.plan==='premium'&&v==='basico')}
async function renderPosts(){const [rows,cats]=await Promise.all([TDL_DATA.list('posts'),TDL_DATA.list('categories')]);cache.posts=rows;cache.categories=cats;await renderCategorySelects(cats);const catMap=Object.fromEntries(cats.map(c=>[c.id,c.name]));const visible=rows.filter(p=>isAdmin()||p.created_by===currentUser.id||(p.status==='aprobado'&&visibleByPlan(p)));$('#postsList').innerHTML=visible.map(p=>`<article class="feed-item"><div class="meta-row">${badge(catMap[p.category_id]||'Publicación')}${badge(p.status,p.status==='pendiente'?'pending':'')}${badge(p.visibility||'todos',p.visibility==='premium'?'premium':'')}</div><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p>${p.url?`<a href="${esc(p.url)}" target="_blank" rel="noopener">Abrir enlace</a>`:''}${p.file_name?`<p>📎 ${esc(p.file_name)}</p>`:''}${(isAdmin()||p.created_by===currentUser.id)?actionButtons('posts',p.id,{approve:isAdmin()&&p.status!=='aprobado'}):''}</article>`).join('')||'<div class="empty-state">No hay publicaciones visibles.</div>'}
async function renderFiles(){const [rows,cats]=await Promise.all([TDL_DATA.list('files'),TDL_DATA.list('categories')]);cache.files=rows;cache.categories=cats;await renderCategorySelects(cats);const catMap=Object.fromEntries(cats.map(c=>[c.id,c.name]));const visible=rows.filter(f=>visibleByPlan(f,'access_level'));$('#filesList').innerHTML=visible.map(f=>`<article class="file-item"><div class="meta-row">${badge(catMap[f.category_id]||'Archivo')}${badge(f.access_level||'todos',f.access_level==='premium'?'premium':'')}</div><h3>${esc(f.title)}</h3><p>${esc(f.description)}</p><p>📁 ${esc(f.file_name||'Sin archivo adjunto')}</p><div class="item-actions">${f.file_name?`<button data-action="download" data-store="files" data-id="${f.id}">Descargar</button>`:''}${isAdmin()||f.created_by===currentUser.id?`<button data-action="edit" data-store="files" data-id="${f.id}">Editar</button><button class="danger" data-action="delete" data-store="files" data-id="${f.id}">Eliminar</button>`:''}</div></article>`).join('')||'<div class="empty-state">No hay archivos disponibles.</div>'}
async function renderNotices(){const rows=await TDL_DATA.list('notices');cache.notices=rows;const visible=rows.filter(n=>isAdmin()||(bool(n.published)&&visibleByPlan(n,'audience')));$('#noticesList').innerHTML=visible.map(n=>`<article class="feed-item"><div class="meta-row">${badge(n.audience||'todos')}${badge(bool(n.published)?'Publicado':'Borrador')}</div><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p><small>${formatDate(n.created_at)}</small>${isAdmin()?actionButtons('notices',n.id):''}</article>`).join('')||'<div class="empty-state">Sin avisos.</div>'}
async function renderLaborCases(){const rows=await TDL_DATA.list('labor_cases');cache.labor_cases=rows;const visible=rows.filter(x=>isAdmin()||x.created_by===currentUser.id);$('#laborCasesTable').innerHTML=`<thead><tr><th>Caso</th><th>Materia</th><th>Estado</th><th>Prioridad</th><th>Acciones</th></tr></thead><tbody>${visible.map(x=>`<tr><td><b>${esc(x.case_name)}</b><br><small>${esc(x.facts)}</small></td><td>${esc(x.topic)}</td><td>${esc(x.status)}</td><td>${esc(x.priority)}</td><td>${actionButtons('labor_cases',x.id)}</td></tr>`).join('')}</tbody>`}
async function renderContent(){const rows=await TDL_DATA.list('content_items');cache.content_items=rows;const visible=rows.filter(x=>isAdmin()||(x.status==='publicado'&&visibleByPlan(x,'access_level'))||x.created_by===currentUser.id);$('#contentList').innerHTML=visible.map(x=>`<article class="feed-item"><div class="meta-row">${badge(x.content_type)}${badge(x.access_level||'todos',x.access_level==='premium'?'premium':'')}${badge(x.status,x.status==='pendiente'?'pending':'')}</div><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p>${x.event_date?`<p>📅 ${formatDate(x.event_date)}</p>`:''}${x.url?`<a href="${esc(x.url)}" target="_blank" rel="noopener">Abrir enlace</a>`:''}${isAdmin()||x.created_by===currentUser.id?actionButtons('content_items',x.id,{approve:isAdmin()&&x.status==='pendiente'}):''}</article>`).join('')||'<div class="empty-state">Sin contenidos.</div>'}
async function renderChat(){const rows=await TDL_DATA.list('chat_messages');cache.chat_messages=rows;const box=$('#crmChatMessages');box.innerHTML=rows.slice().reverse().map(m=>`<div class="chat-bubble ${m.user_id===currentUser.id?'me':''}"><b>${esc(m.display_name||'Usuario')}</b><p>${esc(m.message)}</p>${m.file_name?`<small>📎 ${esc(m.file_name)}</small>`:''}<small>${formatDate(m.created_at)}</small></div>`).join('');box.scrollTop=box.scrollHeight}
async function renderLeads(){if(!isAdmin())return;const rows=await TDL_DATA.list('leads');cache.leads=rows;$('#leadsTable').innerHTML=`<thead><tr><th>Nombre</th><th>Contacto</th><th>Tipo</th><th>Servicio</th><th>Mensaje</th><th>Fecha</th><th>Acción</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.full_name)}</td><td>${esc(x.email)}<br>${esc(x.phone)}</td><td>${esc(x.client_type)}</td><td>${esc(x.service)}</td><td>${esc(x.message)}</td><td>${formatDate(x.created_at)}</td><td>${actionButtons('leads',x.id,{edit:false})}</td></tr>`).join('')}</tbody>`}

function bindForms(){
  $('#userForm').addEventListener('submit',async e=>{e.preventDefault();try{const o=formObject(e.currentTarget);if(o.id)await TDL_DATA.updateUser(o);else await TDL_DATA.createUser(o);resetForm(e.currentTarget);toast('Usuario guardado');await renderUsers()}catch(err){toast(err.message,'error')}});
  $('#profileForm').addEventListener('submit',async e=>{e.preventDefault();try{const o=formObject(e.currentTarget);const file=e.currentTarget.logo.files[0];o.user_id=o.user_id||currentUser.id;if(TDL_DATA.getMode()==='local'&&file){o.logo_blob=file}else if(file){const up=await TDL_DATA.uploadFile(file,currentUser.id);o.logo_storage_path=up.storage_path}if(TDL_DATA.getMode()==='supabase'&&!o.id&&o.user_id===currentUser.id)o.id=currentUser.id;await TDL_DATA.save('profiles',o);resetForm(e.currentTarget);toast('Perfil guardado');await renderProfiles()}catch(err){toast(err.message,'error')}});
  $('#categoryForm').addEventListener('submit',async e=>{e.preventDefault();try{const o=formObject(e.currentTarget);o.active=bool(o.active);o.created_by=currentUser.id;await TDL_DATA.save('categories',o);resetForm(e.currentTarget);toast('Categoría guardada');await renderCategories()}catch(err){toast(err.message,'error')}});
  $('#postForm').addEventListener('input',moderatePost);
  $('#postForm').addEventListener('submit',async e=>{e.preventDefault();try{const o=formObject(e.currentTarget);const file=e.currentTarget.file.files[0];o.featured=bool(o.featured);o.created_by=o.created_by||currentUser.id;if(!isAdmin())o.status='pendiente';if(hasRisk(`${o.title} ${o.body}`))o.status='observado';if(file)Object.assign(o,await TDL_DATA.uploadFile(file,currentUser.id));await TDL_DATA.save('posts',o);resetForm(e.currentTarget);$('#moderationWarning').hidden=true;toast('Publicación guardada');await renderPosts()}catch(err){toast(err.message,'error')}});
  $('#fileForm').addEventListener('submit',async e=>{e.preventDefault();try{const o=formObject(e.currentTarget);o.created_by=o.created_by||currentUser.id;const file=e.currentTarget.file.files[0];if(file)Object.assign(o,await TDL_DATA.uploadFile(file,currentUser.id));await TDL_DATA.save('files',o);await createNotification(`Nuevo archivo: ${o.title}`,o.description||'Se publicó un nuevo recurso.',o.access_level);resetForm(e.currentTarget);toast('Archivo guardado');await renderFiles()}catch(err){toast(err.message,'error')}});
  $('#noticeForm').addEventListener('submit',async e=>{e.preventDefault();try{const o=formObject(e.currentTarget);o.published=bool(o.published);o.created_by=currentUser.id;await TDL_DATA.save('notices',o);if(o.published)await createNotification(o.title,o.body,o.audience);resetForm(e.currentTarget);toast('Aviso guardado');await renderNotices()}catch(err){toast(err.message,'error')}});
  $('#laborCaseForm').addEventListener('submit',async e=>{e.preventDefault();try{const o=formObject(e.currentTarget);o.created_by=o.created_by||currentUser.id;await TDL_DATA.save('labor_cases',o);resetForm(e.currentTarget);toast('Caso guardado');await renderLaborCases()}catch(err){toast(err.message,'error')}});
  $('#contentForm').addEventListener('submit',async e=>{e.preventDefault();try{const o=formObject(e.currentTarget);o.created_by=o.created_by||currentUser.id;if(!isAdmin()&&['proyecto','noticia'].includes(o.content_type))o.status='pendiente';await TDL_DATA.save('content_items',o);resetForm(e.currentTarget);toast('Contenido guardado');await renderContent()}catch(err){toast(err.message,'error')}});
  $('#chatForm').addEventListener('submit',async e=>{e.preventDefault();try{const fd=new FormData(e.currentTarget);const file=fd.get('attachment');const o={user_id:currentUser.id,display_name:currentUser.full_name||currentUser.display_name||currentUser.email,message:fd.get('message')};if(file&&file.size)Object.assign(o,await TDL_DATA.uploadFile(file,currentUser.id));await TDL_DATA.save('chat_messages',o);e.currentTarget.reset();await renderChat()}catch(err){toast(err.message,'error')}});
  ['userForm','categoryForm','postForm','fileForm','noticeForm','laborCaseForm','contentForm'].forEach(id=>$('#'+id)?.addEventListener('reset',e=>setTimeout(()=>resetForm(e.currentTarget),0)));
}
async function createNotification(title,body,audience='todos'){try{await TDL_DATA.save('notifications',{title,body,audience,created_by:currentUser.id})}catch(e){console.warn(e)}}
function hasRisk(text){return /(spam|insulto|odio|amenaza|violencia|estafa|ilegal|discriminaci[oó]n)/i.test(text)}
function moderatePost(){const f=$('#postForm');const text=`${f.title.value} ${f.body.value}`;const w=$('#moderationWarning');w.hidden=!hasRisk(text);if(!w.hidden)w.textContent='Llamado de atención: el contenido puede incumplir las normas de respeto, legalidad o convivencia y quedará observado.'}

async function handleActionClick(e){
  const b=e.target.closest('[data-action]');if(!b)return;const {action,store,id}=b.dataset;
  try{
    if(action==='edit')return editRecord(store,id);
    if(action==='delete'){
      if(!confirm('¿Eliminar este registro?'))return;
      const rec=(cache[store]||[]).find(x=>x.id===id);if(store==='files'||store==='posts')await TDL_DATA.deleteStoredFile(rec);if(store==='users')await TDL_DATA.deleteUser(id);else await TDL_DATA.remove(store,id);toast('Registro eliminado');await renderView(activeView);
    }
    if(action==='approve'){const rec=(cache[store]||[]).find(x=>x.id===id);if(store==='posts')await TDL_DATA.save(store,{...rec,status:'aprobado'});else if(store==='content_items')await TDL_DATA.save(store,{...rec,status:'publicado'});toast('Registro aprobado');await renderView(activeView)}
    if(action==='download'){const rec=(cache[store]||[]).find(x=>x.id===id);const url=await TDL_DATA.fileUrl(rec);if(!url)throw new Error('Archivo no disponible.');const a=document.createElement('a');a.href=url;a.download=rec.file_name||'archivo';a.target='_blank';a.click()}
  }catch(err){toast(err.message,'error')}
}
function editRecord(store,id){
  const rec=(cache[store]||[]).find(x=>x.id===id);if(!rec)return;
  const formMap={users:'userForm',profiles:'profileForm',categories:'categoryForm',posts:'postForm',files:'fileForm',notices:'noticeForm',labor_cases:'laborCaseForm',content_items:'contentForm'};
  const form=$('#'+formMap[store]);if(!form)return;fillForm(form,rec);if(form.elements.existing_storage_path)form.elements.existing_storage_path.value=rec.storage_path||'';
}
function setupRealtime(){
  if(TDL_DATA.getMode()!=='supabase'||!TDL_DATA.getClient())return;
  try{realtimeChannel=TDL_DATA.getClient().channel('tdl-crm-live').on('postgres_changes',{event:'*',schema:'public',table:'chat_messages'},()=>activeView==='chat'&&renderChat()).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},payload=>{const n=payload.new;if(visibleByPlan(n,'audience'))toast(`Nueva notificación: ${n.title}`)}).subscribe()}catch(e){console.warn('Realtime no disponible',e)}
}
document.addEventListener('DOMContentLoaded',init);
