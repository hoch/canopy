/**
 * @license Copyright (c) 2015 Hongchan Choi. MIT License.
 * @fileOverview  This is a gate logic based on the browser type. If the browser
 *     is Chrome, the site will launch without any issue. However, for the case
 *     of FireFox or Safari, the gate will display warning that the application
 *     might not be fully functioning.
 */
(function (window) {
  
  'use strict';

  var Canopy = {};

  Canopy.VERSION = '0.9.13';

  // Canopy system Log.
  Canopy.LOG = function (message) {
    console.log('%c[Canopy]%c ' 
      + message + ' %c@' + performance.now().toFixed(3) + ' ms'
      , 'background:#82B1FF; color:#0D47A1;'
      , 'background:none; color:#000;'
      , 'color:#CCC;');
  };

  Canopy.LOG('Compat checking...');

  // Entry Point.
  window.addEventListener('WebComponentsReady', function () {
    var _divLoadingBox = document.querySelector('#eLoadingBox');
    var _spanVersionNumber = document.querySelector('#eVersionNumber');
    _spanVersionNumber.textContent = '(' + Canopy.VERSION + ')';
    
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
      Canopy.LOG('Compat check failed. Quitting...');
      
      Polymer.Base.importHref(['canopy-bailout.html']);
      var bailoutDialog = document.createElement('canopy-bailout');
      document.body.removeChild(_divLoadingBox);
      document.body.appendChild(bailoutDialog);
      return;
    }

    // Activate Canopy namespace.
    window.Canopy = Canopy;

    Canopy.LOG('Compat check passed. (' + which[0] + ') Loading components...');

    // Start loading the application.
    Polymer.Base.importHref(['canopy-app.html'], function () {
      var canopyAppShell = document.createElement('canopy-app');
      document.body.removeChild(_divLoadingBox);
      document.body.appendChild(canopyAppShell);
    });
  });

})(window);
