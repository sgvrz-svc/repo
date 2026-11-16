(function () {
    'use strict';

    var started = false;
    var timer;
    var attempts = 0;

    function normalize(text) {
        return (text || '').replace(/\s+/g, ' ').trim().toLowerCase();
    }

    function findByText(selectors, phrases) {
        var elements = document.querySelectorAll(selectors);

        for (var i = 0; i < elements.length; i++) {
            var text = normalize(elements[i].innerText || elements[i].textContent);

            for (var j = 0; j < phrases.length; j++) {
                if (text === normalize(phrases[j])) return elements[i];
            }
        }

        return null;
    }

    function activate(element) {
        if (!element) return false;

        if (window.Lampa && Lampa.Controller) {
            Lampa.Controller.focus(element);
        }

        if (window.jQuery) {
            window.jQuery(element).trigger('hover:enter');
        } else {
            element.click();
        }

        return true;
    }

    function openTorrents() {
        attempts++;

        var torrents = findByText(
            '.selector, .selectbox__item, .modal__item, .menu__item, button, a',
            ['Торренты', 'Торрент']
        );

        if (torrents) {
            clearInterval(timer);
            activate(torrents);
            started = false;
            return;
        }

        if (attempts > 30) {
            clearInterval(timer);
            started = false;
            return;
        }
    }

    function openWatch(data) {
        if (started || !data || !data.object || !data.object.activity) return;

        started = true;

        setTimeout(function () {
            var root = data.object.activity.render();
            var watch = null;

            if (root && root.length) {
                root.find('.full-start__button, .selector, button, a').each(function () {
                    var text = normalize(this.innerText || this.textContent);

                    if (text === 'смотреть') {
                        watch = this;
                        return false;
                    }
                });
            }

            if (!activate(watch)) {
                started = false;
                return;
            }

            attempts = 0;
            timer = setInterval(openTorrents, 250);
        }, 150);
    }

    Lampa.Listener.follow('full', function (event) {
        if (event.type === 'complite') openWatch(event.data);
    });
})();
