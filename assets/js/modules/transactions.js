function switchBottomTab(tabName,button){
  // Hide all bottom tab contents with null checks
  const tabs=['bottomTabTransactions','bottomTabStats','bottomTabAccounts','bottomTabMore'];
  tabs.forEach(tabId=>{
    const el=document.getElementById(tabId);
    if(el)el.style.display='none';
  });
  
  // Hide all TOP tabs when bottom tab is selected
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  
  // Remove active styling from all buttons
  document.querySelectorAll('.bottom-tab').forEach(btn=>{
    btn.style.color='var(--muted)';
    btn.style.borderBottom='none';
  });
  
  // Show selected bottom tab and style button
  const tabMap={
    'transactions':'bottomTabTransactions',
    'stats':'bottomTabStats',
    'accounts':'bottomTabAccounts',
    'more':'bottomTabMore'
  };
    
  if(tabMap[tabName]){
    const el=document.getElementById(tabMap[tabName]);
    if(el)el.style.display='block';
  }
  
  button.style.color='#ef4444';
  button.style.borderBottom='2px solid #ef4444';
  
  // Render transactions if switching to that tab
  if(tabName==='transactions'){
    renderTransactions();
  }
}

function renderTransactions(){
  const container=document.getElementById('transactionsListContainer');
  if(!container)return; // Exit if container doesn't exist
  
  const budget=budgets[budgetCurrentMonth];
  if(!budget){
    container.innerHTML='<div style="text-align:center;color:var(--muted);padding:40px 12px;font-size:11px;">No budget data</div>';
    return;
  }
  
  // Ensure expenses array exists
  if(!budget.expenses){
    budget.expenses=[];
  }
  
  if(budget.expenses.length===0){
    container.innerHTML='<div style="text-align:center;color:var(--muted);padding:40px 12px;font-size:11px;">No transactions yet</div>';
    return;
  }
  
  // Group expenses by date (descending)
  const expensesByDate={};
  budget.expenses.forEach((exp,idx)=>{
    const date=exp.date||new Date().toISOString().slice(0,10);
    if(!expensesByDate[date]){
      expensesByDate[date]=[];
    }
    expensesByDate[date].push({...exp,index:idx});
  });
  
  // Sort dates descending
  const sortedDates=Object.keys(expensesByDate).sort().reverse();
  
  let html='';
  sortedDates.forEach(date=>{
    const dateObj=new Date(date+'T00:00:00');
    const dayName=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dateObj.getDay()];
    const dayNum=dateObj.getDate();
    
    html+=`<div style="margin-bottom:16px;">`;
    html+=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding-left:8px;">`;
    html+=`<div style="font-family:var(--display);font-size:16px;font-weight:700;color:var(--text);">${dayNum}</div>`;
    html+=`<div style="background:var(--muted);color:white;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;width:35px;text-align:center;">${dayName}</div>`;
    html+=`<div style="font-size:9px;color:var(--muted);">${date}</div>`;
    html+=`</div>`;
    
    expensesByDate[date].forEach(exp=>{
      const cat=budget.categories.find(c=>c.id===exp.categoryId);
      const catName=cat?`${cat.icon} ${cat.name}`:'Unknown';
      
      html+=`<div style="display:flex;align-items:center;gap:10px;padding:10px 8px;border-bottom:1px solid rgba(255,255,255,0.05);">`;
      html+=`<div style="flex:1;">`;
      html+=`<div style="font-size:11px;font-weight:700;color:var(--text);">${catName}</div>`;
      if(exp.note){
        html+=`<div style="font-size:9px;color:var(--muted);">${exp.note}</div>`;
      }
      html+=`</div>`;
      html+=`<div style="text-align:right;">`;
      html+=`<div style="font-family:var(--display);font-size:13px;font-weight:700;color:#ef4444;">¥${exp.amount.toLocaleString('ja-JP')}</div>`;
      html+=`<button onclick="deleteExpenseFromTransaction(budgetCurrentMonth,${exp.index})" style="font-size:8px;background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.4);color:#ef4444;padding:2px 4px;border-radius:3px;cursor:pointer;margin-top:2px;">Delete</button>`;
      html+=`</div>`;
      html+=`</div>`;
    });
    
    html+=`</div>`;
  });
  
  container.innerHTML=html;
}

function deleteExpenseFromTransaction(monthKey,expenseIdx){
  if(!confirm('Delete this transaction?'))return;
  const budget=budgets[monthKey];
  budget.expenses.splice(expenseIdx,1);
  saveBudgets();
  renderTransactions();
  renderBudget(); // Update summary
}


const calendarTab=document.getElementById('tab-calendar');
const shiftsTab=document.getElementById('tab-timeline');
const budgetTab=document.getElementById('tab-budget');
if(calendarTab)setupSwipeGestures(calendarTab,nextMonth,prevMonth);
if(shiftsTab)setupSwipeGestures(shiftsTab,nextDay,prevDay);
if(budgetTab)setupSwipeGestures(budgetTab, function(){ if(window.Budget) window.Budget.nextMonth(); }, function(){ if(window.Budget) window.Budget.prevMonth(); });

// renderTransactions will be called when Trans tab is clicked
render();
window.Transactions = { render: renderTransactions };