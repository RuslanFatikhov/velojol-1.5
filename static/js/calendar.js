document.addEventListener('DOMContentLoaded', function () {

  console.log('🔥 calendar.js loaded, eventsData:', eventsData);

  const calendarGrid     = document.getElementById('calendarGrid');
  const eventModal       = document.getElementById('eventModal');
  const eventList        = document.getElementById('eventList');
  const addEventButton   = document.getElementById('addEventButton');
  const addEventModal    = document.getElementById('addEventModal');
  const closeButtons     = document.querySelectorAll('.calendar-close-button');
  const addEventForm     = document.getElementById('addEventForm');
  const cityFilter       = document.getElementById('cityFilter');
  const typeFilter       = document.getElementById('typeFilter');
  const prevBtn          = document.getElementById('prevmonth');
  const nextBtn          = document.getElementById('nextmonth');
  const monthLabel       = document.querySelector('#monthSelector h4');
  const monthNames       = [
    'Январь','Февраль','Март','Апрель','Май','Июнь',
    'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
  ];

  // Инициализация отображаемого месяца/года
  let displayDate;
  if (eventsData.length) {
      displayDate = new Date(eventsData[0].datetime);
  } else {
      displayDate = new Date();
  }
  let displayMonth = displayDate.getMonth();
  let displayYear  = displayDate.getFullYear();
  
  function buildCalendar() {
      console.log('→ buildCalendar()', displayMonth, displayYear);
    calendarGrid.innerHTML = '';
    monthLabel.textContent = `${monthNames[displayMonth]} ${displayYear}`;

    const firstDay = new Date(displayYear, displayMonth, 1);
    const lastDay  = new Date(displayYear, displayMonth + 1, 0);
    const startDay = firstDay.getDay() || 7;

    for (let i = 1; i < startDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.classList.add('calendar-cell','empty');
      calendarGrid.appendChild(emptyCell);
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const cell    = document.createElement('div');
      const dateStr = new Date(displayYear, displayMonth, d)
                         .toISOString().split('T')[0];
      cell.classList.add('calendar-cell');
      cell.dataset.date = dateStr;
      cell.innerHTML    = `<p class="date-number">${d}</p>`;

      const dayEvents = getEventsForDate(dateStr);
      if (dayEvents.length) {
        const tagsContainer = document.createElement('div');
        tagsContainer.classList.add('tags-container');

        dayEvents.forEach(evt => {
          const tag = document.createElement('span');
          tag.classList.add(
            'event-tag',
            `event-tag--${evt.type.replace(/\s+/g,'')}`
          );
          tag.textContent = evt.title;
          tag.title       = evt.city;
          tag.addEventListener('click', e => {
            e.stopPropagation();
            showEventDetails(evt);
          });
          tagsContainer.appendChild(tag);
        });

        cell.appendChild(tagsContainer);
      }

      // клик по ячейке — если >1 события, список, иначе детали
      cell.addEventListener('click', () => openEventModal(dateStr));

      calendarGrid.appendChild(cell);
      console.log('calendarGrid →', calendarGrid);
    }
  }

  function getEventsForDate(date) {
    const city = cityFilter.value;
    const type = typeFilter.value;
    return eventsData.filter(evt => {
      const evtDate = evt.datetime.split('T')[0];
      return evtDate === date
        && (!city || evt.city === city)
        && (!type || evt.type === type);
    });
  }

  // Универсальное открытие модалки
  function openEventModal(date) {
    const dayEvents = getEventsForDate(date);
    if (!dayEvents.length) return;

    eventList.innerHTML = '';
    if (dayEvents.length > 1) {
      dayEvents.forEach(evt => {
        const item = document.createElement('div');
        item.classList.add('event-select-item');
        item.textContent = `${evt.title} — ${evt.city}`;
        item.addEventListener('click', () => showEventDetails(evt));
        eventList.appendChild(item);
      });
    } else {
      showEventDetails(dayEvents[0]);
    }
    eventModal.style.display = 'flex';
  }

  // Показ деталей одного события только непустых полей
  function showEventDetails(evt) {
    let html = '<div class="event-card">';
    if (evt.cover_image) html += `<img src="${evt.cover_image}" alt="Обложка" class="calendar-modal-cover-img">`;
    html += '<span class="hstack_important gap8">';
    if (evt.city)      html += `<p class="badge dark-prime-invert-300">${evt.city}</p>`;
    if (evt.type)      html += `<p class="badge dark-prime-invert-300">${evt.type}</p>`;
    html += '</span>';
    if (evt.title)     html += `<h3 class="bold dark-prime-invert-300">${evt.title}</h3>`;
    if (evt.description) html += `<p class="dark-prime-invert-300" style="margin-bottom: 24px;">${evt.description}</p>`;
    if (evt.link)      html += `<a class="button size_l bgprime100 dark-prime-invert-300" href="${evt.link}" target="_blank">Подробнее</a>`;
    if (evt.route_link) html += `<a class="button size_l bgprime100 dark-prime-invert-300" href="${evt.route_link}" target="_blank">Маршрут</a>`;
    html += '</div>';
    eventList.innerHTML = html;
  }

  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      eventModal.style.display    = 'none';
      addEventModal.style.display = 'none';
    });
  });

  addEventButton.addEventListener('click', () => {
    addEventModal.style.display = 'flex';
  });

  prevBtn.addEventListener('click', () => {
    displayMonth--;
    if (displayMonth < 0) {
      displayMonth = 11; displayYear--;
    }
    buildCalendar();
  });
  nextBtn.addEventListener('click', () => {
    displayMonth++;
    if (displayMonth > 11) {
      displayMonth = 0; displayYear++;
    }
    buildCalendar();
  });

  addEventForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(addEventForm);

    fetch('/calendar/submit', {
      method: 'POST',
      body: formData
    })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        alert(data.message);
        addEventModal.style.display = 'none';
        addEventForm.reset();
        buildCalendar();
      } else {
        alert('Ошибка: ' + data.message);
      }
    })
    .catch(err => {
      console.error(err);
      alert('Сетевая ошибка.');
    });
  });

  cityFilter.addEventListener('change', buildCalendar);
  typeFilter.addEventListener('change', buildCalendar);

  buildCalendar();
});
