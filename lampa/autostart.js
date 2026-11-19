(function () {
    'use strict';

    var manifest = {
        type: 'other',
        version: '1.0.0',
        name: 'Autoplay Single Torrent File',
        description: 'Сразу открывает единственный файл торрента',
        component: 'autoplay-single-torrent-file'
    };

    var sent = false;

    function pressEnter() {
        var target = document.activeElement || document;

        var options = {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
        };

        target.dispatchEvent(new KeyboardEvent('keydown', options));
        target.dispatchEvent(new KeyboardEvent('keyup', options));
    }

    function init() {
        Lampa.Listener.follow('torrent_file', function (event) {
            if (!event || !event.data) return;

            var files = event.data.items || event.data.files;

            if (event.type === 'list_open') {
                sent = false;
            }

            if (
                !sent &&
                Array.isArray(files) &&
                files.length === 1
            ) {
                sent = true;

                // Даём Lampa отрисовать и сфокусировать единственный файл.
                setTimeout(pressEnter, 100);
            }
        });
    }

    Lampa.Manifest.plugins = manifest;

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') init();
        });
    }
})();
