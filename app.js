// app.js - Interacción PWA, formularios, base local y chatbot
const qs = (s, el=document) => el.querySelector(s);
const qsa = (s, el=document) => [...el.querySelectorAll(s)];
let deferredPrompt = null;
let currentCase = 0;
let currentStore = 'leads';

const WHATSAPP_NUMBER = '56920185428';

const SERVICES = [
  {icon:'⚖️', title:'Despidos y finiquitos', text:'Revisión de causales, cartas de despido, pagos pendientes, reserva de derechos y firma informada.'},
  {icon:'🛡️', title:'Ley Karin', text:'Protocolos, canal de denuncia, investigación interna y orientación frente a acoso laboral o sexual.'},
  {icon:'📄', title:'Contratos de trabajo', text:'Cláusulas mínimas, anexos, jornadas, remuneraciones, horas extras y obligaciones laborales.'},
  {icon:'🏢', title:'Empresas y sindicatos', text:'Cumplimiento laboral, reglamento interno, negociación colectiva y apoyo a sindicatos.'},
  {icon:'🔍', title:'Fiscalización y comparendo', text:'Preparación documental, defensa y ordenamiento de antecedentes frente a fiscalización laboral.'},
  {icon:'🌎', title:'Inversionistas extranjeros', text:'Softlanding laboral en Chile, contratación, cumplimiento, documentación y orientación inicial.'},
  {icon:'🏘️', title:'Comunidades', text:'Apoyo a administradores, comunidades y comités de administración en materias laborales.'},
  {icon:'🤝', title:'Networking profesional', text:'Registro de colegas, eventos, documentos, noticias, newsletter y comunidad profesional.'}
];

const CASES = [
  ['assets/screens/caso-despido-finiquito.png','Caso 1: Despido o finiquito'],
  ['assets/screens/caso-ley-karin.png','Caso 2: Ley Karin'],
  ['assets/screens/caso-contratos-cumplimiento.png','Caso 3: Contratos y cumplimiento'],
  ['assets/screens/caso-empresas-inversionistas.png','Caso 4: Empresas e inversionistas'],
  ['assets/screens/cierre-whatsapp-networking.png','Cierre: WhatsApp y networking']
];

const FAQS = [
  {q:'¿Debo firmar el finiquito si tengo dudas?', a:'Se recomienda revisar el documento antes de firmar, verificar pagos, descuentos, horas extras y evaluar reserva de derechos.'},
  {q:'¿Qué hago si recibí una carta de despido?', a:'Guarda la carta, comprobantes, liquidaciones, contrato y anexos. Te Defiendo Laboral puede revisar la causal y los antecedentes.'},
  {q:'¿Mi empresa necesita protocolo de Ley Karin?', a:'Sí, las empresas deben contar con canales, protocolos y procedimientos para prevenir, investigar y abordar situaciones de acoso y violencia laboral.'},
  {q:'¿Pueden ayudar a una comunidad o comité de administración?', a:'Sí. La atención contempla comunidades, administradores y comités que necesitan ordenar contratos, remuneraciones, jornadas y cumplimiento laboral.'}
];

async function init(){
  renderServices();
  renderFaqs();
  bindMenu();
  bindForms();
  bindCases();
  bindChatbot();
  bindInstall();
  bindDataTools();
  bindReveal();
  await TDL_DB.seedDemo();
  await refreshStats();
  registerSW();
}

function bindMenu(){
  qs('#menuToggle').addEventListener('click',()=>qs('#navLinks').classList.toggle('open'));
  qsa('#navLinks a').forEach(a=>a.addEventListener('click',()=>qs('#navLinks').classList.remove('open')));
}

function renderServices(){
  const box = qs('#serviceCards');
  box.innerHTML = SERVICES.map(s=>`<article class="service-card reveal"><div class="service-icon">${s.icon}</div><h3>${s.title}</h3><p>${s.text}</p></article>`).join('');
}

function renderFaqs(){
  const box = qs('#forumList');
  box.innerHTML = FAQS.map(f=>`<article class="forum-item"><strong>${f.q}</strong><p>${f.a}</p></article>`).join('');
}

function formToObj(form){
  return Object.fromEntries(new FormData(form).entries());
}

