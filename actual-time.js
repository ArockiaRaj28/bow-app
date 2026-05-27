/**
 * BOW v6.0 - Actual Time Modal (Login/Logout)
 */

const ActualTime = (() => {
  let isSaving = false;

  function open() {
    const today = formatDate(new Date());
    const now = formatTime(new Date());

    // Get scheduled shift for today
    const scheduledShift = getTodayScheduledShift();

    const content = `
      <div class="form-group">
        <label class="form-label">Date</label>
        <div class="form-input-readonly">${today}</div>
      </div>

      ${scheduledShift ? `
        <div class="form-group" style="background:rgba(59,130,246,0.1);padding:12px;border-radius:8px;margin-bottom:12px;">
          <label class="form-label" style="margin-bottom:8px;">Scheduled Shift</label>
          <div style="font-size:13px;color:var(--muted);">
            <div>${scheduledShift.job}</div>
            <div>${scheduledShift.start} - ${scheduledShift.end}</div>
          </div>
        </div>
      ` : ''}

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Actual Login</label>
          <input 
            type="time" 
            class="form-input"
            id="actualLogin"
            value="${now}"
          >
        </div>
        <div class="form-group">
          <label class="form-label">Actual Logout</label>
          <input 
            type="time" 
            class="form-input"
            id="actualLogout"
            value="${now}"
          >
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Break Changes (minutes)</label>
        <input 
          type="number" 
          class="form-input"
          id="breakChanges"
          value="0"
          placeholder="0 for no changes"
        >
      </div>

      <div class="form-group">
        <label class="form-label">Actual Earnings</label>
        <div class="form-input-readonly" id="actualEarnings">
          ¥0
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px;">
          Based on actual login/logout times
        </div>
      </div>
    `;

    const buttons = [
      {
        label: 'Save Actuals',
        action: 'save',
        class: 'modal-btn-primary',
        onClick: handleSave,
      },
      {
        label: 'Save + Log Again',
        action: 'save-again',
        class: 'modal-btn-success',
        onClick: handleSaveAgain,
      },
    ];

    Modal.open({
      id: 'actual-time',
      title: '⏱ Actual Time',
      content,
      buttons,
      onClose: cleanup,
    });

    attachListeners();
  }

  function attachListeners() {
    const loginInput = document.getElementById('actualLogin');
    const logoutInput = document.getElementById('actualLogout');
    const breaksInput = document.getElementById('breakChanges');

    const updateEarnings = () => {
      const earnings = calculateActualEarnings(
        loginInput.value,
        logoutInput.value,
        parseInt(breaksInput.value || 0)
      );
      const earningsDiv = document.getElementById('actualEarnings');
      if (earningsDiv) {
        earningsDiv.textContent = `¥${earnings.toLocaleString('ja-JP')}`;
      }
    };

    if (loginInput) loginInput.addEventListener('change', updateEarnings);
    if (logoutInput) logoutInput.addEventListener('change', updateEarnings);
    if (breaksInput) breaksInput.addEventListener('change', updateEarnings);

    updateEarnings();
    if (loginInput) setTimeout(() => loginInput.focus(), 100);
  }

  function handleSave() {
    if (saveActualTime()) {
      Modal.close();
    }
  }

  function handleSaveAgain() {
    if (saveActualTime()) {
      open();
    }
  }

  function saveActualTime() {
    if (isSaving) return false;

    const login = document.getElementById('actualLogin').value;
    const logout = document.getElementById('actualLogout').value;
    const breakChanges = parseInt(document.getElementById('breakChanges').value || 0);

    if (!login || !logout) {
      alert('Please enter login and logout times');
      return false;
    }

    isSaving = true;

    const actualData = {
      date: formatDate(new Date()),
      actualLogin: login,
      actualLogout: logout,
      breakChanges,
      actualEarnings: calculateActualEarnings(login, logout, breakChanges),
    };

    // Save to app
    if (window.saveActualShift) {
      window.saveActualShift(actualData);
    }

    isSaving = false;
    return true;
  }

  function getTodayScheduledShift() {
    // Placeholder - integrate with app
    return null;
  }

  function calculateActualEarnings(login, logout, breakChanges) {
    if (!login || !logout) return 0;

    const [lH, lM] = login.split(':').map(Number);
    const [oH, oM] = logout.split(':').map(Number);

    const loginMin = lH * 60 + lM;
    const logoutMin = oH * 60 + oM;

    let duration = logoutMin - loginMin;
    if (duration < 0) duration += 24 * 60;

    const actualBreaks = (getTodayScheduledShift()?.breaks || 0) + breakChanges;
    const workMin = duration - actualBreaks;
    const hourlyRate = 1000;

    return Math.round((workMin / 60) * hourlyRate);
  }

  function cleanup() {
    isSaving = false;
  }

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

  return {
    open,
  };
})();
