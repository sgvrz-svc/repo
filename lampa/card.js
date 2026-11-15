(function () {
    'use strict';

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
})();