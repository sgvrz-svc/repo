(function () {
    'use strict';

    var manifest = {
        type: 'other',
        version: '1.0.0',
        name: 'Wrap Content Padding Fix',
        description: 'Устанавливает padding-top: 0 для .wrap__content',
        component: 'wrap-content-padding-fix'
    };

    var STYLE_ID = 'wrap-content-padding-fix-style';

    function applyStyle() {
        if (document.getElementById(STYLE_ID)) return;

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = '.wrap__content { padding-top: 0 !important; }';

        (document.head || document.documentElement).appendChild(style);
    }

    function init() {
        Lampa.Manifest.plugins = manifest;
        applyStyle();
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') init();
        });
    }
})();