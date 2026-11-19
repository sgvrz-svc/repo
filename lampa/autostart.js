(function () {
    'use strict';

    var manifest = {
        type: 'other',
        version: '1.0.2',
        name: 'Torrent File Diagnostic',
        description: 'Показывает и копирует данные списка файлов',
        component: 'torrent-file-diagnostic'
    };

    var dialog, output, status, pageInfo;
    var eventCount = 0;
    var fullText = '';
    var page = 0;
    var pageSize = 1500;

    function createDialog() {
        if (dialog) return;

        dialog = document.createElement('dialog');
        dialog.style.cssText =
            'width:85%;max-width:900px;height:80vh;padding:14px;' +
            'box-sizing:border-box;border:1px solid #666;border-radius:8px;' +
            'background:#181818;color:#fff;';

        dialog.innerHTML =
            '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">' +
                '<strong style="flex:1">Диагностика torrent_file</strong>' +
                '<button id="tfd-copy">Копировать всё</button>' +
                '<button id="tfd-close">Закрыть</button>' +
            '</div>' +
            '<textarea id="tfd-output" readonly ' +
                'style="display:block;width:100%;height:65%;box-sizing:border-box;' +
                'background:#101010;color:#fff;font:12px monospace;padding:8px;resize:none"></textarea>' +
            '<div style="display:flex;gap:8px;align-items:center;margin-top:8px">' +
                '<button id="tfd-prev">Назад</button>' +
                '<button id="tfd-next">Далее</button>' +
                '<span id="tfd-page"></span>' +
            '</div>' +
            '<div id="tfd-status" style="margin-top:8px"></div>';

        document.body.appendChild(dialog);

        output = dialog.querySelector('#tfd-output');
        status = dialog.querySelector('#tfd-status');
        pageInfo = dialog.querySelector('#tfd-page');

        dialog.querySelector('#tfd-close').onclick = function () {
            dialog.close();
        };

        dialog.querySelector('#tfd-prev').onclick = function () {
            if (page > 0) {
                page--;
                renderPage();
            }
        };

        dialog.querySelector('#tfd-next').onclick = function () {
            if ((page + 1) * pageSize < fullText.length) {
                page++;
                renderPage();
            }
        };

        dialog.querySelector('#tfd-copy').onclick = copyAll;
    }

    function renderPage() {
        var pages = Math.max(1, Math.ceil(fullText.length / pageSize));
        output.value = fullText.slice(page * pageSize, (page + 1) * pageSize);
        pageInfo.textContent = 'Страница ' + (page + 1) + ' из ' + pages;
        status.textContent = '';
    }

    function copyAll() {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(fullText).then(function () {
                status.textContent = 'Всё событие скопировано.';
            }).catch(function () {
                status.textContent = 'Не удалось скопировать. Просматривай текст кнопками.';
            });
        } else {
            status.textContent = 'Копирование недоступно. Просматривай текст кнопками.';
        }
    }

    function showEvent(event) {
        createDialog();
        eventCount++;

        try {
            fullText = 'Событие #' + eventCount + '\n\n' +
                JSON.stringify(event, null, 2);
        } catch (error) {
            fullText = 'Ошибка преобразования события: ' + error;
        }

        page = 0;
        renderPage();

        if (!dialog.open) dialog.showModal();
    }

    function init() {
        createDialog();
        fullText = 'Диагностика включена. Открой список файлов торрента.';
        renderPage();
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
