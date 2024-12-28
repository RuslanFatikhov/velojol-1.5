// Функция для переключения темы и показа/скрытия элементов
function switchTheme() {
    const themeLink = document.getElementById('theme-link');
    const currentTheme = themeLink.getAttribute('href');
    const lightTheme = themeLink.getAttribute('href').replace('colors_dark.css', 'colors_light.css');
    const darkTheme = themeLink.getAttribute('href').replace('colors_light.css', 'colors_dark.css');
    
    const darkElements = document.querySelectorAll('#dark-desktop, #dark-mobile');
    const lightElements = document.querySelectorAll('#light-desktop, #light-mobile');

    // Переключение темы и показ/скрытие элементов
    if (currentTheme.includes('colors_dark.css')) {
        themeLink.setAttribute('href', lightTheme);
        darkElements.forEach(el => el.style.display = 'none');
        lightElements.forEach(el => el.style.display = 'flex');
        localStorage.setItem('theme', 'light');
    } else {
        themeLink.setAttribute('href', darkTheme);
        darkElements.forEach(el => el.style.display = 'flex');
        lightElements.forEach(el => el.style.display = 'none');
        localStorage.setItem('theme', 'dark');
    }
}

// Применение темы и управление видимостью элементов при загрузке страницы на основе localStorage
window.onload = function() {
    const savedTheme = localStorage.getItem('theme') || 'dark'; // По умолчанию - темная тема
    const themeLink = document.getElementById('theme-link');
    
    const darkElements = document.querySelectorAll('#dark-desktop, #dark-mobile, #dark');
    const lightElements = document.querySelectorAll('#light-desktop, #light-mobile, #light');

    if (savedTheme === 'light') {
        themeLink.setAttribute('href', themeLink.getAttribute('href').replace('colors_dark.css', 'colors_light.css'));
        darkElements.forEach(el => el.style.display = 'none');
        lightElements.forEach(el => el.style.display = 'flex');
    } else {
        darkElements.forEach(el => el.style.display = 'flex');
        lightElements.forEach(el => el.style.display = 'none');
    }

    // Привязываем обработчики к кнопкам переключения темы (десктоп и мобильная версия)
    document.getElementById('theme-toggle-desktop').addEventListener('click', switchTheme);
    document.getElementById('theme-toggle-mobile').addEventListener('click', switchTheme);
};
