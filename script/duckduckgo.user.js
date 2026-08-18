// ==UserScript==
// @name         DuckDuckGo Cloud Save Auto Restore
// @description  Auto-open Cloud Save restore on DuckDuckGo settings
// @namespace    local
// @version      2.0
// @match        https://duckduckgo.com/settings*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/sgvrz-svc/repo/main/script/duckduckgo.user.js
// @updateURL    https://raw.githubusercontent.com/sgvrz-svc/repo/main/script/duckduckgo.user.js
// @author       sgvrz-svc
// ==/UserScript==

(function () {
  'use strict';

  const PASSPHRASE = '5n^3KiW$XGq&YPJX%Y@XaY#IbGBF$QusDiwdFMyhUf4DA9Tn@a!qCqItiwVNvylU#szmhPrv$FxKQA9WWu1$QWPzHvR3ss80M%gJ';

  function setNativeValue(el, value) {
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (desc && desc.set) {
      desc.set.call(el, value);
    } else {
      el.value = value;
    }
  }

  function fire(el, type) {
    el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
  }

  function click(el) {
    if (!el) return false;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    el.click();
    return true;
  }

  function waitFor(selector, cb, timeout = 10000) {
    const start = Date.now();
    const timer = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(timer);
        cb(el);
      } else if (Date.now() - start > timeout) {
        clearInterval(timer);
      }
    }, 200);
  }

  function fillPassphrase() {
    const input = Array.from(document.querySelectorAll('input, textarea')).find(el =>
      /pass|phrase|code|cloud|restore|load/i.test(
        `${el.name || ''} ${el.id || ''} ${el.placeholder || ''} ${el.getAttribute('aria-label') || ''}`
      )
    );

    if (!input) return false;

    input.focus();
    setNativeValue(input, PASSPHRASE);
    fire(input, 'input');
    fire(input, 'change');
    fire(input, 'keyup');
    return true;
  }

  function run() {
    const loadBtn = document.querySelector('.js-cloudsave-load-btn');
    if (loadBtn) {
      click(loadBtn);
    }

    setTimeout(() => {
      if (fillPassphrase()) {
        setTimeout(() => {
          const confirmBtn =
            document.querySelector('.js-cloudsave-load-confirm-btn') ||
            Array.from(document.querySelectorAll('span, button, a, input[type="button"], input[type="submit"]'))
              .find(el => /load|restore|confirm|continue|submit/i.test((el.textContent || el.value || '').toLowerCase()));

          if (confirmBtn) {
            click(confirmBtn);
          }
        }, 500);
      }
    }, 500);
  }

  function init() {
    if (!location.pathname.startsWith('/settings')) return;
    run();

    const observer = new MutationObserver(() => {
      const inputVisible = Array.from(document.querySelectorAll('input, textarea')).some(el => {
        const s = getComputedStyle(el);
        return s.display !== 'none' && s.visibility !== 'hidden';
      });
      if (inputVisible) run();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();