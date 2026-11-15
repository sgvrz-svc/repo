(function () {
    'use strict';

    function hideRows(render) {
        try {
            render.find('.items-line').each(function () {
                var title = $(this).find('.items-line__title').text().trim().toLowerCase();
                if (
                    title.indexOf('рекомендации') !== -1 ||
                    title.indexOf('похожие') !== -1 ||
                    title.indexOf('recommendations') !== -1 ||
                    title.indexOf('similar') !== -1
                ) {
                    $(this).hide();
                }
            });
        } catch (err) {
            console.log('HideRec error:', err);
        }
    }

    function startPlugin() {
        if (window.lampa_hide_rec_loaded) return;
        window.lampa_hide_rec_loaded = true;

        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                var render = e.object.activity.render();
                hideRows(render);
                setTimeout(function () {
                    hideRows(render);
                }, 500);
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
