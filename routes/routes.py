import os, json, threading, random, glob
from pathlib import Path
from functools import lru_cache
from queue import Queue
from flask import (
    render_template, jsonify, request, abort, current_app, Blueprint
)

from utils import (
    pluralize_stores, pluralize_routes,
    load_data_count, load_routes_count
)

# Константы
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

# Очередь для асинхронной обработки статистики
score_queue = Queue()

# Метрики запросов
request_counters = {
    'total': 0,
    'errors': 0,
    'routes': {}
}

def is_safe_path_component(s: str) -> bool:
    """Разрешены буквы, цифры, тире, подчёркивание и точка."""
    return bool(s) and all(c.isalnum() or c in "-_." for c in s)

@lru_cache(maxsize=32)
def load_data_cached(filepath, default=None):
    """
    Кэшированная версия загрузки данных из JSON-файлов.
    """
    return load_data(filepath, default)

def load_data(filepath, default=None):
    """
    Универсальная функция для загрузки данных из JSON-файлов.
    Возвращает содержимое JSON-файла или `default`,
    если файл не найден / битый / пустой.
    """
    if default is None:
        default = []
    
    full_path = os.path.join(current_app.root_path, filepath)
    if not os.path.exists(full_path):
        current_app.logger.debug(f"Файл не найден: {full_path}")
        return default
    try:
        with open(full_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
            # Более строгая валидация данных
            if isinstance(default, list) and not isinstance(data, list):
                current_app.logger.error(f"Некорректный формат данных в {filepath}: ожидался список")
                return default
            elif isinstance(default, dict) and not isinstance(data, dict):
                current_app.logger.error(f"Некорректный формат данных в {filepath}: ожидался словарь")
                return default
            return data
    except json.JSONDecodeError as e:
        current_app.logger.error(f"Ошибка формата JSON в {filepath}: {e}")
        return default
    except Exception as e:
        current_app.logger.error(f"Ошибка загрузки {filepath}: {e}")
        return default

def get_safe_file_path(base_dir: Path | str, *parts) -> Path | None:
    """
    Безопасно создает путь к файлу, предотвращая path traversal атаки.
    """
    base = Path(base_dir).resolve()
    path = base.joinpath(*parts).resolve()
    try:
        path.relative_to(base)  # ValueError, если path вне base
    except ValueError:
        return None
    return path

def score_worker():
    """
    Рабочий поток для асинхронной обработки статистики.
    """
    while True:
        score = score_queue.get()
        if score is None:  # сигнал для остановки
            break
        _save_score_to_file(score)
        score_queue.task_done()

def _save_score_to_file(score):
    """
    Сохраняет оценку в файл статистики.
    Используется внутри рабочего потока.
    """
    filepath = os.path.join(current_app.root_path, 'scores.json')
    lock = threading.Lock()
    
    with lock:
        data = {}
        if os.path.exists(filepath):
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            except Exception as e:
                current_app.logger.error(f"Ошибка чтения scores.json: {e}")
                data = {}
                
        score_str = str(score)
        data[score_str] = data.get(score_str, 0) + 1
        
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False)
        except Exception as e:
            current_app.logger.error(f"Ошибка записи в scores.json: {e}")

def get_stats():
    """
    Получает статистику оценок из файла.
    """
    filepath = os.path.join(current_app.root_path, 'scores.json')
    if not os.path.exists(filepath):
        return {}
        
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        current_app.logger.error(f"Ошибка чтения данных статистики из scores.json: {e}")
        return {}

def get_route_by_id(route_id):
    """
    Оптимизированный поиск маршрута по ID с кэшированием.
    """
    # Создать кэш маршрутов при первом вызове
    if not hasattr(get_route_by_id, 'routes_cache'):
        get_route_by_id.routes_cache = {}
        get_route_by_id.city_map = {}
        
        routes_directory = os.path.join(current_app.root_path, "static", "data", "routes")
        routes_files = glob.glob(f"{routes_directory}/*_routes.json")
        
        for file_path in routes_files:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    routes_data = json.load(f)
                    city_id = os.path.basename(file_path).split("_")[0]
                    
                    for route in routes_data:
                        if 'id' in route:
                            get_route_by_id.routes_cache[route['id']] = route
                            get_route_by_id.city_map[route['id']] = city_id
            except Exception as e:
                current_app.logger.error(f"Ошибка загрузки маршрутов из {file_path}: {e}")
    
    route = get_route_by_id.routes_cache.get(route_id)
    city_id = get_route_by_id.city_map.get(route_id)
    
    return route, city_id

