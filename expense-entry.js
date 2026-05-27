/**
 * BOW v6.0 - Expense Entry Modal
 * File: pages/expense-entry.js
 * 
 * Quick expense entry form.
 * Separate from budget planning - for spending tracking.
 */

const ExpenseEntry = (() => {
  const DEFAULT_CATEGORIES = [
    { id: 1, name: 'Food', icon: '🍜', emoji: '🍜' },
    { id: 2, name: 'Transport', icon: '🚆', emoji: '🚆' },
    { id: 3, name: 'Shopping', icon: '🛍', emoji: '🛍' },
    { id: 4, name: 'Entertainment', icon: '🎮', emoji: '🎮' },
    { id: 5, name: 'Utilities', icon: '💡', emoji: '💡' },
    { id: 6, name: 'Health', icon: '⚕', emoji: '⚕' },
    { id: 7, name: 'Other', icon: '📌', emoji: '📌' },
  ];

  let selectedCategory = DEFAULT_CATEGORIES[0];
  let isSaving = false;

  /**
   * Open expense entry modal
   */
  function open() {
    const today = new Date();
    const dateStr = formatDate(today);
    const timeStr = formatTime(today);

    const content = `
      <div class="form-group">
        <label class="form-label">Date</label>
        <input 
          type="date" 
          class="form-input" 
          id="expenseDate"
          value="${dateStr}"
        >
      </div>

      <div class="form-group">
        <label class="form-label">Time</label>
        <input 
          type="time" 
          class="form-input" 
          id="expenseTime"
          value="${timeStr}"
        >
      </div>

      <div class="form-group">
        <label class="form-label">Category</label>
        <button 
          class="form-category-picker"
          id="categoryPickerBtn"
          data-category-id="${selectedCategory.id}"
        >
          <span class="category-icon">${selectedCategory.emoji}</span>
          <span class="category-name">${selectedCategory.name}</span>
          <span class="category-arrow">›</span>
        </button>
      </div>

      <div class="form-group">
        <label class="form-label">Amount (¥)</label>
        <input 
          type="number" 
          class="form-input form-amount"
          id="expenseAmount"
          placeholder="0"
          inputmode="decimal"
        >
      </div>

      <div class="form-group">
        <label class="form-label">Note (Optional)</label>
        <input 
          type="text" 
          class="form-input"
          id="expenseNote"
          placeholder="e.g., Lunch with friends"
        >
      </div>
    `;

    const buttons = [
      {
        label: 'Save',
        action: 'save',
        class: 'modal-btn-primary',
        onClick: handleSave,
      },
      {
        label: 'Save + Continue',
        action: 'save-continue',
        class: 'modal-btn-success',
        onClick: handleSaveContinue,
      },
    ];

    Modal.open({
      id: 'expense-entry',
      title: '💴 Add Expense',
      content,
      buttons,
      onClose: cleanup,
    });

    // Attach listeners
    attachListeners();
  }

  /**
   * Attach event listeners
   */
  function attachListeners() {
    const categoryBtn = document.getElementById('categoryPickerBtn');
    if (categoryBtn) {
      categoryBtn.addEventListener('click', openCategoryPicker);
    }

    // Focus amount field
    const amountInput = document.getElementById('expenseAmount');
    if (amountInput) {
      setTimeout(() => amountInput.focus(), 100);
    }
  }

  /**
   * Open category picker
   */
  function openCategoryPicker() {
    const pickerContent = `
      <div class="category-picker">
        ${DEFAULT_CATEGORIES.map(cat => `
          <button 
            class="category-item ${cat.id === selectedCategory.id ? 'active' : ''}"
            data-category-id="${cat.id}"
            data-category-name="${cat.name}"
            data-category-emoji="${cat.emoji}"
          >
            <span class="category-item-icon">${cat.emoji}</span>
            <span class="category-item-name">${cat.name}</span>
          </button>
        `).join('')}
      </div>
    `;

    Modal.updateContent(pickerContent);

    // Attach category selection
    const categoryItems = document.querySelectorAll('.category-item');
    categoryItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const id = parseInt(item.getAttribute('data-category-id'));
        const name = item.getAttribute('data-category-name');
        const emoji = item.getAttribute('data-category-emoji');

        // Update selected
        selectedCategory = {
          id,
          name,
          emoji,
          icon: emoji,
        };

        // Re-render form
        open();
      });
    });
  }

  /**
   * Handle save
   */
  function handleSave() {
    if (saveExpense()) {
      Modal.close();
    }
  }

  /**
   * Handle save and continue
   */
  function handleSaveContinue() {
    if (saveExpense()) {
      // Re-open with fresh form
      selectedCategory = DEFAULT_CATEGORIES[0];
      open();
    }
  }

  /**
   * Save expense to app data
   */
  function saveExpense() {
    if (isSaving) return false;

    const date = document.getElementById('expenseDate').value;
    const time = document.getElementById('expenseTime').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const note = document.getElementById('expenseNote').value;

    // Validation
    if (!date || !time) {
      alert('Please enter date and time');
      return false;
    }

    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return false;
    }

    isSaving = true;

    // Create expense object
    const expense = {
      id: generateId(),
      date,
      time,
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      categoryEmoji: selectedCategory.emoji,
      amount,
      note,
      timestamp: new Date().toISOString(),
    };

    // Save to app data structure
    // This should integrate with the existing budgets/expenses storage
    saveToStorage(expense);

    isSaving = false;
    return true;
  }

  /**
   * Save to app storage
   */
  function saveToStorage(expense) {
    // Get current budget month from main app
    const monthKey = getCurrentMonthKey();
    
    // Ensure budget exists
    if (!window.budgets) {
      window.budgets = {};
    }

    if (!window.budgets[monthKey]) {
      window.budgets[monthKey] = {
        expenses: [],
        categories: [],
      };
    }

    // Add expense to budget
    if (!window.budgets[monthKey].expenses) {
      window.budgets[monthKey].expenses = [];
    }

    window.budgets[monthKey].expenses.push({
      categoryId: expense.categoryId,
      amount: expense.amount,
      date: expense.date,
      note: expense.note,
    });

    // Save to localStorage
    if (window.saveBudgets) {
      window.saveBudgets();
    }

    // Notify app
    if (window.renderBudget) {
      window.renderBudget();
    }

    if (window.renderTransactions) {
      window.renderTransactions();
    }
  }

  /**
   * Get current month key (YYYY-MM format)
   */
  function getCurrentMonthKey() {
    if (window.budgetCurrentMonth) {
      return window.budgetCurrentMonth;
    }
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Cleanup
   */
  function cleanup() {
    selectedCategory = DEFAULT_CATEGORIES[0];
    isSaving = false;
  }

  /**
   * Helpers
   */
  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatTime(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  function generateId() {
    return 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Public API
   */
  return {
    open,
  };
})();
