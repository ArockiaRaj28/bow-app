function exportData(){
  const entries=[];
  for(let mi=0;mi<TOTAL_MONTHS;mi++){
    const d=new Date(START_YEAR,START_MONTH+mi,1),y2=d.getFullYear(),m2=d.getMonth();
    const days=new Date(y2,m2+1,0).getDate();
    for(let day=1;day<=days;day++){
      const dk=dateKey(y2,m2,day);
      const jobEntries=jobs.map(j=>({jobId:j.id,dayHours:getJobHours(dk,j.id)-getNightHours(dk,j.id),nightHours:getNightHours(dk,j.id)})).filter(e=>e.dayHours>0||e.nightHours>0);
      if(jobEntries.length)entries.push({date:dk,jobs:jobEntries,totalEarned:Math.round(dayTotalEarned(dk))});
    }
  }
  const data={
    exportedAt:new Date().toISOString(),
    profile:{country:'Japan',weeklyLimit:28,currency:'JPY'},
    jobs,entries,
    shifts,
    templates
  };
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const today=new Date();
  a.download=`work_hours_backup_${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}.json`;
  a.href=url;a.click();URL.revokeObjectURL(url);
}

function importData(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    try{
      const data=JSON.parse(ev.target.result);
      if(!data.jobs||!data.entries)throw new Error('Invalid format');
      
      // Ask user: Replace or Merge?
      const mode=confirm(`Found ${data.entries.length} entries, ${data.jobs.length} jobs, ${Object.keys(data.shifts||{}).length} shifts.\n\nClick OK to REPLACE all data\nClick Cancel to MERGE with existing data`)?'replace':'merge';
      
      if(mode==='replace'){
        // REPLACE MODE: Clear everything first
        jobs=[];
        shifts={};
        templates=[];
        // Clear all hour entries
        for(let mi=0;mi<TOTAL_MONTHS;mi++){
          const d=new Date(START_YEAR,START_MONTH+mi,1),y2=d.getFullYear(),m2=d.getMonth();
          const days=new Date(y2,m2+1,0).getDate();
          for(let day=1;day<=days;day++){
            const dk=dateKey(y2,m2,day);
            data.jobs.forEach(j=>{
              localStorage.removeItem(`wh2_${dk}_${j.id}`);
              localStorage.removeItem(`wh2n_${dk}_${j.id}`);
            });
          }
        }
      }
      
      // Restore jobs
      if(mode==='replace')jobs=data.jobs;
      else data.jobs.forEach(j=>{if(!jobs.find(x=>x.id===j.id))jobs.push(j);});
      saveJobsLS();
      
      // Restore entries
      data.entries.forEach(en=>{
        en.jobs.forEach(ej=>{
          setJobHoursRaw(en.date,ej.jobId,ej.dayHours||0,ej.nightHours||0);
        });
      });
      
      // Restore shifts (CRITICAL FIX)
      if(data.shifts){
        if(mode==='replace')shifts=data.shifts;
        else Object.assign(shifts,data.shifts);
        saveShiftsLS();
      }
      
      // Restore templates
      if(data.templates){
        if(mode==='replace')templates=data.templates;
        else templates=[...templates,...data.templates.filter(t=>!templates.find(x=>x.id===t.id))];
        saveTemplatesLS();
      }
      
      render();renderTimeline();
      alert(`Import successful! (${mode.toUpperCase()} mode)\n\nRestored:\n• ${data.jobs.length} jobs\n• ${data.entries.length} day entries\n• ${Object.keys(data.shifts||{}).length} shift timings\n• ${(data.templates||[]).length} templates`);
    }catch(err){alert('Invalid backup file: '+err.message);}
  };
  reader.readAsText(file);
  e.target.value='';
}

// ════════════════════════════════════════════
// SWIPE GESTURES
// ════════════════════════════════════════════
