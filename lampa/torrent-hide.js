(function () {
    'use strict';

    var PLUGIN_ID = 'hide_filtered_torrents';
    var HIDDEN_CLASS = 'hide-filtered-torrents';

    var MIN_SEEDS = 5;

    // Словарь запрещённых фрагментов в названии.
    // Сравнение выполняется без учёта регистра.
    var BLOCKED_TITLE_WORDS = [
        'TSRip',
        'CAMRip',
        'TS-Rip',
        'CAM-Rip'
    ];

    function addStyle() {
        if (document.getElementById(PLUGIN_ID + '-style')) return;

        var style = document.createElement('style');
        style.id = PLUGIN_ID + '-style';
        style.textContent = '.' + HIDDEN_CLASS + ' { display: none !important; }';
        document.head.appendChild(style);
    }

    function getNode(event) {
        var item = event && (event.item || event.element);

        if (!item) return null;
        if (item.nodeType === 1) return item;
        if (item[0] && item[0].nodeType === 1) return item[0];

        if (typeof item.get === 'function') {
            var node = item.get(0);
            if (node && node.nodeType === 1) return node;
        }

        return null;
    }

    function hasBlockedTitleWord(node) {
        var titleElement = node.querySelector(
            '.torrent-item__title, .torrent-item__name'
        );

        var title = titleElement
            ? titleElement.textContent || ''
            : node.textContent || '';

        return BLOCKED_TITLE_WORDS.some(function (word) {
            return title.indexOf(word) !== -1;
        });
    }

    function hasTooFewSeeds(node) {
        var seedsElement = node.querySelector('.torrent-item__seeds');
        if (!seedsElement) return false;

        var match = (seedsElement.textContent || '').match(/\d+/);
        if (!match) return false;

        return parseInt(match[0], 10) < MIN_SEEDS;
    }

    function updateItem(node) {
        if (!node || !node.classList ||
            !node.classList.contains('torrent-item')) return;

        var shouldHide =
            hasTooFewSeeds(node) ||
            hasBlockedTitleWord(node);

        node.classList.toggle(HIDDEN_CLASS, shouldHide);
    }

    function updateExistingItems() {
        var items = document.querySelectorAll('.torrent-list .torrent-item');

        for (var i = 0; i < items.length; i++) {
            updateItem(items[i]);
        }
    }

    function init() {
        addStyle();
        updateExistingItems();

        Lampa.Listener.follow('torrent', function (event) {
            if (!event || event.type !== 'render') return;
            updateItem(getNode(event));
        });
    }

    Lampa.Manifest = Lampa.Manifest || {};
    Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};
    Lampa.Manifest.plugins[PLUGIN_ID] = {
        type: 'other',
        name: 'Torrent filters',
        version: '1.1.0',
        description: 'Скрывает торренты по числу сидов и словам в названии'
    };

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') init();
        });
    }
})();
