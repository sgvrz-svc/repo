(function () {
    'use strict';

    const rules = [
        {
            container: 'torrent-list',
            elements: ['watched-history', 'selector'],
            level: 0
        }
    ];

    function removeMatches(root, rule) {
        if (!root || root.nodeType !== 1) return;

        const containers = [];

        if (root.classList.contains(rule.container)) {
            containers.push(root);
        }

        containers.push(...root.querySelectorAll('.' + CSS.escape(rule.container)));

        containers.forEach(function (container) {
            rule.elements.forEach(function (className) {
                const matches = [];

                if (container.classList.contains(className)) {
                    matches.push(container);
                }

                matches.push(...container.querySelectorAll('.' + CSS.escape(className)));

                matches.forEach(function (element) {
                    let target = element;

                    for (let i = 0; i < Math.abs(rule.level); i++) {
                        if (!target.parentElement) return;
                        target = target.parentElement;
                    }

                    target.remove();
                });
            });
        });
    }

    function process(root) {
        rules.forEach(function (rule) {
            removeMatches(root, rule);
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
