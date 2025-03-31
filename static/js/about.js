// about.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('about.js загружен успешно.');

    const firstScroll = 200;   // Высота первого скролла
    const secondScroll = 600;  // Высота второго скролла
    const thirdScroll = 800;   // Высота третьего скролла

    const aboutCoverSpan = document.querySelector('.about_cover span');
    const aboutCoverImg = document.querySelector('.about_cover_img');
    const about2Slide = document.querySelector('.about_2slide');
    const about3Slide = document.querySelector('.about_3slide');
    const body = document.body;

    // Изначально скрываем .about_2slide и .about_3slide
    if (about2Slide) about2Slide.style.opacity = '0';
    if (about3Slide) about3Slide.style.opacity = '0';

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY || document.documentElement.scrollTop;

        // ---- Первый скролл логика (200px) ----
        if (aboutCoverSpan) {
            const spanOpacity = Math.max(1 - (scrollY / firstScroll), 0);
            aboutCoverSpan.style.opacity = spanOpacity;
        }

        if (aboutCoverImg) {
            const blurValue = Math.min((scrollY / firstScroll) * 100, 100);
            const imageOpacity = Math.max(1 - (scrollY / firstScroll) * 0.5, 0.5);
            aboutCoverImg.style.filter = `blur(${blurValue}px)`;
            aboutCoverImg.style.opacity = imageOpacity;
        }

        if (about2Slide) {
            const slideOpacity = Math.min((scrollY - firstScroll) / 200, 1);
            about2Slide.style.opacity = slideOpacity >= 0 ? slideOpacity : 0;
        }

        // ---- Второй скролл логика (600px) ----
        if (scrollY >= secondScroll) {
            if (about2Slide) {
                about2Slide.style.opacity = Math.max(1 - (scrollY - secondScroll) / 200, 0);
                about2Slide.style.transition = 'opacity 0.6s ease';
            }

            if (aboutCoverImg) {
                aboutCoverImg.style.opacity = Math.max(1 - (scrollY - secondScroll) / 200, 0);
                aboutCoverImg.style.transition = 'opacity 0.6s ease';
            }

            const bgTransitionValue = Math.min((scrollY - secondScroll) / 200, 1);
            body.style.backgroundColor = `rgb(${(176 - (176 - 51) * bgTransitionValue)}, ${(156 - (156 - 51) * bgTransitionValue)}, ${(130 - (130 - 51) * bgTransitionValue)})`;
            body.style.transition = 'background-color 0.6s ease';
        } else {
            body.style.backgroundColor = '#B09C82';
        }

        // ---- Третий скролл логика (800px) ----
        if (scrollY >= thirdScroll) {
            if (about3Slide) {
                about3Slide.style.opacity = Math.min((scrollY - thirdScroll) / 200, 1);
                about3Slide.style.transition = 'opacity 0.6s ease';
            }
        } else {
            if (about3Slide) about3Slide.style.opacity = '0';
        }
    });
});
