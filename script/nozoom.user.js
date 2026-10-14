// ==UserScript==
// @name         Disable Page Zoom in Safari iOS
// @namespace    local
// @version      1.1
// @author       SGVRZ
// @updateURL    https://raw.githubusercontent.com/sgvrz-svc/repo/main/script/nozoom.user.js
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const content =
    'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';

  function enforceViewport() {
    if (!document.head) return;

    let viewport = document.head.querySelector('meta[name="viewport"]');

    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }

    if (viewport.getAttribute('content') !== content) {
      viewport.setAttribute('content', content);
    }
  }

  const observer = new MutationObserver(enforceViewport);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['content', 'name']
  });

  enforceViewport();
})();