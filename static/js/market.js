document.addEventListener("DOMContentLoaded", function () {
    const modal = document.getElementById("storeModal");
    const modalContent = modal.querySelector(".modal-content");
    const closeModal = document.querySelector("#storeModal .close");
    const filtersModal = document.getElementById("filtersModal");
    const filtersModalContent = filtersModal.querySelector(".modal-content");
    const openFiltersBtn = document.getElementById("openFiltersModal");
    const closeFiltersBtn = filtersModal.querySelector(".close");
    const applyFiltersBtn = document.getElementById("applyFilters");
    const categoryButtons = document.querySelectorAll(".category-button");
    const stores = document.querySelectorAll(".storecard");
    const storeCountText = document.getElementById("storeCountText");

    modal.style.display = "none";
    filtersModal.style.display = "none";

    closeModal.addEventListener("click", closeModalHandler(modal, modalContent));
    window.addEventListener("click", function (event) {
        if (event.target === modal) closeModalHandler(modal, modalContent)();
    });

    openFiltersBtn.addEventListener("click", function () {
        filtersModal.style.display = "flex";
        setTimeout(() => {
            filtersModal.classList.add("active");
            filtersModalContent.classList.add("active");
        }, 10);
    });

    closeFiltersBtn.addEventListener("click", closeModalHandler(filtersModal, filtersModalContent));
    window.addEventListener("click", function (event) {
        if (event.target === filtersModal) closeModalHandler(filtersModal, filtersModalContent)();
    });

    function closeModalHandler(modalElement, contentElement) {
        return function () {
            modalElement.classList.remove("active");
            contentElement.classList.remove("active");
            setTimeout(() => {
                modalElement.style.display = "none";
            }, 300);
        };
    }

    function getURLParameter(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    function pluralizeStores(count) {
        if (count % 10 === 1 && count % 100 !== 11) {
            return `${count} магазин`;
        } else if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
            return `${count} магазина`;
        } else {
            return `${count} магазинов`;
        }
    }

    function updateStoreCount() {
        const visibleStores = Array.from(stores).filter(store => store.style.display !== "none").length;
        storeCountText.textContent = pluralizeStores(visibleStores);
    }

    const selectedCategory = getURLParameter("category") || "all";
    const selectedCity = getURLParameter("city");

    categoryButtons.forEach(button => {
        if (button.getAttribute("data-category") === selectedCategory) {
            button.classList.add("active");
        }
    });

    if (selectedCity) {
        const cityCheckbox = document.querySelector(`.city-filter[value="${selectedCity}"]`);
        if (cityCheckbox) {
            cityCheckbox.checked = true;
            filterStores(selectedCategory, [selectedCity], false);
        } else {
            console.warn(`Чекбокс для города "${selectedCity}" не найден`);
            filterStores(selectedCategory);
        }
    } else {
        filterStores(selectedCategory);
    }

    categoryButtons.forEach(button => {
        button.addEventListener("click", function () {
            categoryButtons.forEach(btn => btn.classList.remove("active"));
            this.classList.add("active");
            const selectedCities = Array.from(document.querySelectorAll(".city-filter:checked")).map(cb => cb.value);
            const deliveryOnly = document.getElementById("deliveryFilter").checked;
            filterStores(this.getAttribute("data-category"), selectedCities, deliveryOnly);
        });
    });

    applyFiltersBtn.addEventListener("click", function () {
        const selectedCities = Array.from(document.querySelectorAll(".city-filter:checked")).map(cb => cb.value);
        const deliveryOnly = document.getElementById("deliveryFilter").checked;
        const activeCategory = document.querySelector(".category-button.active").getAttribute("data-category");
        filterStores(activeCategory, selectedCities, deliveryOnly);
        closeModalHandler(filtersModal, filtersModalContent)();
    });

    function filterStores(category, cities = [], deliveryOnly = false) {
        stores.forEach(store => {
            try {
                const storeData = JSON.parse(store.getAttribute("data-store"));
                // Используем 'catergory' из JSON, так как в данных опечатка
                const storeCategories = (storeData.catergory || "all").split(",").map(cat => cat.trim().toLowerCase());
                const storeAddress = (storeData.address || "").toLowerCase();
                const hasDelivery = storeData.delivery === "TRUE" || storeData.delivery === true;

                const categoryMatch = category === "all" || storeCategories.includes(category.toLowerCase());
                const cityMatch = cities.length === 0 || cities.some(city => storeAddress.includes(city.toLowerCase()));
                const deliveryMatch = !deliveryOnly || hasDelivery;

                store.style.display = categoryMatch && cityMatch && deliveryMatch ? "block" : "none";
            } catch (error) {
                console.error("Ошибка при обработке магазина:", error);
                console.log("Данные магазина:", store.getAttribute("data-store"));
                store.style.display = "none";
            }
        });
        updateStoreCount();
    }

    updateStoreCount();
});

// Функция openModal (без изменений)
function openModal(element) {
    const store = JSON.parse(element.getAttribute("data-store"));

    document.getElementById("modal-logo").src = `/static/img/market/${store.logo}.jpg`;
    document.getElementById("modal-name").innerText = store.name;
    document.getElementById("modal-description").innerText = store.description;
    document.getElementById("modal-cover").style.backgroundImage = `url('/static/img/market/${store.bg}.jpg')`;

    const addressElement = document.getElementById("modal-address");
    const addressTextElement = addressElement.querySelector(".p2.dark-prime-invert-300");
    addressTextElement.innerText = store.address || "Адрес не указан";
    if (store.lat && store.lon) {
        addressElement.href = `https://yandex.ru/maps/?pt=${store.lon},${store.lat}&z=16&l=map&oid=&whatshere[point]=${store.lon},${store.lat}&whatshere[zoom]=16`;
    } else {
        addressElement.href = "#";
    }

    const categoryContainer = document.getElementById("modal-category");
    categoryContainer.innerHTML = "";
    if (store.catergory) {  // Используем 'catergory' из JSON
        const categories = store.catergory.split(",").map(cat => cat.trim());
        categories.forEach(category => {
            const categoryElement = document.createElement("p");
            categoryElement.innerText = category;
            categoryContainer.appendChild(categoryElement);
        });
    }

    const deliveryElement = document.getElementById("modal-delivery");
    if (store.delivery === "TRUE" || store.delivery === true) {
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
                links[key].href = `https://${store[key]}`;
            } else if (key === "telegram") {
                links[key].href = `https://t.me/${store[key]}`;
            } else {
                links[key].href = `https://${key}.com/${store[key]}`;
            }
            links[key].classList.remove("hidden");
        } else {
            links[key].classList.add("hidden");
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