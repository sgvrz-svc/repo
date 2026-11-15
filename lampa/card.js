(function () {
    'use strict';

    function startPlugin() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                var render = e.object.activity.render();
                render.find('.items-line').each(function () {
                    var title = $(this).find('.items-line__title').text().trim().toLowerCase();
                    if (title === 'рекомендации' || title === 'похожие' || title === 'recommendations' || title === 'similar') {
                        $(this).remove();
                    }
                });
            }
        });
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') startPlugin();
        });
    }
})();