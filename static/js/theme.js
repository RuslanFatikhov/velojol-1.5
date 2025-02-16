function switchTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Добавляем обработчики на кнопки смены темы
document.addEventListener('DOMContentLoaded', () => {
    const themeToggleDesktop = document.getElementById('theme-toggle-desktop');
    const themeToggleMobile = document.getElementById('theme-toggle-mobile');

    if (themeToggleDesktop) themeToggleDesktop.addEventListener('click', switchTheme);
    if (themeToggleMobile) themeToggleMobile.addEventListener('click', switchTheme);
});
