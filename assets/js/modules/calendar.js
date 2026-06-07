function switchTab(id,btn){
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+id).classList.add('active');
  btn.classList.add('active');
  
  // Hide all bottom tabs when top tab is selected
  const bottomTabs=['bottomTabTransactions','bottomTabStats','bottomTabAccounts','bottomTabMore'];
  bottomTabs.forEach(tabId=>{
    const el=document.getElementById(tabId);
    if(el)el.style.display='none';
  });
  
  // Remove active styling from bottom tab buttons
  document.querySelectorAll('.bottom-tab').forEach(b=>{
    b.style.color='var(--muted)';
    b.style.borderBottom='none';
  });
  
  if(id==='templates')renderTemplates();
  if(id==='summary')updateCumulative();
}

// ════════════════════════════════════════════
// NAVIGATION
// ════════════════════════════════════════════
function changeMonth(d){const n=new Date(curY,curM+d,1);if(n<minMD||n>maxMD)return;curY=n.getFullYear();curM=n.getMonth();render();}
function goToday(){const t=new Date();curY=t.getFullYear();curM=t.getMonth();const d=new Date(curY,curM,1);if(d<minMD){curY=START_YEAR;curM=START_MONTH;}if(d>maxMD){curY=maxMD.getFullYear();curM=maxMD.getMonth();}render();}

