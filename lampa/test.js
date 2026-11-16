(function () {
    if (!window.Lampa || !Lampa.Activity) {
        alert('Lampa.Activity не найден');
        return;
    }

    var box = document.createElement('pre');
    box.style.cssText = 'position:fixed;z-index:999999;left:5px;right:5px;bottom:5px;max-height:45vh;overflow:auto;background:#000;color:#0f0;padding:10px;font:12px monospace;white-space:pre-wrap';
    box.textContent = 'Диагностика переходов активна\n';
    document.body.appendChild(box);

    var originalPush = Lampa.Activity.push;

    Lampa.Activity.push = function () {
        var item = arguments[0] || {};
        var info = {
            component: item.component,
            title: item.title,
            keys: Object.keys(item)
        };

        if (item.data && typeof item.data === 'object') {
            info.dataKeys = Object.keys(item.data);
        }

        box.textContent += '\n' + JSON.stringify(info);
        return originalPush.apply(this, arguments);
    };
})();