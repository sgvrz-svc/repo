(function () {
    if (!window.Lampa || !Lampa.Activity) return;

    var originalPush = Lampa.Activity.push;

    Lampa.Activity.push = function () {
        var item = arguments[0] || {};

        if (item.component === 'torrents') {
            var result = {};

            Object.keys(item).forEach(function (key) {
                var value = item[key];

                if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
                    result[key] = value;
                } else if (value && typeof value === 'object') {
                    result[key] = {};
                    Object.keys(value).forEach(function (name) {
                        var entry = value[name];

                        if (entry === null || ['string', 'number', 'boolean'].includes(typeof entry)) {
                            result[key][name] = entry;
                        } else if (entry && typeof entry === 'object') {
                            result[key][name] = '[object: ' + Object.keys(entry).join(', ') + ']';
                        }
                    });
                }
            });

            prompt('Скопируйте данные перехода к торрентам:', JSON.stringify(result, null, 2));
        }

        return originalPush.apply(this, arguments);
    };
})();