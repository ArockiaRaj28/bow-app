function setupSwipeGestures(element,onSwipeLeft,onSwipeRight){
  let touchStartX=0,touchStartY=0,touchEndX=0,touchEndY=0;
  const minSwipeDistance=30; // v5.1.3: Reduced from 50 to 30 for mobile sensitivity
  
  element.addEventListener('touchstart',e=>{
    touchStartX=e.changedTouches[0].screenX;
    touchStartY=e.changedTouches[0].screenY;
  },{passive:true});
  
  element.addEventListener('touchend',e=>{
    touchEndX=e.changedTouches[0].screenX;
    touchEndY=e.changedTouches[0].screenY;
    handleSwipe();
  },{passive:true});
  
  function handleSwipe(){
    const deltaX=touchEndX-touchStartX;
    const deltaY=touchEndY-touchStartY;
    
    // Only trigger if horizontal swipe is dominant
    if(Math.abs(deltaX)>Math.abs(deltaY)&&Math.abs(deltaX)>minSwipeDistance){
      if(deltaX>0){
        // Swipe right
        if(onSwipeRight)onSwipeRight();
      }else{
        // Swipe left
        if(onSwipeLeft)onSwipeLeft();
      }
    }
  }
}

// Calendar month navigation
function prevMonth(){
  const d=new Date(curY,curM-1,1);
  if(d<minMD)return;
  curY=d.getFullYear();curM=d.getMonth();
  render();
}
function nextMonth(){
  const d=new Date(curY,curM+1,1);
  if(d>maxMD)return;
  curY=d.getFullYear();curM=d.getMonth();
  render();
}

// Shifts day navigation
function prevDay(){
  const d=parseDate(tlSelectedDate);
  d.setDate(d.getDate()-1);
  const newKey=dateKey(d.getFullYear(),d.getMonth(),d.getDate());
  if(d<minMD)return;
  tlSelectedDate=newKey;
  renderTimeline();
}
function nextDay(){
  const d=parseDate(tlSelectedDate);
  d.setDate(d.getDate()+1);
  const newKey=dateKey(d.getFullYear(),d.getMonth(),d.getDate());
  if(d>maxMD)return;
  tlSelectedDate=newKey;
  renderTimeline();
}

// ════════════════════════════════════════════
// v5.1: BUDGET SYSTEM - MONTH-BASED
// ════════════════════════════════════════════

let budgets=JSON.parse(localStorage.getItem('wh_budgets')||'{}');
let budgetCurrentMonth=new Date().toISOString().slice(0,7); // YYYY-MM format

