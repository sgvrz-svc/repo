(function () {
    'use strict';

    var manifest = {
        type: 'other',
        version: '1.0.0',
        name: 'Torrent File Diagnostic',
        description: 'Показывает данные списка файлов в окне',
        component: 'torrent-file-diagnostic'
    };

    var dialog;
    var output;
    var eventCount = 0;

    function createDialog() {
        if (dialog) return;

        dialog = document.createElement('dialog');
        dialog.style.cssText = [
            'width:85%',
            'max-width:900px',
            'max-height:80vh',
            'padding:16px',
            'border:1px solid #666',
            'border-radius:8px',
            'background:#181818',
            'color:#fff'
        ].join(';');

        dialog.innerHTML =
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
                '<strong>Диагностика torrent_file</strong>' +
                '<button type="button" id="tfd-close">Закрыть</button>' +
            '</div>' +
            '<textarea id="tfd-output" readonly ' +
                'style="box-sizing:border-box;width:100%;height:60vh;background:#101010;color:#fff;' +
                'font:14px monospace;padding:10px;white-space:pre;overflow:auto"></textarea>';

        document.body.appendChild(dialog);

        output = dialog.querySelector('#tfd-output');

        dialog.querySelector('#tfd-close').addEventListener('click', function () {
            dialog.close();
        });
    }

    function formatEvent(event) {
        try {
            return JSON.stringify(event, function (key, value) {
                if (value instanceof ArrayBuffer) return '[ArrayBuffer]';
                return value;
            }, 2);
        } catch (error) {
            return String(event);
        }
    }

    function showEvent(event) {
        createDialog();

        eventCount++;
        output.value =
            'Событие #' + eventCount + '\n\n' +
            formatEvent(event);

        if (!dialog.open) dialog.showModal();
    }

    function init() {
        createDialog();

        Lampa.Listener.follow('torrent_file', function (event) {
            showEvent(event);
        });

        output.value = 'Диагностика включена.\nОткрой список файлов торрента.';
        dialog.showModal();
    }

    function start() {
        Lampa.Manifest.plugins = manifest;

        if (window.appready) {
            init();
        } else {
            Lampa.Listener.follow('app', function (event) {
                if (event.type === 'ready') init();
            });
        }
    }

    start();
})();
