(function () {
    'use strict';

    var PLUGIN_ID = 'hide_torrents_below_5_seeds';
    var MIN_SEEDS = 5;
    var HIDDEN_CLASS = 'hide-torrents-below-5-seeds';

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

    function updateItem(node) {
        if (!node || !node.classList || !node.classList.contains('torrent-item')) return;

        var seedsElement = node.querySelector('.torrent-item__seeds');
        if (!seedsElement) return;

        var match = (seedsElement.textContent || '').match(/\d+/);

        // Если число сидов ещё не появилось, оставляем карточку как есть.
        if (!match) return;

        var seeds = parseInt(match[0], 10);

        if (seeds < MIN_SEEDS) {
            node.classList.add(HIDDEN_CLASS);
        } else {
            node.classList.remove(HIDDEN_CLASS);
        }
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
        name: 'Hide torrents with fewer than 5 seeds',
        version: '1.0.0',
        description: 'Скрывает торренты, у которых меньше 5 раздающих'
    };

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') init();
        });
    }
})();