function whatsappUrl(data, title='Consulta desde Sitio Web + App'){
  const lines = [
    `Hola, soy ${data.nombre||''} ${data.apellido||''}`.trim(),
    `Motivo: ${title}`,
    data.tipoCliente ? `Tipo de cliente: ${data.tipoCliente}` : '',
    data.servicio ? `Servicio: ${data.servicio}` : '',
    data.profesion ? `Profesión: ${data.profesion}` : '',
    data.participacion ? `Participación: ${data.participacion}` : '',
    data.telefono ? `WhatsApp: ${data.telefono}` : '',
    data.correo ? `Correo: ${data.correo}` : '',
    data.comentario ? `Comentario: ${data.comentario}` : '',
    data.pregunta ? `Pregunta: ${data.pregunta}` : ''
  ].filter(Boolean).join('\n');
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines)}`;
}

function toast(msg){
  const t=qs('#toast');
  t.textContent=msg;
  t.hidden=false;
  setTimeout(()=>t.hidden=true,3600);
}

function bindForms(){
  qs('#contactForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const data=formToObj(e.currentTarget);
    await TDL_DB.add('leads', data);
    await refreshStats();
    toast('Consulta guardada en base local. Se abrirá WhatsApp.');
    window.open(whatsappUrl(data,'Consulta laboral'), '_blank');
    e.currentTarget.reset();
  });

  qs('#memberForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const data=formToObj(e.currentTarget);
    await TDL_DB.add('members', data);
    await refreshStats();
    toast('Registro guardado en base local. Se abrirá WhatsApp.');
    window.open(whatsappUrl(data,'Registro networking'), '_blank');
    e.currentTarget.reset();
  });

  qs('#newsletterForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const data=formToObj(e.currentTarget);
    await TDL_DB.add('newsletter', data);
    await refreshStats();
    toast('Registro de newsletter guardado.');
    e.currentTarget.reset();
  });

  qs('#questionForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const data=formToObj(e.currentTarget);
    const respuesta = autoAnswer(data.pregunta || '');
    await TDL_DB.add('questions', {...data, respuesta});
    addForumItem(data.pregunta, respuesta);
    await refreshStats();
    toast('Pregunta guardada y respondida por el asistente.');
    e.currentTarget.reset();
  });

  qs('#syncDemoBtn').addEventListener('click',async()=>{
    await TDL_DB.add('leads',{nombre:'Prueba',apellido:'Local',telefono:'+56900000000',correo:'prueba@tdl.cl',tipoCliente:'Persona',servicio:'Prueba base local',comentario:'Registro de prueba creado desde la App.'});
    await refreshStats();
    toast('Base local funcionando correctamente.');
  });
}

function autoAnswer(text){
  const t=text.toLowerCase();
  if(t.includes('finiquito')) return 'Para finiquito, se recomienda revisar montos, causal, descuentos, vacaciones, horas extras y evaluar reserva de derechos antes de firmar.';
  if(t.includes('despido')) return 'Frente a un despido, conviene revisar la carta, causal invocada, contrato, anexos, liquidaciones y fechas. Te Defiendo Laboral puede orientar la revisión.';
  if(t.includes('karin') || t.includes('acoso')) return 'En Ley Karin se debe revisar protocolo, canal de denuncia, medidas de resguardo e investigación. Es importante documentar los hechos.';
  if(t.includes('contrato') || t.includes('anexo')) return 'En contratos y anexos se revisan cláusulas mínimas, jornada, remuneración, funciones, lugar de trabajo y cambios posteriores.';
  if(t.includes('fiscalización') || t.includes('comparendo')) return 'Para fiscalización o comparendo se recomienda ordenar antecedentes, contratos, liquidaciones, asistencia, reglamento interno y comunicaciones relevantes.';
  if(t.includes('sindicato') || t.includes('negociación')) return 'En sindicatos y negociación colectiva se puede revisar estrategia, documentación, comunicaciones, cumplimiento y etapas del proceso.';
  if(t.includes('comunidad') || t.includes('administrador')) return 'Para comunidades y comités de administración, se pueden revisar contratos, jornadas, remuneraciones y cumplimiento laboral del personal asociado.';
  return 'Gracias por tu consulta. Para entregar una orientación más precisa, completa el formulario de contacto y comparte antecedentes del caso.';
}

function addForumItem(q,a){
  const item=document.createElement('article');
  item.className='forum-item';
  item.innerHTML=`<strong>${escapeHtml(q)}</strong><p>${escapeHtml(a)}</p>`;
  qs('#forumList').prepend(item);
}

function bindCases(){
  const update=()=>{
    qs('#caseImage').src=CASES[currentCase][0];
    qs('#caseCaption').textContent=CASES[currentCase][1];
  };
  qs('#prevCase').addEventListener('click',()=>{currentCase=(currentCase-1+CASES.length)%CASES.length; update();});
  qs('#nextCase').addEventListener('click',()=>{currentCase=(currentCase+1)%CASES.length; update();});
  setInterval(()=>{currentCase=(currentCase+1)%CASES.length; update();},6500);
}

function bindChatbot(){
  const msgs=qs('#chatMessages');
  const add=(text,who='bot')=>{
    const d=document.createElement('div');
    d.className=`msg ${who}`;
    d.textContent=text;
    msgs.appendChild(d);
    msgs.scrollTop=msgs.scrollHeight;
  };
  qs('#chatToggle').addEventListener('click',()=>{
    qs('#chatWindow').hidden=false;
    if(!msgs.dataset.started){
      add('Hola, soy el asistente de Te Defiendo Laboral. ¿Tu caso es despido, finiquito, Ley Karin, contrato, fiscalización, sindicato o comunidad?');
      msgs.dataset.started='1';
    }
  });
  qs('#chatClose').addEventListener('click',()=>qs('#chatWindow').hidden=true);
  qs('#chatForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const input=qs('#chatInput');
    const text=input.value.trim();
    if(!text) return;
    add(text,'user');
    input.value='';
    const answer=autoAnswer(text);
    add(answer,'bot');
    await TDL_DB.add('leads',{nombre:'Chatbot',apellido:'Web',telefono:'No informado',correo:'no-informado@chat.local',tipoCliente:'Chatbot',servicio:'Consulta chatbot',comentario:text,respuesta:answer});
    await refreshStats();
  });
}

function bindInstall(){
  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault();
    deferredPrompt=e;
    qs('#installBanner').hidden=false;
  });
  qs('#installBtn').addEventListener('click', async()=>{
    if(deferredPrompt){
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt=null;
      qs('#installBanner').hidden=true;
    } else qs('#installDialog').showModal();
  });
  qs('#closeInstall').addEventListener('click',()=>qs('#installBanner').hidden=true);
  qs('#openInstallHelp').addEventListener('click',()=>qs('#installDialog').showModal());
}

function bindDataTools(){
  qs('#openDataDialog').addEventListener('click',async()=>{ await renderDataBackup(); qs('#dataDialog').showModal(); });
  qs('#openDataDialogFooter').addEventListener('click',async()=>{ await renderDataBackup(); qs('#dataDialog').showModal(); });
  qsa('.tab').forEach(btn=>btn.addEventListener('click',async()=>{
    qsa('.tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    currentStore=btn.dataset.tab;
    await renderTable();
  }));
  qs('#exportJsonBtn').addEventListener('click',async()=>{
    const data=await TDL_DB.exportAll();
    TDL_DB.download('te-defiendo-laboral-formularios-backup.json', JSON.stringify(data,null,2));
  });
  qs('#exportCsvBtn').addEventListener('click',async()=>{
    const rows=await TDL_DB.all(currentStore);
    TDL_DB.download(`tdl-${currentStore}.csv`, TDL_DB.toCsv(rows), 'text/csv;charset=utf-8');
  });
  qs('#clearDbBtn').addEventListener('click',async()=>{
    if(confirm('¿Limpiar registros locales de este navegador?')){
      await TDL_DB.clearAll();
      await refreshStats();
      await renderDataBackup();
      toast('Base local limpiada.');
    }
  });
}

async function refreshStats(){
  const leads=await TDL_DB.all('leads');
  const members=await TDL_DB.all('members');
  const questions=await TDL_DB.all('questions');
  const newsletter=await TDL_DB.all('newsletter');
  qs('#statLeads').textContent=leads.length + members.length;
  qs('#statQuestions').textContent=questions.length;
  qs('#statNewsletter').textContent=newsletter.length;
  return {leads,members,questions,newsletter};
}

async function renderDataBackup(){
  const stats=await refreshStats();
  qs('#dataStats').innerHTML=`<div class="stat-card"><b>${stats.leads.length}</b>Contactos</div><div class="stat-card"><b>${stats.members.length}</b>Networking</div><div class="stat-card"><b>${stats.newsletter.length}</b>Newsletter</div><div class="stat-card"><b>${stats.questions.length}</b>Foro</div>`;
  await renderTable();
}

async function renderTable(){
  const rows=await TDL_DB.all(currentStore);
  const table=qs('#dataTable');
  if(!rows.length){ table.innerHTML='<tr><td>No hay registros en esta sección.</td></tr>'; return; }
  const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))].filter(k=>!['synced'].includes(k));
  table.innerHTML=`<thead><tr>${keys.map(k=>`<th>${escapeHtml(k)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${keys.map(k=>`<td>${escapeHtml(r[k])}</td>`).join('')}</tr>`).join('')}</tbody>`;
}

function escapeHtml(v){
  return String(v??'').replace(/[&<>"']/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

function bindReveal(){
  const obs=new IntersectionObserver((entries)=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.12});
  qsa('.reveal').forEach(el=>obs.observe(el));
}

function registerSW(){
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Service Worker:', err));
  }
}

window.addEventListener('DOMContentLoaded', init);
