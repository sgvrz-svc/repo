// ==UserScript==
// @name         DuckDuckGo Cloud Save Auto Restore
// @description  Auto-open Cloud Save restore on DuckDuckGo settings
// @namespace    local
// @version      1.6
// @match        https://duckduckgo.com/settings*
// @grant        none
// @downloadURL  https://raw.githibusercontent.com/sgvrz-svc/repo/main/script/duckduckgo.user.js
// @updateURL    https://raw.githibusercontent.com/sgvrz-svc/repo/main/script/duckduckgo.user.js
// @author       sgvrz-svc
// ==/UserScript==
(function () {
  'use strict';

  const PASSPHRASE = '5n^3KiW$XGq&YPJX%Y@XaY#IbGBF$QusDiwdFMyhUf4DA9Tn@a!qCqItiwVNvylU#szmhPrv$FxKQA9WWu1$QWPzHvR3ss80M%gJ';

  function fire(el, type) {
    el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
  }

  function waitFor(selector, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);

      const obs = new MutationObserver(() => {
        const node = document.querySelector(selector);
        if (node) {
          obs.disconnect();
          resolve(node);
        }
      });

      obs.observe(document.documentElement, { childList: true, subtree: true });

      setTimeout(() => {
        obs.disconnect();
        reject(new Error('timeout'));
      }, timeoutMs);
    });
  }

  function findPasswordInput(root = document) {
    const inputs = Array.from(root.querySelectorAll('input, textarea'));
    return inputs.find(el =>
      /password|passphrase|phrase|code|restore/i.test(
        `${el.name || ''} ${el.id || ''} ${el.placeholder || ''} ${el.getAttribute('aria-label') || ''}`
      )
    );
  }

  function findRestoreButton(root = document) {
    const btns = Array.from(root.querySelectorAll('button, input[type="submit"]'));
    return btns.find(el => {
      const t = (el.innerText || el.value || el.textContent || '').toString().trim();
      return /загрузить настройки|load setting|restore|recover|load|submit|continue/i.test(t);
    });
  }

  async function run() {
    if (!location.pathname.startsWith('/settings')) return;

    // Шаг 1: попробуем открыть раздел (только по button/a, не по div/span)
    const openCandidates = Array.from(document.querySelectorAll('button, a'))
      .filter(el => /cloud save|restore|backup|sync/i.test((el.textContent || '').trim()));

    if (openCandidates.length) {
      openCandidates[0].click();
    }

    // Шаг 2: ждём форму/инпут и кнопку
    let passInput;
    try {
      // Ждём появления поля пароля
      const start = Date.now();
      while (!passInput && Date.now() - start < 8000) {
        passInput = findPasswordInput();
        if (!passInput) await new Promise(r => setTimeout(r, 250));
      }
    } catch {}

    if (!passInput) return;

    passInput.focus();
    passInput.value = PASSPHRASE;
    fire(passInput, 'input');
    fire(passInput, 'change');

    // Ждём кнопку “Load Setting/Загрузить настройки”
    const start2 = Date.now();
    while (Date.now() - start2 < 8000) {
      const btn = findRestoreButton();
      if (btn && !btn.disabled) {
        btn.click();
        return;
      }
      await new Promise(r => setTimeout(r, 250));
    }
  }

  // Ждём интерактивность, дальше запускаем run
  const t = setInterval(() => {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      clearInterval(t);
      run();
    }
  }, 200);
})();