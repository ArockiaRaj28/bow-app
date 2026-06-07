/**
 * BOW v6.0 - Shift Entry Modal
 * File: pages/shift-entry.js
 * 
 * Quick shift logging with auto-detection of next empty date.
 */

const ShiftEntry = (() => {
  let selectedJob = null;
  let isSaving = false;

  /**
   * Open shift entry modal
   */
  function open() {
    const nextDate = findNextEmptyDate();
    selectedJob = getLastUsedJob();
    const dateStr = formatDate(nextDate);
    const lastTiming = getLastShiftTiming();

    const content = `
      <div class="form-group">
        <label class="form-label">Date</label>
        <input type="date" class="form-input" id="shiftDate" value="${dateStr}">
      </div>
      <div class="form-group">
        <label class="form-label">Job</label>
        <select class="form-input" id="shiftJob">
          <option value="">Select a job...</option>
          ${getJobOptions()}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Start Time</label>
          <input type="time" class="form-input" id="shiftStart" value="${lastTiming.start || '09:00'}">
        </div>
        <div class="form-group">
          <label class="form-label">End Time</label>
          <input type="time" class="form-input" id="shiftEnd" value="${lastTiming.end || '18:00'}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Breaks (minutes)</label>
        <input type="number" class="form-input" id="shiftBreaks" value="0" min="0">
      </div>
      <div class="form-group">
        <label class="form-label">Estimated Earnings</label>
        <div class="form-input-readonly" id="estimatedEarnings">¥0</div>
      </div>
    `;

    const buttons = [
      { label: 'Save', action: 'save', class: 'modal-btn-primary', onClick: handleSave },
      { label: 'Save + Continue', action: 'save-continue', class: 'modal-btn-success', onClick: handleSaveContinue },
    ];

    Modal.open({
      id: 'shift-entry',
      title: '📅 Add Shift',
      content,
      buttons,
      onClose: cleanup,
    });

    attachListeners();
  }

  /**
   * Attach listeners and setup real-time calculation
   */
  function attachListeners() {
    const jobSelect = document.getElementById('shiftJob');
    const startInput = document.getElementById('shiftStart');
    const endInput = document.getElementById('shiftEnd');
    const breaksInput = document.getElementById('shiftBreaks');

    if (jobSelect) {
      jobSelect.addEventListener('change', (e) => {
        selectedJob = e.target.value;
      });
    }

    // Real-time earnings calculation
    const updateEarnings = () => {
      const earnings = calculateEstimatedEarnings(startInput.value, endInput.value, parseInt(breaksInput.value || 0));
      const earningsDiv = document.getElementById('estimatedEarnings');
      if (earningsDiv) {
        earningsDiv.textContent = `¥${earnings.toLocaleString('ja-JP')}`;
      }
    };

    if (startInput) startInput.addEventListener('change', updateEarnings);
    if (endInput) endInput.addEventListener('change', updateEarnings);
    if (breaksInput) breaksInput.addEventListener('change', updateEarnings);

    // Initial calculation
    updateEarnings();

    // Focus job select
    if (jobSelect) {
      setTimeout(() => jobSelect.focus(), 100);
    }
  }

  /**
   * Handle save
   */
  function handleSave() {
    if (saveShift()) {
      Modal.close();
    }
  }

  /**
   * Handle save and continue
   */
  function handleSaveContinue() {
    if (saveShift()) {
      open();
    }
  }

  /**
   * Save shift
   */
  function saveShift() {
    if (isSaving) return false;

    const date = (document.getElementById('shiftDate') || {}).value;
    const job = (document.getElementById('shiftJob') || {}).value;
    const start = (document.getElementById('shiftStart') || {}).value;
    const end = (document.getElementById('shiftEnd') || {}).value;
    const breaks = parseInt((document.getElementById('shiftBreaks') || {}).value || 0);

    if (!date || !job || !start || !end) {
      alert('Please fill all fields');
      return false;
    }

    isSaving = true;

    const shift = {
      date,
      job,
      startTime: start,
      endTime: end,
      breaks,
      scheduledEarnings: calculateEstimatedEarnings(start, end, breaks),
    };

    if (window.saveBudgetShift) {
      window.saveBudgetShift(shift);
    }

    isSaving = false;
    return true;
  }

  /**
   * Find next empty date in shifts
   */
  function findNextEmptyDate() {
    const today = new Date();
    // For now, return tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  /**
   * Get last used job
   */
  function getLastUsedJob() {
    // Placeholder - integrate with app's job tracking
    return null;
  }

  /**
   * Get last shift timing
   */
  function getLastShiftTiming() {
    // Placeholder - integrate with app's shift history
    return { start: '09:00', end: '18:00' };
  }

  /**
   * Get job options
   */
  function getJobOptions() {
    // Placeholder - get from app's jobs
    return `<option value="job1">McDonald's</option>`;
  }

  /**
   * Calculate estimated earnings (SCHEDULED times only)
   */
  function calculateEstimatedEarnings(start, end, breaks) {
    if (!start || !end) return 0;

    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    let durationMin = endMin - startMin;
    if (durationMin < 0) durationMin += 24 * 60; // Next day

    const workMin = durationMin - breaks;
    const hourlyRate = 1000; // Placeholder

    return Math.round((workMin / 60) * hourlyRate);
  }

  /**
   * Cleanup
   */
  function cleanup() {
    selectedJob = null;
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

  function formatDateDisplay(date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const day = days[date.getDay()];
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} (${day})`;
  }

  /**
   * Public API
   */
  return {
    open,
  };
})();