// ════════════════════════════════════════════
// MAIN RENDER
// ════════════════════════════════════════════
function render(){
  const today=new Date();today.setHours(0,0,0,0);
  document.getElementById('monthLabel').textContent=new Date(curY,curM,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
  document.getElementById('ms-jobs').textContent=jobs.length+' job'+(jobs.length>1?'s':'');

  // Legend
  const leg=document.getElementById('jobLegend');leg.innerHTML='';
  jobs.forEach(j=>{
    const p=document.createElement('div');p.className='legend-pill';
    p.innerHTML=`<div class="legend-dot" style="background:${j.color}"></div><span class="legend-name" style="color:${j.color}">${j.name}</span><span class="legend-rate">¥${j.rate.toLocaleString()}/h${j.nightRate&&j.nightRate!==j.rate?' · 🌙¥'+j.nightRate.toLocaleString():''}</span>`;
    leg.appendChild(p);
  });

  // Weekday header
  const wh=document.getElementById('weekdayHeader');wh.innerHTML='';
  DAY_NAMES.forEach((n,i)=>{const c=document.createElement('div');c.className='wh-cell'+(i>=5?' weekend':'');c.textContent=n;wh.appendChild(c);});

  // Visa bar for current week
  const todayWS=getWeekStart(today);
  const twh=weekTotalHours(todayWS);
  const pct=Math.min((twh/28)*100,100);
  const vbFill=document.getElementById('vbFill');
  vbFill.style.width=pct+'%';
  vbFill.style.background=twh>28?'var(--red)':twh>=24?'var(--yellow)':'var(--green)';
  document.getElementById('vbText').textContent=formatHours(twh)+'/28h';
  const warn=document.getElementById('vbWarn');
  if(twh>28){warn.className='vb-warn warn-over';warn.textContent='⚠ OVER!';}
  else if(twh>=24){warn.className='vb-warn warn-near';warn.textContent='⚡ Near';}
  else{warn.className='vb-warn warn-safe';warn.textContent='✓ Safe';}

  // Grid
  const grid=document.getElementById('calGrid');grid.innerHTML='';
  const firstDay=new Date(curY,curM,1),lastDay=new Date(curY,curM+1,0);
  let off=firstDay.getDay()-1;if(off<0)off=6;
  const slots=[];for(let i=0;i<off;i++)slots.push(null);for(let d=1;d<=lastDay.getDate();d++)slots.push(d);while(slots.length%7)slots.push(null);
  const weeks=[];for(let i=0;i<slots.length;i+=7)weeks.push(slots.slice(i,i+7));

  let mH=0,mE=0,mD=0;
  let mScheduledE=0,mActualE=0,hasMonthActual=false;

  weeks.forEach(week=>{
    let ws=null;
    for(let ci=0;ci<7;ci++){if(week[ci]!==null){ws=getWeekStart(new Date(curY,curM,week[ci]));break;}}
    week.forEach(day=>{
      const cell=document.createElement('div');
      if(day===null){cell.className='day-cell empty';grid.appendChild(cell);return;}
      const cd=new Date(curY,curM,day);cd.setHours(0,0,0,0);
      const dk=dateKey(curY,curM,day);
      const isToday=cd.getTime()===today.getTime();
      const isOri=dk===ORIENTATION;
      const tH=dayTotalHours(dk),tE=dayTotalEarned(dk);
      const wh=ws?weekTotalHours(ws):0,isOver=wh>28;
      const hasTmpl=templates.some(t=>t.days.includes((cd.getDay()+6)%7));
      const hasShift=shifts[dk]&&shifts[dk].length>0;

      cell.className=['day-cell',isToday?'today':'',isOri?'orientation':'',tH>0?'has-hours':'',isOver&&tH>0?'over-limit':''].filter(Boolean).join(' ');

      let html='<div class="day-jobbar">';
      if(tH>0)jobs.forEach(j=>{const jh=getJobHours(dk,j.id);if(jh>0)html+=`<div class="day-jobbar-seg" style="flex:${jh};background:${j.color}"></div>`;});
      html+='</div>';
      html+=`<div class="day-num"><span style="${isToday?'color:var(--accent2);font-weight:700':''}">${day}</span><div style="display:flex;gap:2px">${isToday?'<span class="today-dot"></span>':''}${isOri?'<span class="orient-badge">ORI</span>':''}${hasShift?'<span style="font-size:6px;color:var(--green2)">●</span>':''}${hasTmpl&&!tH?'<span class="template-dot"></span>':''}</div></div>`;

      if(isOri){
        html+=`<div style="font-size:7px;color:var(--yellow);text-align:center;line-height:1.4">Orientation<br>Day</div>`;
      } else if(tH>0){
        html+='<div class="day-jobs-wrap">';
        jobs.forEach(j=>{const jh=getJobHours(dk,j.id);if(jh>0)html+=`<div class="day-job-seg" style="background:${j.color}18"><span class="djs-name" style="color:${j.color}">${j.name.split(' ')[0]}</span><span class="djs-hrs" style="color:${j.color}">${formatHours(jh)}</span></div>`;});
        html+='</div>';
        
        // Show estimated vs actual if per-minute enabled and actual times exist
        if(perMinutePay){
          const actualH=dayActualHours(dk);
          const actualE=dayActualEarned(dk);
          if(actualH!==null&&actualE!==null){
            const scheduledH=dayScheduledHours(dk);
            const scheduledE=dayScheduledEarned(dk);
            const diffH=actualH-scheduledH;
            const diffE=actualE-scheduledE;
            // Compact single-line display
            html+=`<div style="display:flex;justify-content:space-between;font-size:7px;margin-top:2px;padding:2px 4px;background:rgba(59,130,246,0.05);border-radius:3px;">`;
            html+=`<span><span style="color:var(--muted);font-size:6px;">E</span> <span style="color:var(--blue);font-weight:700;">¥${Math.round(scheduledE).toLocaleString()}</span></span>`;
            html+=`<span style="color:var(--muted);">|</span>`;
            html+=`<span><span style="color:var(--muted);font-size:6px;">A</span> <span style="color:#a78bfa;font-weight:700;">¥${Math.round(actualE).toLocaleString()}</span></span>`;
            html+=`</div>`;
            html+=`<div style="font-size:6px;color:${diffE>=0?'var(--green2)':'var(--red)'};text-align:center;margin-top:1px;font-weight:700;">${diffE>=0?'+':''}¥${Math.round(diffE).toLocaleString()} · ${diffH>=0?'+':''}${formatHours(Math.abs(diffH))}</div>`;
          }else{
            html+=`<div class="day-total">¥${Math.round(tE).toLocaleString()}</div>`;
          }
        }else{
          html+=`<div class="day-total">¥${Math.round(tE).toLocaleString()}</div>`;
        }
      } else {
        html+=`<div style="text-align:center;padding:6px 0;color:var(--muted);font-size:11px">—</div>`;
      }
      cell.innerHTML=html;
      if(!isOri)cell.onclick=()=>openModal(dk,day,curM,curY,ws);
      if(tH>0){mH+=tH;mD++;}
      mE+=tE;
      
      // Accumulate monthly scheduled/actual
      mScheduledE+=dayScheduledEarned(dk);
      const actualE=dayActualEarned(dk);
      if(actualE!==null){
        hasMonthActual=true;
        mActualE+=actualE;
      }else{
        mActualE+=dayScheduledEarned(dk);
      }
      
      grid.appendChild(cell);
    });

    // Week summary
    if(ws){
      const wh=weekTotalHours(ws),we=weekTotalEarned(ws);
      const pct=Math.min((wh/28)*100,100);
      const bc=wh>28?'var(--red)':wh>=24?'var(--yellow)':'var(--green)';
      const vc=wh>28?'red':wh>=24?'yellow':'green';
      const wEnd=new Date(ws);wEnd.setDate(ws.getDate()+6);
      const fmt=d=>d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
      let tags='';jobs.forEach(j=>{const jh=weekJobHours(ws,j.id);if(jh>0)tags+=`<span class="ws-job-tag" style="background:${j.color}18;color:${j.color}">${j.name.split(' ')[0]} ${formatHours(jh)}</span>`;});
      
      // Check if week has actual times
      let earnedDisplay='';
      if(perMinutePay){
        const actualWE=weekActualEarned(ws);
        if(actualWE!==null){
          const scheduledWE=weekScheduledEarned(ws);
          const diffWE=actualWE-scheduledWE;
          earnedDisplay=`<span class="ws-val green" style="font-size:7px;">E:¥${Math.round(scheduledWE).toLocaleString()} | A:¥${Math.round(actualWE).toLocaleString()}<br><span style="color:${diffWE>=0?'var(--green2)':'var(--red)'};">${diffWE>=0?'+':''}¥${Math.round(diffWE).toLocaleString()}</span></span>`;
        }else{
          earnedDisplay=`<span class="ws-val green">¥${Math.round(we).toLocaleString()}</span>`;
        }
      }else{
        earnedDisplay=`<span class="ws-val green">¥${Math.round(we).toLocaleString()}</span>`;
      }
      
      const row=document.createElement('div');row.className='week-summary-cell';
      row.innerHTML=`<div class="ws-item"><span class="ws-label">Week</span><span class="ws-val blue" style="font-size:8px">${fmt(ws)}–${fmt(wEnd)}</span></div>
        <div class="ws-item"><span class="ws-label">Hours</span><span class="ws-val ${vc}">${formatHours(wh)}/28h</span></div>
        <div class="ws-item"><span class="ws-label">Earned</span>${earnedDisplay}</div>
        <div class="ws-jobs">${tags}</div>
        <div class="ws-bar-wrap"><div class="ws-bar-bg"><div class="ws-bar-fill" style="width:${pct}%;background:${bc}"></div></div></div>`;
      grid.appendChild(row);
    }
  });

  document.getElementById('ms-hours').textContent=formatHours(mH);
  
  // Show EST vs ACT for monthly earned if per-minute enabled and has actual times
  if(perMinutePay&&hasMonthActual){
    const diffE=mActualE-mScheduledE;
    document.getElementById('ms-earned').innerHTML=`<div style="font-size:7px;color:var(--muted);">E:¥${Math.round(mScheduledE).toLocaleString()} | A:¥${Math.round(mActualE).toLocaleString()}</div><div style="font-size:8px;color:${diffE>=0?'var(--green2)':'var(--red)'};">${diffE>=0?'+':''}¥${Math.round(diffE).toLocaleString()}</div>`;
  }else{
    document.getElementById('ms-earned').textContent='¥'+Math.round(mE).toLocaleString();
  }
  
  document.getElementById('ms-days').textContent=mD;
}

// ════════════════════════════════════════════
// DAY MODAL + VISA ENGINE
// ════════════════════════════════════════════
let modalDK=null,modalWS=null;
