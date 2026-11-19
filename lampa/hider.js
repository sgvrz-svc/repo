(function () {
    'use strict';

    const rules = [
        {
            container: 'head',
            elements: ['head__body'],
            level: 0
        },
        {
            container: 'menu',
            elements: ['menu__split'],
            level: 0
        },
        {
            container: 'menu',
            elements: ['menu__case', 'nosort'],
            level: 0
        },
        {
            container: 'explorer__files',
            elements: ['explorer__files-head'],
            level: 0
        },
        {
            container: 'explorer__files-body',
            elements: ['empty'],
            level: -1
        },
        {
            container: 'torrent-list',
            elements: ['watched-history', 'selector'],
            level: 0
        }
    ];

    function isHidden(element) {
        let current = element;

        while (current && current !== document.documentElement) {
            if (
                current.classList &&
                (current.classList.contains('hide') ||
                    current.getAttribute('aria-hidden') === 'true')
            ) {
                return true;
            }

            current = current.parentElement;
        }

        return false;
    }

    function focusFirstAvailable() {
        const first = Array.from(document.querySelectorAll('.selector')).find(function (element) {
            return (
                !isHidden(element) &&
                element.getClientRects().length > 0 &&
                element.getAttribute('aria-disabled') !== 'true' &&
                !element.disabled
            );
        });

        if (!first || !window.Lampa || !Lampa.Controller) return;

        const collection = window.$ ? $(document.body) : document.body;

        Lampa.Controller.collectionSet(collection);
        Lampa.Controller.collectionFocus(first, collection);
    }

    function processContainer(container, rule) {
        const elementSelector = rule.elements
            .map(function (className) {
                return '.' + CSS.escape(className);
            })
            .join('');

        let changed = false;

        container.querySelectorAll(elementSelector).forEach(function (element) {
            let target = element;

            for (let i = 0; i < Math.abs(rule.level); i++) {
                if (!target.parentElement) return;
                target = target.parentElement;
            }

            if (
                target !== document.documentElement &&
                !target.classList.contains(rule.addClass)
            ) {
                target.classList.add(rule.addClass);
                changed = true;
            }
        });

        if (changed) {
            requestAnimationFrame(focusFirstAvailable);
        }
    }

    function process(root) {
        if (!root || root.nodeType !== 1) return;

        rules.forEach(function (rule) {
            const containerSelector = '.' + CSS.escape(rule.container);

            if (root.matches(containerSelector)) {
                processContainer(root, rule);
            }

            root.querySelectorAll(containerSelector).forEach(function (container) {
                processContainer(container, rule);
            });
        });
    }

    function start() {
        process(document.body);

        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeType === 1) {
                        process(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    if (document.body) {
        start();
    } else {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    }
})();