/**
 * Copyright (c) 2015 Hongchan Choi. MIT License.
 *
 * This is a gate logic based on the browser type.  If the browser is Chrome,
 * the site will launch without any issue.  However, for the case of FireFox or
 * Safari, the gate will display warning that the application might not be fully
 * functioning.
 */
(function (window) {
  
  'use strict';

  var _canopyVersion = '0.9.9-rc1';
  
  function handleLanding() {
    var divLoadingBox = document.querySelector('#eLoadingBox');
    var spanVersionNumber = document.querySelector('#eVersionNumber');
    spanVersionNumber.textContent = '(' + _canopyVersion + ')';
    
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
    Polymer.Base.importHref(['assets/canopy-app.html'], function () {
      var canopyAppShell = document.createElement('canopy-app');
      document.body.removeChild(divLoadingBox);
      document.body.appendChild(canopyAppShell);
      canopyAppShell.startApplication();
    });
  }

  console.log('[canopy] loading components: ' + performance.now());

  window.addEventListener('WebComponentsReady', handleLanding);

})(window);
