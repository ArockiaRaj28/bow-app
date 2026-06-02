/**
 * BOW v6.0 - Reusable Modal System
 * File: components/modal.js
 * 
 * Generic modal management for all quick entry forms.
 * Handles creation, animation, and cleanup.
 */

const Modal = (() => {
  let modalContainer = null;
  let currentModal = null;
  let onCloseCallback = null;

  /**
   * Initialize modal system
   */
  function init() {
    modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'modal-container';
      document.body.appendChild(modalContainer);
    }
  }

  /**
   * Open a modal
   * 
   * @param {Object} config - Modal configuration
   * @param {string} config.id - Unique modal ID
   * @param {string} config.title - Modal title
   * @param {string} config.content - HTML content (form)
   * @param {Array} config.buttons - Action buttons [{label, class, onClick}]
   * @param {Function} config.onClose - Callback on close
   */
  function open(config) {
    if (!config || !config.id) {
      console.error('Modal config required with id');
      return;
    }

    // Close any existing modal
    if (currentModal) {
      close();
    }

    // Store close callback
    onCloseCallback = config.onClose;

    // Create modal HTML
    const modalHTML = createModalHTML(config);
    
    // Insert into DOM
    modalContainer.innerHTML = modalHTML;

    // Trigger animation
    const overlay = modalContainer.querySelector('.modal-overlay');
    const modalBox = modalContainer.querySelector('.modal-box');
    
    if (overlay && modalBox) {
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        overlay.classList.add('modal-show');
        modalBox.classList.add('modal-show');
      });
    }

    // Attach event listeners
    attachModalListeners(config);

    // Store reference
    currentModal = config.id;
  }

  /**
   * Create modal HTML structure
   */
  function createModalHTML(config) {
    const buttons = config.buttons || [];
    const buttonsHTML = buttons.map(btn => `
      <button 
        class="modal-btn ${btn.class || 'modal-btn-primary'}"
        data-action="${btn.action || 'default'}"
      >
        ${btn.label || 'OK'}
      </button>
    `).join('');

    return `
      <div class="modal-overlay"></div>
      <div class="modal-box" id="modal-${config.id}">
        <div class="modal-header">
          <h2 class="modal-title">${config.title || 'Quick Add'}</h2>
          <button class="modal-close" aria-label="Close">×</button>
        </div>
        <div class="modal-content">
          ${config.content || ''}
        </div>
        <div class="modal-footer">
          ${buttonsHTML}
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners to modal
   */
  function attachModalListeners(config) {
    const closeBtn = modalContainer.querySelector('.modal-close');
    const overlay = modalContainer.querySelector('.modal-overlay');
    const buttons = modalContainer.querySelectorAll('.modal-btn');

    // Close button
    if (closeBtn) {
      closeBtn.addEventListener('click', close);
    }

    // Overlay click (close)
    if (overlay) {
      overlay.addEventListener('click', close);
    }

    // Action buttons
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = btn.getAttribute('data-action');
        if (config.buttons) {
          const btnConfig = config.buttons.find(b => b.action === action);
          if (btnConfig && btnConfig.onClick) {
            btnConfig.onClick(e);
          }
        }
      });
    });

    // Keyboard ESC to close
    document.addEventListener('keydown', handleEscape);
  }

  /**
   * Handle ESC key press
   */
  function handleEscape(e) {
    if (e.key === 'Escape' && currentModal) {
      close();
    }
  }

  /**
   * Close current modal
   */
  function close() {
    if (!currentModal) return;

    const overlay = modalContainer.querySelector('.modal-overlay');
    const modalBox = modalContainer.querySelector('.modal-box');

    // Remove show classes
    if (overlay) overlay.classList.remove('modal-show');
    if (modalBox) modalBox.classList.remove('modal-show');

    // Wait for animation then remove from DOM
    setTimeout(() => {
      modalContainer.innerHTML = '';
      currentModal = null;

      // Remove ESC listener
      document.removeEventListener('keydown', handleEscape);

      // Call close callback
      if (onCloseCallback) {
        onCloseCallback();
      }
    }, 200);
  }

  /**
   * Update modal content dynamically
   */
  function updateContent(newContent) {
    const contentDiv = modalContainer.querySelector('.modal-content');
    if (contentDiv) {
      contentDiv.innerHTML = newContent;
    }
  }

  /**
   * Get current modal ID
   */
  function getCurrentModalId() {
    return currentModal;
  }

  /**
   * Public API
   */
  return {
    init,
    open,
    close,
    updateContent,
    getCurrentModalId,
  };
})();

// Auto-initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', Modal.init);
} else {
  Modal.init();
}
