function openModal(dk,day,m,y,ws){
  modalDK=dk;modalWS=ws;
  const dObj=new Date(y,m,day);
  document.getElementById('modalTitle').textContent=dObj.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric',year:'numeric'});
  
  // Week info
  const wh=ws?weekTotalHours(ws):0,dayTotal=dayTotalHours(dk),rem=Math.max(28-(wh-dayTotal),0),we=ws?weekTotalEarned(ws):0;
  document.getElementById('modalWeekInfo').innerHTML=`Week: <strong>${formatHours(wh)} / 28h</strong> &nbsp;·&nbsp; <strong>${formatHours(rem)}</strong> remaining &nbsp;·&nbsp; Earned: <strong>¥${Math.round(we).toLocaleString()}</strong>`;
  
  // Show existing shifts
  renderModalShiftsList(dk);
  renderModalTimeline(dk);
  
  // Populate job dropdown
  const jobSelect=document.getElementById('modalJob');
  jobSelect.innerHTML='';
  jobs.forEach(j=>{
    const opt=document.createElement('option');
    opt.value=j.id;
    opt.textContent=j.name;
    jobSelect.appendChild(opt);
  });
  
  // Populate template dropdown
  const tmplSelect=document.getElementById('modalTemplateSelect');
  tmplSelect.innerHTML='<option value="">-- Use template to auto-fill --</option>';
  templates.forEach(t=>{
    const j=jobs.find(x=>x.id===t.jobId)||{name:'?'};
    const opt=document.createElement('option');
    opt.value=t.id;
    opt.textContent=`${t.name} (${j.name} · ${t.start}–${t.end})`;
    tmplSelect.appendChild(opt);
  });
  
  // Show/hide actual times section
  const actualSection=document.getElementById('modalActualSection');
  if(actualSection)actualSection.style.display=perMinutePay?'block':'none';
  
  // Auto-populate form with last shift if exists (enables adding actual times)
  const dayShifts=shifts[dk]||[];
  if(dayShifts.length>0){
    const lastShift=dayShifts[dayShifts.length-1];
    document.getElementById('modalJob').value=lastShift.jobId;
    document.getElementById('modalStart').value=lastShift.start;
    document.getElementById('modalEnd').value=lastShift.end;
    modalBreakRows=lastShift.breaks?lastShift.breaks.map(b=>({start:b.start,end:b.end})):[];
    renderModalBreakRows();
    if(lastShift.actualLogin)document.getElementById('modalActualLogin').value=lastShift.actualLogin;
    if(lastShift.actualLogout)document.getElementById('modalActualLogout').value=lastShift.actualLogout;
    updateModalCalc();
  }else{
    // Reset form for new day
    modalBreakRows=[];
    renderModalBreakRows();
    document.getElementById('modalStart').value='09:00';
    document.getElementById('modalEnd').value='17:00';
    document.getElementById('modalActualLogin').value='';
    document.getElementById('modalActualLogout').value='';
    document.getElementById('modalCalc').textContent='—';
  }
  
  document.getElementById('modalOverlay').classList.add('open');
}

