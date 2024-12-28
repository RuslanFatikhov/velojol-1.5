// bikeparkings.js

async function addBikeParkings(map) {
    if (!map || typeof map.on !== 'function') {
        console.error('Ошибка: map не определён или не является объектом карты!');
        return;
    }

    if (!cityId) {
        console.error('Ошибка: cityId не определён!');
        return;
    }

    // Пути к GeoJSON и иконкам
    const parkingsGeojsonUrl = `static/data/cities/${cityId}-parkings.geojson`;
    const repairStationsGeojsonUrl = `static/data/cities/${cityId}-repairstation.geojson`;
    const parkingIcon = 'static/img/icon/bikeparking.png';
    const repairStationIcon = 'static/img/icon/repair-station.png';

    try {
        // Загрузка иконок
        const parkingImage = await loadImage(parkingIcon);
        const repairImage = await loadImage(repairStationIcon);

        // Добавляем иконки на карту
        map.addImage('bikeparking-icon', parkingImage);
        map.addImage('repair-station-icon', repairImage);

        // Загрузка и отображение велопарковок
        await addLayerToMap(map, parkingsGeojsonUrl, 'bikeparkings', 'bikeparking-icon');

        // Загрузка и отображение велоремонтных станций
        await addLayerToMap(map, repairStationsGeojsonUrl, 'repairstations', 'repair-station-icon');

        console.log('Велопарковки и ремонтные станции успешно добавлены на карту.');
    } catch (error) {
        console.error('Ошибка при загрузке данных:', error.message);
    }
}

// Функция для загрузки изображения
async function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = src;
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Ошибка загрузки изображения: ${src}`));
    });
}

// Функция для добавления слоя на карту
async function addLayerToMap(map, geojsonUrl, layerId, iconId) {
    const response = await fetch(geojsonUrl);
    if (!response.ok) {
        console.warn(`GeoJSON файл не найден: ${geojsonUrl}`);
        return;
    }

    const data = await response.json();
    map.addSource(layerId, {
        type: 'geojson',
        data: data,
    });

    map.addLayer({
        id: layerId,
        type: 'symbol',
        source: layerId,
        layout: {
            'icon-image': iconId,
            'icon-size': [
                'interpolate', ['linear'], ['zoom'],
                10, 0.1,
                15, 0.25,
                20, 0.5,
            ],
            'icon-allow-overlap': true,
        },
    });
}

// Убедитесь, что карта загружена перед вызовом
document.addEventListener('DOMContentLoaded', function () {
    if (typeof window.map !== 'undefined') {
        addBikeParkings(window.map);
    } else {
        console.error('Ошибка: объект map не определён!');
    }
});
