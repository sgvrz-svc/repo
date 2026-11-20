(function () {
    'use strict';

    var PLUGIN_ID = 'torrent_styles_mod';
    var PLUGIN_NAME = 'Torrent Styles MOD';
    var STYLE_ID = 'torrent-styles-mod-style';

    var manifest = {
        type: 'interface',
        version: '5.3.7',
        name: 'UI Style',
        component: 'ui_style'
    };

    var pluginManifest = {
        type: 'other',
        name: PLUGIN_NAME,
        version: '1.0.0',
        description: 'Дополнительные стили и настройки интерфейса.'
    };

    var STYLES = {
        '.torrent-item__seeds span.high-seeds': {
            color: '#00b300',
            'font-weight': 'bold'
        },
        '.torrent-item__bitrate span.high-bitrate': {
            color: '#b30000',
            'font-weight': 'bold'
        },
        '.torrent-item.selector.focus': {
            'box-shadow': '0 0 0 0.3em #1aff00'
        },
        '.torrent-serial.selector.focus': {
            'box-shadow': '0 0 0 0.25em #1aff00'
        },
        '.torrent-file.selector.focus': {
            'box-shadow': '0 0 0 0.25em #1aff00'
        },
        '.torrent-item.focus::after': {
            border: 'none'
        },
        '.selector.focus::after': {
            'border-color': '#1aff00'
        },
        '.scroll__body': {
            margin: '5px'
        },
        '.wrap__content': {
            'padding-top': '0'
        }
    };

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;

        try {
            var style = document.createElement('style');
            var css = Object.keys(STYLES).map(function (selector) {
                var rules = Object.keys(STYLES[selector]).map(function (prop) {
                    return prop + ': ' + STYLES[selector][prop] + ' !important';
                }).join('; ');

                return selector + ' { ' + rules + ' }';
            }).join('\n');

            style.id = STYLE_ID;
            style.textContent = css;
            (document.head || document.documentElement).appendChild(style);
        } catch (e) {
            console.error(PLUGIN_NAME + ' style injection error:', e);
        }
    }

    function updateTorrentStyles() {
        try {
            document.querySelectorAll('.torrent-item__seeds span').forEach(function (span) {
                var value = parseInt(span.textContent, 10) || 0;
                span.classList.toggle('high-seeds', value > 10);
            });

            document.querySelectorAll('.torrent-item__bitrate span').forEach(function (span) {
                var value = parseFloat(span.textContent) || 0;
                span.classList.toggle('high-bitrate', value > 50);
            });
        } catch (e) {
            console.error(PLUGIN_NAME + ' torrent update error:', e);
        }
    }

    function observeDom() {
        try {
            var observer = new MutationObserver(function (mutations) {
                var hasAddedNodes = mutations.some(function (mutation) {
                    return mutation.addedNodes && mutation.addedNodes.length;
                });

                if (hasAddedNodes) updateTorrentStyles();
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            updateTorrentStyles();
        } catch (e) {
            console.error(PLUGIN_NAME + ' observer error:', e);
            updateTorrentStyles();
        }
    }

    function initFull() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite') return;

            var movie = e.data && e.data.movie;
            if (!movie) return;

            var title = movie.title;
            var titleOriginal = movie.original_title;
            var titleElement = e.body.find('.full-start-new__title');

            if (title && titleOriginal && title !== titleOriginal && titleElement.length) {
                titleElement.before(
                    $('<div class="full-start-new__title-original"></div>').text(titleOriginal)
                );
            }

            var buttonsContainer = e.body.find('.full-start-new__buttons');
            if (!buttonsContainer.length) return;

            var buttonOnline = e.body.find('.view--online');
            var buttonTorrent = e.body.find('.view--torrent');
            var buttonBook = e.body.find('.button--book');

            buttonsContainer.children('.full-start__button')
                .not(buttonOnline)
                .not(buttonTorrent)
                .not(buttonBook)
                .remove();

            [buttonOnline, buttonTorrent, buttonBook].forEach(function (button) {
                if (button.length) buttonsContainer.append(button);
            });
        });
    }

    function initExit() {
        var exiting = false;
        var originalSelectShow = Lampa.Select.show;

        Lampa.Select.show = function (object) {
            var item = object && object.items
                ? object.items.find(function (entry) {
                    return entry.out === true;
                })
                : null;

            if (item && typeof object.onSelect === 'function') {
                if (exiting) return;

                exiting = true;
                object.onSelect(item);
                setTimeout(function () {
                    exiting = false;
                }, 1000);

                return;
            }

            return originalSelectShow.apply(this, arguments);
        };
    }

    function initTv() {
        if (Lampa.Helper) Lampa.Helper.show = function () {};
        if (Lampa.RemoteHelper) Lampa.RemoteHelper.show = function () {};
    }

    function registerPlugin() {
        try {
            Lampa.Manifest = Lampa.Manifest || {};
            Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};

            Lampa.Manifest.plugins.ui_style = manifest;
            Lampa.Manifest.plugins[PLUGIN_ID] = pluginManifest;
        } catch (e) {
            console.error(PLUGIN_NAME + ' register error:', e);
        } finally {
            window['plugin_' + PLUGIN_ID + '_ready'] = true;
        }
    }

    function start() {
        if (window.ui_style) return;
        window.ui_style = true;

        injectStyles();
        observeDom();
        registerPlugin();

        initFull();
        initExit();
        initTv();
    }

    if (window.appready) {
        start();
    } else if (typeof Lampa !== 'undefined' &&
               Lampa.Listener &&
               typeof Lampa.Listener.follow === 'function') {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') start();
        });
    } else {
        var attempts = 0;
        var timer = setInterval(function () {
            attempts++;

            if (typeof Lampa !== 'undefined' &&
                Lampa.Listener &&
                typeof Lampa.Listener.follow === 'function') {
                clearInterval(timer);

                if (window.appready) {
                    start();
                } else {
                    Lampa.Listener.follow('app', function (event) {
                        if (event.type === 'ready') start();
                    });
                }
            } else if (attempts >= 40) {
                clearInterval(timer);
            }
        }, 250);
    }
})();
