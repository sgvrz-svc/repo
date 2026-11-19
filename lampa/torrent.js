(function () {
    'use strict';

    if (!window.Lampa || !Lampa.Activity || window.skipDescriptionTorrentsLoaded) return;
    window.skipDescriptionTorrentsLoaded = true;

    var originalPush = Lampa.Activity.push;

    Lampa.Activity.push = function (activity) {
        if (!activity || activity.component !== 'full' || !activity.card) {
            return originalPush.apply(this, arguments);
        }

        var movie = activity.card;
        var originalTitle = movie.original_title || movie.title || '';
        var localTitle = movie.title || originalTitle;

        return originalPush.call(this, {
            url: '',
            title: 'Торренты',
            component: 'torrents',
            search: originalTitle,
            search_one: localTitle,
            search_two: originalTitle,
            movie: movie,
            page: activity.page || 1
        });
    };
})();