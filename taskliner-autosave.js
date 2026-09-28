;(function (root) {
  function createAutoSaveScheduler({
    delay,
    isVisible,
    isCurrent,
    isDirty,
    save,
    setTimer = setTimeout,
    clearTimer = clearTimeout
  }) {
    let timer = null;
    let deferredDate = null;

    function cancel() {
      if (timer !== null) clearTimer(timer);
      timer = null;
      deferredDate = null;
    }

    function stillEligible(date) {
      return Boolean(date && isCurrent(date) && isDirty(date));
    }

    function schedule(date) {
      cancel();
      if (!stillEligible(date)) return;
      timer = setTimer(() => {
        timer = null;
        if (!stillEligible(date)) return;
        if (!isVisible()) {
          deferredDate = date;
          return;
        }
        save(date);
      }, delay);
    }

    function visibilityChanged() {
      if (!isVisible() || !deferredDate) return;
      const date = deferredDate;
      deferredDate = null;
      if (stillEligible(date)) save(date);
    }

    return { schedule, cancel, visibilityChanged };
  }

  const api = { createAutoSaveScheduler };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TaskLinerAutoSave = api;
})(typeof globalThis === 'object' ? globalThis : this);
