from flask import Blueprint, render_template, request, jsonify
import json, os
from datetime import datetime
from werkzeug.utils import secure_filename

calendar_bp = Blueprint('calendar', __name__)

EVENTS_FILE    = 'static/data/events.json'
UPLOAD_FOLDER  = 'static/img/calendar'
ALLOWED_EXTS   = {'png','jpg','jpeg'}
MAX_FILE_SIZE  = 10 * 1024 * 1024  # 10 МБ

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.',1)[1].lower() in ALLOWED_EXTS

def load_events():
    if not os.path.exists(EVENTS_FILE):
        return []
    with open(EVENTS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_events(events):
    with open(EVENTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(events, f, ensure_ascii=False, indent=4)

def generate_event_id(events):
    existing = {e['id'] for e in events}
    i = 1
    while True:
        eid = f"event{i:03}"
        if eid not in existing:
            return eid
        i += 1

@calendar_bp.route('/calendar')
def calendar():
    events = load_events()
    approved = [e for e in events if e.get('status') == 'approved']
    return render_template('calendar.html', events=approved)

@calendar_bp.route('/calendar/submit', methods=['POST'])
def submit_event():
    # проверка размера
    if 'cover_image' in request.files:
        f = request.files['cover_image']
        f.seek(0, os.SEEK_END)
        if f.tell() > MAX_FILE_SIZE:
            return jsonify(success=False, message='Файл слишком большой (max 10МБ).'), 400
        f.seek(0)

    # обычные поля
    title       = request.form.get('title','').strip()
    description = request.form.get('description','').strip()
    dt          = request.form.get('datetime','').strip()
    city        = request.form.get('city','').strip()
    etype       = request.form.get('type','').strip()
    link        = request.form.get('link','').strip()
    route_link  = request.form.get('route_link','').strip()
    organizer   = request.form.get('organizer','').strip()

    if not all([title, description, dt, city, etype, link, route_link, organizer]):
        return jsonify(success=False, message='Заполните все обязательные поля.'), 400

    events = load_events()
    new_id = generate_event_id(events)
    new_event = {
        'id': new_id,
        'title': title,
        'description': description,
        'datetime': dt,
        'city': city,
        'type': etype,
        'link': link,
        'route_link': route_link,
        'organizer': organizer,
        'cover_image': '',
        'status': 'pending',
        'created_at': datetime.utcnow().isoformat()
    }

    # загрузка файла
    if 'cover_image' in request.files:
        file = request.files['cover_image']
        if file and allowed_file(file.filename):
            fname = secure_filename(file.filename)
            save_name = f"{new_id}_{fname}"
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            path = os.path.join(UPLOAD_FOLDER, save_name)
            file.save(path)
            new_event['cover_image'] = f"/static/img/calendar/{save_name}"

    events.append(new_event)
    save_events(events)
    return jsonify(success=True, message='Событие отправлено на модерацию!')

