function updateCumulative(){
  let tH=0,tE=0,months=0;
  const jt={};jobs.forEach(j=>{jt[j.id]={h:0,e:0};});
  const monthData=[];
  for(let mi=0;mi<TOTAL_MONTHS;mi++){
    const d=new Date(START_YEAR,START_MONTH+mi,1),y2=d.getFullYear(),m2=d.getMonth();
    const days=new Date(y2,m2+1,0).getDate();let mh=0,me=0;
    for(let day=1;day<=days;day++){
      const dk=dateKey(y2,m2,day);
      jobs.forEach(j=>{
        const t=getJobHours(dk,j.id),n=getNightHours(dk,j.id),dh=t-n;
        const e=dh*j.rate+n*(j.nightRate||Math.round(j.rate*1.25));
        jt[j.id].h+=t;jt[j.id].e+=e;tH+=t;tE+=e;mh+=t;me+=e;
      });
    }
    if(mh>0){months++;monthData.push({label:d.toLocaleDateString('en-US',{month:'short',year:'numeric'}),h:mh,e:me});}
  }
  const avg=months>0?Math.round(tE/months):0,gap=Math.max(SCHOOL_FEE-tE,0),pct=Math.min((tE/SCHOOL_FEE)*100,100);
  document.getElementById('cum-hours').textContent=formatHours(tH)+' h';
  document.getElementById('cum-earned').textContent='¥'+Math.round(tE).toLocaleString();
  document.getElementById('cum-avg').textContent='¥'+avg.toLocaleString();
  document.getElementById('cum-gap').textContent=gap>0?'¥'+Math.round(gap).toLocaleString():'✓ Done!';
  document.getElementById('cum-gap').style.color=gap>0?'var(--red)':'var(--green2)';
  document.getElementById('gp-pct').textContent=pct.toFixed(1)+'%';
  document.getElementById('gpBar').style.width=pct+'%';
  document.getElementById('gp-sub').children[0].textContent='¥'+Math.round(tE).toLocaleString()+' earned';
  const cj=document.getElementById('cumJobs');cj.innerHTML='';
  let any=false;
  jobs.forEach(j=>{if(jt[j.id].h>0){any=true;const r=document.createElement('div');r.className='cum-job-row';
    r.innerHTML=`<div class="cjr-dot" style="background:${j.color}"></div><span class="cjr-name" style="color:${j.color}">${j.name}</span><span class="cjr-hrs">${formatHours(jt[j.id].h)} · ¥${j.rate}/h</span><span class="cjr-earn" style="color:${j.color}">¥${Math.round(jt[j.id].e).toLocaleString()}</span>`;cj.appendChild(r);}});
  if(!any)cj.innerHTML=`<div style="font-size:9px;color:var(--muted);text-align:center;padding:4px">Log hours to see breakdown</div>`;
  // Monthly breakdown
  const mb=document.getElementById('monthlyBreakdown');if(!mb)return;mb.innerHTML='';
  if(!monthData.length){mb.innerHTML='<div style="font-size:9px;color:var(--muted);text-align:center;padding:4px">No data yet</div>';return;}
  monthData.forEach(md=>{
    const pct2=Math.min((md.e/SCHOOL_FEE)*100,100);
    const div=document.createElement('div');
    div.innerHTML=`<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px"><span style="font-family:var(--display);font-weight:700">${md.label}</span><span style="color:var(--green2)">¥${Math.round(md.e).toLocaleString()}</span></div>
      <div style="height:3px;background:var(--border);border-radius:2px;overflow:hidden"><div style="height:100%;width:${pct2}%;background:var(--accent);border-radius:2px"></div></div>`;
    mb.appendChild(div);
  });
}

