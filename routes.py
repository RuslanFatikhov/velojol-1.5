import os
import json
import threading
import random
from flask import render_template, jsonify, request, abort
from utils import load_json, pluralize_stores, pluralize_routes, load_data_count, load_routes_count

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def load_courses():
    filepath = os.path.join("static", "data", "course.json")
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def init_routes(app):
    @app.route("/")
    def home():
        cities_data = load_json("static/data/cities.json") or []
        random_cities = random.sample(cities_data, min(len(cities_data), 6))
        return render_template("index.html", cities=random_cities)

    @app.route("/cities")
    def cities():
        cities_data = load_json("static/data/cities.json") or []
        return render_template("cities.html", cities=cities_data)

    @app.route("/market")
    def market():
        stores = load_json("static/data/market.json") or []
        return render_template("market.html", stores=stores)

    @app.route("/about")
    def about():
        return render_template("about.html")

    @app.route("/<city_id>")
    def city_details(city_id):
        cities_data = load_json("static/data/cities.json") or []
        city = next((c for c in cities_data if c["id"] == city_id), None)
        if not city:
            abort(404)

        parking_count = load_data_count(city_id, "parkings")
        station_count = load_data_count(city_id, "repairstation")
        stores = load_json("static/data/market.json") or []
        store_count = sum(1 for store in stores if city["city"] in store.get("address", ""))
        routes_count = load_routes_count(city_id)

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
        cities_data = load_json("static/data/cities.json") or []
        city = next((c for c in cities_data if c["id"] == city_id), None)
        if not city:
            abort(404)

        required_fields = ["coordinates", "zoom", "city", "id"]
        for field in required_fields:
            if city.get(field) is None:
                return f"Ошибка: Поле '{field}' отсутствует в данных города {city_id}", 500

        city_json_path = f"static/data/cities/{city_id}.json"
        bikeparkings_json_path = f"static/data/cities/{city_id}-parkings.geojson"
        city_map_data = load_json(city_json_path) or {}
        bikeparkings_data_exists = os.path.exists(bikeparkings_json_path)

        return render_template("map.html", city=city,
                               map_data=city_map_data,
                               bikeparkings_json_path=bikeparkings_json_path if bikeparkings_data_exists else None)

    @app.route("/routes")
    def routes_page():
        route_cities_data = load_json("static/data/route_cities.json") or []
        return render_template("routes.html", routes=route_cities_data)

    @app.route("/<city_id>_routes")
    def city_routes(city_id):
        json_file_path = f"static/data/routes/{city_id}_routes.json"
        routes_data = load_json(json_file_path) or []
        cities_data = load_json("static/data/cities.json") or []
        city = next((c for c in cities_data if c["id"] == city_id), None)
        if not city:
            abort(404)
        return render_template("city_routes.html", city=city, routes=routes_data)

    @app.route("/route/<route_id>")
    def route_details(route_id):
        from glob import glob
        routes_directory = "static/data/routes"
        routes_files = glob(f"{routes_directory}/*_routes.json")

        route = None
        city_id = None
        for file_path in routes_files:
            routes_data = load_json(file_path) or []
            route = next((r for r in routes_data if r["id"] == route_id), None)
            if route:
                city_id = file_path.split("/")[-1].split("_")[0]
                break

        if not route or not city_id:
            abort(404)

        return render_template("route_details.html", route=route, city_id=city_id)

    @app.route("/photos/<city_id>/<bikelane_id>", methods=["GET"])
    def get_bikelane_photos(city_id, bikelane_id):
        folder_path = os.path.join("static", "img", "bikelanes", city_id, bikelane_id)
        if not os.path.exists(folder_path) or not os.path.isdir(folder_path):
            return jsonify({"error": "Папка не найдена"}), 404

        allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
        files = [f"/static/img/bikelanes/{city_id}/{bikelane_id}/{file}"
                 for file in os.listdir(folder_path)
                 if os.path.splitext(file)[1].lower() in allowed_extensions]

        return jsonify({"photos": files}) if files else jsonify({"error": "Файлы не найдены"}), 404

    @app.route("/api/route_photos", methods=["GET"])
    def get_route_photos():
        folder = request.args.get("folder")
        folder_path = os.path.join("static", "img", "routes", folder)
        if not os.path.exists(folder_path):
            return jsonify({"photos": []})

        photos = [f"/static/img/routes/{folder}/{f}"
                  for f in os.listdir(folder_path)
                  if f.endswith((".jpg", ".png", ".jpeg"))]
        photos.sort()
        return jsonify({"photos": photos})

    @app.route("/spotters")
    def spotters():
        return render_template("spotters.html")

    @app.route("/velojol2")
    def velojol2():
        return render_template("velojol2.html")

    @app.route("/course")
    def course():
        courses = load_courses()
        return render_template("course/course.html", courses=courses)

    @app.route("/course/<lesson_url>")
    def course_lesson(lesson_url):
        courses = load_courses()
        lesson = next((lesson for lesson in courses if lesson['url'] == lesson_url), None)
        return render_template(f'course/{lesson_url}.html', lesson=lesson) if lesson else render_template('404.html'), 404

    @app.route("/exam")
    def exam():
        return render_template("exam.html")

    @app.route("/exam_data")
    def exam_data():
        filepath = os.path.join("static", "data", "exam.json")
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                return jsonify(json.load(f))
        return jsonify({"error": "exam.json not found"}), 404

    lock = threading.Lock()

    def save_score(score):
        filepath = os.path.join(app.root_path, 'scores.json')
        with lock:
            data = {}
            if os.path.exists(filepath):
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            score_str = str(score)
            data[score_str] = data.get(score_str, 0) + 1
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False)

    def get_stats():
        filepath = os.path.join(app.root_path, 'scores.json')
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

    @app.route("/submit_score", methods=["POST"])
    def submit_score():
        data = request.get_json()
        score = data.get('score')
        if score is not None and isinstance(score, int) and 0 <= score <= 10:
            save_score(score)
            return jsonify({'status': 'success'}), 200
        return jsonify({'status': 'error', 'message': 'Invalid or missing score'}), 400

    @app.route("/stats")
    def stats():
        stats_data = get_stats()
        return render_template("stats.html", stats=stats_data)

    @app.errorhandler(404)
    def page_not_found(e):
        return render_template("404.html"), 404
