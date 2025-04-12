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

    // Сохраняем все слои и их источники
    if (currentStyle && currentStyle.layers) {
        currentStyle.layers.forEach(layer => {
            if (layer.id.startsWith('route-')) {
                layers.push(layer);
                const src = map.getSource(layer.source);
                if (src && src._data && !sources[layer.source]) {
                    sources[layer.source] = src._data;
                }
            }
        });
    }

    // Меняем стиль с обработкой ошибок
    try {
        map.setStyle(newStyle, { diff: false });
    } catch (err) {
        console.error('Ошибка при смене стиля карты:', err);
        return;
    }

    // Восстанавливаем источники и слои после загрузки стиля
    map.once('style.load', () => {
        Object.keys(sources).forEach(sourceId => {
            map.addSource(sourceId, { type: 'geojson', data: sources[sourceId] });
        });
        layers.forEach(layer => {
            map.addLayer(layer);
        });
    });

    map.once('error', (err) => {
        console.error('Ошибка загрузки стиля карты:', err);
    });
}

// 1) Создаём наблюдатель за сменой data-theme
const observer = new MutationObserver(reloadMapStyle);
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// Отключаем наблюдатель при выгрузке страницы
window.addEventListener('unload', () => {
    observer.disconnect();
});

// 2) Инициализация карты
mapboxgl.accessToken = 'pk.eyJ1IjoiZnV6bGFuIiwiYSI6ImNsc2N3dnhuNTBrZXYya28xeG1mb3k3N3AifQ.bLjMuXA5JfgBW0pwtjQxxA';

// Проверяем наличие глобальных переменных
const mapCenter = typeof cityCoordinates !== 'undefined' ? cityCoordinates : [0, 0];
const mapZoom = typeof cityZoom !== 'undefined' ? cityZoom : 10;

// Глобальная переменная карты
window.map = new mapboxgl.Map({
    container: 'map',
    style: getMapStyle(),
    center: mapCenter,
    zoom: mapZoom
});

// 3) Массив маршрутов
let routesData = [];

// 4) Цвета для маршрутов
const routeColors = [
    '#e6194b', '#3cb44b', '#ffe119', '#0082c8', '#f58231', '#911eb4', '#46f0f0'
];

// 5) Функция для закрытия модального окна
function closeRouteModal() {
    const modal = document.getElementById('routeModal');
    if (!modal) {
        console.warn('Модальное окно не найдено');
        return;
    }
    modal.style.display = 'none';

    // Возвращаем карту в предыдущее состояние
    if (previousView.center && previousView.zoom) {
        map.flyTo({
            center: previousView.center,
            zoom: previousView.zoom
        });
        previousView.center = null;
        previousView.zoom = null;
    }
}

window.closeRouteModal = closeRouteModal;

// Функция для получения первого фото из папки маршрута
function getFirstPhoto(routePhotos) {
    return fetch(`/api/route_photos?folder=${routePhotos}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.photos?.length > 0) {
                return data.photos[0]; // Путь уже полный, например, /static/img/routes/koktobe/photo1.jpg
            }
            return `/static/img/placeholder.jpg`;
        })
        .catch(error => {
            console.error(`Ошибка загрузки фото для ${routePhotos}:`, error.message);
            return `/static/img/placeholder.jpg`;
        });
}

// Функция получения всех фото маршрута
function getAllPhotos(routePhotos) {
    return fetch(`/api/route_photos?folder=${routePhotos}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.photos?.length > 0) {
                return data.photos; // Возвращаем массив полных путей
            }
            return [`/static/img/placeholder.jpg`];
        })
        .catch(error => {
            console.error(`Ошибка загрузки всех фото для ${routePhotos}:`, error.message);
            return [`/static/img/placeholder.jpg`];
        });
}

