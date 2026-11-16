(function () {
    'use strict';

    function hideBlock() {
        var args = Array.prototype.slice.call(arguments);
        var level = 0;

        if (typeof args[args.length - 1] === 'number') {
            level = args.pop();
        }

        var classes = [];

        args.forEach(function (arg) {
            if (Array.isArray(arg)) {
                arg.forEach(function (className) {
                    if (typeof className === 'string' && className.trim()) {
                        classes.push(className.trim());
                    }
                });
            } else if (typeof arg === 'string' && arg.trim()) {
                classes.push(arg.trim());
            }
        });

        if (classes.length === 0) return;

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

            target.style.display = 'none';
        });
    }


    hideBlock('watched-history', 'selector');

    function observePage() {
        if (!document.body) {
            document.addEventListener('DOMContentLoaded', observePage, {
                once: true
            });
            return;
        }

        var observer = new MutationObserver(function () {
            hideBlock('watched-history', 'selector');
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        hideBlock('watched-history', 'selector');
    }

    observePage();
})();
