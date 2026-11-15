(function () {
	"use strict";

    const manifest = {
        type: 'interface',
        version: '5.3.7',
        name: 'UI Style',
        component: 'ui_style'
    };
    Lampa.Manifest.plugins = manifest;

	var PLUGIN_ID = "torrent_styles_mod";
	var PLUGIN_NAME = "Torrent Styles MOD";

	var STYLES = {
		".torrent-item__seeds span.high-seeds": {
			color: "#00b300",
			"font-weight": "bold"
		},

		".torrent-item__bitrate span.high-bitrate": {
			color: "#b30000",
			"font-weight": "bold"
		},

		".torrent-item.selector.focus": {
			"box-shadow": "0 0 0 0.3em #1aff00"
		},

		".torrent-serial.selector.focus": {
			"box-shadow": "0 0 0 0.25em #1aff00"
		},

		".torrent-file.selector.focus": {
			"box-shadow": "0 0 0 0.25em #1aff00"
		},

		".torrent-item.focus::after": {
			border: "none"
		},

		".scroll__body": {
			margin: "5px"
		}
	};

    // FULL
  function initFull() {
    Lampa.Listener.follow('full', (e) => {
      if (e.type !== 'complite') return;
      // TITLE
      const title = e.data.movie.title;
      const titleOriginal = e.data.movie.original_title;
      const titleElement = e.body.find('.full-start-new__title');
      if (title && titleOriginal && title !== titleOriginal) {
        titleElement.before($('<div class="full-start-new__title-original"></div>').text(titleOriginal));
      }

      // BUTTONS
      const buttonsContainer = e.body.find('.full-start-new__buttons');
      const buttonOnline = e.body.find('.view--online');
      const buttonTorrent = e.body.find('.view--torrent');
      const buttonBook = e.body.find('.button--book');
      buttonsContainer.children('.full-start__button')
        .not(buttonOnline).not(buttonTorrent).not(buttonBook)
        .remove();
      [buttonOnline, buttonTorrent, buttonBook].forEach((button) => {
        if (button.length) buttonsContainer.append(button);
      });
    });
  }

  // EXIT
  function initExit() {
    let exiting = false;
    const originalSelectShow = Lampa.Select.show;

    Lampa.Select.show = function (object) {
      const item = object && object.items ? object.items.find((i) => i.out === true) : null;
      if (item && typeof object.onSelect === 'function') {
        if (exiting) return;
        exiting = true;
        object.onSelect(item);
        setTimeout(() => { exiting = false; }, 1000);
        return;
      }
      return originalSelectShow.apply(this, arguments);
    };
  }

  // TV
  function initTv() {
    if (Lampa.Helper) Lampa.Helper.show = function () {};
    if (Lampa.RemoteHelper) Lampa.RemoteHelper.show = function () {};
  }

	function injectStyles() {
		try {
			var style = document.createElement("style");
			var css = Object.keys(STYLES)
				.map(function (selector) {
					var props = STYLES[selector];
					var rules = Object.keys(props)
						.map(function (prop) {
							return prop + ": " + props[prop] + " !important";
						})
						.join("; ");
					return selector + " { " + rules + " }";
				})
				.join("\n");

			style.setAttribute("data-" + PLUGIN_ID + "-styles", "true");
			style.innerHTML = css;
			document.head.appendChild(style);
		} catch (e) {
			console.error(PLUGIN_NAME + " style injection error:", e);
		}
	}

	function updateTorrentStyles() {
		try {
			document
				.querySelectorAll(".torrent-item__seeds span")
				.forEach(function (span) {
					var value = parseInt(span.textContent, 10) || 0;
					if (value > 10) span.classList.add("high-seeds");
					else span.classList.remove("high-seeds");
				});

			document
				.querySelectorAll(".torrent-item__bitrate span")
				.forEach(function (span) {
					var value = parseFloat(span.textContent) || 0;
					if (value > 50) span.classList.add("high-bitrate");
					else span.classList.remove("high-bitrate");
				});
		} catch (e) {
			console.error(PLUGIN_NAME + " torrent update error:", e);
		}
	}

	function observeDom() {
		try {
			var observer = new MutationObserver(function (mutations) {
				var hasAdded = false;
				for (var i = 0; i < mutations.length; i++) {
					if (mutations[i].addedNodes && mutations[i].addedNodes.length) {
						hasAdded = true;
						break;
					}
				}
				if (hasAdded) updateTorrentStyles();
			});

			observer.observe(document.body, { childList: true, subtree: true });
			updateTorrentStyles();
		} catch (e) {
			console.error(PLUGIN_NAME + " observer error:", e);
			updateTorrentStyles();
		}
	}

	function registerPlugin() {
		try {
			if (typeof Lampa !== "undefined") {
				Lampa.Manifest = Lampa.Manifest || {};
				Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};

				Lampa.Manifest.plugins[PLUGIN_ID] = {
					type: "other",
					name: PLUGIN_NAME,
					version: "1.0.0",
					description: "Дополнительные стили для карточек торрентов."
				};
			}
		} catch (e) {
			console.error(PLUGIN_NAME + " register error:", e);
		} finally {
			window["plugin_" + PLUGIN_ID + "_ready"] = true;
		}
	}

	function waitForAppReady() {
		try {
			if (typeof Lampa !== "undefined") {
				if (window.appready) {
					registerPlugin();
				} else if (
					Lampa.Listener &&
					typeof Lampa.Listener.follow === "function"
				) {
					Lampa.Listener.follow("app", function (e) {
						if (e.type === "ready") registerPlugin();
					});
				} else {
					setTimeout(registerPlugin, 500);
				}
				return;
			}

			var attempts = 0;
			var timer = setInterval(function () {
				attempts++;
				if (typeof Lampa !== "undefined") {
					clearInterval(timer);
					waitForAppReady();
				} else if (attempts > 40) {
					clearInterval(timer);
					window["plugin_" + PLUGIN_ID + "_ready"] = true;
				}
			}, 250);
		} catch (e) {
			console.error(PLUGIN_NAME + " app wait error:", e);
		}
	}

	function start() {
		injectStyles();
		observeDom();
		waitForAppReady();
            if (window.ui_style) return;
    window.ui_style = true;

    initFull();
    initExit();
    initTv();

	}

  if (window.appready) start();
  else Lampa.Listener.follow('app', (event) => { if (event.type === 'ready') start(); });
  
})();