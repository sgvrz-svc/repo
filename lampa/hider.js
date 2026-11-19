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

    function focusFirstAvailable(root) {
        const scope = root && root.isConnected ? root : document.body;

        const first = Array.from(scope.querySelectorAll('.selector')).find(function (element) {
            return (
                element.getClientRects().length > 0 &&
                element.getAttribute('aria-disabled') !== 'true' &&
                !element.disabled
            );
        });

        if (!first || !window.Lampa || !Lampa.Controller) return;

        const collection = window.$ ? $(scope) : scope;

        Lampa.Controller.collectionSet(collection);
        Lampa.Controller.collectionFocus(first, collection);
    }

    function processContainer(container, rule) {
        const selector = rule.elements
            .map(function (className) {
                return '.' + CSS.escape(className);
            })
            .join('');

        const elements = [];

        if (container.matches(selector)) {
            elements.push(container);
        }

        elements.push(...container.querySelectorAll(selector));

        let focusRoot = null;
        let removed = false;

        elements.forEach(function (element) {
            let target = element;

            for (let i = 0; i < Math.abs(rule.level); i++) {
                if (!target.parentElement) return;
                target = target.parentElement;
            }

            if (
                target === document.body ||
                target === document.documentElement ||
                !target.isConnected
            ) {
                return;
            }

            focusRoot = target.parentElement;
            target.remove();
            removed = true;
        });

        if (removed) {
            requestAnimationFrame(function () {
                focusFirstAvailable(focusRoot);
            });
        }
    }

    function process(root) {
        if (!root || root.nodeType !== 1) return;

        rules.forEach(function (rule) {
            const containerSelector = '.' + CSS.escape(rule.container);
            const containers = new Set();

            const ancestor = root.closest(containerSelector);
            if (ancestor) containers.add(ancestor);

            if (root.matches(containerSelector)) {
                containers.add(root);
            }

            root.querySelectorAll(containerSelector).forEach(function (container) {
                containers.add(container);
            });

            containers.forEach(function (container) {
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