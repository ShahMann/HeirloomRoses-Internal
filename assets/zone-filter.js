/**
 * Hardiness Zone filter toggle: applies collection filter via URL with full Shopify filter value
 * (e.g. filter.p.m.custom.hardiness_zone=7+%280%C2%B0+to+10%C2%B0%29).
 * Syncs with #zoneFilterToggle (desktop) and #zoneFilterToggleMobile (drawer).
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'locator';
  const DEFAULT_ZONE_PARAM = 'filter.p.m.custom.hardiness_zone';

  function getZoneFilterParam() {
    const wrapper = document.querySelector('.hardiness-zone-filter-toggle[data-zone-filter-param]');
    return (wrapper && wrapper.getAttribute('data-zone-filter-param')) || DEFAULT_ZONE_PARAM;
  }

  function getUserHardinessZone() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data && data.zone != null ? String(data.zone) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Find the filter checkbox that matches the user's zone (stored as number e.g. "7").
   * Shopify filter values can be the full label e.g. "7 (0° to 10°)".
   */
  function findUserZoneCheckbox(userZone, zoneFilterParam) {
    if (!userZone) return null;
    const param = zoneFilterParam || getZoneFilterParam();
    const forms = document.querySelectorAll('form.facets__form');
    for (const form of forms) {
      const inputs = form.querySelectorAll(`input[name="${param}"]`);
      for (const input of inputs) {
        const v = (input.value || '').trim();
        if (v === userZone) return input;
        if (v.startsWith(userZone + ' ') || v.startsWith(userZone + '(')) return input;
        const label = input.closest('li') && input.closest('li').querySelector('label');
        if (label && label.getAttribute('for') === input.id) {
          const id = (input.id || '').split('-');
          if (id.length >= 2 && id[1] === userZone) return input;
        }
      }
    }
    return null;
  }

  /**
   * True if the URL has the zone filter applied for this zone (value is exactly zone or full label like "7 (0° to 10°)").
   */
  function checkZoneFilterInUrl(url, zone, zoneFilterParam) {
    const param = zoneFilterParam || getZoneFilterParam();
    const values = url.searchParams.getAll(param);
    return values.some(
      (v) =>
        v === zone ||
        v.startsWith(zone + ' ') ||
        v.startsWith(zone + '(')
    );
  }

  function updateZoneDisplay(zone) {
    const els = document.querySelectorAll('#currentZoneDisplay, #currentZoneDisplayMobile, .zone-filter__zone-number');
    els.forEach((el) => {
      if (el) el.textContent = zone || '–';
    });
    const locatorRaw = localStorage.getItem(STORAGE_KEY);
    if (locatorRaw) {
      try {
        const data = JSON.parse(locatorRaw);
        const locationText = data.region ? `${data.zip || ''}, ${data.region}`.trim() : (data.zip || '');
        const locationEls = document.querySelectorAll('#currentZoneLocation, #currentZoneLocationMobile, .zone-display-box-sub-heading');
        locationEls.forEach((el) => {
          if (el) {
            el.textContent = locationText;
            el.classList.toggle('hide', !locationText);
          }
        });
      } catch (_) {}
    }
  }

  function updateToggleSliderClass(toggleElement, isActive) {
    if (!toggleElement) return;
    let slider =
      toggleElement.nextElementSibling ||
      (toggleElement.closest('label') && toggleElement.closest('label').querySelector('.zone-toggle-slider, .zone-filter__toggle-track'));
    if (!slider) {
      const wrap = toggleElement.closest('.hardiness-zone-filter-toggle');
      if (wrap) slider = wrap.querySelector('.zone-toggle-slider, .zone-filter__toggle-track');
    }
    if (slider) {
      if (isActive) slider.classList.add('zone-toggle-slider-active');
      else slider.classList.remove('zone-toggle-slider-active');
    }
  }

  function syncZoneToggleSliderClass() {
    document.querySelectorAll('#zoneFilterToggle, #zoneFilterToggleMobile').forEach((toggle) => {
      updateToggleSliderClass(toggle, !!toggle.checked);
    });
  }

  function setToggleChecked(checked) {
    document.querySelectorAll('#zoneFilterToggle, #zoneFilterToggleMobile').forEach((t) => {
      if (!t.disabled) t.checked = !!checked;
      updateToggleSliderClass(t, !!checked);
    });
  }

  /**
   * Set initial toggle and checkbox state from URL; run on load and after section re-render.
   */
  function syncZoneToggleOnPageLoad(zoneFilterParam, _zoneFilterCleared) {
    const userZone = getUserHardinessZone();
    if (!userZone) {
      updateZoneDisplay(null);
      return;
    }
    updateZoneDisplay(userZone);
    const url = new URL(window.location.href);
    const hasZoneInUrl = checkZoneFilterInUrl(url, userZone, zoneFilterParam);
    if (_zoneFilterCleared) {
      setToggleChecked(false);
      const checkbox = findUserZoneCheckbox(userZone, zoneFilterParam);
      if (checkbox) {
        checkbox.checked = false;
        document.querySelectorAll(`input[name="${zoneFilterParam}"]`).forEach((cb) => {
          cb.checked = false;
        });
      }
      return;
    }
    setToggleChecked(hasZoneInUrl);
    const checkbox = findUserZoneCheckbox(userZone, zoneFilterParam);
    if (checkbox) {
      if (hasZoneInUrl && !checkbox.checked) checkbox.checked = true;
      else if (!hasZoneInUrl && checkbox.checked) checkbox.checked = false;
    }
    syncZoneToggleSliderClass();
  }

  function onZoneToggleChange(event, userZone, otherToggle, zoneFilterParam) {
    event.preventDefault();
    event.stopPropagation();

    const isChecked = event.target.checked;
    if (otherToggle && !otherToggle.disabled) {
      otherToggle.checked = isChecked;
      updateToggleSliderClass(otherToggle, isChecked);
    }
    updateToggleSliderClass(event.target, isChecked);

    let checkbox = findUserZoneCheckbox(userZone, zoneFilterParam);
    if (!checkbox) {
      event.target.checked = !isChecked;
      if (otherToggle) otherToggle.checked = !isChecked;
      syncZoneToggleSliderClass();
      return;
    }

    if (isChecked) {
      document.querySelectorAll(`input[name="${zoneFilterParam}"]`).forEach((cb) => {
        cb.checked = cb === checkbox;
      });
    } else {
      checkbox.checked = false;
    }

    const form = checkbox.closest('form');
    const facetsForm = form && form.closest('facets-form-component');
    if (facetsForm && typeof facetsForm.updateFilters === 'function') {
      facetsForm.updateFilters();
    }
  }

  function initZoneToggle() {
    const desktopWrapper = document.querySelector('.hardiness-zone-filter-toggle:not(.mobile-zone-toggle)');
    const mobileWrapper = document.querySelector('.hardiness-zone-filter-toggle.mobile-zone-toggle');
    const zoneFilterParam =
      (desktopWrapper && desktopWrapper.getAttribute('data-zone-filter-param')) ||
      (mobileWrapper && mobileWrapper.getAttribute('data-zone-filter-param')) ||
      DEFAULT_ZONE_PARAM;

    const userZone = getUserHardinessZone();
    updateZoneDisplay(userZone);

    const desktopToggle = document.getElementById('zoneFilterToggle');
    const mobileToggle = document.getElementById('zoneFilterToggleMobile');

    if (!desktopToggle && !mobileToggle) return;

    const checkbox = findUserZoneCheckbox(userZone, zoneFilterParam);
    if (!checkbox) {
      [desktopToggle, mobileToggle].forEach((t) => {
        if (t) {
          t.disabled = true;
          const wrap = t.closest('.hardiness-zone-filter-toggle');
          if (wrap) {
            wrap.style.opacity = '0.5';
            wrap.title = userZone
              ? 'Zone ' + userZone + ' is not available for this collection'
              : 'Please enter your ZIP code first';
          }
        }
      });
      return;
    }

    const url = new URL(window.location.href);
    const hasZoneInUrl = checkZoneFilterInUrl(url, userZone, zoneFilterParam);
    setToggleChecked(hasZoneInUrl);
    if (hasZoneInUrl && !checkbox.checked) checkbox.checked = true;
    else if (!hasZoneInUrl && checkbox.checked) checkbox.checked = false;
    syncZoneToggleSliderClass();

    const handler = function (e) {
      onZoneToggleChange(e, userZone, e.target === desktopToggle ? mobileToggle : desktopToggle, zoneFilterParam);
    };

    if (desktopToggle) {
      desktopToggle.removeEventListener('change', desktopToggle._zoneToggleHandler);
      desktopToggle._zoneToggleHandler = handler;
      desktopToggle.addEventListener('change', handler);
    }
    if (mobileToggle) {
      mobileToggle.removeEventListener('change', mobileToggle._zoneToggleHandler);
      mobileToggle._zoneToggleHandler = handler;
      mobileToggle.addEventListener('change', handler);
    }

    document.querySelectorAll('[data-update-hardiness-zone]').forEach((link) => {
      link.removeEventListener('click', link._zoneUpdateHandler);
      link._zoneUpdateHandler = function (e) {
        e.preventDefault();
        const trigger = document.querySelector('tool-tip-trigger.location-zone-popup, tool-tip-trigger[data-tool-tip="LocationDetector"]');
        if (trigger) trigger.click();
      };
      link.addEventListener('click', link._zoneUpdateHandler);
    });
  }

  function runSync() {
    const zoneFilterParam = getZoneFilterParam();
    const userZone = getUserHardinessZone();
    if (!userZone) {
      updateZoneDisplay(null);
      return;
    }
    syncZoneToggleOnPageLoad(zoneFilterParam, window._zoneFilterCleared);
    if (window._zoneFilterCleared) window._zoneFilterCleared = false;
  }

  function init() {
    initZoneToggle();
    runSync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY) {
      updateZoneDisplay(getUserHardinessZone());
      initZoneToggle();
      runSync();
    }
  });

  window.addEventListener('section:rendered', function (e) {
    if (e && e.detail && e.detail.sectionId) {
      initZoneToggle();
      runSync();
    }
  });

  document.addEventListener('filter:update', function () {
    setTimeout(function () {
      runSync();
    }, 0);
  });

  window.ZoneFilter = {
    initZoneToggle,
    syncZoneToggleOnPageLoad: runSync,
    getUserHardinessZone,
    findUserZoneCheckbox,
    checkZoneFilterInUrl,
    updateZoneDisplay,
    setZoneFilterCleared: function () {
      window._zoneFilterCleared = true;
    },
  };
})();
