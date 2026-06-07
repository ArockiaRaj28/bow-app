// Format decimal hours as "Xh Ym" (e.g., 7.1 → "7h 6m")
function formatHours(decimalHours){
  const hours=Math.floor(decimalHours);
  const minutes=Math.round((decimalHours-hours)*60);
  if(minutes===0)return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function getJobHours(dk,jid){return parseFloat(localStorage.getItem(`wh2_${dk}_${jid}`))||0;}
function getNightHours(dk,jid){return parseFloat(localStorage.getItem(`wh2n_${dk}_${jid}`))||0;}
function setJobHoursRaw(dk,jid,dayH,nightH){
  const k=`wh2_${dk}_${jid}`,kn=`wh2n_${dk}_${jid}`,total=dayH+nightH;
  if(total<=0){localStorage.removeItem(k);localStorage.removeItem(kn);}
  else{localStorage.setItem(k,total);if(nightH>0)localStorage.setItem(kn,nightH);else localStorage.removeItem(kn);}
}
function dayTotalHours(dk){return jobs.reduce((s,j)=>s+getJobHours(dk,j.id),0);}
function dayTotalEarned(dk){
  return jobs.reduce((s,j)=>{
    const t=getJobHours(dk,j.id),n=getNightHours(dk,j.id),d=t-n;
    return s+d*j.rate+n*(j.nightRate||Math.round(j.rate*1.25));
  },0);
}
function dateKey(y,m,d){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
function todayKey(){const t=new Date();return dateKey(t.getFullYear(),t.getMonth(),t.getDate());}
function parseDate(dk){const[y,m,d]=dk.split('-').map(Number);return new Date(y,m-1,d);}

// Calculate scheduled (estimated) vs actual hours and earnings
function dayScheduledHours(dk){
  const dayShifts=shifts[dk]||[];
  return dayShifts.reduce((total,shift)=>{
    // Calculate using SCHEDULED times only
    const tempShift={...shift};
    delete tempShift.actualLogin;
    delete tempShift.actualLogout;
    delete tempShift.actualBreaks;
    return total+calcShiftHours(tempShift);
  },0);
}

function dayActualHours(dk){
  const dayShifts=shifts[dk]||[];
  let hasActual=false;
  const total=dayShifts.reduce((sum,shift)=>{
    if(shift.actualLogin||shift.actualLogout)hasActual=true;
    return sum+calcShiftHours(shift); // Uses actual if present, scheduled otherwise
  },0);
  return hasActual?total:null; // Return null if no actual times entered
}

function dayScheduledEarned(dk){
  const dayShifts=shifts[dk]||[];
  return dayShifts.reduce((total,shift)=>{
    const j=jobs.find(x=>x.id===shift.jobId);
    if(!j)return total;
    const tempShift={...shift};
    delete tempShift.actualLogin;
    delete tempShift.actualLogout;
    delete tempShift.actualBreaks;
    return total+calcShiftEarned(tempShift,j);
  },0);
}

function dayActualEarned(dk){
  const dayShifts=shifts[dk]||[];
  let hasActual=false;
  const total=dayShifts.reduce((sum,shift)=>{
    if(shift.actualLogin||shift.actualLogout)hasActual=true;
    const j=jobs.find(x=>x.id===shift.jobId);
    if(!j)return sum;
    return sum+calcShiftEarned(shift,j);
  },0);
  return hasActual?total:null;
}

// ════════════════════════════════════════════
// WEEK HELPERS
// ════════════════════════════════════════════
function getWeekStart(date){const d=new Date(date),day=d.getDay();d.setDate(d.getDate()+(day===0?-6:1-day));d.setHours(0,0,0,0);return d;}
function weekDays(ws){return Array.from({length:7},(_,i)=>{const d=new Date(ws);d.setDate(ws.getDate()+i);return d;});}
function weekTotalHours(ws){return weekDays(ws).reduce((s,d)=>s+dayTotalHours(dateKey(d.getFullYear(),d.getMonth(),d.getDate())),0);}
function weekTotalEarned(ws){return weekDays(ws).reduce((s,d)=>s+dayTotalEarned(dateKey(d.getFullYear(),d.getMonth(),d.getDate())),0);}
function weekJobHours(ws,jid){return weekDays(ws).reduce((s,d)=>s+getJobHours(dateKey(d.getFullYear(),d.getMonth(),d.getDate()),jid),0);}

// Weekly EST vs ACT
function weekScheduledHours(ws){return weekDays(ws).reduce((s,d)=>s+dayScheduledHours(dateKey(d.getFullYear(),d.getMonth(),d.getDate())),0);}
function weekActualHours(ws){
  let hasActual=false;
  const total=weekDays(ws).reduce((s,d)=>{
    const actual=dayActualHours(dateKey(d.getFullYear(),d.getMonth(),d.getDate()));
    if(actual!==null)hasActual=true;
    return s+(actual||dayScheduledHours(dateKey(d.getFullYear(),d.getMonth(),d.getDate())));
  },0);
  return hasActual?total:null;
}
function weekScheduledEarned(ws){return weekDays(ws).reduce((s,d)=>s+dayScheduledEarned(dateKey(d.getFullYear(),d.getMonth(),d.getDate())),0);}
function weekActualEarned(ws){
  let hasActual=false;
  const total=weekDays(ws).reduce((s,d)=>{
    const actual=dayActualEarned(dateKey(d.getFullYear(),d.getMonth(),d.getDate()));
    if(actual!==null)hasActual=true;
    return s+(actual||dayScheduledEarned(dateKey(d.getFullYear(),d.getMonth(),d.getDate())));
  },0);
  return hasActual?total:null;
}

// ════════════════════════════════════════════
// TABS
// ════════════════════════════════════════════
