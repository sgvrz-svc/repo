(function () {
    'use strict';

    if (window.skipDescriptionTorrentsLoaded) return;
    window.skipDescriptionTorrentsLoaded = true;

    function openTorrents(event) {
        if (!event || event.type !== 'complite') return;

        var activity = event.object && event.object.activity;
        if (!activity || !activity.render) return;

        var button = activity.render().find('.view--torrent').first();
        if (!button.length) return;

        setTimeout(function () {
            button.trigger('hover:enter');
        }, 300);
    }

    if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('full', openTorrents);
    }
})();