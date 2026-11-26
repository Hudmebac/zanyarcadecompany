/* ELEMENTAL LITTLE WARS - boot. */
(function (global) {
  'use strict';
  function boot() {
    // The free Netlify plan pins a badge to the bottom-right. Reserve HUD space
    // for it on Netlify-hosted copies without changing local or GitHub play.
    if (/(^|\.)netlify\.app$/i.test(global.location.hostname)) {
      document.documentElement.classList.add('netlify-badge-safe');
    }
    var ZAC = global.ZAC;
    if (!ZAC || !ZAC.LWApp) {
      var err = document.createElement('div');
      err.style.cssText = 'position:fixed;inset:0;display:grid;place-items:center;background:#8fdfff;color:#28334a;font:bold 18px Trebuchet MS,sans-serif;text-align:center;padding:20px;';
      err.textContent = 'The little war could not start. Please reload the page.';
      document.body.appendChild(err);
      return;
    }
    ZAC.LWApp.init();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof globalThis !== 'undefined' ? globalThis : this);
