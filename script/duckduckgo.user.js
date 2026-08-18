// ==UserScript==
// @name         DuckDuckGo Cloud Save Auto Restore
// @description  Auto-open Cloud Save restore on DuckDuckGo settings
// @namespace    local
// @version      1.5
// @match        https://duckduckgo.com/settings*
// @grant        none
// @downloadURL  https://raw.githibusercontent.com/sgvrz-svc/repo/main/script/duckduckgo-cloud-save-auto-restore.user.js
// @updateURL    https://raw.githibusercontent.com/sgvrz-svc/repo/main/script/duckduckgo-cloud-save-auto-restore.user.js
// @author       sgvrz-svc
// ==/UserScript==

(function () {
  'use strict';

  const PASSPHRASE = '5n^3KiW$XGq&YPJX%Y@XaY#IbGBF$QusDiwdFMyhUf4DA9Tn@a!qCqItiwVNvylU#szmhPrv$FxKQA9WWu1$QWPzHvR3ss80M%gJ';

  function fire(el, type) {
    el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
  }

  function clickIfExists(selector) {
    const el = document.querySelector(selector);
    if (el) {
      el.click();
      return true;
    }
    return false;
  }

  function openSection() {
    const candidates = Array.from(document.querySelectorAll('button, a, div, span'))
      .filter(el => /cloud save|settings|restore|backup|sync/i.test(el.textContent || ''));

    for (const el of candidates) {
      el.click();
      return true;
    }
    return false;
  }

  function fillAndRestore() {
    const inputs = Array.from(document.querySelectorAll('input, textarea'));
    const passInput = inputs.find(el =>
      /password|passphrase|phrase|code|restore/i.test(
        `${el.name || ''} ${el.id || ''} ${el.placeholder || ''} ${el.ariaLabel || ''}`
      )
    );

    if (!passInput) return false;

    passInput.focus();
    passInput.value = PASSPHRASE;
    fire(passInput, 'input');
    fire(passInput, 'change');

    const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
    const restoreBtn = buttons.find(el =>
      /restore|recover|load|submit|continue/i.test((el.innerText || el.value || '') + ' ' + (el.name || '') + ' ' + (el.id || ''))
    );

    if (restoreBtn) {
      restoreBtn.click();
      return true;
    }

    const form = passInput.closest('form');
    if (form) {
      form.submit();
      return true;
    }

    return false;
  }

  function run() {
    if (!location.pathname.startsWith('/settings')) return;

    openSection();
    setTimeout(() => {
      if (!fillAndRestore()) {
        setTimeout(fillAndRestore, 1000);
      }
    }, 1000);
  }

  const timer = setInterval(() => {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      run();
      clearInterval(timer);
    }
  }, 500);
})();
