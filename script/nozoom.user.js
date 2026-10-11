// ==UserScript==
// @name         Disable Page Zoom in Safari iOS
// @namespace    local
// @version      1.0
// @author       SGVRZ
// @updateURL    https://raw.githubusercontent.com/sgvrz-svc/repo/main/script/nozoom.user.js
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  function disableZoom() {
    let viewport = document.querySelector('meta[name="viewport"]');

    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      (document.head || document.documentElement).appendChild(viewport);
    }

    viewport.setAttribute(
      'content',
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
    );
  }

  if (document.head) {
    disableZoom();
  } else {
    const observer = new MutationObserver((_, observer) => {
      if (document.head) {
        observer.disconnect();
        disableZoom();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
})();