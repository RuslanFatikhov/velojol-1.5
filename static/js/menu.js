document.addEventListener("DOMContentLoaded", function () {
    const tapbarItems = document.querySelectorAll('.tapbar__item'); // Все кнопки тапбара
    const currentPath = window.location.pathname; // Текущий путь страницы
    const homeButton = document.getElementById('tab-index'); // Кнопка "Главная"
    const menuButton = document.getElementById('tab-menu'); // Кнопка "Меню"
    const popupMenu = document.getElementById('popup-menu');
    const closeButton = document.getElementById('close-popup');

    let previousActiveItem = null; // Для сохранения предыдущей активной кнопки

    console.log("Текущий путь:", currentPath);

    // 1. Устанавливаем правильный href для кнопки "Главная"
    if (currentPath === '/' || currentPath.endsWith('index.html')) {
        homeButton.setAttribute('href', '#cover'); // На главной странице
    } else {
        homeButton.setAttribute('href', '/'); // На других страницах
    }

    // 2. Устанавливаем активное состояние
    function setActiveTab() {
        tapbarItems.forEach(item => item.classList.remove('active')); // Сброс active у всех кнопок
        if (currentPath === '/' || currentPath.endsWith('index.html')) {
            homeButton.classList.add('active'); // Главная страница
        } else {
            tapbarItems.forEach(item => {
                const link = item.getAttribute('href');
                if (link && link === currentPath) {
                    item.classList.add('active'); // Активная кнопка на других страницах
                }
            });
        }
    }

    setActiveTab(); // Устанавливаем активный таб при загрузке страницы

    // 3. Логика для popup-меню
    menuButton.addEventListener('click', function () {
        // Сохраняем текущую активную кнопку перед открытием popup
        previousActiveItem = document.querySelector('.tapbar__item.active');
        console.log("Сохранена предыдущая активная кнопка:", previousActiveItem?.id);

        // Делаем кнопку "Меню" активной
        tapbarItems.forEach(item => item.classList.remove('active'));
        menuButton.classList.add('active');
        popupMenu.classList.add('open');
    });

    // Закрытие popup и восстановление активной кнопки
    function closePopup() {
        popupMenu.classList.remove('open'); // Закрываем popup
        menuButton.classList.remove('active'); // Удаляем active с кнопки "Меню"

        // Восстанавливаем предыдущую активную кнопку
        if (previousActiveItem) {
            previousActiveItem.classList.add('active');
            console.log("Восстановлена кнопка:", previousActiveItem.id);
        } else {
            setActiveTab(); // Если не нашли предыдущую кнопку, переустанавливаем активный таб
        }
    }

    closeButton?.addEventListener('click', closePopup);

    document.addEventListener('click', function (event) {
        if (!popupMenu.contains(event.target) && !menuButton.contains(event.target)) {
            closePopup();
        }
    });
});
