(function () {
    'use strict';

    function hide() {
        var list = ['рекомендации', 'похожие', 'recommendations', 'similar'];
        $('.items-line, [class*="line"]').each(function () {
            var el = $(this);
            if (el.data('hr')) return;
            var t = el.find('.items-line__title, h2, h3').first().text().trim().toLowerCase();
            if (list.indexOf(t) !== -1) el.data('hr', 1).hide();
        });
    }

    function init() {
        new MutationObserver(hide).observe(document.body, { childList: true, subtree: true });
        hide();
    }

    window.appready ? init() : Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') init();
    });
})();
