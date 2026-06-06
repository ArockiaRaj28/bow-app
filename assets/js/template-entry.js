/**
 * BOW v6.0 - Template Entry Modal
 * File: pages/template-entry.js
 * 
 * Create recurring shift templates.
 */

const TemplateEntry = (() => {
  let selectedDays = [];
  let isSaving = false;

  const DAYS_OF_WEEK = [
    { id: 0, name: 'Sun', short: 'S' },
    { id: 1, name: 'Mon', short: 'M' },
    { id: 2, name: 'Tue', short: 'T' },
    { id: 3, name: 'Wed', short: 'W' },
    { id: 4, name: 'Thu', short: 'T' },
    { id: 5, name: 'Fri', short: 'F' },
    { id: 6, name: 'Sat', short: 'S' },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'];

  function open() {
    const content = `
      <div class="form-group">
        <label class="form-label">Template Name</label>
        <input 
          type="text" 
          class="form-input"
          id="templateName"
          placeholder="e.g., Morning Shift"
        >
      </div>

      <div class="form-group">
        <label class="form-label">Job</label>
        <select class="form-input" id="templateJob">
          <option value="">Select a job...</option>
          ${getJobOptions()}
        </select>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Start Time</label>
          <input 
            type="time" 
            class="form-input"
            id="templateStart"
            value="09:00"
          >
        </div>
        <div class="form-group">
          <label class="form-label">End Time</label>
          <input 
            type="time" 
            class="form-input"
            id="templateEnd"
            value="18:00"
          >
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Breaks (minutes)</label>
        <input 
          type="number" 
          class="form-input"
          id="templateBreaks"
          value="0"
        >
      </div>

      <div class="form-group">
        <label class="form-label">Repeat Days</label>
        <div class="days-selector">
          ${DAYS_OF_WEEK.map(day => `
            <button 
              class="day-btn" 
              data-day-id="${day.id}"
              title="${day.name}"
            >
              ${day.short}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Color</label>
        <div class="color-selector">
          ${COLORS.map((color, idx) => `
            <button 
              class="color-btn" 
              data-color="${color}"
              style="background-color:${color};"
              ${idx === 0 ? 'data-selected="true"' : ''}
            ></button>
          `).join('')}
        </div>
      </div>
    `;

    const buttons = [
      {
        label: 'Save Template',
        action: 'save',
        class: 'modal-btn-primary',
        onClick: handleSave,
      },
      {
        label: 'Save + Use Now',
        action: 'save-use',
        class: 'modal-btn-success',
        onClick: handleSaveUse,
      },
    ];

    Modal.open({
      id: 'template-entry',
      title: '🔁 New Template',
      content,
      buttons,
      onClose: cleanup,
    });

    attachListeners();
  }

  function attachListeners() {
    // Day selection
    const dayBtns = document.querySelectorAll('.day-btn');
    dayBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dayId = parseInt(btn.getAttribute('data-day-id'));
        if (selectedDays.includes(dayId)) {
          selectedDays = selectedDays.filter(d => d !== dayId);
          btn.classList.remove('active');
        } else {
          selectedDays.push(dayId);
          btn.classList.add('active');
        }
      });
    });

    // Color selection
    const colorBtns = document.querySelectorAll('.color-btn');
    colorBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        colorBtns.forEach(b => b.removeAttribute('data-selected'));
        btn.setAttribute('data-selected', 'true');
      });
    });

    // Focus name
    const nameInput = document.getElementById('templateName');
    if (nameInput) {
      setTimeout(() => nameInput.focus(), 100);
    }
  }

  function handleSave() {
    if (saveTemplate()) {
      Modal.close();
    }
  }

  function handleSaveUse() {
    if (saveTemplate()) {
      // Use template immediately
      applyTemplateNow();
      Modal.close();
    }
  }

  function saveTemplate() {
    if (isSaving) return false;

    const name = document.getElementById('templateName').value;
    const job = document.getElementById('templateJob').value;
    const start = document.getElementById('templateStart').value;
    const end = document.getElementById('templateEnd').value;
    const breaks = parseInt(document.getElementById('templateBreaks').value || 0);
    const selectedColorBtn = document.querySelector('[data-selected="true"]');
    const color = selectedColorBtn ? selectedColorBtn.getAttribute('data-color') : COLORS[0];

    if (!name || !job) {
      alert('Please fill name and job');
      return false;
    }

    if (selectedDays.length === 0) {
      alert('Please select at least one day');
      return false;
    }

    isSaving = true;

    const template = {
      id: 'tpl_' + Date.now(),
      name,
      job,
      startTime: start,
      endTime: end,
      breaks,
      repeatDays: selectedDays,
      color,
    };

    // Save to app
    if (window.saveShiftTemplate) {
      window.saveShiftTemplate(template);
    }

    isSaving = false;
    return true;
  }

  function applyTemplateNow() {
    // Create shift for today using template
    if (window.applyTemplate) {
      window.applyTemplate();
    }
  }

  function getJobOptions() {
    return `<option value="job1">McDonald's</option>`;
  }

  function cleanup() {
    selectedDays = [];
    isSaving = false;
  }

  return {
    open,
  };
})();
