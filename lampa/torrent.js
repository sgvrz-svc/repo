(function () {
    'use strict';

    const rules = [
        {
            container: 'torrent-list',
            elements: ['watched-history', 'selector'],
            level: 0
        }
    ];

    function processContainer(container, rule) {
        const selector = rule.elements
            .map(function (className) {
                return '.' + CSS.escape(className);
            })
            .join('');

        container.querySelectorAll(selector).forEach(function (element) {
            let target = element;

            for (let i = 0; i < Math.abs(rule.level); i++) {
                if (!target.parentElement || target.parentElement === container) {
                    return;
                }

                target = target.parentElement;
            }

            if (target !== container && container.contains(target)) {
                target.remove();
            }
        });
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