function renderModalShiftsList(dk){
  const list=document.getElementById('modalShiftsList');
  list.innerHTML='';
  const dayShifts=shifts[dk]||[];
  
  if(dayShifts.length===0){
    list.innerHTML='<div style="text-align:center;padding:12px;color:var(--muted);font-size:10px;">No shifts logged for this day</div>';
    return;
  }
  
  list.innerHTML='<div style="font-size:11px;font-weight:700;color:var(--text);margin-bottom:8px;">Logged Shifts</div>';
  
  dayShifts.forEach((s,i)=>{
    const j=jobs.find(x=>x.id===s.jobId)||{name:'Unknown',color:'#666',rate:1300};
    const hrs=calcShiftHours(s);
    const earned=calcShiftEarned(s,j);
    
    const hasActual=s.actualLogin||s.actualLogout;
    const actualInfo=hasActual?` (Actual: ${s.actualLogin||s.start}–${s.actualLogout||s.end})`:'';
    
    const card=document.createElement('div');
    card.style.cssText='background:var(--card);border-left:3px solid '+j.color+';padding:10px;border-radius:6px;margin-bottom:8px;';
    card.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:start;">
        <div>
          <div style="font-size:11px;font-weight:700;color:${j.color}">${j.name}</div>
          <div style="font-size:9px;color:var(--muted);margin-top:2px;">${s.start} – ${s.end}${s.breaks&&s.breaks.length>0?' ('+s.breaks.length+' break'+(s.breaks.length>1?'s':'')+')':''}${actualInfo}</div>
          <div style="font-size:10px;color:var(--green2);margin-top:4px;">${formatHours(hrs)} · ¥${Math.round(earned).toLocaleString()}</div>
        </div>
        <button onclick="deleteModalShift(${i})" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:var(--red);padding:6px 10px;border-radius:4px;cursor:pointer;font-size:9px;font-weight:700;">Delete</button>
      </div>
    `;
    list.appendChild(card);
  });
}

function renderModalTimeline(dk){
  const container=document.getElementById('modalTimeline');
  if(!container)return;
  
  const dayShifts=shifts[dk]||[];
  
  if(dayShifts.length===0){
    container.innerHTML='<div style="text-align:center;padding:40px;color:var(--muted);font-size:10px;">No shifts to visualize</div>';
    return;
  }
  
  // Create timeline grid (6:00 AM to 5:00 AM next day)
  let html='<div style="position:relative;">';
  
  // Hours ruler
  html+='<div style="display:grid;grid-template-columns:repeat(24,1fr);gap:1px;margin-bottom:4px;">';
  for(let h=6;h<30;h++){
    const displayH=h>=24?(h-24):h;
    html+=`<div style="font-size:7px;color:var(--muted);text-align:center;">${String(displayH).padStart(2,'0')}</div>`;
  }
  html+='</div>';
  
  // Timeline bars
  html+='<div style="position:relative;height:60px;background:linear-gradient(to right, rgba(59,130,246,0.05) 0%, rgba(59,130,246,0.05) 66.67%, rgba(139,92,246,0.1) 66.67%, rgba(139,92,246,0.1) 100%);border-radius:4px;margin-bottom:10px;">';
  
  // Night time indicator (22:00-05:00)
  html+='<div style="position:absolute;left:66.67%;right:0;top:0;bottom:0;background:rgba(139,92,246,0.1);border-left:2px dashed rgba(139,92,246,0.3);"></div>';
  html+='<div style="position:absolute;left:66.67%;top:50%;transform:translateY(-50%);font-size:7px;color:#a78bfa;padding-left:4px;">Night Pay</div>';
  
  // Shift blocks
  dayShifts.forEach((s,i)=>{
    const j=jobs.find(x=>x.id===s.jobId)||{name:'?',color:'#666'};
    const useStart=s.actualLogin||s.start;
    const useEnd=s.actualLogout||s.end;
    
    let startM=timeToMins(useStart);
    let endM=timeToMins(useEnd);
    
    // Adjust for display (6:00 AM = 0%, 5:00 AM next day = 100%)
    if(startM<6*60)startM+=24*60; // Next day early morning
    if(endM<6*60)endM+=24*60;
    if(endM<=startM)endM+=24*60;
    
    const left=((startM-6*60)/(24*60))*100;
    const width=((endM-startM)/(24*60))*100;
    
    html+=`<div style="position:absolute;left:${left}%;width:${width}%;top:${i*20+5}px;height:15px;background:${j.color};border-radius:3px;border:1px solid ${j.color};opacity:0.9;display:flex;align-items:center;justify-content:center;font-size:7px;color:white;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 4px;">`;
    html+=`${j.name.substring(0,10)} ${formatHours(calcShiftHours(s))}`;
    html+='</div>';
    
    // Break overlays
    (s.breaks||[]).forEach(b=>{
      let bs=timeToMins(b.start);
      let be=timeToMins(b.end);
      if(bs<6*60)bs+=24*60;
      if(be<6*60)be+=24*60;
      if(be<=bs)be+=24*60;
      
      const bLeft=((bs-6*60)/(24*60))*100;
      const bWidth=((be-bs)/(24*60))*100;
      
      html+=`<div style="position:absolute;left:${bLeft}%;width:${bWidth}%;top:${i*20+5}px;height:15px;background:repeating-linear-gradient(45deg,rgba(0,0,0,0.3),rgba(0,0,0,0.3) 2px,transparent 2px,transparent 4px);border-radius:3px;pointer-events:none;"></div>`;
    });
  });
  
  html+='</div>';
  html+='<div style="font-size:7px;color:var(--muted);margin-top:6px;">Striped areas = breaks</div>';
  html+='</div>';
  
  container.innerHTML=html;
}

// Modal break management
let modalBreakRows=[];
function addModalBreakRow(){
  modalBreakRows.push({start:'14:00',end:'15:00'});
  renderModalBreakRows();
}
function renderModalBreakRows(){
  const c=document.getElementById('modalBreakRows');
  if(!c)return;
  c.innerHTML='';
  modalBreakRows.forEach((b,i)=>{
    const row=document.createElement('div');
    row.className='break-row';
    row.innerHTML=`<div><label style="font-size:9px;">Start</label><input class="asf-input" type="time" value="${b.start}" onchange="modalBreakRows[${i}].start=this.value;updateModalCalc()" style="font-size:10px;"></div>
      <div><label style="font-size:9px;">End</label><input class="asf-input" type="time" value="${b.end}" onchange="modalBreakRows[${i}].end=this.value;updateModalCalc()" style="font-size:10px;"></div>
      <button class="rm-break" onclick="modalBreakRows.splice(${i},1);renderModalBreakRows();updateModalCalc()">✕</button>`;
    c.appendChild(row);
  });
  updateModalCalc();
}

function updateModalCalc(){
  const start=document.getElementById('modalStart').value;
  const end=document.getElementById('modalEnd').value;
  if(!start||!end)return;
  const tempShift={start,end,breaks:modalBreakRows};
  const hrs=calcShiftHours(tempShift);
  document.getElementById('modalCalc').textContent=formatHours(hrs);
}

function applyTemplateToModal(tmplId){
  if(!tmplId)return;
  const t=templates.find(x=>x.id===tmplId);
  if(!t)return;
  document.getElementById('modalJob').value=t.jobId;
  document.getElementById('modalStart').value=t.start;
  document.getElementById('modalEnd').value=t.end;
  updateModalCalc();
}

function saveModalShift(){
  const jobId=document.getElementById('modalJob').value;
  const start=document.getElementById('modalStart').value;
  const end=document.getElementById('modalEnd').value;
  const actualLogin=document.getElementById('modalActualLogin').value;
  const actualLogout=document.getElementById('modalActualLogout').value;
  
  if(!jobId||!start||!end)return;
  
  if(!shifts[modalDK])shifts[modalDK]=[];
  
  // Check if we're adding actual times to an existing shift
  const hasActualTimes=actualLogin||actualLogout;
  const existingShift=shifts[modalDK].find(s=>
    s.jobId===jobId && 
    s.start===start && 
    s.end===end && 
    !s.actualLogin && 
    !s.actualLogout
  );
  
  if(existingShift&&hasActualTimes){
    // UPDATE existing shift with actual times
    if(actualLogin)existingShift.actualLogin=actualLogin;
    if(actualLogout)existingShift.actualLogout=actualLogout;
    existingShift.breaks=modalBreakRows.map(b=>({start:b.start,end:b.end}));
  }else{
    // CREATE new shift
    const shift={jobId,start,end,breaks:modalBreakRows.map(b=>({start:b.start,end:b.end}))};
    if(actualLogin)shift.actualLogin=actualLogin;
    if(actualLogout)shift.actualLogout=actualLogout;
    shifts[modalDK].push(shift);
  }
  
  recalculateDayHours(modalDK);
  saveShiftsLS();
  
  // Reset form
  modalBreakRows=[];
  renderModalBreakRows();
  document.getElementById('modalStart').value='09:00';
  document.getElementById('modalEnd').value='17:00';
  document.getElementById('modalActualLogin').value='';
  document.getElementById('modalActualLogout').value='';
  document.getElementById('modalTemplateSelect').value='';
  
  // Refresh
  renderModalShiftsList(modalDK);
  renderModalTimeline(modalDK);
  render();
}

function deleteModalShift(index){
  if(!shifts[modalDK])return;
  shifts[modalDK].splice(index,1);
  if(shifts[modalDK].length===0)delete shifts[modalDK];
  recalculateDayHours(modalDK);
  saveShiftsLS();
  renderModalShiftsList(modalDK);
  renderModalTimeline(modalDK);
  render();
}

function closeModal(){
  document.getElementById('modalOverlay').classList.remove('open');
  modalDK=null;
  modalWS=null;
}

// v5.0: Swipe to close modal (left/right) - SIMPLIFIED & IMPROVED
let swipeStartX=0;
let swipeStartY=0;

document.addEventListener('touchstart',e=>{
  swipeStartX=e.touches[0].clientX;
  swipeStartY=e.touches[0].clientY;
},false);

document.addEventListener('touchend',e=>{
  const modalOverlay=document.getElementById('modalOverlay');
  if(!modalOverlay||!modalOverlay.classList.contains('open'))return;
  
  const swipeEndX=e.changedTouches[0].clientX;
  const swipeEndY=e.changedTouches[0].clientY;
  const diffX=Math.abs(swipeEndX-swipeStartX);
  const diffY=Math.abs(swipeEndY-swipeStartY);
  
  // Horizontal swipe > 60px AND vertical < 40px (confident horizontal swipe, not scroll)
  if(diffX>60&&diffY<40){
    closeModal();
  }
},false);

// v5.0: Click outside modal to close
document.getElementById('modalOverlay').addEventListener('click',e=>{
  if(e.target===document.getElementById('modalOverlay'))closeModal();
});

// v5.0: Back button / Android hardware back support
history.pushState(null,null,location.href);
window.addEventListener('popstate',()=>{
  const modalOverlay=document.getElementById('modalOverlay');
  if(modalOverlay&&modalOverlay.classList.contains('open')){
    closeModal();
    history.pushState(null,null,location.href);
  }else{
    history.back();
  }
});

// ════════════════════════════════════════════
// CUMULATIVE + SUMMARY
// ════════════════════════════════════════════
