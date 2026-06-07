function loadJobs(){
  try{const s=localStorage.getItem('wh_jobs3');if(s)return JSON.parse(s);}catch(e){}
  return [{id:'j1',name:"McDonald's",color:'#f59e0b',rate:1250,nightRate:1562},
          {id:'j2',name:'Big Boy',color:'#6366f1',rate:1300,nightRate:1700}];
}
function saveJobsLS(){localStorage.setItem('wh_jobs3',JSON.stringify(jobs));}
function loadShifts(){try{const s=localStorage.getItem('wh_shifts');if(s)return JSON.parse(s);}catch(e){}return {};}
function saveShiftsLS(){localStorage.setItem('wh_shifts',JSON.stringify(shifts));}
function loadTemplates(){try{const s=localStorage.getItem('wh_templates');if(s)return JSON.parse(s);}catch(e){}return [];}
function saveTemplatesLS(){localStorage.setItem('wh_templates',JSON.stringify(templates));}
function loadPerMinuteSetting(){try{return localStorage.getItem('wh_perMinute')==='true';}catch(e){}return false;}
function savePerMinuteSetting(val){localStorage.setItem('wh_perMinute',val?'true':'false');}
function togglePerMinutePay(enabled){
  perMinutePay=enabled;
  savePerMinuteSetting(enabled);
  const section=document.getElementById('actualTimesSection');
  if(section)section.style.display=enabled?'block':'none';
  updateButtonVisibility();
}

