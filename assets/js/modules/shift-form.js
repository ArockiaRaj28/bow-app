function addBreakRow(){
  breakRows.push({start:'19:00',end:'19:30'});
  renderBreakRows();
}
function renderBreakRows(){
  const c=document.getElementById('breakRows');c.innerHTML='';
  breakRows.forEach((b,i)=>{
    const row=document.createElement('div');row.className='break-row';
    row.innerHTML=`<div><label>Start</label><input class="asf-input" type="time" value="${b.start}" onchange="breakRows[${i}].start=this.value;updateShiftCalc()"></div>
      <div><label>End</label><input class="asf-input" type="time" value="${b.end}" onchange="breakRows[${i}].end=this.value;updateShiftCalc()"></div>
      <button class="rm-break" onclick="breakRows.splice(${i},1);renderBreakRows()">✕</button>`;
    c.appendChild(row);
  });
  updateShiftCalc();
}

// Actual break rows (for actual times)
function addActualBreakRow(){
  actualBreakRows.push({start:'19:00',end:'19:30'});
  renderActualBreakRows();
}
function renderActualBreakRows(){
  const c=document.getElementById('actualBreakRows');
  if(!c)return;
  c.innerHTML='';
  actualBreakRows.forEach((b,i)=>{
    const row=document.createElement('div');row.className='break-row';
    row.innerHTML=`<div><label style="font-size:9px;">Start</label><input class="asf-input" type="time" value="${b.start}" onchange="actualBreakRows[${i}].start=this.value" style="border-color:rgba(139,92,246,0.3);"></div>
      <div><label style="font-size:9px;">End</label><input class="asf-input" type="time" value="${b.end}" onchange="actualBreakRows[${i}].end=this.value" style="border-color:rgba(139,92,246,0.3);"></div>
      <button class="rm-break" onclick="actualBreakRows.splice(${i},1);renderActualBreakRows()" style="background:rgba(139,92,246,0.1);border-color:rgba(139,92,246,0.3);">✕</button>`;
    c.appendChild(row);
  });
}
function toggleActualBreaks(enabled){
  const section=document.getElementById('actualBreaksSection');
  if(section)section.style.display=enabled?'block':'none';
  if(!enabled){
    actualBreakRows=[];
    renderActualBreakRows();
  }
}

function updateShiftCalc(){
  const start=document.getElementById('asfStart').value;
  const end=document.getElementById('asfEnd').value;
  if(!start||!end){document.getElementById('asfCalc').textContent='—';return;}
  const s={start,end,breaks:breakRows.map(b=>({start:b.start,end:b.end}))};
  const h=calcShiftHours(s);
  document.getElementById('asfCalc').textContent=formatHours(h);
  // Template calc
  const ts=document.getElementById('tmplStart'),te=document.getElementById('tmplEnd'),tc=document.getElementById('tmplHrsCalc');
  if(ts&&te&&tc){const ts2={start:ts.value,end:te.value,breaks:[]};tc.textContent=formatHours(calcShiftHours(ts2));}
}
// Event listeners (wrapped in null checks - some elements only exist in modal)
const asfStart=document.getElementById('asfStart');
if(asfStart)asfStart.addEventListener('input',updateShiftCalc);
const asfEnd=document.getElementById('asfEnd');
if(asfEnd)asfEnd.addEventListener('input',updateShiftCalc);

function updateButtonVisibility(){
  const saveScheduledBtn=document.getElementById('saveScheduledBtn');
  const updateActualBtn=document.getElementById('updateActualBtn');
  const actualLogin=document.getElementById('asfActualLogin');
  const actualLogout=document.getElementById('asfActualLogout');
  
  if(!saveScheduledBtn||!updateActualBtn)return;
  
  // If per-minute pay is disabled, always show only "Save Scheduled Shift"
  if(!perMinutePay){
    saveScheduledBtn.style.display='block';
    updateActualBtn.style.display='none';
    return;
  }
  
  // Per-minute pay is enabled
  const hasActualTimes=(actualLogin&&actualLogin.value)||(actualLogout&&actualLogout.value);
  const hasShiftsToday=shifts[tlSelectedDate]&&shifts[tlSelectedDate].length>0;
  
  if(hasShiftsToday&&hasActualTimes){
    // Show "Update Actual Times" button
    saveScheduledBtn.style.display='none';
    updateActualBtn.style.display='block';
  }else{
    // Show "Save Scheduled Shift" button
    saveScheduledBtn.style.display='block';
    updateActualBtn.style.display='none';
  }
}

function clearShiftForm(){
  breakRows=[];
  actualBreakRows=[];
  renderBreakRows();
  renderActualBreakRows();
  document.getElementById('asfStart').value='09:00';
  document.getElementById('asfEnd').value='17:00';
  document.getElementById('asfActualLogin').value='';
  document.getElementById('asfActualLogout').value='';
  const useActualBreaksToggle=document.getElementById('useActualBreaks');
  if(useActualBreaksToggle){
    useActualBreaksToggle.checked=false;
    toggleActualBreaks(false);
  }
  document.getElementById('asfCalc').textContent='—';
  updateButtonVisibility();
}
function deleteShift(dk,i){
  if(!shifts[dk])return;
  shifts[dk].splice(i,1);
  if(!shifts[dk].length)delete shifts[dk];
  recalculateDayHours(dk); // Recalculate after deletion
  saveShiftsLS();renderTimeline();render();
}

