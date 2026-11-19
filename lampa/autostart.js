(function () {
    'use strict';

    var manifest = {
        type: 'other',
        version: '1.0.1',
        name: 'Torrent File Diagnostic',
        description: 'Показывает и копирует данные списка файлов',
        component: 'torrent-file-diagnostic'
    };

    var dialog;
    var output;
    var status;
    var eventCount = 0;

    function createDialog() {
        if (dialog) return;

        dialog = document.createElement('dialog');
        dialog.style.cssText =
            'width:85%;max-width:900px;max-height:80vh;padding:16px;' +
            'border:1px solid #666;border-radius:8px;background:#181818;color:#fff;';

        dialog.innerHTML =
            '<div style="display:flex;gap:10px;align-items:center;margin-bottom:10px">' +
                '<strong style="flex:1">Диагностика torrent_file</strong>' +
                '<button type="button" id="tfd-copy">Копировать</button>' +
                '<button type="button" id="tfd-close">Закрыть</button>' +
            '</div>' +
            '<textarea id="tfd-output" readonly ' +
                'style="box-sizing:border-box;width:100%;height:55vh;background:#101010;color:#fff;' +
                'font:14px monospace;padding:10px;white-space:pre;overflow:auto"></textarea>' +
            '<div id="tfd-status" style="margin-top:8px"></div>';

        document.body.appendChild(dialog);

        output = dialog.querySelector('#tfd-output');
        status = dialog.querySelector('#tfd-status');

        dialog.querySelector('#tfd-close').onclick = function () {
            dialog.close();
        };

        dialog.querySelector('#tfd-copy').onclick = copyText;
    }

    function copyText() {
        output.focus();
        output.select();
        output.setSelectionRange(0, output.value.length);

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(output.value).then(function () {
                status.textContent = 'Скопировано.';
            }).catch(fallbackCopy);
        } else {
            fallbackCopy();
        }
    }

    function fallbackCopy() {
        try {
            var copied = document.execCommand('copy');
            status.textContent = copied
                ? 'Скопировано.'
                : 'Текст выделен. Скопируй его штатной командой устройства.';
        } catch (error) {
            status.textContent =
                'Текст выделен. Скопируй его штатной командой устройства.';
        }
    }

    function showEvent(event) {
        createDialog();
        eventCount++;

        try {
            output.value = 'Событие #' + eventCount + '\n\n' +
                JSON.stringify(event, function (key, value) {
                    return value instanceof ArrayBuffer ? '[ArrayBuffer]' : value;
                }, 2);
        } catch (error) {
            output.value = 'Не удалось преобразовать событие в текст: ' + error;
        }

        status.textContent = '';
        if (!dialog.open) dialog.showModal();
    }

    function init() {
        createDialog();
        output.value = 'Диагностика включена. Открой список файлов торрента.';
        dialog.showModal();

        Lampa.Listener.follow('torrent_file', showEvent);
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
