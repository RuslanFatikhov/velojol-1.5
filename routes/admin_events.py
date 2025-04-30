from flask import Blueprint, render_template, redirect, url_for, request, flash
import os, json
from functools import wraps
from datetime import datetime

# Blueprint для админки событий
admin_events_bp = Blueprint('admin_events', __name__, url_prefix='/admin')

EVENTS_FILE = 'static/data/events.json'

# Вспомогательные функции

def load_events():
    if not os.path.exists(EVENTS_FILE):
        return []
    with open(EVENTS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_events(events):
    with open(EVENTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(events, f, ensure_ascii=False, indent=4)

# Декоратор проверки авторизации админа (пример)
def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        from flask import session
        if not session.get('admin_logged_in'):
            flash('Пожалуйста, войдите в админку', 'warning')
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated

# Страница модерации событий
@admin_events_bp.route('/events')
@admin_required
def list_events():
    events = load_events()
    pending  = [e for e in events if e.get('status') == 'pending']
    approved = [e for e in events if e.get('status') == 'approved']
    return render_template('admin_events.html', pending=pending, approved=approved)

# Одобрить событие
@admin_events_bp.route('/events/approve/<event_id>', methods=['POST'])
@admin_required
def approve_event(event_id):
    events = load_events()
    for e in events:
        if e['id'] == event_id:
            e['status'] = 'approved'
            e['approved_at'] = datetime.utcnow().isoformat()
            break
    save_events(events)
    flash(f'Событие {event_id} одобрено', 'success')
    return redirect(url_for('admin_events.list_events'))

# Удалить событие
@admin_events_bp.route('/events/delete/<event_id>', methods=['POST'])
@admin_required
def delete_event(event_id):
    events = load_events()
    events = [e for e in events if e['id'] != event_id]
    save_events(events)
    flash(f'Событие {event_id} удалено', 'success')
    return redirect(url_for('admin_events.list_events'))
