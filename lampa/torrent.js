(function () {
    "use strict";

    var PLUGIN_ID = "torrent_styles_mod";
    var PLUGIN_NAME = "Torrent Styles MOD";

    // 1. Стили в виде строки (статичные)
    const staticStyle = `
    .full-start-new__title-original { font-size: 1.6em; margin-bottom: 0em; }
    .full-start-new__buttons .full-start__button:not(.focus) span { display: unset; }
    .source--name { display: none; }
    .time-line > div { background-color: #3498DB; }
    .torrent-serial .time-line { width: stretch; top: unset; bottom: 0; left: unset; }
    .torrent-item__ffprobe > .m-general + div,
    .torrent-item__ffprobe > div:not(.m-channels):not(.m-audio) + .m-channels,
    .torrent-item__ffprobe > div:not(.m-channels):not(.m-audio) + .m-audio,
    .torrent-item__ffprobe > div:not(.m-subtitle) + .m-subtitle { clear: both; }
    @media screen and (min-width: 768px) {
      .torrent-item__details { flex-wrap: wrap; }
      .torrent-item__tracker { order: 1; }
      .torrent-item__seeds { order: 2; }
      .torrent-item__grabs { order: 3; margin-right: 0; }
      .torrent-item__details::after { content: ''; order: 4; flex-basis: 100%; margin-top: 0.4em; }
      .torrent-item__date { order: 5; margin-right: auto; }
      .torrent-item__bitrate { order: 6; margin-right: 0; }
      .torrent-item__size { order: 7; margin-left: 1em; }
    }
  `;

    // 2. Динамические стили (из объекта STYLES)
    var STYLES = {
        ".torrent-item__seeds span.high-seeds": { color: "#00b300", "font-weight": "bold" },
        ".torrent-item__bitrate span.high-bitrate": { color: "#b30000", "font-weight": "bold" },
        ".torrent-item.selector.focus": { "box-shadow": "0 0 0 0.3em #1aff00" },
        ".torrent-serial.selector.focus": { "box-shadow": "0 0 0 0.25em #1aff00" },
        ".torrent-file.selector.focus": { "box-shadow": "0 0 0 0.25em #1aff00" },
        ".torrent-item.focus::after": { border: "none" },
        ".scroll__body": { margin: "5px" }
    };

    function injectStyles() {
        const styleTag = document.createElement('style');
        styleTag.textContent = staticStyle;
        document.head.appendChild(styleTag);

        const dynamicTag = document.createElement("style");
        const css = Object.keys(STYLES).map(selector => {
            const props = STYLES[selector];
            const rules = Object.keys(props).map(prop => `${prop}: ${props[prop]} !important`).join("; ");
            return `${selector} { ${rules} }`;
        }).join("\n");
        dynamicTag.setAttribute("data-" + PLUGIN_ID + "-styles", "true");
        dynamicTag.innerHTML = css;
        document.head.appendChild(dynamicTag);
    }

    function updateTorrentStyles() {
        try {
            document.querySelectorAll(".torrent-item__seeds span").forEach(span => {
                var value = parseInt(span.textContent, 10) || 0;
                span.classList.toggle("high-seeds", value > 10);
            });
            document.querySelectorAll(".torrent-item__bitrate span").forEach(span => {
                var value = parseFloat(span.textContent) || 0;
                span.classList.toggle("high-bitrate", value > 50);
            });
        } catch (e) { console.error(PLUGIN_NAME + " update error:", e); }
    }

    function observeDom() {
        const observer = new MutationObserver(mutations => {
            if (mutations.some(m => m.addedNodes.length)) updateTorrentStyles();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        updateTorrentStyles();
    }

    function initFull() {
        Lampa.Listener.follow('full', (e) => {
            if (e.type !== 'complite') return;
            const { movie } = e.data;
            if (movie.title && movie.original_title && movie.title !== movie.original_title) {
                e.body.find('.full-start-new__title').before($('<div class="full-start-new__title-original"></div>').text(movie.original_title));
            }
            const buttonsContainer = e.body.find('.full-start-new__buttons');
            const keep = ['.view--online', '.view--torrent', '.button--book'];
            buttonsContainer.children('.full-start__button').each(function() {
                const isKeep = keep.some(selector => $(this).is(selector));
                if (!isKeep) $(this).remove();
            });
        });
    }

    function initExit() {
        const originalSelectShow = Lampa.Select.show;
        Lampa.Select.show = function (object) {
            const item = object && object.items ? object.items.find(i => i.out === true) : null;
            if (item && typeof object.onSelect === 'function') {
                object.onSelect(item);
                return;
            }
            return originalSelectShow.apply(this, arguments);
        };
    }

    function initTv() {
        if (Lampa.Helper) Lampa.Helper.show = () => {};
        if (Lampa.RemoteHelper) Lampa.RemoteHelper.show = () => {};
    }

    function registerPlugin() {
        if (typeof Lampa !== "undefined") {
            Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};
            Lampa.Manifest.plugins[PLUGIN_ID] = {
                type: "other",
                name: PLUGIN_NAME,
                version: "1.0.0",
                description: "Дополнительные стили для карточек торрентов."
            };
        }
    }

    function start() {
        if (window.ui_style_loaded) return;
        window.ui_style_loaded = true;
        
        registerPlugin();
        injectStyles();
        observeDom();
        initFull();
        initExit();
        initTv();
    }

    if (window.appready) {
        start();
    } else if (typeof Lampa !== "undefined" && Lampa.Listener) {
        Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') start(); });
    } else {
        // Резервный запуск, если Lampa еще не определена
        var checkLampa = setInterval(() => {
            if (typeof Lampa !== "undefined") {
                clearInterval(checkLampa);
                start();
            }
        }, 500);
    }
})();
