document.addEventListener('DOMContentLoaded', function () {
    mapboxgl.accessToken = 'pk.eyJ1IjoiZnV6bGFuIiwiYSI6ImNsc2N3dnhuNTBrZXYya28xeG1mb3k3N3AifQ.bLjMuXA5JfgBW0pwtjQxxA'; // Замените на ваш ключ Mapbox

    // Инициализация карты
    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/dark-v11',
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

    // Управление зумом (по желанию)
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