// 6) Открытие модального окна с информацией о маршруте
function openRouteModal(route, geojson) {
    const modal = document.getElementById('routeModal');
    if (!modal) {
        console.error('Модальное окно не найдено');
        return;
    }

    // Проверка элементов DOM
    const elements = {
        title: document.getElementById('routeTitle'),
        time: document.getElementById('routeTime'),
        difficulty: document.getElementById('routeDifficulty'),
        description: document.getElementById('routeDescription'),
        photosContainer: document.getElementById('routePhotosContainer'),
        downloadBtn: document.getElementById('downloadGpxBtn')
    };

    for (const [key, el] of Object.entries(elements)) {
        if (!el) {
            console.warn(`Элемент ${key} не найден`);
            return;
        }
    }

    // Заполняем данные
    elements.title.textContent = route.name || 'Без названия';
    elements.time.textContent = route.time ? `${route.time}ч` : 'N/A';
    elements.difficulty.textContent = route.difficulty || 'N/A';
    elements.description.textContent = route.description || 'Описание отсутствует';

    // Устанавливаем GPX-файл для скачивания
    if (elements.downloadBtn) {
        elements.downloadBtn.onclick = () => {
            const gpxUrl = `/static/data/gpx/${route.gpx}`;
            const link = document.createElement('a');
            link.href = gpxUrl;
            link.download = `${(route.name || 'route').replace(/\s+/g, '_')}.gpx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
    }

    // Загружаем фото
    elements.photosContainer.innerHTML = '';
    getAllPhotos(route.photos).then(photoUrls => {
        photoUrls.forEach(photoUrl => {
            const imgElement = document.createElement('img');
            imgElement.src = photoUrl;
            imgElement.alt = `Фото маршрута ${route.name || 'route'}`;
            imgElement.classList.add('route-photo-thumbnail');
            imgElement.setAttribute('data-imageview', '');
            elements.photosContainer.appendChild(imgElement);
        });

        // Предполагаем, что initImageView определена во внешнем скрипте
        if (typeof initImageView === 'function') {
            initImageView();
        } else {
            console.warn('Функция initImageView не определена');
        }
    });

    // Заглушка для графика высот (функция не определена в оригинале)
    if (typeof processAndRenderElevationChart === 'function') {
        processAndRenderElevationChart(geojson);
    } else {
        console.warn('Функция processAndRenderElevationChart не определена');
    }

    // Показываем модальное окно
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

let previousView = {
    center: null,
    zoom: null
};

// 8) Функция при клике по маршруту
function handleRouteClick(route, layerGeoJson) {
    // Сохраняем текущий центр и зум
    if (!previousView.center || !previousView.zoom) {
        previousView.center = map.getCenter();
        previousView.zoom = map.getZoom();
    }

    // Выделяем маршрут
    setRouteOpacity(`route-${route.id}`);

    // Центрируемся на маршруте
    if (
        layerGeoJson &&
        layerGeoJson.features?.length > 0 &&
        layerGeoJson.features[0].geometry?.coordinates?.length > 0
    ) {
        if (!turf || !turf.bbox) {
            console.error('Библиотека turf не загружена');
            return;
        }
        const bbox = turf.bbox(layerGeoJson);
        map.fitBounds(bbox, { padding: 40 });
    } else {
        console.warn('Некорректные GeoJSON данные для маршрута:', route.id);
    }

    // Открываем модальное окно
    openRouteModal(route, layerGeoJson);
}

// 9) Создание слоя с маршрутом
async function createRouteLayer(route, color) {
    const gpxUrl = `/static/data/gpx/${route.gpx}`;
    try {
        if (!toGeoJSON || !toGeoJSON.gpx) {
            throw new Error('Библиотека toGeoJSON не загружена');
        }

        const response = await fetch(gpxUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
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

        // Удаляем старый обработчик клика, если он существует
        map.off('click', layerId);
        map.on('click', layerId, () => {
            handleRouteClick(route, geojson);
        });
    } catch (err) {
        console.error(`Ошибка загрузки GPX для маршрута ${route.id}:`, err);
    }
}

// 10) Функция заполнения списка маршрутов
async function populateRoutesList(data) {
    const bikeRoutesList = document.getElementById('bikeRoutesList');
    if (!bikeRoutesList) {
        console.warn('Элемент bikeRoutesList не найден');
        return;
    }
    bikeRoutesList.innerHTML = '';

    // Обрабатываем маршруты последовательно для сохранения порядка
    for (const [index, route] of data.entries()) {
        if (!route.name || !route.gpx || !route.photos) {
            console.warn(`Некорректные данные маршрута:`, route);
            continue;
        }

        const color = routeColors[index % routeColors.length];
        const photoUrl = await getFirstPhoto(route.photos);

        const item = document.createElement('div');
        item.classList.add('bike-route-item');
        item.innerHTML = `
            <div class="vstack_important">
                <span class="hstack_important gap12">
                    <img src="${photoUrl}" alt="${route.name}" class="route-thumbnail">
                    <span class="vstack_important">
                        <h6 class="dark-prime-invert-100" style="margin-bottom:4px;">${route.name}</h6>
                        <p style="height:20px; padding: 4px 8px; border-radius:8px; display: flex; align-items:center; justify-content: center; max-width: 80px;" class="bgprimeinvert50 dark-prime-100 mb16">${route.difficulty || 'N/A'}</p>
                    </span>
                </span>
            </div>
            <span class="hstack_important gap24">
                <span class="hstack_important gap4">
                    <img class="theme-icon light" style="max-width:20px !important; max-height:20px !important; min-width:20px !important; min-height:20px !important;" src="/static/img/icon/distance-light.svg">
                    <img class="theme-icon dark" style="max-width:20px !important; max-height:20px !important; min-width:20px !important; min-height:20px !important;" src="/static/img/icon/distance-dark.svg">
                    <p class="dark-prime-invert-100">${route.distance || 0}км</p>
                </span>
                <span class="hstack_important gap4">
                    <img class="theme-icon dark" style="max-width:20px !important; max-height:20px !important; min-width:20px !important; min-height:20px !important;" src="/static/img/icon/high-light.svg">
                    <img class="theme-icon light" style="max-width:20px !important; max-height:20px !important; min-width:20px !important; min-height:20px !important;" src="/static/img/icon/high-dark.svg">
                    <p class="dark-prime-invert-100">${route.height || 0}м</p>
                </span>
                <span class="hstack_important gap4">
                    <img class="theme-icon light" style="max-width:20px !important; max-height:20px !important; min-width:20px !important; min-height:20px !important;" src="/static/img/icon/time-dark.svg">
                    <img class="theme-icon dark" style="max-width:20px !important; max-height:20px !important; min-width:20px !important; min-height:20px !important;" src="/static/img/icon/time-light.svg">
                    <p class="dark-prime-invert-100">${route.time || 0}ч</p>
                </span>
            </span>
        `;

        // Обработчик клика
        item.addEventListener('click', () => {
            const sourceId = `route-source-${route.id}`;
            const source = map.getSource(sourceId);
            if (source) {
                handleRouteClick(route, source._data);
            } else {
                console.warn(`Источник не найден: ${sourceId}`);
            }
        });

        bikeRoutesList.appendChild(item);
    }
}

// 11) Основная загрузка
map.on('load', () => {
    // Проверяем cityId
    if (typeof cityId === 'undefined') {
        console.error('Переменная cityId не определена');
        return;
    }

    const routesUrl = `/static/data/routes/${cityId}_routes.json`;
    fetch(routesUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            routesData = data;
            // Создаём слои для каждого маршрута
            routesData.forEach((route, idx) => {
                const color = routeColors[idx % routeColors.length];
                createRouteLayer(route, color);
            });
            // Заполняем список
            populateRoutesList(routesData);
        })
        .catch(err => {
            console.error(`Ошибка при загрузке маршрутов (${routesUrl}):`, err);
        });

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
        console.warn('Кнопки зума не найдены в DOM');
    }
}

// 13) Фильтрация маршрутов
window.filterRoutes = function () {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) {
        console.warn('Поле поиска не найдено');
        return;
    }

    const query = searchInput.value.toLowerCase();
    const filtered = routesData.filter(r => r.name?.toLowerCase().includes(query));

    // Обновляем видимость слоёв
    routesData.forEach(route => {
        const layerId = `route-${route.id}`;
        map.setLayoutProperty(
            layerId,
            'visibility',
            filtered.includes(route) ? 'visible' : 'none'
        );
    });

    // Обновляем список
    populateRoutesList(filtered);
};