def init_routes(app):
    # Запуск рабочего потока для обработки статистики
    worker_thread = threading.Thread(target=score_worker, daemon=True)
    worker_thread.start()
    
    # Миддлвары для сбора метрик
    @app.before_request
    def before_request():
        request_counters['total'] += 1
        endpoint = request.endpoint
        if endpoint:
            request_counters['routes'][endpoint] = request_counters['routes'].get(endpoint, 0) + 1

    @app.after_request
    def after_request(response):
        if response.status_code >= 400:
            request_counters['errors'] += 1
        return response
    
    # Основные маршруты
    @app.route("/")
    def home():
        cities_data = load_data_cached("static/data/cities.json")
        random_cities = random.sample(cities_data, min(len(cities_data), 6))
        return render_template("index.html", cities=random_cities)

    @app.route("/cities")
    def cities():
        cities_data = load_data_cached("static/data/cities.json")
        return render_template("cities.html", cities=cities_data)

    @app.route("/market")
    def market():
        stores = load_data_cached("static/data/market.json")
        return render_template("market.html", stores=stores)

    @app.route("/about")
    def about():
        return render_template("about.html")

    @app.route("/<city_id>")
    def city_details(city_id):
        if not is_safe_path_component(city_id):
            current_app.logger.warning(f"Invalid city_id: {city_id}")
            abort(400)  # Bad Request
            
        cities_data = load_data_cached("static/data/cities.json")
        city = next((c for c in cities_data if c["id"] == city_id), None)
        if not city:
            current_app.logger.warning(f"City not found: {city_id}")
            abort(404)
        
        try:
            parking_count = load_data_count(city_id, "parkings")
            station_count = load_data_count(city_id, "repairstation")
            stores = load_data_cached("static/data/market.json")
            store_count = sum(1 for store in stores if city["city"] in store.get("address", ""))
            routes_count = load_routes_count(city_id)
        except Exception as e:
            current_app.logger.error(f"Ошибка загрузки данных для города {city_id}: {e}")
            abort(500)
            
        store_text = pluralize_stores(store_count)
        routes_text = pluralize_routes(routes_count)

        return render_template("city_details.html", city=city,
                               parking_count=parking_count,
                               station_count=station_count,
                               store_count=store_count,
                               store_text=store_text,
                               routes_count=routes_count,
                               routes_text=routes_text)

    @app.route("/<city_id>_map")
    def city_map(city_id):
        if not is_safe_path_component(city_id):
            current_app.logger.warning(f"Invalid city_id: {city_id}")
            abort(400)  # Bad Request
            
        cities_data = load_data_cached("static/data/cities.json")
        city = next((c for c in cities_data if c["id"] == city_id), None)
        if not city:
            current_app.logger.warning(f"City not found: {city_id}")
            abort(404)

        required_fields = ["coordinates", "zoom", "city", "id"]
        for field in required_fields:
            if city.get(field) is None:
                current_app.logger.error(f"Ошибка: Поле '{field}' отсутствует в данных города {city_id}")
                abort(500, f"Ошибка: Поле '{field}' отсутствует в данных города {city_id}")

        city_json_path = f"static/data/cities/{city_id}.json"
        if not os.path.exists(os.path.join(current_app.root_path, city_json_path)):
            current_app.logger.error(f"City data file not found: {city_json_path}")
            abort(404)

        bikeparkings_json_path = f"static/data/cities/{city_id}-parkings.geojson"
        city_map_data = load_data_cached(city_json_path)
        
        full_bikeparkings_path = os.path.join(current_app.root_path, bikeparkings_json_path)
        bikeparkings_data_exists = os.path.exists(full_bikeparkings_path)

        return render_template("map.html", city=city,
                            map_data=city_map_data,
                            bikeparkings_json_path=bikeparkings_json_path if bikeparkings_data_exists else None)

    @app.route("/routes")
    def routes_page():
        route_cities_data = load_data_cached("static/data/route_cities.json")
        return render_template("routes.html", routes=route_cities_data)

    @app.route("/<city_id>_routes")
    def city_routes(city_id):
        if not is_safe_path_component(city_id):
            current_app.logger.warning(f"Invalid city_id: {city_id}")
            abort(400)  # Bad Request
            
        json_file_path = f"static/data/routes/{city_id}_routes.json"
        routes_data = load_data_cached(json_file_path)
        cities_data = load_data_cached("static/data/cities.json")
        city = next((c for c in cities_data if c["id"] == city_id), None)
        if not city:
            current_app.logger.warning(f"City not found: {city_id}")
            abort(404)
        return render_template("city_routes.html", city=city, routes=routes_data)

    @app.route("/route/<route_id>")
    def route_details(route_id):
        if not is_safe_path_component(route_id):
            current_app.logger.warning(f"Invalid route_id: {route_id}")
            abort(400)  # Bad Request
            
        route, city_id = get_route_by_id(route_id)
        
        if not route or not city_id:
            current_app.logger.warning(f"Route not found: {route_id}")
            abort(404)

        return render_template("route_details.html", route=route, city_id=city_id)

    @app.route("/photos/<city_id>/<bikelane_id>")
    def get_bikelane_photos(city_id: str, bikelane_id: str):
        """Отдаёт массив файлов-картинок или 404."""
        if not (is_safe_path_component(city_id) and is_safe_path_component(bikelane_id)):
            current_app.logger.warning(
                "✖ bad path components city=%s id=%s", city_id, bikelane_id
            )
            abort(400)

        base_dir = Path(current_app.root_path) / "static" / "img" / "bikelanes"
        folder = get_safe_file_path(base_dir, city_id, bikelane_id)

        if folder is None or not folder.is_dir():
            current_app.logger.info("No photos directory: %s", folder)
            abort(404)

        if not os.access(folder, os.R_OK):
            current_app.logger.error("No read permission: %s", folder)
            abort(403)

        photos = [
            f"/static/img/bikelanes/{city_id}/{bikelane_id}/{f.name}"
            for f in folder.iterdir()
            if f.suffix.lower() in ALLOWED_EXT and f.is_file()
        ]
        current_app.logger.debug(
            "Found %d photos for %s/%s", len(photos), city_id, bikelane_id
        )
        return jsonify(photos)

    @app.route("/api/route_photos", methods=["GET"])
    def get_route_photos():
        folder = request.args.get("folder")
        if not folder or not is_safe_path_component(folder):
            current_app.logger.warning("Invalid folder parameter for route_photos: %s", folder)
            return jsonify([])

        base_dir = Path(current_app.root_path) / "static" / "img" / "routes"
        folder_path = get_safe_file_path(base_dir, folder)

        if folder_path is None or not os.path.isdir(folder_path):
            current_app.logger.info("Route photos folder not found: %s", folder)
            return jsonify([])

        photos = [
            f"/static/img/routes/{folder}/{f}"
            for f in os.listdir(folder_path)
            if Path(f).suffix.lower() in ALLOWED_EXT
        ]
        photos.sort()
        return jsonify(photos)
    
    @app.route("/spotters")
    def spotters():
        return render_template("spotters.html")

    @app.route("/velojol2")
    def velojol2():
        return render_template("velojol2.html")

    @app.route("/course")
    def course():
        courses = load_data_cached("static/data/course.json")
        return render_template("course/course.html", courses=courses)

    @app.route("/course/<lesson_url>")
    def course_lesson(lesson_url):
        if not is_safe_path_component(lesson_url):
            current_app.logger.warning(f"Invalid lesson_url: {lesson_url}")
            abort(400)  # Bad Request
            
        courses = load_data_cached("static/data/course.json")
        lesson = next((lesson for lesson in courses if lesson['url'] == lesson_url), None)
        
        if not lesson:
            current_app.logger.warning(f"Lesson not found: {lesson_url}")
            return render_template('404.html'), 404
            
        template_path = f'course/{lesson_url}.html'
        try:
            return render_template(template_path, lesson=lesson)
        except Exception as e:
            current_app.logger.error(f"Error rendering lesson template {template_path}: {e}")
            abort(500)

    @app.route("/exam")
    def exam():
        return render_template("exam.html")

    @app.route("/exam_data")
    def exam_data():
        exam_data = load_data_cached("static/data/exam.json")
        if not exam_data:
            current_app.logger.error("Exam data file not found")
            return jsonify({"error": "exam.json not found"}), 404
        return jsonify(exam_data)

    @app.route("/submit_score", methods=["POST"])
    def submit_score():
        try:
            # Проверка наличия правильного Content-Type
            if not request.is_json:
                return jsonify({'status': 'error', 'message': 'Expected Content-Type: application/json'}), 415
                
            data = request.get_json()
            if not data:
                return jsonify({'status': 'error', 'message': 'Invalid JSON data'}), 400
                
            score = data.get('score')
            if score is not None and isinstance(score, int) and 0 <= score <= 10:
                # Использовать асинхронную обработку
                score_queue.put(score)
                return jsonify({'status': 'success'}), 200
            return jsonify({'status': 'error', 'message': 'Invalid or missing score'}), 400
        except Exception as e:
            current_app.logger.error(f"Ошибка при обработке отправки оценки: {e}")
            return jsonify({'status': 'error', 'message': 'Server error'}), 500

    @app.route("/stats")
    def stats():
        stats_data = get_stats()
        return render_template("stats.html", stats=stats_data)
    
    @app.route("/admin/metrics")
    def metrics():
        # Ограничить доступ к метрикам (например, по IP или авторизации)
        if request.remote_addr not in ['127.0.0.1', 'localhost']:
            current_app.logger.warning(f"Unauthorized metrics access from {request.remote_addr}")
            abort(403)
        return jsonify(request_counters)

    @app.errorhandler(404)
    def page_not_found(e):
        return render_template("404.html"), 404
        
    @app.errorhandler(500)
    def internal_server_error(e):
        current_app.logger.error("500: %s", e)
        try:
            return render_template("500.html"), 500
        except Exception:
            # Если шаблон не найден, возвращаем простой текст
            return "Internal server error", 500
            
    @app.errorhandler(400)
    def bad_request(e):
        current_app.logger.warning("400: %s", e)
        return "Bad Request", 400
        
    @app.errorhandler(403)
    def forbidden(e):
        current_app.logger.warning("403: %s", e)
        return "Forbidden", 403

    # При завершении приложения, останавливаем рабочий поток
    @app.teardown_appcontext
    def teardown_appcontext(exception=None):
        score_queue.put(None)  # Сигнал для остановки потока