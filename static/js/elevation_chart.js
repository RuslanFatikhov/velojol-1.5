/* elevation_chart.js */

// 1) Собираем все координаты из GeoJSON (LineString / MultiLineString)
function collectAllCoords(geojson) {
    let coords = [];

    if (geojson.features && geojson.features.length > 0) {
        geojson.features.forEach(feature => {
            const geometry = feature.geometry;
            if (!geometry) return;
            
            if (geometry.type === 'LineString') {
                coords.push(...geometry.coordinates);
            } else if (geometry.type === 'MultiLineString') {
                geometry.coordinates.forEach(segmentCoords => {
                    coords.push(...segmentCoords);
                });
            }
        });
    }

    return coords;
}

// 2) Преобразуем координаты в { distance, elevation }
function getElevationData(geojson) {
    const coords = collectAllCoords(geojson);
    if (coords.length === 0) {
        console.warn("Нет координат в GeoJSON");
        return [];
    }

    let totalDistance = 0;
    const elevationData = [];

    for (let i = 0; i < coords.length; i++) {
        if (i > 0) {
            const from = turf.point(coords[i - 1]);
            const to = turf.point(coords[i]);
            // Расстояние в км между соседними точками
            const segmentDist = turf.distance(from, to, { units: 'kilometers' });
            totalDistance += segmentDist;
        }
        // elevation: третий элемент массива (lng, lat, ele)
        const elevation = coords[i][2] || 0;

        elevationData.push({
            distance: Number(totalDistance.toFixed(2)), // округляем до 2 знаков
            elevation
        });
    }

    return elevationData;
}

// 3) Дополнительная функция — вычисляем общий набор/сброс высоты
function calcAscentDescent(elevationData) {
    let totalAscent = 0;
    let totalDescent = 0;

    for (let i = 1; i < elevationData.length; i++) {
        const diff = elevationData[i].elevation - elevationData[i - 1].elevation;
        if (diff > 0) {
            totalAscent += diff;
        } else {
            totalDescent += Math.abs(diff);
        }
    }

    // Общая дистанция — это distance последней точки
    const totalDistance = elevationData.length > 0 
        ? elevationData[elevationData.length - 1].distance 
        : 0;

    return {
        ascent: Math.round(totalAscent),     // м
        descent: Math.round(totalDescent),   // м
        distance: totalDistance              // км
    };
}

// 4) Глобальная переменная для хранения текущего графика, чтобы пересоздавать
let elevationChart = null;

// 5) Рендерим график в <canvas id="elevationChart">
function renderElevationChart(elevationData) {
    if (!elevationData || elevationData.length === 0) {
        console.warn("Нет данных для построения графика высоты");
        return;
    }

    // Уничтожаем предыдущий график (если есть)
    if (elevationChart) {
        elevationChart.destroy();
    }

    // Массивы для осей
    const distances = elevationData.map(d => d.distance);    // X
    const elevations = elevationData.map(d => d.elevation);  // Y

    // Определяем min/max высот
    const minElevation = Math.min(...elevations);
    const maxElevation = Math.max(...elevations);

    // Делаем «зазор» по оси Y, если все точки почти на одном уровне
    let yAxisMin = minElevation;
    let yAxisMax = maxElevation;
    if (Math.abs(maxElevation - minElevation) < 1) {
        yAxisMin = minElevation - 5;
        yAxisMax = maxElevation + 5;
    }

    // Создаём график Chart.js
    const ctx = document.getElementById("elevationChart").getContext("2d");
    elevationChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: distances, // ось X
            datasets: [{
                label: "Высота (м)",
                data: elevations, // ось Y

                // Цвет линии
                borderColor: "#2196f3",
                borderWidth: 0.001,        // толщина линии
                borderDash: [5, 5],    // пунктир, если хотите


                // Заливка под графиком
                fill: true,
                backgroundColor: "rgba(33,150,243,0.2)",
                // Плавность линии
                tension: 1,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,

            // Улучшаем взаимодействие (hover по всей вертикали)
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        // Кастомная подпись: покажем "Расстояние: X км, Высота: Y м"
                        label: function(context) {
                            const dist = context.label;
                            const elev = context.formattedValue;
                            return `Расстояние: ${dist} км, Высота: ${elev} м`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: "Расстояние (м)" },
                    ticks: {
                        callback: function(value) {
                            return value + "м";
                        },
                        maxRotation: 0, // Убираем наклон
                        minRotation: 0, // Устанавливаем 0° для подписи
                    }
                },                
                y: {
                    title: { display: true, text: "" },
                    min: yAxisMin,
                    max: yAxisMax,
                    // Кастомный вывод на оси Y
                    ticks: {
                        callback: function(value) {
                            return Math.round(value) + " м"; // Округляем до целого
                        }
                    }
                }
            }
        }
    });
}

// 6) Функция-обёртка, которую вызываем извне:
//    1) Получаем elevationData, 
//    2) Считаем набор/сброс, дистанцию,
//    3) Выводим график и, при желании, статистику
function processAndRenderElevationChart(geojson) {
    const elevationData = getElevationData(geojson);
    renderElevationChart(elevationData);

    // (Опционально) Покажем набор/сброс и дистанцию, если хотим
    const stats = calcAscentDescent(elevationData);
    console.log("Статистика по маршруту:", stats); 
   
    document.getElementById("totalDistance").textContent = stats.distance.toFixed(2) + " км";
    document.getElementById("ascent").textContent = stats.ascent + " м";
    document.getElementById("descent").textContent = stats.descent + " м";
}
