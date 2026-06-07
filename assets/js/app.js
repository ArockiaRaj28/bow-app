// ════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════
const START_YEAR=2026,START_MONTH=3,TOTAL_MONTHS=18,SCHOOL_FEE=840000;
const ORIENTATION='2026-04-23';
const COLORS=['#f59e0b','#6366f1','#10b981','#ef4444','#ec4899','#3b82f6','#a855f7','#14b8a6'];
const DAY_NAMES=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAY_NAMES_SHORT=['Mo','Tu','We','Th','Fr','Sa','Su'];

// ════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════
let jobs=loadJobs();
let shifts=loadShifts();       // {dateKey: [{jobId,start,end,breaks:[{start,end}]}]}
let templates=loadTemplates(); // [{id,name,days:[0-6],jobId,start,end}]
let perMinutePay=loadPerMinuteSetting(); // boolean: calculate pay per minute

let curY=new Date().getFullYear(),curM=new Date().getMonth();
let pendingModalData=null;
let editingTmplId=null;
let applyTmplId=null;
let tmplSelectedDays=[];

const minMD=new Date(START_YEAR,START_MONTH,1);
const maxMD=new Date(START_YEAR,START_MONTH+TOTAL_MONTHS-1,1);
if(new Date(curY,curM,1)<minMD){curY=START_YEAR;curM=START_MONTH;}
if(new Date(curY,curM,1)>maxMD){curY=maxMD.getFullYear();curM=maxMD.getMonth();}

// ════════════════════════════════════════════
// TIMELINE STUB (tab exists, not yet implemented)
// ════════════════════════════════════════════
let tlSelectedDate=new Date().toISOString().slice(0,10); // YYYY-MM-DD
function renderTimeline(){ /* TODO: Shifts Timeline — not yet implemented */ }