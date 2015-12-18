/**
 * canopy-landing.js
 * @version 0.9.2
 */
(function (window) {
  
  'use strict';
  
  function handleLanding() {
    // Detect browser and version.
    var which = (function () {
      var ua = navigator.userAgent, tem,
      M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
      if (/trident/i.test(M[1])) {
        tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
        return 'IE ' + (tem[1] || '');
      }
      if (M[1] === 'Chrome') {
        tem = ua.match(/\bOPR\/(\d+)/);
        if (tem !== null)
          return 'Opera '+ tem[1];
      }
      M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
      if ((tem = ua.match(/version\/(\d+)/i)) !== null)
        M.splice(1, 1, tem[1]);
      return M;
    })();

    var browserIsGood = which[0] === 'Chrome';

    // Detect URL has the dev mode query.
    var devMode = window.location.href.split('?q=')[1] === 'dev';
    
    // Not Chrome or dev mode, bailing out.
    if (!browserIsGood && !devMode) {
      Polymer.Base.importHref(['assets/canopy-bailout.html']);
      var bailoutDialog = document.createElement('canopy-bailout');
      document.body.appendChild(bailoutDialog);
      return;
    }

    // Start loading the application.
    Polymer.Base.importHref(['assets/canopy-app.html']);
    var canopyAppShell = document.createElement('canopy-app');
    document.body.appendChild(canopyAppShell);
  }

  console.log('[canopy] loading components: ' + performance.now());

  window.addEventListener('WebComponentsReady', handleLanding);

})(window);