// Recalculate day hours from ALL shifts (fixes double-counting bug)
function recalculateDayHours(dateKey){
  // Build up hours per job in memory first
  const jobTotals={}; // {jobId: {dayH:0, nightH:0}}
  
  // Calculate from all shifts
  const dayShifts=shifts[dateKey]||[];
  dayShifts.forEach(shift=>{
    const j=jobs.find(x=>x.id===shift.jobId);
    if(!j)return;
    
    if(!jobTotals[shift.jobId])jobTotals[shift.jobId]={dayH:0,nightH:0};
    
    // Use actual times if present, otherwise use scheduled
    const useStart=shift.actualLogin||shift.start;
    const useEnd=shift.actualLogout||shift.end;
    
    // Use actual breaks if present AND actual times are used, otherwise use scheduled breaks
    const useBreaks=(shift.actualLogin&&shift.actualBreaks)?shift.actualBreaks:shift.breaks;
    
    // Calculate total hours
    const hrs=calcShiftHours(shift);
    
    // Calculate night hours (22:00-05:00)
    let nightH=0;
    const startM=timeToMins(useStart);
    let endM=timeToMins(useEnd);
    if(endM<=startM)endM+=24*60;
    
    for(let m=startM;m<endM;m++){
      const inBreak=(useBreaks||[]).some(b=>{
        let bs=timeToMins(b.start),be=timeToMins(b.end);
        if(be<=bs)be+=24*60;
        return m>=bs&&m<be;
      });
      if(!inBreak&&(m>=22*60||m<5*60))nightH+=1/60;
    }
    
    const dayH=hrs-nightH;
    
    // Accumulate in memory
    jobTotals[shift.jobId].dayH+=dayH;
    jobTotals[shift.jobId].nightH+=nightH;
  });
  
  // NOW write to storage ONCE per job (not during loop!)
  jobs.forEach(j=>{
    const totals=jobTotals[j.id]||{dayH:0,nightH:0};
    setJobHoursRaw(dateKey,j.id,totals.dayH,totals.nightH);
  });
}

function saveScheduledShift(){
  const jobId=document.getElementById('asfJob').value;
  const start=document.getElementById('asfStart').value;
  const end=document.getElementById('asfEnd').value;
  if(!jobId||!start||!end)return;
  
  if(!shifts[tlSelectedDate])shifts[tlSelectedDate]=[];
  
  // CREATE new scheduled shift (no actual times)
  const shift={jobId,start,end,breaks:breakRows.map(b=>({start:b.start,end:b.end}))};
  shifts[tlSelectedDate].push(shift);
  
  // Recalculate hours
  recalculateDayHours(tlSelectedDate);
  
  saveShiftsLS();
  clearShiftForm();
  renderTimeline();
  render();
  updateButtonVisibility(); // Show "Update Actual Times" button
}

function updateActualTimes(){
  const jobId=document.getElementById('asfJob').value;
  const start=document.getElementById('asfStart').value;
  const end=document.getElementById('asfEnd').value;
  const actualLogin=document.getElementById('asfActualLogin').value;
  const actualLogout=document.getElementById('asfActualLogout').value;
  
  if(!actualLogin&&!actualLogout){
    alert('Please enter actual login/logout times');
    return;
  }
  
  if(!shifts[tlSelectedDate]||shifts[tlSelectedDate].length===0){
    alert('Please save scheduled shift first');
    return;
  }
  
  // Find the matching shift to update
  let targetShift=shifts[tlSelectedDate].find(s=>
    s.jobId===jobId && s.start===start && s.end===end
  );
  
  if(!targetShift){
    alert('No matching shift found. Please save scheduled shift first.');
    return;
  }
  
  // UPDATE with actual times
  if(actualLogin)targetShift.actualLogin=actualLogin;
  if(actualLogout)targetShift.actualLogout=actualLogout;
  
  // Update actual breaks if toggle is enabled
  const useActualBreaksToggle=document.getElementById('useActualBreaks');
  if(useActualBreaksToggle&&useActualBreaksToggle.checked&&actualBreakRows.length>0){
    targetShift.actualBreaks=actualBreakRows.map(b=>({start:b.start,end:b.end}));
  }else if(targetShift.actualBreaks){
    delete targetShift.actualBreaks;
  }
  
  // Recalculate hours
  recalculateDayHours(tlSelectedDate);
  
  saveShiftsLS();
  clearShiftForm();
  renderTimeline();
  render();
  updateButtonVisibility();
}

// ════════════════════════════════════════════
// TEMPLATES
// ════════════════════════════════════════════
const TEMPLATE_DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
