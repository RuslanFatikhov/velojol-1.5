document.addEventListener('DOMContentLoaded', function () {
    mapboxgl.accessToken = 'pk.eyJ1IjoiZnV6bGFuIiwiYSI6ImNsc2N3dnhuNTBrZXYya28xeG1mb3k3N3AifQ.bLjMuXA5JfgBW0pwtjQxxA'; // Замените на ваш ключ Mapbox

    // Функция, возвращающая стиль карты в зависимости от темы
    function getMapStyle() {
        return document.documentElement.getAttribute('data-theme') === 'light'
            ? 'mapbox://styles/mapbox/light-v11'
            : 'mapbox://styles/mapbox/dark-v11';
    }

    // Инициализация карты
    const map = new mapboxgl.Map({
        container: 'map',
        style: getMapStyle(),
        center: routeCoordinates[0], // Центрируем карту на первой точке маршрута
        zoom: 12
    });

    map.on('load', function () {
        // Добавляем маршрут на карту
        map.addSource('route', {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: routeCoordinates
                }
            }
        });

        map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#007cbf',
                'line-width': 4
            }
        });
    });

    // Функция для пересоздания стиля карты при смене темы
    function reloadMapStyle() {
        const newStyle = getMapStyle();
        const currentStyle = map.getStyle();
        const sources = {};
        const layers = [];

        // Сохраняем все слои и их источники
        if (currentStyle && currentStyle.layers) {
            currentStyle.layers.forEach(layer => {
                if (layer.id === 'route') {
                    layers.push(layer);
                    const src = map.getSource(layer.source);
                    if (src && src._data && !sources[layer.source]) {
                        sources[layer.source] = src._data;
                    }
                }
            });
        }

        // Меняем стиль
        map.setStyle(newStyle);

        // Когда стиль загрузится, восстанавливаем источники и слои
        map.once('style.load', () => {
            Object.keys(sources).forEach(sourceId => {
                map.addSource(sourceId, { type: 'geojson', data: sources[sourceId] });
            });
            layers.forEach(layer => {
                map.addLayer(layer);
            });
        });
    }

    // Создаём наблюдатель, который следит за сменой data-theme
    const observer = new MutationObserver(reloadMapStyle);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Управление зумом
    const zoomInButton = document.getElementById('zoomIn');
    const zoomOutButton = document.getElementById('zoomOut');

    if (zoomInButton && zoomOutButton) {
        zoomInButton.addEventListener('click', function () {
            map.zoomIn();
        });

        zoomOutButton.addEventListener('click', function () {
            map.zoomOut();
        });
    }
});
