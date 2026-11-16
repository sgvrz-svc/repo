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
        rule.elements.forEach(function (className) {
            const elements = container.querySelectorAll('.' + CSS.escape(className));

            elements.forEach(function (element) {
                let target = element;
                let steps = Math.abs(rule.level);

                while (steps > 0) {
                    if (!target.parentElement || target.parentElement === container) {
                        return;
                    }

                    target = target.parentElement;
                    steps--;
                }

                if (target !== container && container.contains(target)) {
                    target.remove();
                }
            });
        });
    }

    function process(root) {
        if (!root || root.nodeType !== 1) return;

        rules.forEach(function (rule) {
            if (root.matches('.' + CSS.escape(rule.container))) {
                processContainer(root, rule);
            }

            root.querySelectorAll('.' + CSS.escape(rule.container)).forEach(function (container) {
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