// ════════════════════════════════════════════
// JOB MANAGER
// ════════════════════════════════════════════
let jmTemp=[];
function openJobManager(){jmTemp=JSON.parse(JSON.stringify(jobs));renderJM();document.getElementById('jmOverlay').classList.add('open');}
function renderJM(){
  const list=document.getElementById('jmJobList');list.innerHTML='';
  jmTemp.forEach((j,i)=>{
    const d=document.createElement('div');d.className='jm-job';d.style.borderColor=j.color+'30';
    d.innerHTML=`<div class="jm-job-top">
      <input type="color" class="jm-color" value="${j.color}" style="background:${j.color}" oninput="jmTemp[${i}].color=this.value;this.style.background=this.value">
      <input class="jm-name-input" placeholder="Job name" value="${j.name}" oninput="jmTemp[${i}].name=this.value" style="color:${j.color}">
      <button class="jm-remove" onclick="rmJob(${i})">✕</button></div>
      <div class="jm-rate-grid">
        <div class="jm-rate-field"><label>Day Rate (¥/hr)</label><input class="jm-rate-input day" type="number" value="${j.rate}" min="900" max="9999" oninput="jmTemp[${i}].rate=parseInt(this.value)||1000"></div>
        <div class="jm-rate-field"><label>Night Rate ¥/hr (22:00+)</label><input class="jm-rate-input night" type="number" value="${j.nightRate||Math.round(j.rate*1.25)}" min="900" max="9999" oninput="jmTemp[${i}].nightRate=parseInt(this.value)||0"></div>
      </div>`;
    list.appendChild(d);
  });
}
function addJob(){jmTemp.push({id:'j'+Date.now(),name:'New Job',color:COLORS[jmTemp.length%COLORS.length],rate:1300,nightRate:1625});renderJM();}
function rmJob(i){if(jmTemp.length<=1)return;jmTemp.splice(i,1);renderJM();}
function closeJobManager(){document.getElementById('jmOverlay').classList.remove('open');}
function saveJobManager(){jobs=JSON.parse(JSON.stringify(jmTemp));saveJobsLS();closeJobManager();render();populateJobSelects();}
document.getElementById('jmOverlay').addEventListener('click',e=>{if(e.target===document.getElementById('jmOverlay'))closeJobManager();});

function populateJobSelects(){
  ['asfJob','tmplJob'].forEach(id=>{
    const sel=document.getElementById(id);if(!sel)return;
    sel.innerHTML=jobs.map(j=>`<option value="${j.id}">${j.name}</option>`).join('');
  });
}

// ════════════════════════════════════════════
// SHIFT TIMELINE
// ════════════════════════════════════════════
function calcShiftHours(s){
  const useStart=s.actualLogin||s.start;
  const useEnd=s.actualLogout||s.end;
  const useBreaks=(s.actualLogin&&s.actualBreaks)?s.actualBreaks:s.breaks;
  const start=timeToMins(useStart),end=timeToMins(useEnd>useStart?useEnd:useEnd);
  let endM=timeToMins(useEnd);if(endM<=timeToMins(useStart))endM+=24*60;
  let total=endM-timeToMins(useStart);
  (useBreaks||[]).forEach(b=>{let bs=timeToMins(b.start),be=timeToMins(b.end);if(be<=bs)be+=24*60;total-=(be-bs);});
  return Math.max(total/60,0);
}
function calcShiftEarned(s,j){
  const useStart=s.actualLogin||s.start;
  const useEnd=s.actualLogout||s.end;
  const useBreaks=(s.actualLogin&&s.actualBreaks)?s.actualBreaks:s.breaks;
  const startM=timeToMins(useStart);let endM=timeToMins(useEnd);if(endM<=startM)endM+=24*60;
  const nightStart=22*60,nightEnd=24*60+5*60;
  let dayMins=0,nightMins=0;
  for(let m=startM;m<endM;m++){
    const inBreak=(useBreaks||[]).some(b=>{let bs=timeToMins(b.start),be=timeToMins(b.end);if(be<=bs)be+=24*60;return m>=bs&&m<be;});
    if(!inBreak){if(m>=nightStart||m<5*60)nightMins++;else dayMins++;}
  }
  return (dayMins/60)*j.rate+(nightMins/60)*(j.nightRate||Math.round(j.rate*1.25));
}
function timeToMins(t){const[h,m]=t.split(':').map(Number);return h*60+m;}
function minsToTime(m){return String(Math.floor(m/60)%24).padStart(2,'0')+':'+String(m%60).padStart(2,'0');}


// Add shift
let breakRows=[];
let actualBreakRows=[]; // For actual time breaks

