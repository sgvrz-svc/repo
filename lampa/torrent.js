(function () {
    'use strict';

    /**
     * Скрывает div с указанными классами.
     * Последний числовой аргумент — уровень родителя:
     *   без числа или 0 — сам div;
     *   -1 — родитель;
     *   -2 — родитель на два уровня выше.
     *
     * Примеры:
     * hideBlock('watched-history');
     * hideBlock('watched-history', 'selector', -1);
     * hideBlock(['watched-history', 'selector'], -2);
     */
    function hideBlock() {
        var args = Array.prototype.slice.call(arguments);
        var level = 0;

        if (typeof args[args.length - 1] === 'number') {
            level = args.pop();
        }

        var classes = [];

        args.forEach(function (arg) {
            var names = Array.isArray(arg) ? arg : [arg];

            names.forEach(function (className) {
                if (typeof className === 'string' && className.trim()) {
                    classes.push(className.trim());
                }
            });
        });

        if (!classes.length) return;

        document.querySelectorAll('div').forEach(function (element) {
            var matches = classes.every(function (className) {
                return element.classList.contains(className);
            });

            if (!matches) return;

            var target = element;
            var parentLevels = Math.abs(Math.min(level, 0));

            for (var i = 0; i < parentLevels; i++) {
                if (!target.parentElement) break;
                target = target.parentElement;
            }

            // Переносим фокус только если он находился внутри скрываемого блока.
            var activeElement = document.activeElement;
            var shouldMoveFocus =
                activeElement &&
                activeElement !== document.body &&
                target.contains(activeElement);

            target.style.display = 'none';

            if (shouldMoveFocus) {
                setTimeout(focusFirstItem, 100);
            }
        });
    }

    function focusFirstItem() {
        var items = document.querySelectorAll('.card, .selector');

        for (var i = 0; i < items.length; i++) {
            var item = items[i];

            if (item.closest('[style*="display: none"]')) continue;

            var style = window.getComputedStyle(item);
            if (style.display === 'none' || style.visibility === 'hidden') continue;

            if (window.Lampa && Lampa.Controller &&
                typeof Lampa.Controller.focus === 'function') {
                Lampa.Controller.focus(item);
            } else if (typeof item.focus === 'function') {
                item.focus();
            }

            return;
        }
    }

    // Укажите нужные классы и, при необходимости, уровень родителя.
    var hideTarget = function () {
        hideBlock('watched-history', 'selector');
        // Например, чтобы скрыть родителя:
        // hideBlock('watched-history', 'selector', -1);
    };

    function start() {
        if (!document.body) {
            document.addEventListener('DOMContentLoaded', start, { once: true });
            return;
        }

        hideTarget();

        var observer = new MutationObserver(hideTarget);
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    start();
})();
