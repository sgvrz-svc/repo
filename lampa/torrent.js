(function () {
    'use strict';

    var selector = 'div.watched-history.selector';

    function removeWatchedHistory() {
        document.querySelectorAll(selector).forEach(function (element) {
            element.remove();
        });
    }

    // Удалить элемент, если он уже есть, и следить за его повторным появлением.
    removeWatchedHistory();

    var observer = new MutationObserver(removeWatchedHistory);

    function startObserver() {
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            removeWatchedHistory();
        } else {
            document.addEventListener('DOMContentLoaded', startObserver, {
                once: true
            });
        }
    }

    startObserver();
})();