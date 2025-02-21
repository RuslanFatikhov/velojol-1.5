/* routes_map.js
   Адаптирован на основе map.js для отображения и взаимодействия с маршрутами.
   Шаги:
   1. Инициализация карты с учётом темы (светлая/тёмная).
   2. Загрузка списка маршрутов (JSON) и их GPX-файлов.
   3. Отображение маршрутов линиями на карте.
   4. По клику на маршрут – центрируем карту и показываем модальное окно.
*/

// Функция, возвращающая стиль карты в зависимости от темы
function getMapStyle() {
    return document.documentElement.getAttribute('data-theme') === 'light'
        ? 'mapbox://styles/mapbox/light-v11'
        : 'mapbox://styles/mapbox/dark-v11';
}

// Обновление стиля карты при смене темы
function reloadMapStyle() {
    const newStyle = getMapStyle();
    const currentStyle = map.getStyle();
    const sources = {};
    const layers = [];

    // Сохраняем все слои и их источники (здесь необязательно, но показываем логику)
    if (currentStyle && currentStyle.layers) {
        currentStyle.layers.forEach(layer => {
            // Здесь можно отфильтровывать нужные слои, например, начинающиеся с "route-"
            if (layer.id.startsWith('route-')) {
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

// 1) Создаём наблюдатель, который следит за сменой data-theme
const observer = new MutationObserver(reloadMapStyle);
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// 2) Инициализация карты
mapboxgl.accessToken = 'pk.eyJ1IjoiZnV6bGFuIiwiYSI6ImNsc2N3dnhuNTBrZXYya28xeG1mb3k3N3AifQ.bLjMuXA5JfgBW0pwtjQxxA';

// Глобальная переменная карты
window.map = new mapboxgl.Map({
    container: 'map',
    style: getMapStyle(),
    center: cityCoordinates, // переменная из map.html
    zoom: cityZoom          // переменная из map.html
});

// 3) Массив маршрутов. Будем заполнять при загрузке.
let routesData = [];

// 4) Цвета для маршрутов
const routeColors = [
    '#e6194b', '#3cb44b', '#ffe119', '#0082c8', '#f58231', '#911eb4', '#46f0f0'
];

// 5) Функция для закрытия модального окна
function closeRouteModal() {
    const modal = document.getElementById('routeModal');
    if (modal) {
        modal.style.display = 'none';
    }
}
window.closeRouteModal = closeRouteModal; // чтобы дергать из HTML

// 5) Функция для закрытия модального окна
function closeRouteModal() {
    const modal = document.getElementById('routeModal');
    if (modal) {
        modal.style.display = 'none';
    }
}
window.closeRouteModal = closeRouteModal; // чтобы дергать из HTML

// 6) Открытие модального окна с информацией о маршруте
function openRouteModal(route) {
    document.getElementById('routeTitle').textContent = route.name;
    document.getElementById('routeDistance').textContent = `Расстояние: ${route.distance} км`;
    document.getElementById('routeHeight').textContent = `Перепад высоты: ${route.height} м`;
    document.getElementById('routeDifficulty').textContent = `Сложность: ${route.difficulty}`;
    document.getElementById('routeDescription').textContent = route.description;
    document.getElementById('routePhoto').src = `/static/img/routes/${route.photos}/cover.jpg`;

    document.getElementById('routeModal').style.display = 'block';
}

// Функция закрытия модального окна
document.getElementById('closeModal').addEventListener('click', function() {
    document.getElementById('routeModal').style.display = 'none';
});


// 6) Открытие модального окна с информацией о маршруте
function openRouteModal(route) {
    const modal = document.getElementById('routeModal');
    if (!modal) return;

    // Наполняем содержимым
    document.getElementById('routeTitle').textContent = route.name || 'Без названия';
    document.getElementById('routeDistance').textContent = `Расстояние: ${route.distance ?? 'N/A'} км`;
    document.getElementById('routeHeight').textContent = `Перепад высоты: ${route.height ?? 'N/A'} м`;
    document.getElementById('routeDifficulty').textContent = `Сложность: ${route.difficulty ?? 'N/A'}`;
    document.getElementById('routeDescription').textContent = route.description || '';

    // Пример: меняем фото обложки
    const routePhoto = document.getElementById('routePhoto');
    if (routePhoto) {
        routePhoto.src = `/static/img/routes/${route.photos}/cover.jpg`;
        routePhoto.alt = route.name;
    }

    // Показываем модал
    modal.style.display = 'block';
}

// 7) Устанавливаем прозрачность всех слоёв, кроме одного
function setRouteOpacity(exceptId = '') {
    const currentStyle = map.getStyle();
    if (!currentStyle || !currentStyle.layers) return;

    currentStyle.layers.forEach(layer => {
        if (layer.id.startsWith('route-')) {
            map.setPaintProperty(
                layer.id,
                'line-opacity',
                layer.id === exceptId ? 1 : 0.4
            );
        }
    });
}

// 8) Функция при клике по маршруту
function handleRouteClick(route, layerGeoJson) {
    // Выделяем маршрут
    setRouteOpacity(`route-${route.id}`);

    // Центрируемся на точках GPX (берем первую координату)
    if (
        layerGeoJson &&
        layerGeoJson.features &&
        layerGeoJson.features.length > 0 &&
        layerGeoJson.features[0].geometry.coordinates.length > 0
    ) {
        const coordinates = layerGeoJson.features[0].geometry.coordinates;
        // Можем пролететь к bounding box, чтобы показать весь маршрут
        const bbox = turf.bbox(layerGeoJson);
        map.fitBounds(bbox, { padding: 40 });
    }

    // Открываем модальное окно
    openRouteModal(route);
}

// 9) Создание слоя с маршрутом
async function createRouteLayer(route, color) {
    // Загрузка GPX
    const gpxUrl = `/static/data/gpx/${route.gpx}`;
    try {
        const response = await fetch(gpxUrl);
        const gpxText = await response.text();
        const gpx = new DOMParser().parseFromString(gpxText, 'text/xml');
        const geojson = toGeoJSON.gpx(gpx);

        // Источник
        const sourceId = `route-source-${route.id}`;
        map.addSource(sourceId, {
            type: 'geojson',
            data: geojson
        });

        // Слой
        const layerId = `route-${route.id}`;
        map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': color,
                'line-width': 5,
                'line-opacity': 0.4
            }
        });

        // Обработчик клика
        map.on('click', layerId, () => {
            handleRouteClick(route, geojson);
        });
    } catch (err) {
        console.error(`Ошибка загрузки GPX для маршрута ${route.id}:`, err);
    }
}

// 10) Функция заполнения списка маршрутов
function populateRoutesList(data) {
    const bikeRoutesList = document.getElementById('bikeRoutesList');
    if (!bikeRoutesList) return;
    bikeRoutesList.innerHTML = '';

    data.forEach((route, index) => {
        // Создаём элемент в списке
        const item = document.createElement('div');
        item.classList.add('bike-route-item'); // Перераспользуем стили
        const color = routeColors[index % routeColors.length];

        // Корректно объявляем пути к изображениям **внутри** цикла
        const imagePath = `/static/img/routes/${route.photos}/cover.jpg`;
        const placeholderPath = `/static/img/placeholder.jpg`;

        item.innerHTML = `
            <div class="vstack_important">
                <span class="hstack_important gap12">
                    <img src="${imagePath}" onerror="this.onerror=null; this.src='${placeholderPath}';" alt="${route.name}" class="route-thumbnail">

                    <span class="vstack_important">
                        <h6 class="dark-prime-invert-100" style="margin-bottom:4px;">${route.name}</h6>
                        <p>${route.difficulty}</p>
                    </span>
                </span>
            </div>

            <span class="hstack_important gap24">
                <span class="hstack_important gap4"><img class="theme-icon" style="max-width:20px !important; max-height:20px !important; min-width:20px !important; min-height:20px !important;" src="static/img/icon/distance.svg"><p class="dark-prime-invert-100">${route.distance}км</p></span>
                <span class="hstack_important gap4"><img class="theme-icon" style="max-width:20px !important; max-height:20px !important; min-width:20px !important; min-height:20px !important;" src="static/img/icon/high.svg"><p class="dark-prime-invert-100">${route.height}м</p></span>
                <span class="hstack_important gap4"><img class="theme-icon" style="max-width:20px !important; max-height:20px !important; min-width:20px !important; min-height:20px !important;" src="static/img/icon/time.svg"><p class="dark-prime-invert-100">${route.time}м</p></span>  
            </span>
        </div>
        `;

        // При клике на элемент списка – тоже открываем маршрут
        item.addEventListener('click', () => {
            const layerId = `route-${route.id}`;
            const sourceId = `route-source-${route.id}`;
            const source = map.getSource(sourceId);
            if (source) {
                // GeoJSON
                const data = source._data;
                handleRouteClick(route, data);
            } else {
                console.warn('Источник не найден:', sourceId);
            }
        });

        bikeRoutesList.appendChild(item);
    });
}


// 11) Основная загрузка
map.on('load', function () {
    // Загружаем список маршрутов
    // Пример пути: /static/data/routes/${cityId}_routes.json
    // Или можно передать через глобальную переменную. Для гибкости примерим fetch.
    const routesUrl = `/static/data/routes/${cityId}_routes.json`;

    fetch(routesUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка при загрузке JSON: ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            routesData = data; // сохраняем

            // Создаём слои для каждого маршрута
            routesData.forEach((route, idx) => {
                const color = routeColors[idx % routeColors.length];
                createRouteLayer(route, color);
            });

            // Заполняем список
            populateRoutesList(routesData);
        })
        .catch(err => {
            console.error('Ошибка при загрузке маршрутов:', err);
        });

    // Дополнительная логика при необходимости
    initializeZoomControls();
});

// 12) Инициализация кнопок зума
function initializeZoomControls() {
    const zoomInButton = document.getElementById('zoomIn');
    const zoomOutButton = document.getElementById('zoomOut');

    if (zoomInButton && zoomOutButton) {
        zoomInButton.addEventListener('click', () => map.zoomIn());
        zoomOutButton.addEventListener('click', () => map.zoomOut());
    } else {
        console.warn('Кнопки зума не найдены в DOM.');
    }
}

// 13) Фильтрация (опционально)
window.filterRoutes = function() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    const query = searchInput.value.toLowerCase();

    const bikeRoutesList = document.getElementById('bikeRoutesList');
    if (!bikeRoutesList) return;
    bikeRoutesList.innerHTML = '';

    const filtered = routesData.filter(r => r.name.toLowerCase().includes(query));
    populateRoutesList(filtered);
};


