// filter.js

document.addEventListener('DOMContentLoaded', () => {
    // Кнопки для фильтров
    const bikeParkingsBtn = document.getElementById('bikeParkingsBtn'); // Кнопка для велопарковок
    const bikeStationsBtn = document.getElementById('bikeStationsBtn'); // Кнопка для велоремонтных станций

    // Функция для переключения видимости слоя
    const toggleLayerVisibility = (layerId, button) => {
        const isActive = button.classList.toggle('active'); // Изменяем состояние кнопки
        const visibility = isActive ? 'visible' : 'none'; // Устанавливаем видимость слоя

        // Проверяем наличие слоя и меняем его видимость
        if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, 'visibility', visibility);
        } else {
            console.error(`Слой "${layerId}" не найден на карте!`);
        }
    };

    // Добавляем обработчик для кнопки велопарковок
    bikeParkingsBtn.addEventListener('click', () => {
        toggleLayerVisibility('bikeparkings', bikeParkingsBtn);
    });

    // Добавляем обработчик для кнопки велоремонтных станций
    bikeStationsBtn.addEventListener('click', () => {
        toggleLayerVisibility('repairstations', bikeStationsBtn);
    });

    // Проверяем готовность карты
    map.on('load', () => {
        map.on('idle', () => {
            if (map.getLayer('bikeparkings')) {
                console.log('Слой велопарковок готов для управления видимостью.');
            }
            if (map.getLayer('repairstations')) {
                console.log('Слой велоремонтных станций готов для управления видимостью.');
            }
        });
    });
});
