from flask import render_template, jsonify, request
import random
import os
from utils import load_json, pluralize_stores, pluralize_routes, load_data_count, load_routes_count

def init_routes(app):
    """
    Регистрирует публичные маршруты в приложении Flask.
    :param app: Экземпляр Flask-приложения
    """
    # Главная страница
    @app.route("/")
    def home():
        cities_data = load_json("static/data/cities.json") or []
        random_cities = random.sample(cities_data, min(len(cities_data), 6))
        return render_template("index.html", cities=random_cities)

    # Страница списка городов
    @app.route("/cities")
    def cities():
        cities_data = load_json("static/data/cities.json") or []
        return render_template("cities.html", cities=cities_data)

    # Страница магазина
    @app.route("/market")
    def market():
        stores = load_json("static/data/market.json") or []
        return render_template("market.html", stores=stores)

    # Страница "О нас"
    @app.route("/about")
    def about():
        return render_template("about.html")

    # Страница конкретного города
    @app.route("/<city_id>")
    def city_details(city_id):
        cities_data = load_json("static/data/cities.json") or []
        city = next((c for c in cities_data if c["id"] == city_id), None)
        if not city:
            return "Город не найден", 404

        parking_count = load_data_count(city_id, "parkings")
        station_count = load_data_count(city_id, "repairstation")
        stores = load_json("static/data/market.json") or []
        store_count = sum(1 for store in stores if city["city"] in store.get("address", ""))
        routes_count = load_routes_count(city_id)

        store_text = pluralize_stores(store_count)
        routes_text = pluralize_routes(routes_count)

        return render_template(
            "city_details.html",
            city=city,
            parking_count=parking_count,
            station_count=station_count,
            store_count=store_count,
            store_text=store_text,
            routes_count=routes_count,
            routes_text=routes_text
        )

    # Страница карты города
    @app.route("/<city_id>_map")
    def city_map(city_id):
        cities_data = load_json("static/data/cities.json") or []
        city = next((c for c in cities_data if c["id"] == city_id), None)
        if not city:
            return "Город не найден", 404

        required_fields = ["coordinates", "zoom", "city", "id"]
        for field in required_fields:
            if city.get(field) is None:
                return f"Ошибка: Поле '{field}' отсутствует в данных города {city_id}", 500

        city_json_path = f"static/data/cities/{city_id}.json"
        bikeparkings_json_path = f"static/data/cities/{city_id}-parkings.geojson"
        city_map_data = load_json(city_json_path) or {}
        bikeparkings_data_exists = os.path.exists(bikeparkings_json_path)

        return render_template(
            "map.html",
            city=city,
            map_data=city_map_data,
            bikeparkings_json_path=bikeparkings_json_path if bikeparkings_data_exists else None
        )

    # Страница маршрутов
    @app.route("/routes")
    def routes_page():
        route_cities_data = load_json("static/data/route_cities.json") or []
        return render_template("routes.html", routes=route_cities_data)

    # Страница маршрутов города
    @app.route("/<city_id>_routes")
    def city_routes(city_id):
        json_file_path = f"static/data/routes/{city_id}_routes.json"
        routes_data = load_json(json_file_path) or []
        cities_data = load_json("static/data/cities.json") or []
        city = next((c for c in cities_data if c["id"] == city_id), None)
        if not city:
            return f"Город с id '{city_id}' не найден.", 404
        return render_template("city_routes.html", city=city, routes=routes_data)

    # Страница конкретного маршрута
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
            return "Маршрут или город не найден", 404
        return render_template("route_details.html", route=route, city_id=city_id)

    # Получение фотографий велодорожек
    @app.route("/photos/<city_id>/<bikelane_id>", methods=["GET"])
    def get_bikelane_photos(city_id, bikelane_id):
        folder_path = os.path.join("static", "img", "bikelanes", city_id, bikelane_id)
        if not os.path.exists(folder_path) or not os.path.isdir(folder_path):
            return jsonify({"error": "Папка не найдена"}), 404

        allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
        files = [
            f"/static/img/bikelanes/{city_id}/{bikelane_id}/{file}"
            for file in os.listdir(folder_path)
            if os.path.splitext(file)[1].lower() in allowed_extensions
        ]

        if not files:
            return jsonify({"error": "Файлы не найдены"}), 404
        return jsonify({"photos": files})

    # Получение фотографий маршрутов
    @app.route("/api/route_photos", methods=["GET"])
    def get_route_photos():
        folder = request.args.get("folder")
        folder_path = os.path.join("static", "img", "routes", folder)
        if not os.path.exists(folder_path):
            return jsonify({"photos": []})

        photos = [
            f"/static/img/routes/{folder}/{f}"
            for f in os.listdir(folder_path)
            if f.endswith((".jpg", ".png", ".jpeg"))
        ]
        photos.sort()
        return jsonify({"photos": photos})