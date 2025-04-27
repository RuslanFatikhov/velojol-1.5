document.addEventListener('DOMContentLoaded', () => {
    // Константы для многократного использования
    const PLACEHOLDER_IMAGE = '/static/img/placeholder.jpg';
    const API_BASE_URL = '/photos';

    /* ====================  ИНИЦИАЛИЗАЦИЯ КАРТЫ  ==================== */
    // Проверка наличия токена доступа
    if (!mapboxgl || !mapboxgl.accessToken) {
        mapboxgl.accessToken = 'pk.eyJ1IjoiZnV6bGFuIiwiYSI6ImNsc2N3dnhuNTBrZXYya28xeG1mb3k3N3AifQ.bLjMuXA5JfgBW0pwtjQxxA';
    }

    // Кеширование DOM-элементов для частого доступа
    const mapContainer = document.getElementById('map');
    const bikeLanesList = document.getElementById('bikeLanesList');
    const customPopup = document.getElementById('customPopup');
    const searchInput = document.getElementById('searchInput');

    if (!mapContainer) {
        console.error('Элемент карты #map не найден');
        return;
    }

    /* ---------- тема «светлая / тёмная» ---------- */
    function getMapStyle() {
        return document.documentElement.getAttribute('data-theme') === 'light'
            ? 'mapbox://styles/mapbox/light-v11'
            : 'mapbox://styles/mapbox/dark-v11';
    }

    function reloadMapStyle() {
        const newStyle = getMapStyle();
        const currentStyle = map.getStyle();
        const savedSources = {};
        const savedLayers = [];

        /* сохраняем все bikeLane-слои, чтобы вернуть после смены стиля */
        if (currentStyle?.layers) {
            currentStyle.layers.forEach(l => {
                if (l.id.startsWith('bikeLane-')) {
                    savedLayers.push(l);
                    const src = map.getSource(l.source);
                    if (src?._data) savedSources[l.source] = src._data;
                }
            });
        }

        map.setStyle(newStyle);
        map.once('style.load', () => {
            Object.entries(savedSources).forEach(([id, data]) =>
                map.addSource(id, { type: 'geojson', data })
            );
            savedLayers.forEach(l => map.addLayer(l));
        });
    }

    new MutationObserver(reloadMapStyle).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
    });

    /* ---------- проверка глобальных переменных ---------- */
    const initialCenter = typeof window.cityCoordinates !== 'undefined' && Array.isArray(window.cityCoordinates) 
        ? window.cityCoordinates 
        : [30.3350986, 59.9342802]; // СПб по умолчанию
    
    const initialZoom = typeof window.cityZoom === 'number' 
        ? window.cityZoom 
        : 11;
    
    const cityId = typeof window.cityId !== 'undefined' 
        ? window.cityId 
        : 'spb';

    /* ---------- создаём карту ---------- */
    window.map = new mapboxgl.Map({
        container: 'map',
        style: getMapStyle(),
        center: initialCenter,
        zoom: initialZoom,
    });

    let bikeLanesData = [];
    let cachedCityData = {};

    /* ====================  УТИЛИТЫ  ==================== */
    function closeCustomPopup() {
        if (customPopup) {
            customPopup.style.display = 'none';
        }
        setLayerOpacity();
        map.flyTo({ center: initialCenter, zoom: initialZoom });
    }
    window.closeCustomPopup = closeCustomPopup;

    function setLayerOpacity(exceptId = '') {
        const style = map.getStyle();
        style?.layers?.forEach(l => {
            if (l.id.startsWith('bikeLane-')) {
                map.setPaintProperty(l.id, 'line-opacity', l.id === exceptId ? 1 : 0.5);
            }
        });
    }

    function getSafetyLevelDetails(level) {
        return (
            {
                5: { color: '#64C750', label: 'Отлично' },
                4: { color: '#FFBD3F', label: 'Хорошо' },
                3: { color: '#FF8552', label: 'Удовлетворительно' },
                2: { color: '#E55D47', label: 'Плохо' },
                1: { color: '#772613', label: 'Ужасно' },
            }[level] || { color: 'gray', label: 'Неизвестно' }
        );
    }

    /**
     * Реализация просмотра увеличенных изображений
     */
    function initImageView() {
        const images = document.querySelectorAll('[data-imageview]');
        
        images.forEach(img => {
            img.addEventListener('click', () => {
                // Проверяем, нет ли уже открытого оверлея
                const existingOverlay = document.querySelector('.image-overlay');
                if (existingOverlay) existingOverlay.remove();
                
                const overlay = document.createElement('div');
                overlay.className = 'image-overlay';
                overlay.innerHTML = `
                    <div class="image-view">
                        <img src="${img.src}" alt="Увеличенное фото">
                        <button class="close-btn">Закрыть</button>
                    </div>
                `;
                document.body.appendChild(overlay);
                
                // Обработчик для закрытия
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay || e.target.classList.contains('close-btn')) {
                        overlay.remove();
                    }
                });

                // Обработчик клавиши ESC
                const escHandler = (e) => {
                    if (e.key === 'Escape') {
                        overlay.remove();
                        document.removeEventListener('keydown', escHandler);
                    }
                };
                document.addEventListener('keydown', escHandler);
            });
        });
    }

    /* ---------- Загрузка фотографий (адаптируется к любому формату) ---------- */       
    /**
     * Получает фотографии для велодорожки
     * @param {string} cityId - Идентификатор города
     * @param {string} laneId - Идентификатор велодорожки
     * @returns {Promise<string[]>} Массив URL фотографий
     */
    function getPhotosFromFolder(cityId, laneId) {
        if (!cityId || !laneId) {
            console.warn('Отсутствует cityId или laneId для загрузки фото');
            return Promise.resolve([PLACEHOLDER_IMAGE]);
        }
        
        const api = `${API_BASE_URL}/${cityId}/${laneId}`;

        return fetch(api)
            .then(r => (r.ok ? r.json() : []))
            .then(arr => {
                // Обработка разных форматов ответа
                if (Array.isArray(arr)) return arr;
                if (arr && Array.isArray(arr.photos)) return arr.photos;
                return [];
            })
            .then(list => (list.length ? list : [PLACEHOLDER_IMAGE]))
            .catch(err => {
                console.error(`Ошибка загрузки фото для ${cityId}/${laneId}:`, err);
                return [PLACEHOLDER_IMAGE];
            });
    }

    /* ====================  CARD / POPUP  ==================== */
    /**
     * Создает HTML-содержимое для всплывающего окна
     * @param {Object} bikeLane - Объект с данными о велодорожке
     * @returns {Promise<string>} HTML-код для вставки в попап
     */
    async function createPopUpHtml(bikeLane) {
        const { color, label } = getSafetyLevelDetails(bikeLane.safetyLevel);
        const photos = await getPhotosFromFolder(cityId, bikeLane.id);
        const photosHtml = photos
            .map(p => `<img src="${p}" data-imageview alt="Фото велодорожки">`)
            .join('');

        return `
        <div class="info">
            <button class="size_s absolute_rt" onclick="closeCustomPopup()">
                <img class="theme-icon dark" src="../static/img/icon/close-white.svg" alt="x">
                <img class="theme-icon light" src="../static/img/icon/close-black.svg"  alt="x">
            </button>
            <div class="photogrid popup_mobile">${photosHtml}</div>
            <h4 class="dark-prime-invert-200">${bikeLane.name}</h4>
            <p style="background:${color};color:#121212;padding:2px 8px;border-radius:8px"
               class="dark-prime-invert-300">${label}</p>

            <span class="hstack gap4">
                <img class="theme-icon dark"  src="../static/img/icon/distance-dark.svg"  alt="">
                <img class="theme-icon light" src="../static/img/icon/distance-light.svg" alt="">
                <p class="dark-prime-invert-300">${bikeLane.distance} м</p>
            </span>

            <p class="dark-prime-invert-200">${bikeLane.description || 'Описание отсутствует'}</p>
            <div class="photogrid popup_desktop">${photosHtml}</div>

            <span class="hstack gap8 w100 cta_block">
                <a href="https://tally.so/r/m6RZDe" target="_blank"
                   class="dark-prime-invert-200 size_l bgprime400 w100">
                   <p class="center">Добавить фото</p></a>
            </span>

            <span class="hstack sb">
                <p class="dark-prime-invert-50">Источник: ${bikeLane.source || 'Не указан'}</p>
                <p class="dark-prime-invert-50">${bikeLane.date || ''}</p>
            </span>
        </div>`;
    }

    /**
     * Обрабатывает клик по велодорожке
     * @param {Object} bikeLane - Объект велодорожки
     */
    function handleBikeLaneClick(bikeLane) {
        if (!bikeLane || !bikeLane.coordinates || !bikeLane.coordinates.length) {
            console.error('Некорректные данные велодорожки', bikeLane);
            return;
        }
        
        setLayerOpacity(`bikeLane-${bikeLane.id}`);
        map.flyTo({ center: bikeLane.coordinates[0], zoom: 14 });
        
        createPopUpHtml(bikeLane).then(html => {
            if (!customPopup) {
                console.warn('Элемент #customPopup не найден');
                return;
            }
            
            customPopup.innerHTML = html;
            initImageView();
            customPopup.style.display = 'block';
        });
    }

    /* ====================  СЛОИ / СПИСОК  ==================== */
    /**
     * Создает слой для велодорожки на карте
     * @param {Object} bikeLane - Объект велодорожки
     */
    function createBikeLaneLayer(bikeLane) {
        const { color } = getSafetyLevelDetails(bikeLane.safetyLevel);
        const layerId = `bikeLane-${bikeLane.id}`;

        try {
            map.addLayer({
                id: layerId,
                type: 'line',
                source: {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        properties: bikeLane,
                        geometry: { type: 'LineString', coordinates: bikeLane.coordinates },
                    },
                },
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': color, 'line-width': 6, 'line-opacity': 0.5 },
            });
        } catch (err) {
            console.error(`Ошибка добавления слоя ${layerId}:`, err);
        }
    }

    /**
     * Создает элемент списка для велодорожки
     * @param {Object} bikeLane - Объект велодорожки
     * @returns {HTMLElement} Элемент списка
     */
    function createBikeLaneListItem(bikeLane) {
        const { color, label } = getSafetyLevelDetails(bikeLane.safetyLevel);
        const item = document.createElement('div');
        item.classList.add('bike-lane-item');

        getPhotosFromFolder(cityId, bikeLane.id).then(photos => {
            const thumb = photos[0] || PLACEHOLDER_IMAGE;
            item.innerHTML = `
                <img src="${thumb}" alt="${bikeLane.name}" class="thumbnail">
                <span>
                    <div>
                        <span class="hstack_important sb" style="margin-bottom:8px">
                            <h6>${bikeLane.name}</h6>
                            <p class="p2 dark-prime-invert-200 distance">${bikeLane.distance} м</p>
                        </span>
                        <span style="background:${color};color:#121212;font-weight:bold;
                                     padding:2px 8px;border-radius:4px;">${label}</span>
                    </div>
                </span>`;
            item.onclick = () => handleBikeLaneClick(bikeLane);
        });

        return item;
    }

    /**
     * Заполняет список велодорожек
     * @param {Array} data - Массив объектов велодорожек
     */
    function populateBikeLanesList(data) {
        if (!bikeLanesList) {
            console.error('Элемент #bikeLanesList не найден');
            return;
        }
        
        bikeLanesList.innerHTML = '';
        
        if (!data || !data.length) {
            bikeLanesList.innerHTML = '<p>Велодорожки не найдены</p>';
            return;
        }
        
        data
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(bl => {
                try {
                    createBikeLaneLayer(bl);
                    bikeLanesList.appendChild(createBikeLaneListItem(bl));
                } catch (err) {
                    console.error(`Ошибка отображения велодорожки ${bl.id}:`, err);
                }
            });
    }

    /**
     * Загружает данные города
     * @param {string} cityId - Идентификатор города
     * @returns {Promise<Array>} Данные о велодорожках
     */
    function loadCityData(cityId) {
        if (!cityId) {
            return Promise.reject('Не указан идентификатор города');
        }
        
        if (cachedCityData[cityId]) {
            return Promise.resolve(cachedCityData[cityId]);
        }
        
        return fetch(`/static/data/cities/${cityId}.json`)
            .then(r => {
                if (!r.ok) {
                    throw new Error(`Не удалось загрузить данные (${r.status}): ${r.statusText}`);
                }
                return r.json();
            })
            .then(data => {
                cachedCityData[cityId] = data;
                return data;
            });
    }

    /* ====================  ЗАГРУЗКА ДАННЫХ ГОРОДА  ==================== */
    map.on('load', () => {
        loadCityData(cityId)
            .then(json => {
                bikeLanesData = json;
                populateBikeLanesList(bikeLanesData);
                
                // Обработчик клика по карте
                map.on('click', e => {
                    const ft = map.queryRenderedFeatures(e.point, {
                        layers: bikeLanesData.map(bl => `bikeLane-${bl.id}`),
                    });
                    if (ft.length) {
                        const id = ft[0].properties.id;
                        const lane = bikeLanesData.find(bl => bl.id === id);
                        if (lane) handleBikeLaneClick(lane);
                    }
                });
            })
            .catch(err => {
                console.error('Ошибка загрузки велодорожек:', err);
                if (bikeLanesList) {
                    bikeLanesList.innerHTML = `<p class="error">Ошибка загрузки данных: ${err.message || err}</p>`;
                }
                alert('Ошибка загрузки велодорожек: ' + (err.message || err));
            });
    });

    /* ====================  ЗУМ-КНОПКИ  ==================== */
    function initZoomControls() {
        const plus = document.getElementById('zoomIn');
        const minus = document.getElementById('zoomOut');
        
        if (plus) plus.addEventListener('click', () => map.zoomIn());
        if (minus) minus.addEventListener('click', () => map.zoomOut());
    }
    
    // Инициализация кнопок зума сразу после загрузки карты
    map.once('load', initZoomControls);

    /* ====================  ФИЛЬТР  ==================== */
    /**
     * Дебаунс для уменьшения количества вызовов функций
     * @param {Function} func - Функция для дебаунса
     * @param {number} wait - Время задержки в миллисекундах
     * @returns {Function} Функция с дебаунсом
     */
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /**
     * Фильтрует список велодорожек по поисковому запросу
     */
    window.filterBikeLanes = debounce(() => {
        if (!searchInput || !bikeLanesList) return;
        
        const query = searchInput.value.toLowerCase();
        bikeLanesList.innerHTML = '';

        const filteredLanes = bikeLanesData.filter(bl => 
            bl.name.toLowerCase().includes(query)
        );
        
        if (filteredLanes.length === 0) {
            bikeLanesList.innerHTML = '<p>Ничего не найдено</p>';
            return;
        }
        
        filteredLanes.forEach(bl => 
            bikeLanesList.appendChild(createBikeLaneListItem(bl))
        );
    }, 300);

    /* ====================  ДОП. СЛОИ ==================== */
    /**
     * Добавляет GeoJSON слой на карту с обработкой ошибок
     * @param {string} id - Идентификатор слоя
     * @param {string} url - URL GeoJSON данных
     * @param {string} color - Цвет для отображения точек
     */
    function addGeojsonLayer(id, url, color) {
        fetch(url)
            .then(r => {
                if (!r.ok) {
                    console.warn(`Ресурс ${url} не найден (${r.status}), слой ${id} пропущен`);
                    return Promise.reject(`Статус: ${r.status}`);
                }
                return r.json();
            })
            .then(data => {
                if (!map.getSource(id)) {
                    map.addSource(id, { type: 'geojson', data });
                }
                
                if (!map.getLayer(id)) {
                    map.addLayer({
                        id,
                        type: 'circle',
                        source: id,
                        paint: { 'circle-radius': 6, 'circle-color': color },
                    });
                }
            })
            .catch(err => console.error(`Ошибка загрузки ${id}:`, err));
    }

    
});