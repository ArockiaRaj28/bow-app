/**
 * BOW v6.0 - Floating Action Button System
 * File: components/fab.js
 * 
 * Global floating action button with quick entry menu.
 * Handles FAB UI, animations, and action dispatching.
 */

const FAB = (() => {
  const ACTIONS = [
    { id: 'expense', icon: '💴', label: 'Add Expense', color: '#3b82f6' },
    { id: 'shift', icon: '📅', label: 'Add Shift', color: '#10b981' },
    { id: 'actual', icon: '⏱', label: 'Actual Time', color: '#f97316' },
    { id: 'template', icon: '🔁', label: 'New Template', color: '#8b5cf6' },
  ];

  let isExpanded = false;
  let fabContainer = null;
  let fabButton = null;
  let menuContainer = null;
  let overlay = null;

  /**
   * Initialize FAB system
   */
  function init() {
    createFABHTML();
    attachEventListeners();
    // Auto-initialize modal system
    if (typeof Modal !== 'undefined') {
      Modal.init();
    }
  }

  /**
   * Create FAB DOM structure
   */
  function createFABHTML() {
    fabContainer = document.getElementById('fab-container');
    if (!fabContainer) {
      fabContainer = document.createElement('div');
      fabContainer.id = 'fab-container';
      document.body.appendChild(fabContainer);
    }

    fabContainer.innerHTML = `
      <!-- FAB Overlay (click to close) -->
      <div id="fab-overlay" class="fab-overlay" style="display:none;"></div>

      <!-- FAB Menu (hidden by default) -->
      <div id="fab-menu" class="fab-menu" style="display:none;">
        ${ACTIONS.map((action, idx) => `
          <button 
            class="fab-action" 
            data-action="${action.id}"
            style="background-color:${action.color};animation-delay:${idx * 100}ms;"
            title="${action.label}"
          >
            <span class="fab-action-icon">${action.icon}</span>
            <span class="fab-action-label">${action.label}</span>
          </button>
        `).join('')}
      </div>

      <!-- Main FAB Button -->
      <button id="fab-main" class="fab-main" title="Quick Add">
        <span class="fab-icon">+</span>
      </button>
    `;

    fabButton = document.getElementById('fab-main');
    menuContainer = document.getElementById('fab-menu');
    overlay = document.getElementById('fab-overlay');
  }

  /**
   * Attach all event listeners
   */
  function attachEventListeners() {
    if (!fabButton) return;

    // Main FAB click
    fabButton.addEventListener('click', toggle);

    // Overlay click (close menu)
    if (overlay) {
      overlay.addEventListener('click', collapse);
    }

    // Action button clicks
    const actionButtons = document.querySelectorAll('.fab-action');
    actionButtons.forEach(btn => {
      btn.addEventListener('click', handleAction);
    });

    // Keyboard: ESC to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isExpanded) {
        collapse();
      }
    });
  }

  /**
   * Toggle FAB menu open/close
   */
  function toggle() {
    if (isExpanded) {
      collapse();
    } else {
      expand();
    }
  }

  /**
   * Expand FAB menu
   */
  function expand() {
    if (isExpanded) return;
    isExpanded = true;

    // Show overlay
    if (overlay) overlay.style.display = 'block';

    // Show menu
    if (menuContainer) menuContainer.style.display = 'flex';

    // Rotate FAB icon
    if (fabButton) fabButton.classList.add('fab-expanded');
  }

  /**
   * Collapse FAB menu
   */
  function collapse() {
    if (!isExpanded) return;
    isExpanded = false;

    // Hide overlay
    if (overlay) overlay.style.display = 'none';

    // Hide menu
    if (menuContainer) menuContainer.style.display = 'none';

    // Remove expanded state
    if (fabButton) fabButton.classList.remove('fab-expanded');
  }

  /**
   * Handle action button click
   */
  function handleAction(event) {
    const actionId = event.currentTarget.getAttribute('data-action');
    
    // Collapse menu
    collapse();

    // Dispatch action
    dispatchAction(actionId);
  }

  /**
   * Dispatch action based on ID
   */
  function dispatchAction(actionId) {
    const actions = {
      'expense': openExpenseModal,
      'shift': openShiftModal,
      'actual': openActualTimeModal,
      'template': openTemplateModal,
    };

    if (actions[actionId]) {
      actions[actionId]();
    }
  }

  /**
   * Open Expense entry modal
   */
  function openExpenseModal() {
    if (typeof ExpenseEntry !== 'undefined') {
      ExpenseEntry.open();
    } else {
      console.warn('ExpenseEntry not loaded');
    }
  }

  /**
   * Open Shift entry modal
   */
  function openShiftModal() {
    if (typeof ShiftEntry !== 'undefined') {
      ShiftEntry.open();
    } else {
      console.warn('ShiftEntry not loaded');
    }
  }

  /**
   * Open Actual time modal
   */
  function openActualTimeModal() {
    if (typeof ActualTime !== 'undefined') {
      ActualTime.open();
    } else {
      console.warn('ActualTime not loaded');
    }
  }

  /**
   * Open Template modal
   */
  function openTemplateModal() {
    if (typeof TemplateEntry !== 'undefined') {
      TemplateEntry.open();
    } else {
      console.warn('TemplateEntry not loaded');
    }
  }

  /**
   * Public API
   */
  return {
    init,
    toggle,
    expand,
    collapse,
  };
})();

// Auto-initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', FAB.init);
} else {
  FAB.init();
}
