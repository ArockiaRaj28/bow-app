function ensureBudgetMonth(monthKey){
  if(!budgets[monthKey]){
    budgets[monthKey]={
      categories:[
        {id:1,name:'Rent',icon:'🏠',budget:65000,priority:1},
        {id:2,name:'Food',icon:'🍜',budget:20000,priority:2},
        {id:3,name:'Transport',icon:'🚆',budget:8000,priority:3},
        {id:4,name:'School',icon:'📚',budget:15000,priority:4},
        {id:5,name:'Entertainment',icon:'🎮',budget:10000,priority:5}
      ],
      expenses:[],
      monthlyExpenses:0,
      savings:{goal:0,amount:0},
      notes:''
    };
    saveBudgets();
  }else{
    // v5.1.4: FIX for May issue - If month exists but categories have ¥0 budget,
    // update them to defaults (handles migration from old data)
    const budget=budgets[monthKey];
    const defaultCats=[
      {id:1,name:'Rent',icon:'🏠',budget:65000,priority:1},
      {id:2,name:'Food',icon:'🍜',budget:20000,priority:2},
      {id:3,name:'Transport',icon:'🚆',budget:8000,priority:3},
      {id:4,name:'School',icon:'📚',budget:15000,priority:4},
      {id:5,name:'Entertainment',icon:'🎮',budget:10000,priority:5}
    ];
    
    // Check if categories need defaults (all have budget: 0)
    const needsDefaults=budget.categories.every(c=>c.budget===0);
    if(needsDefaults){
      budget.categories=defaultCats;
      saveBudgets();
    }
  }
}

function getMonthEarnings(monthKey){
  // v5.1.1 HOTFIX: Use exact same calculation as Summary tab
  // This ensures DETERMINISTIC results (same month = same earnings always)
  const[year,month]=monthKey.split('-');
  let totalEarnings=0;
  const y=parseInt(year),m=parseInt(month);
  
  // Get days in month
  const daysInMonth=new Date(y,m,0).getDate();
  
  // Iterate through each day in the month
  for(let day=1;day<=daysInMonth;day++){
    const dk=String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0')+'-'+String(day).padStart(2,'0');
    
    // For each job, calculate earnings same way Summary does
    jobs.forEach(j=>{
      const dayHours=getJobHours(dk,j.id);      // Get stored day hours from localStorage
      const nightHours=getNightHours(dk,j.id);  // Get stored night hours from localStorage
      
      // Calculate day hours (total - night)
      const regularHours=dayHours-nightHours;
      
      // Earnings = (regular hours * rate) + (night hours * night rate)
      const dayEarned=regularHours*j.rate+nightHours*(j.nightRate||Math.round(j.rate*1.25));
      totalEarnings+=dayEarned;
    });
  }
  
  return totalEarnings;
}

function saveBudgets(){
  localStorage.setItem('wh_budgets',JSON.stringify(budgets));
}

function budgetPrevMonth(){
  const[y,m]=budgetCurrentMonth.split('-');
  let year=parseInt(y);
  let month=parseInt(m);
  
  month--; // Go to previous month
  if(month<1){
    month=12;
    year--;
  }
  
  // Boundary check: Don't go before April 2026
  if(year<2026||(year===2026&&month<4)){
    year=2026;
    month=4;
  }
  
  budgetCurrentMonth=String(year)+'-'+String(month).padStart(2,'0');
  ensureBudgetMonth(budgetCurrentMonth);
  renderBudget();
}

function budgetNextMonth(){
  const[y,m]=budgetCurrentMonth.split('-');
  let year=parseInt(y);
  let month=parseInt(m);
  
  month++; // Go to next month
  if(month>12){
    month=1;
    year++;
  }
  
  // Boundary check: Don't go after September 2027
  if(year>2027||(year===2027&&month>9)){
    year=2027;
    month=9;
  }
  
  budgetCurrentMonth=String(year)+'-'+String(month).padStart(2,'0');
  ensureBudgetMonth(budgetCurrentMonth);
  renderBudget();
}

