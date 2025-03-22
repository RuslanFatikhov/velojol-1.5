document.addEventListener('DOMContentLoaded', function () {
    mapboxgl.accessToken = 'pk.eyJ1IjoiZnV6bGFuIiwiYSI6ImNsc2N3dnhuNTBrZXYya28xeG1mb3k3N3AifQ.bLjMuXA5JfgBW0pwtjQxxA';

    // 1) Функция, возвращающая стиль карты в зависимости от темы
    function getMapStyle() {
        return document.documentElement.getAttribute('data-theme') === 'light'
            ? 'mapbox://styles/mapbox/light-v11'
            : 'mapbox://styles/mapbox/dark-v11';
    }

    // 2) Функция для пересоздания стиля карты при смене темы
    function reloadMapStyle() {
        const newStyle = getMapStyle();
        const currentStyle = map.getStyle();
        const sources = {};
        const layers = [];

        // Сохраняем все слои и их источники, начинающиеся на "bikeLane-"
        if (currentStyle && currentStyle.layers) {
            currentStyle.layers.forEach(layer => {
                if (layer.id.startsWith('bikeLane-')) {
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

    // 3) Создаём наблюдатель, который следит за сменой data-theme
    const observer = new MutationObserver(reloadMapStyle);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // ================== ВАШ ИСХОДНЫЙ КОД ==================

    // Глобальная (в рамках этого файла) переменная карты
    window.map = new mapboxgl.Map({
        container: 'map',
        style: getMapStyle(), // Вместо 'mapbox://styles/mapbox/dark-v11'
        center: cityCoordinates, // см. где у вас объявлены cityCoordinates
        zoom: cityZoom,          // см. где у вас объявлен cityZoom
    });

    const initialCenter = cityCoordinates;
    const initialZoom = cityZoom;

    // ВЕЛИКАЯ переменная со всеми велодорожками
    let bikeLanesData = [];

    // Закрытие попапа
    function closeCustomPopup() {
        const customPopup = document.getElementById('customPopup');
        if (customPopup) {
            customPopup.style.display = 'none';
        }
        setLayerOpacity();
        map.flyTo({ center: initialCenter, zoom: initialZoom });
    }
    window.closeCustomPopup = closeCustomPopup; // чтобы вызвать из кнопки в попапе

    // Прозрачность слоёв для визуальной подсветки выбранного
    function setLayerOpacity(exceptId = "") {
        const mapStyle = map.getStyle();
        if (mapStyle && mapStyle.layers) {
            mapStyle.layers.forEach(layer => {
                if (layer.id.startsWith('bikeLane-')) {
                    map.setPaintProperty(
                      layer.id,
                      'line-opacity',
                      exceptId === layer.id ? 1 : 0.5
                    );
                }
            });
        }
    }

    // Уровень "безопасности"
    function getSafetyLevelDetails(safetyLevel) {
        const safetyLevels = {
            5: { color: '#64C750', label: 'Отлично' },
            4: { color: '#FFBD3F', label: 'Хорошо' },
            3: { color: '#FF8552', label: 'Удовлетворительно' },
            2: { color: '#E55D47', label: 'Плохо' },
            1: { color: '#772613', label: 'Ужасно' }
        };
        return safetyLevels[safetyLevel] || { color: 'gray', label: 'Неизвестно' };
    }

    // Загрузка фотографий
    function getPhotosFromFolder(cityId, bikelaneId) {
        const apiUrl = `/photos/${cityId}/${bikelaneId}`;
        const placeholder = `/static/img/placeholder.jpg`; // Заглушка

        return fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    console.warn(`Ошибка при загрузке файлов из ${apiUrl}. Используется placeholder.`);
                    return [placeholder];
                }
                return response.json();
            })
            .then(data => {
                if (data.error || !data.photos || data.photos.length === 0) {
                    console.warn(`Фотографии отсутствуют для ${apiUrl}. Используется placeholder.`);
                    return [placeholder];
                }
                return data.photos;
            })
            .catch(error => {
                console.error(`Ошибка при запросе ${apiUrl}:`, error);
                return [placeholder];
            });

            
    }

    // Генерация HTML для попапа
    async function createPopUpHtml(bikeLane) {
        const { color, label } = getSafetyLevelDetails(bikeLane.safetyLevel);
        const photos = await getPhotosFromFolder(cityId, bikeLane.id);
        const photosHtml = photos
            .map(photo => `<img src="${photo}" data-imageview alt="Фото велодорожки">`)
            .join('');

        return `
            <div class="info">
                <div class="photogrid popup_mobile">${photosHtml}</div>
                <h4 class="dark-prime-invert-200">${bikeLane.name}</h4>
                <p style="background-color: ${color}; color:#121212; padding:2px 8px; border-radius:8px;" class="dark-prime-invert-300">${label}</p>

                <span class="hstack gap4">

                    <img class="theme-icon dark" src="../static/img/icon/distance-dark.svg" alt="Distance">
                    <img class="theme-icon light" src="../static/img/icon/distance-light.svg" alt="Distance">
                    <p class="dark-prime-invert-300">${bikeLane.distance} м</p>
                </span>

                <p class="dark-prime-invert-200">${bikeLane.description}</p>
                <div class="photogrid popup_desktop">${photosHtml}</div>

                
                <span class="hstack gap8 w100 cta_block">
                    <a href="https://tally.so/r/m6RZDe" target="_blank" style="width:100%;" class="dark-prime-invert-200 size_l bgprime400"><p class="center">Добавить фото</p></a>
                </span>

                <span class="hstack sb">
                    <p class="dark-prime-invert-50">Источник: ${bikeLane.source}</p>
                    <p class="dark-prime-invert-50">${bikeLane.date}</p>
                </span>
                <button class="size_s absolute_rt" onclick="closeCustomPopup();">
                    <img class="theme-icon dark" src="../static/img/icon/close-white.svg" alt="close">
                    <img class="theme-icon light" src="../static/img/icon/close-black.svg" alt="close">
                </button>
            </div>
        `;
    }

    // Логика клика по линии велодорожки
    function handleBikeLaneClick(bikeLane) {
        setLayerOpacity(`bikeLane-${bikeLane.id}`);
        map.flyTo({ center: bikeLane.coordinates[0], zoom: 14 });
        createPopUpHtml(bikeLane).then(popupHtml => {
            const customPopup = document.getElementById('customPopup');
            if (customPopup) {
                customPopup.innerHTML = popupHtml;
                // ВАЖНО: добавляем повторную инициализацию
                initImageView();
                customPopup.style.display = 'block';
            }
        });
    }

    // Создание слоя на карте
    function createBikeLaneLayer(bikeLane) {
        const { color } = getSafetyLevelDetails(bikeLane.safetyLevel);
        const layerId = `bikeLane-${bikeLane.id}`;

        map.addLayer({
            id: layerId,
            type: 'line',
            source: {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: bikeLane,
                    geometry: {
                        type: 'LineString',
                        coordinates: bikeLane.coordinates
                    }
                }
            },
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': color,
                'line-width': 6,
                'line-opacity': 0.5
            }
        });
    }

    // Создание элемента в списке
    function createBikeLaneListItem(bikeLane) {
        const { color, label } = getSafetyLevelDetails(bikeLane.safetyLevel);
        const bikeLaneItem = document.createElement('div');
        bikeLaneItem.classList.add('bike-lane-item');

        getPhotosFromFolder(cityId, bikeLane.id).then(photos => {
            const photoHtml = (photos && photos.length > 0)
                ? `<img src="${photos[0]}" alt="${bikeLane.name}" class="thumbnail">`
                : `<img src="/static/img/placeholder.jpg" alt="Нет изображения" class="thumbnail">`;

            bikeLaneItem.innerHTML = `
                ${photoHtml}
                <span>
                    <div>
                        <span class="hstack_important sb">
                            <h6 style="margin-bottom:8px;">${bikeLane.name}</h6>
                            <p class="p2 dark-prime-invert-200 distance">${bikeLane.distance} м</p>
                        </span>
                        <span style="background-color: ${color}; color:#121212;font-weight:bold;letter-spacing:-2%;padding:2px 8px;border-radius:4px;">${label}</span>
                    </div>
                </span>
            `;

            bikeLaneItem.onclick = function () {
                handleBikeLaneClick(bikeLane);
            };
        });

        return bikeLaneItem;
    }

    // Заполняем список всеми велодорожками
    function populateBikeLanesList(data) {
        const bikeLanesList = document.getElementById('bikeLanesList');
        bikeLanesList.innerHTML = '';
        data
          .sort((a, b) => a.name.localeCompare(b.name))
          .forEach(bikeLane => {
              createBikeLaneLayer(bikeLane);
              const bikeLaneItem = createBikeLaneListItem(bikeLane);
              bikeLanesList.appendChild(bikeLaneItem);
          });
    }

    // Пример: загружаем JSON и отрисовываем на карте
    map.on('load', function () {
        fetch(`/static/data/cities/${cityId}.json`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                if (typeof data !== 'object') {
                    throw new Error('Invalid JSON response');
                }
                // Сохраняем в локальную переменную
                bikeLanesData = data;

                // Отрисовка на карте
                populateBikeLanesList(bikeLanesData);

                // Обработка кликов по карте (выбор велодорожки)
                map.on('click', function (e) {
                    const features = map.queryRenderedFeatures(e.point, {
                        layers: bikeLanesData.map(bl => `bikeLane-${bl.id}`)
                    });
                    if (features.length) {
                        const clickedBikeLaneId = features[0].properties.id;
                        const clickedBikeLane = bikeLanesData.find(bl => bl.id === clickedBikeLaneId);
                        if (clickedBikeLane) {
                            handleBikeLaneClick(clickedBikeLane);
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Error loading bike lanes:', error);
                alert('Error loading bike lanes: ' + error.message);
            });

        // Если нужно, можно вызвать дополнительный код (например, addBikeParkings(map))
        // addBikeParkings(map);
    });

    // Инициализация кнопок зума
    function initializeZoomControls() {
        const zoomInButton = document.getElementById('zoomIn');
        const zoomOutButton = document.getElementById('zoomOut');

        if (zoomInButton && zoomOutButton) {
            zoomInButton.addEventListener('click', () => map.zoomIn());
            zoomOutButton.addEventListener('click', () => map.zoomOut());
        } else {
            console.error('Zoom buttons not found in the DOM.');
        }
    }
    setTimeout(initializeZoomControls, 1000);

    // --- Функция фильтрации (внутри DOMContentLoaded!) ---
    window.filterBikeLanes = function() {
        const searchInput = document.getElementById('searchInput').value.toLowerCase();
        const bikeLanesList = document.getElementById('bikeLanesList');
        bikeLanesList.innerHTML = '';

        // Если данные ещё не загружены или пусты
        if (!bikeLanesData || bikeLanesData.length === 0) {
            console.warn("Нет данных для фильтрации");
            return;
        }

        const filtered = bikeLanesData.filter(bikeLane =>
            bikeLane.name.toLowerCase().includes(searchInput)
        );

        filtered.forEach(bikeLane => {
            const bikeLaneItem = createBikeLaneListItem(bikeLane);
            bikeLanesList.appendChild(bikeLaneItem);
        });
    };

    // Функция для добавления слоя велопарковок
    function addBikeParkings() {
        fetch(`/static/data/bikeparkings.json`)
            .then(response => response.json())
            .then(data => {
                if (!map.getSource('bikeparkings')) {
                    map.addSource('bikeparkings', {
                        type: 'geojson',
                        data: data
                    });
                }

                if (!map.getLayer('bikeparkings')) {
                    map.addLayer({
                        id: 'bikeparkings',
                        type: 'circle',
                        source: 'bikeparkings',
                        paint: {
                            'circle-radius': 6,
                            'circle-color': '#007cbf'
                        }
                    });
                }
            })
            .catch(error => console.error('Ошибка загрузки велопарковок:', error));
    }

    // Функция для добавления слоя велостанций
    function addBikeRepairStations() {
        fetch(`/static/data/repairstations.json`)
            .then(response => response.json())
            .then(data => {
                if (!map.getSource('repairstations')) {
                    map.addSource('repairstations', {
                        type: 'geojson',
                        data: data
                    });
                }

                if (!map.getLayer('repairstations')) {
                    map.addLayer({
                        id: 'repairstations',
                        type: 'circle',
                        source: 'repairstations',
                        paint: {
                            'circle-radius': 6,
                            'circle-color': '#ff5733'
                        }
                    });
                }
            })
            .catch(error => console.error('Ошибка загрузки велостанций:', error));
    }

    // Загружаем слои после загрузки карты
    map.on('load', function () {
        addBikeParkings();
        addBikeRepairStations();
    });

});
