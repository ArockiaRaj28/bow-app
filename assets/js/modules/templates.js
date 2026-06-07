function renderTemplates(){
  const list=document.getElementById('templateList');list.innerHTML='';
  if(!templates.length){list.innerHTML='<div style="font-size:10px;color:var(--muted);text-align:center;padding:16px">No templates yet. Create one below!</div>';return;}
  templates.forEach(t=>{
    const j=jobs.find(x=>x.id===t.jobId)||{name:'?',color:'#666'};
    const hrs=calcShiftHours({start:t.start,end:t.end,breaks:[]});
    const card=document.createElement('div');card.className='template-card';card.style.borderColor=j.color+'30';
    let dayPills=t.days.map(d=>`<span class="tc-day-pill" style="background:${j.color}18;color:${j.color}">${TEMPLATE_DAYS[d]}</span>`).join('');
    card.innerHTML=`<div class="tc-header"><div class="tc-name" style="color:${j.color}">${t.name}</div>
      <div class="tc-actions">
        <button class="tc-btn apply" onclick="openApplyTmpl('${t.id}')">Apply</button>
        <button class="tc-btn del" onclick="deleteTmpl('${t.id}')">✕</button>
      </div></div>
      <div class="tc-days">${dayPills}</div>
      <div class="tc-shifts">${j.name} · ${t.start}–${t.end} · ${formatHours(hrs)}/day</div>`;
    list.appendChild(card);
  });
}
function openTemplateForm(id){
  editingTmplId=id||null;tmplSelectedDays=[];
  if(id){const t=templates.find(x=>x.id===id);if(t){document.getElementById('tmplName').value=t.name;tmplSelectedDays=[...t.days];document.getElementById('tmplStart').value=t.start;document.getElementById('tmplEnd').value=t.end;}}
  else{document.getElementById('tmplName').value='';document.getElementById('tmplStart').value='09:00';document.getElementById('tmplEnd').value='17:00';}
  populateJobSelects();renderTmplDaysPicker();
  document.getElementById('tmplOverlay').classList.add('open');
}
function renderTmplDaysPicker(){
  const c=document.getElementById('tmplDaysPicker');c.innerHTML='';
  TEMPLATE_DAYS.forEach((d,i)=>{
    const btn=document.createElement('button');btn.className='tday-btn'+(tmplSelectedDays.includes(i)?' sel':'');
    btn.textContent=d;btn.onclick=()=>{if(tmplSelectedDays.includes(i))tmplSelectedDays=tmplSelectedDays.filter(x=>x!==i);else tmplSelectedDays.push(i);renderTmplDaysPicker();};
    c.appendChild(btn);
  });
}
function closeTmplForm(){document.getElementById('tmplOverlay').classList.remove('open');}
function saveTmplForm(){
  const name=document.getElementById('tmplName').value.trim();
  const jobId=document.getElementById('tmplJob').value;
  const start=document.getElementById('tmplStart').value;
  const end=document.getElementById('tmplEnd').value;
  if(!name||!tmplSelectedDays.length||!jobId)return alert('Fill in all fields and select days.');
  const tmpl={id:editingTmplId||'t'+Date.now(),name,days:[...tmplSelectedDays],jobId,start,end};
  if(editingTmplId){const i=templates.findIndex(x=>x.id===editingTmplId);if(i>=0)templates[i]=tmpl;}
  else templates.push(tmpl);
  saveTemplatesLS();closeTmplForm();renderTemplates();render();
}
function deleteTmpl(id){templates=templates.filter(x=>x.id!==id);saveTemplatesLS();renderTemplates();render();}

// Apply template
let applyTmplWeeks=[];
function openApplyTmpl(id){
  applyTmplId=id;applyTmplWeeks=[];
  document.getElementById('atpSub').textContent='Template: '+templates.find(t=>t.id===id)?.name;
  // Generate next 8 weeks
  const today=new Date();const ws=getWeekStart(today);
  const weeksBtns=document.getElementById('atpWeeks');weeksBtns.innerHTML='';
  for(let i=0;i<8;i++){
    const w=new Date(ws);w.setDate(ws.getDate()+i*7);
    const we=new Date(w);we.setDate(w.getDate()+6);
    const fmt=d=>d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
    const btn=document.createElement('button');btn.className='atp-week-btn';btn.textContent=fmt(w)+'–'+fmt(we);
    btn.dataset.ws=w.toISOString();
    btn.onclick=()=>{btn.classList.toggle('sel');if(btn.classList.contains('sel'))applyTmplWeeks.push(w.toISOString());else applyTmplWeeks=applyTmplWeeks.filter(x=>x!==w.toISOString());};
    weeksBtns.appendChild(btn);
  }
  document.getElementById('applyTmplOverlay').classList.add('open');
}
function closeApplyTmpl(){document.getElementById('applyTmplOverlay').classList.remove('open');}
function applyTemplate(){
  const t=templates.find(x=>x.id===applyTmplId);if(!t)return;
  const j=jobs.find(x=>x.id===t.jobId);if(!j)return;
  const hrs=calcShiftHours({start:t.start,end:t.end,breaks:[]});
  let nightH=0;const sm=timeToMins(t.start);let em=timeToMins(t.end);if(em<=sm)em+=24*60;
  for(let m=sm;m<em;m++){if(m>=22*60||m<5*60)nightH+=1/60;}
  const dayH=hrs-nightH;
  applyTmplWeeks.forEach(wiso=>{
    const ws=new Date(wiso);
    weekDays(ws).forEach((d,di)=>{
      if(t.days.includes(di)){
        const dk=dateKey(d.getFullYear(),d.getMonth(),d.getDate());
        setJobHoursRaw(dk,t.jobId,dayH,nightH);
        if(!shifts[dk])shifts[dk]=[];
        shifts[dk].push({jobId:t.jobId,start:t.start,end:t.end,breaks:[]});
      }
    });
  });
  saveShiftsLS();closeApplyTmpl();render();renderTimeline();
}
document.getElementById('tmplOverlay').addEventListener('click',e=>{if(e.target===document.getElementById('tmplOverlay'))closeTmplForm();});
document.getElementById('applyTmplOverlay').addEventListener('click',e=>{if(e.target===document.getElementById('applyTmplOverlay'))closeApplyTmpl();});

// Template Quick Select for Shift Form
function populateTemplateSelect(){
  const sel=document.getElementById('asfTemplateSelect');
  if(!sel)return;
  sel.innerHTML='<option value="">-- Select template to auto-fill --</option>';
  templates.forEach(t=>{
    const j=jobs.find(x=>x.id===t.jobId)||{name:'?'};
    const opt=document.createElement('option');
    opt.value=t.id;
    opt.textContent=`${t.name} (${j.name} · ${t.start}–${t.end})`;
    sel.appendChild(opt);
  });
}
function applyTemplateToShift(tmplId){
  if(!tmplId)return;
  const t=templates.find(x=>x.id===tmplId);
  if(!t)return;
  document.getElementById('asfJob').value=t.jobId;
  document.getElementById('asfStart').value=t.start;
  document.getElementById('asfEnd').value=t.end;
  updateShiftCalc();
}
function clearTemplateSelect(){
  const sel=document.getElementById('asfTemplateSelect');
  if(sel)sel.value='';
}

// ════════════════════════════════════════════
// EXPORT / IMPORT
// ════════════════════════════════════════════
