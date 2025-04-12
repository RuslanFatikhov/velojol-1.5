function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateActiveButtons(theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

function updateActiveButtons(theme) {
    const btnLight = document.getElementById('mobile-theme-light');
    const btnDark = document.getElementById('mobile-theme-dark');
    const btnDesktop = document.getElementById('theme-toggle-desktop');

    // Мобильные кнопки
    if (btnLight && btnDark) {
        btnLight.classList.toggle('active', theme === 'light');
        btnDark.classList.toggle('active', theme === 'dark');
    }

    // Обновляем состояние иконок/текста на десктопе
    if (btnDesktop) {
        const spanLight = btnDesktop.querySelector('.theme-switcher.light');
        const spanDark = btnDesktop.querySelector('.theme-switcher.dark');

        if (spanLight && spanDark) {
            spanLight.style.display = theme === 'light' ? 'flex' : 'none';
            spanDark.style.display = theme === 'dark' ? 'flex' : 'none';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Применяем сохранённую тему
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    // 2. Обработчики
    const btnDesktopToggle = document.getElementById('theme-toggle-desktop');
    const btnMobileLight = document.getElementById('mobile-theme-light');
    const btnMobileDark = document.getElementById('mobile-theme-dark');

    if (btnDesktopToggle) btnDesktopToggle.addEventListener('click', toggleTheme);
    if (btnMobileLight) btnMobileLight.addEventListener('click', () => applyTheme('light'));
    if (btnMobileDark) btnMobileDark.addEventListener('click', () => applyTheme('dark'));
});
