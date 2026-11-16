(function () {
    if (!window.Lampa || !Lampa.Activity) return;

    var box = document.createElement('pre');
    box.style.cssText = 'position:fixed;z-index:999999;left:5px;right:5px;bottom:5px;max-height:60vh;overflow:auto;background:#000;color:#0f0;padding:10px;font:12px monospace;white-space:pre-wrap';
    box.textContent = 'Параметры переходов\n';
    document.body.appendChild(box);

    var originalPush = Lampa.Activity.push;
    var fields = ['component', 'title', 'url', 'search', 'query', 'id', 'movie', 'data', 'source', 'object'];

    Lampa.Activity.push = function () {
        var item = arguments[0] || {};
        var info = {};

        fields.forEach(function (key) {
            var value = item[key];

            if (value !== undefined) {
                if (value && typeof value === 'object') {
                    info[key] = {
                        keys: Object.keys(value),
                        values: Object.keys(value).reduce(function (result, name) {
                            var entry = value[name];
                            if (entry === null || ['string', 'number', 'boolean'].includes(typeof entry)) {
                                result[name] = entry;
                            }
                            return result;
                        }, {})
                    };
                } else {
                    info[key] = value;
                }
            }
        });

        box.textContent += '\n' + JSON.stringify(info);
        return originalPush.apply(this, arguments);
    };
})();
