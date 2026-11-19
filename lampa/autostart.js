(function () {
    'use strict';

    function playableFiles(data) {
        // Источники могут передавать список под разными именами.
        var files = data.files || data.items || data.playlist;

        if (!Array.isArray(files)) return [];

        return files.filter(function (file) {
            return file && (file.url || file.link);
        });
    }

    Lampa.Listener.follow('torrent', function (event) {
        if (!event || !event.data) return;

        var files = playableFiles(event.data);

        // Ноль или несколько файлов — ничего не меняем:
        // Lampa продолжит штатную обработку.
        if (files.length !== 1) return;

        var file = files[0];

        Lampa.Player.play({
            url: file.url || file.link,
            title: file.title || file.name || ''
        });
    });
})();