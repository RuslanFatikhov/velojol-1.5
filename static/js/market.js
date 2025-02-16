document.addEventListener("DOMContentLoaded", function () {
    const modal = document.getElementById("storeModal");
    const modalContent = modal.querySelector(".modal-content");
    const closeModal = document.querySelector(".modal-store .close");

    // Убеждаемся, что модальное окно скрыто при загрузке страницы
    modal.style.display = "none";

    closeModal.addEventListener("click", function () {
        modal.classList.remove("active");
        modalContent.classList.remove("active");
        setTimeout(() => {
            modal.style.display = "none";
        }, 300); // Должно совпадать с длительностью анимации
    });

    window.onclick = function (event) {
        if (event.target === modal) {
            modal.classList.remove("active");
            modalContent.classList.remove("active");
            setTimeout(() => {
                modal.style.display = "none";
            }, 300);
        }
    };
});

function openModal(element) {
    const store = JSON.parse(element.getAttribute("data-store"));

    document.getElementById("modal-logo").src = `/static/img/market/${store.logo}.jpg`;
    document.getElementById("modal-name").innerText = store.name;
    document.getElementById("modal-description").innerText = store.description;

    // Используем bg как cover
    document.getElementById("modal-cover").style.backgroundImage = `url('/static/img/market/${store.bg}.jpg')`;

    // Устанавливаем адрес и ссылку на Яндекс.Карты
    const addressElement = document.getElementById("modal-address");
    addressElement.innerText = store.address || "Адрес не указан";

    if (store.lat && store.lon) {
        addressElement.href = `https://yandex.ru/maps/?pt=${store.lon},${store.lat}&z=16&l=map&oid=&whatshere[point]=${store.lon},${store.lat}&whatshere[zoom]=16`;
    } else {
        addressElement.href = "#";
    }

    // Обрабатываем категории
    const categoryContainer = document.getElementById("modal-category");
    categoryContainer.innerHTML = "";
    if (store.catergory) {
        const categories = store.catergory.split(",").map(cat => cat.trim());
        categories.forEach(category => {
            const categoryElement = document.createElement("p");
            categoryElement.innerText = category;
            categoryContainer.appendChild(categoryElement);
        });
    }

    // Показываем или скрываем лейбл доставки
    const deliveryElement = document.getElementById("modal-delivery");
    if (store.delivery) {
        deliveryElement.classList.remove("hidden");
    } else {
        deliveryElement.classList.add("hidden");
    }

    const links = {
        instagram: document.getElementById("modal-instagram"),
        telegram: document.getElementById("modal-telegram"),
        vk: document.getElementById("modal-vk"),
        web: document.getElementById("modal-web"),
    };

    Object.keys(links).forEach((key) => {
        if (store[key]) {
            if (key === "web") {
                links[key].href = `https://${store[key]}`; // Для веб-сайта добавляем https://
            } else if (key === "telegram") {
                links[key].href = `https://t.me/${store[key]}`; // Для Telegram формируем ссылку t.me
            } else {
                links[key].href = `https://${key}.com/${store[key]}`; // Для Instagram, VK формируем стандартную ссылку
            }
            links[key].classList.remove("hidden"); // Показываем ссылку
        } else {
            links[key].classList.add("hidden"); // Скрываем ссылку, если её нет
        }
    });
    

    const modal = document.getElementById("storeModal");
    const modalContent = modal.querySelector(".modal-content");

    modal.style.display = "flex";
    setTimeout(() => {
        modal.classList.add("active");
        modalContent.classList.add("active");
    }, 10);
}