function renderBudget(){
  ensureBudgetMonth(budgetCurrentMonth);
  const budget=budgets[budgetCurrentMonth];
  const monthNames=['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const[y,m]=budgetCurrentMonth.split('-');
  document.getElementById('budgetMonthLabel').textContent=`${monthNames[parseInt(m)]} ${y}`;
  
  const earned=getMonthEarnings(budgetCurrentMonth);
  const spent=budget.expenses.reduce((a,b)=>a+b.amount,0);
  const remaining=earned-spent;
  
  document.getElementById('budgetEarned').textContent=`¥${earned.toLocaleString('ja-JP',{maximumFractionDigits:0})}`;
  document.getElementById('budgetExpenses').textContent=`¥${spent.toLocaleString('ja-JP',{maximumFractionDigits:0})}`;
  document.getElementById('budgetRemaining').textContent=`¥${remaining.toLocaleString('ja-JP',{maximumFractionDigits:0})}`;
  
  // Allocate funds by priority
  let remaining_=earned;
  budget.categories.sort((a,b)=>a.priority-b.priority);
  budget.categories.forEach(cat=>{
    if(remaining_>=cat.budget){
      cat.allocated=cat.budget;
      remaining_-=cat.budget;
    }else{
      cat.allocated=remaining_;
      remaining_=0;
    }
  });
  
  // Render categories
  const container=document.getElementById('budgetCategoriesContainer');
  container.innerHTML='';
  budget.categories.forEach((cat,idx)=>{
    const catSpent=budget.expenses.filter(e=>e.categoryId===cat.id).reduce((a,b)=>a+b.amount,0);
    
    // v5.1.5: Show spending percentage vs budget (not allocation)
    const spentPercentage=cat.budget>0?(catSpent/cat.budget)*100:0;
    const displayPercentage=spentPercentage>999?'999+':Math.round(spentPercentage);
    const remaining=cat.budget-catSpent;
    
    // Color coding: Blue < 70%, Yellow 70-100%, Red > 100%
    let barColor='#3b82f6'; // blue for safe
    let statusLabel='Safe';
    if(spentPercentage>100){
      barColor='#ef4444'; // red
      statusLabel='Exceeded';
    }else if(spentPercentage>70){
      barColor='#f59e0b'; // yellow/orange
      statusLabel='Caution';
    }
    
    const el=document.createElement('div');
    el.className='budget-category';
    el.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:12px;flex:1;">
          <div style="font-size:28px;">${cat.icon}</div>
          <div style="flex:1;">
            <div style="font-family:var(--display);font-weight:700;color:var(--text);font-size:13px;">${cat.name}</div>
            <div style="font-size:10px;color:var(--muted);margin-top:2px;">¥${cat.budget.toLocaleString('ja-JP',{maximumFractionDigits:0})}</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <div style="text-align:right;">
            <div style="font-size:13px;font-weight:700;color:var(--text);">${displayPercentage}%</div>
            <div style="font-size:8px;color:${barColor};font-weight:600;">${statusLabel}</div>
          </div>
          <div style="display:flex;gap:4px;">
            ${idx>0?`<button onclick="moveBudgetCategoryUp('${budgetCurrentMonth}',${cat.id})" style="padding:4px 6px;background:rgba(59,130,246,0.2);border:1px solid rgba(59,130,246,0.4);color:var(--accent);border-radius:4px;cursor:pointer;font-size:10px;">⬆</button>`:''}
            ${idx<budget.categories.length-1?`<button onclick="moveBudgetCategoryDown('${budgetCurrentMonth}',${cat.id})" style="padding:4px 6px;background:rgba(59,130,246,0.2);border:1px solid rgba(59,130,246,0.4);color:var(--accent);border-radius:4px;cursor:pointer;font-size:10px;">⬇</button>`:''}
            <button onclick="editBudgetAmount('${budgetCurrentMonth}',${cat.id},${cat.budget})" style="padding:4px 6px;background:rgba(59,130,246,0.2);border:1px solid rgba(59,130,246,0.4);color:var(--accent);border-radius:4px;cursor:pointer;font-size:10px;">✏️</button>
            <button onclick="deleteBudgetCategory('${budgetCurrentMonth}',${cat.id})" style="padding:4px 6px;background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.4);color:#ef4444;border-radius:4px;cursor:pointer;font-size:10px;">🗑️</button>
          </div>
        </div>
      </div>
      
      <div style="height:16px;background:rgba(255,255,255,0.05);border-radius:8px;overflow:hidden;margin-bottom:10px;border:1px solid rgba(255,255,255,0.1);">
        <div style="height:100%;background:${barColor};border-radius:8px;width:${Math.min(spentPercentage,100)}%;transition:all 0.3s;"></div>
      </div>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:10px;">
        <div>
          <div style="color:var(--muted);margin-bottom:3px;font-weight:600;">Spent</div>
          <div style="color:var(--text);font-weight:700;font-size:11px;">¥${catSpent.toLocaleString('ja-JP',{maximumFractionDigits:0})}</div>
        </div>
        <div>
          <div style="color:var(--muted);margin-bottom:3px;font-weight:600;">Remaining</div>
          <div style="color:${remaining<0?'#ef4444':'#22c55e'};font-weight:700;font-size:11px;">¥${Math.max(0,remaining).toLocaleString('ja-JP',{maximumFractionDigits:0})}</div>
        </div>
      </div>
    `;
    container.appendChild(el);
  });
  
  // Render goals section (v5.2)
  ensureBudgetGoals(budgetCurrentMonth);
  const savings=Math.max(0,earned-spent);
  document.getElementById('totalSavings').textContent=`¥${savings.toLocaleString('ja-JP',{maximumFractionDigits:0})}`;
  
  const monthlyExp=budget.monthlyExpenses||0;
  if(document.getElementById('monthlyExpensesDisplay')){document.getElementById('monthlyExpensesDisplay').textContent=`¥${monthlyExp.toLocaleString('ja-JP',{maximumFractionDigits:0})}`;}
  
  const goalsContainer=document.getElementById('budgetGoalsContainer');
  goalsContainer.innerHTML='';
  
  if(budget.goals.length===0){
    goalsContainer.innerHTML='<div style="color:var(--muted);font-size:9px;text-align:center;padding:10px;">No goals yet. Click "+ Goal" to add one.</div>';
  }else{
    budget.goals.forEach(goal=>{
      const allocated=budget.goalAllocations[goal.id]||0;
      const cumulativeAmount=goal.cumulativeAmount||0;
      const daysLeft=Math.ceil((new Date(goal.deadline)-new Date())/86400000);
      
      // v5.4: Status based on cumulative progress and deadline
      let status='Active';
      let statusColor='#22c55e';
      if(goal.status==='completed'||cumulativeAmount>=goal.target){
        status='Completed';
        statusColor='#22c55e';
      }else if(goal.status==='archived'||daysLeft<0){
        status='Archived';
        statusColor='#666';
      }else if(daysLeft<=30&&daysLeft>0){
        status='Urgent';
        statusColor='#f59e0b';
      }else{
        status='On Track';
        statusColor='#22c55e';
      }
      
      const cumulativePercent=Math.round((cumulativeAmount/goal.target)*100);
      
      const goalEl=document.createElement('div');
      goalEl.style.cssText='background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:8px;margin-bottom:8px;';
      goalEl.innerHTML=`
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
          <div style="flex:1;">
            <div style="font-weight:700;color:var(--text);font-size:11px;">${goal.name}</div>
            <div style="font-size:8px;color:var(--muted);margin-top:2px;">Target: ¥${goal.target.toLocaleString('ja-JP',{maximumFractionDigits:0})} | Deadline: ${goal.deadline} (${daysLeft} days)</div>
          </div>
          <div style="display:flex;gap:4px;">
            <button onclick="updateGoalPercentage('${budgetCurrentMonth}',${goal.id})" style="padding:3px 6px;background:rgba(59,130,246,0.2);border:1px solid rgba(59,130,246,0.4);color:var(--accent);border-radius:4px;cursor:pointer;font-size:8px;">⚙️</button>
            <button onclick="deleteBudgetGoal('${budgetCurrentMonth}',${goal.id})" style="padding:3px 6px;background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.4);color:#ef4444;border-radius:4px;cursor:pointer;font-size:8px;">🗑️</button>
          </div>
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:8px;margin-bottom:6px;">
          <div><div style="color:var(--muted);">This Month</div><div style="font-weight:700;color:var(--accent);">${goal.percentage}% → ¥${allocated.toLocaleString('ja-JP',{maximumFractionDigits:0})}</div></div>
          <div><div style="color:var(--muted);">Status</div><div style="font-weight:700;color:${statusColor};">${status}</div></div>
        </div>
        
        <div style="font-size:8px;color:var(--muted);margin-bottom:6px;">Cumulative: ¥${cumulativeAmount.toLocaleString('ja-JP',{maximumFractionDigits:0})} / ¥${goal.target.toLocaleString('ja-JP',{maximumFractionDigits:0})} (${cumulativePercent}%)</div>
        
        <div style="height:8px;background:rgba(255,255,255,0.05);border-radius:4px;overflow:hidden;">
          <div style="height:100%;background:${statusColor};width:${Math.min(cumulativePercent,100)}%;transition:all 0.3s;"></div>
        </div>
      `;
      goalsContainer.appendChild(goalEl);
    });
  }
  
  // Update expense category dropdown
  const select=document.getElementById('expenseCategorySelect');
  select.innerHTML='<option value="">Select category...</option>';
  budget.categories.forEach(cat=>{
    const opt=document.createElement('option');
    opt.value=cat.id;
    opt.textContent=`${cat.icon} ${cat.name}`;
    select.appendChild(opt);
  });
  
  // Set today's date as default
  const dateInput=document.getElementById('expenseDateInput');
  if(dateInput){
    const today=new Date().toISOString().slice(0,10);
    if(!dateInput.value)dateInput.value=today;
  }
  
  // Render expenses list
  const expensesContainer=document.getElementById('expensesListContainer');
  if(expensesContainer){
    if(budget.expenses.length===0){
      expensesContainer.innerHTML='<div style="color:var(--muted);font-size:9px;text-align:center;padding:10px;">No expenses logged yet</div>';
    }else{
      let html='<div style="font-size:9px;">';
      budget.expenses.forEach((exp,idx)=>{
        const cat=budget.categories.find(c=>c.id===exp.categoryId);
        const catName=cat?`${cat.icon} ${cat.name}`:'Unknown';
        html+=`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px;border-bottom:1px solid rgba(255,255,255,0.1);">
          <div style="flex:1;"><span style="color:var(--muted);">${exp.date}</span> ${catName}</div>
          <div style="color:var(--text);font-weight:700;">¥${exp.amount.toLocaleString('ja-JP')}</div>
          <button onclick="deleteBudgetExpense(budgetCurrentMonth,${idx})" style="padding:2px 6px;background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.4);color:#ef4444;border-radius:3px;cursor:pointer;font-size:8px;">🗑️</button>
        </div>`;
      });
      html+='</div>';
      expensesContainer.innerHTML=html;
    }
  }
  
  // v5.4: Update transactions tab
  if(window.Transactions) window.Transactions.render();
}

function addBudgetCategory(){
  const name=prompt('Category name (with emoji):');
  if(!name)return;
  const budget=budgets[budgetCurrentMonth];
  const maxId=Math.max(...budget.categories.map(c=>c.id),0);
  budget.categories.push({
    id:maxId+1,
    name:name,
    icon:'📁',
    budget:parseInt(prompt('Budget amount (¥):')||0),
    priority:budget.categories.length+1
  });
  saveBudgets();
  renderBudget();
}

function moveBudgetCategoryUp(monthKey,catId){
  const budget=budgets[monthKey];
  const idx=budget.categories.findIndex(c=>c.id===catId);
  if(idx<=0)return;
  const tmp=budget.categories[idx].priority;
  budget.categories[idx].priority=budget.categories[idx-1].priority;
  budget.categories[idx-1].priority=tmp;
  budget.categories.sort((a,b)=>a.priority-b.priority);
  saveBudgets();
  renderBudget();
}

function moveBudgetCategoryDown(monthKey,catId){
  const budget=budgets[monthKey];
  const idx=budget.categories.findIndex(c=>c.id===catId);
  if(idx>=budget.categories.length-1)return;
  const tmp=budget.categories[idx].priority;
  budget.categories[idx].priority=budget.categories[idx+1].priority;
  budget.categories[idx+1].priority=tmp;
  budget.categories.sort((a,b)=>a.priority-b.priority);
  saveBudgets();
  renderBudget();
}

function editMonthlyExpenses(monthKey){
  const budget=budgets[monthKey];
  const current=budget.monthlyExpenses||0;
  const input=prompt('Enter total monthly expenses (¥):',current.toString());
  if(input===null)return;
  const num=parseFloat(input);
  if(isNaN(num)||num<0){alert('Please enter a valid amount');return;}
  budget.monthlyExpenses=Math.round(num);
  saveBudgets();
  renderBudget();
}

function saveBudgetExpense(){
  const catId=parseInt(document.getElementById('expenseCategorySelect').value);
  const amount=parseFloat(document.getElementById('expenseAmountInput').value||0);
  const dateInput=document.getElementById('expenseDateInput').value;
  if(!catId||amount<=0){alert('Select category and enter amount');return;}
  
  const budget=budgets[budgetCurrentMonth];
  budget.expenses.push({
    categoryId:catId,
    amount:amount,
    date:dateInput||new Date().toISOString().slice(0,10),
    note:''
  });
  saveBudgets();
  document.getElementById('expenseAmountInput').value='';
  document.getElementById('expenseCategorySelect').value='';
  document.getElementById('expenseDateInput').value='';
  renderBudget();
  if(window.Transactions) window.Transactions.render(); // v5.4: Update transactions tab
}

function deleteBudgetExpense(monthKey,expenseIdx){
  if(!confirm('Delete this expense?'))return;
  const budget=budgets[monthKey];
  budget.expenses.splice(expenseIdx,1);
  saveBudgets();
  renderBudget();
}

function editBudgetAmount(monthKey,catId,currentAmount){
  const newAmount=prompt(`Edit budget amount (Current: ¥${currentAmount.toLocaleString('ja-JP',{maximumFractionDigits:0})}):`);
  if(!newAmount||isNaN(newAmount))return;
  
  const budget=budgets[monthKey];
  const cat=budget.categories.find(c=>c.id===catId);
  if(cat){
    cat.budget=parseInt(newAmount);
    saveBudgets();
    renderBudget();
  }
}

function deleteBudgetCategory(monthKey,catId){
  if(!confirm('Delete this category? (Expenses will be kept)'))return;
  
  const budget=budgets[monthKey];
  budget.categories=budget.categories.filter(c=>c.id!==catId);
  saveBudgets();
  renderBudget();
}

function ensureBudgetGoals(monthKey){
  const budget=budgets[monthKey];
  if(!budget.goals){budget.goals=[];}
  if(!budget.goalAllocations){budget.goalAllocations={};}
  
  // v5.4: Ensure all goals have new fields
  budget.goals.forEach(goal=>{
    if(!goal.monthlyProgress)goal.monthlyProgress={};
    if(goal.cumulativeAmount===undefined)goal.cumulativeAmount=0;
    if(!goal.createdMonth)goal.createdMonth=monthKey;
    if(!goal.status)goal.status='active';
  });
  
  // v5.4: Carry forward goals from previous month if any exist
  const carryForwardGoals=(monthKey)=>{
    const [year,month]=monthKey.split('-');
    const y=parseInt(year);
    const m=parseInt(month);
    
    // Get previous month
    let prevMonth=m-1, prevYear=y;
    if(prevMonth<1){prevMonth=12;prevYear--;}
    const prevMonthKey=`${prevYear}-${String(prevMonth).padStart(2,'0')}`;
    
    if(budgets[prevMonthKey]&&budgets[prevMonthKey].goals){
      budgets[prevMonthKey].goals.forEach(prevGoal=>{
        // Check if goal already exists in current month
        const exists=budget.goals.find(g=>g.id===prevGoal.id);
        if(!exists){
          // Copy goal to current month (carry forward)
          const newGoal={...prevGoal};
          if(!newGoal.monthlyProgress)newGoal.monthlyProgress={};
          if(!newGoal.cumulativeAmount)newGoal.cumulativeAmount=0;
          if(!newGoal.status)newGoal.status='active';
          budget.goals.push(newGoal);
        }
      });
    }
  };
  
  // Only carry forward if this is a future month being accessed
  carryForwardGoals(monthKey);
  saveBudgets();
}


function recalculateBudget(monthKey){
  const budget=budgets[monthKey];
  ensureBudgetGoals(monthKey);
  
  // Step 1: Calculate earned and expenses
  const earned=getMonthEarnings(monthKey);
  const expenses=budget.expenses.reduce((a,b)=>a+b.amount,0);
  const savings=Math.max(0,earned-expenses);
  
  // Step 2: Store savings amount
  budget.savings={goal:budget.savings?.goal||0,amount:savings};
  
  // Step 3: Allocate savings to goals by percentage (v5.4: Carry-forward)
  if(budget.goals.length>0&&savings>0){
    budget.goalAllocations={};
    budget.goals.forEach(goal=>{
      const percentage=goal.percentage||0;
      const allocated=Math.round(savings*(percentage/100));
      budget.goalAllocations[goal.id]=allocated;
      
      // v5.4: Track monthly progress
      if(!goal.monthlyProgress)goal.monthlyProgress={};
      goal.monthlyProgress[monthKey]=allocated;
      
      // v5.4: Calculate cumulative from all months
      goal.cumulativeAmount=Object.values(goal.monthlyProgress).reduce((a,b)=>a+b,0);
      
      // v5.4: Update status based on deadline and progress
      const daysLeft=Math.ceil((new Date(goal.deadline)-new Date())/86400000);
      if(daysLeft<0)goal.status='archived';
      else if(goal.cumulativeAmount>=goal.target)goal.status='completed';
      else if(daysLeft<=30&&daysLeft>0)goal.status='urgent';
      else goal.status='active';
    });
  }
  
  saveBudgets();
  renderBudget();
}

function addBudgetGoal(monthKey){
  const name=prompt('Goal name (e.g., School Fees):');
  if(!name)return;
  
  const deadline=prompt('Deadline (YYYY-MM-DD format):');
  if(!deadline)return;
  
  const target=parseFloat(prompt('Target amount (¥):'));
  if(!target||target<=0)return;
  
  const budget=budgets[monthKey];
  ensureBudgetGoals(monthKey);
  
  const goalId=Math.max(0,...budget.goals.map(g=>g.id||0))+1;
  budget.goals.push({
    id:goalId,
    name:name,
    deadline:deadline,
    target:target,
    percentage:0,
    priority:budget.goals.length+1,
    createdMonth:monthKey,
    monthlyProgress:{},
    cumulativeAmount:0,
    status:'active'
  });
  
  saveBudgets();
  renderBudget();
}

function updateGoalPercentage(monthKey,goalId){
  const budget=budgets[monthKey];
  const goal=budget.goals.find(g=>g.id===goalId);
  
  if(!goal)return;
  
  const newPercentage=parseFloat(prompt('Allocation percentage (0-100):',goal.percentage||0));
  if(isNaN(newPercentage)||newPercentage<0||newPercentage>100){
    alert('Enter a valid percentage (0-100)');
    return;
  }
  
  // Ensure total percentages don't exceed 100%
  const otherPercentage=budget.goals
    .filter(g=>g.id!==goalId)
    .reduce((a,b)=>a+(b.percentage||0),0);
  
  if(otherPercentage+newPercentage>100){
    alert(`Total cannot exceed 100%. Other goals: ${otherPercentage}%`);
    return;
  }
  
  goal.percentage=newPercentage;
  saveBudgets();
  recalculateBudget(monthKey);
}

function deleteBudgetGoal(monthKey,goalId){
  if(!confirm('Delete this goal?'))return;
  
  const budget=budgets[monthKey];
  budget.goals=budget.goals.filter(g=>g.id!==goalId);
  delete budget.goalAllocations[goalId];
  
  saveBudgets();
  renderBudget();
}

function openBudgetMonthPicker(){
  alert('Month picker - tap arrows to navigate');
}

// ════════════════════════════════════════════
populateJobSelects();
ensureBudgetMonth(budgetCurrentMonth);
renderBudget();
document.getElementById('perMinuteToggle').checked=perMinutePay;
const actualTimesSection=document.getElementById('actualTimesSection');
if(actualTimesSection)actualTimesSection.style.display=perMinutePay?'block':'none';
// Event listeners for template form (wrapped in null checks)
const tmplStart=document.getElementById('tmplStart');
if(tmplStart)tmplStart.addEventListener('input',updateShiftCalc);
const tmplEnd=document.getElementById('tmplEnd');
if(tmplEnd)tmplEnd.addEventListener('input',updateShiftCalc);
const asfActualLogin=document.getElementById('asfActualLogin');
if(asfActualLogin)asfActualLogin.addEventListener('input',updateButtonVisibility);
const asfActualLogout=document.getElementById('asfActualLogout');
if(asfActualLogout)asfActualLogout.addEventListener('input',updateButtonVisibility);
updateButtonVisibility();

// ════════════════════════════════════════════
// BOTTOM TAB FUNCTIONS (v5.4)
// ════════════════════════════════════════════

window.Budget = { prevMonth: budgetPrevMonth, nextMonth: budgetNextMonth };
