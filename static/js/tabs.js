document.addEventListener('DOMContentLoaded', function () {
    const tabMap = document.getElementById('tabMap');
    const tabList = document.getElementById('tabList');
    const mapElement = document.getElementById('map');
    const bikeLanesList = document.getElementById('bikelist');

    function showMap() {
        mapElement.classList.remove('hidden');
        bikeLanesList.classList.add('hidden');
        tabMap.classList.add('active');
        tabList.classList.remove('active');
    }

    function showList() {
        bikeLanesList.classList.remove('hidden');
        mapElement.classList.add('hidden');
        tabList.classList.add('active');
        tabMap.classList.remove('active');
    }

    // События кликов на табы
    tabMap.addEventListener('click', showMap);
    tabList.addEventListener('click', showList);
});
