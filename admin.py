from flask import render_template, request, jsonify, redirect, url_for
import os
from utils import load_json

def init_admin_routes(app):
    """
    Регистрирует маршруты админ-панели в приложении Flask.
    :param app: Экземпляр Flask-приложения
    """
    # Главная страница админ-панели
    @app.route("/admin", methods=["GET"])
    def admin_panel():
        cities_data = load_json("static/data/cities.json") or []
        return render_template("admin.html", cities=cities_data)

    # Управление городами
    @app.route("/admin/cities", methods=["GET", "POST"])
    def admin_cities():
        cities_data = load_json("static/data/cities.json") or []
        if request.method == "POST":
            updated_data = request.json
            with open("static/data/cities.json", "w", encoding="utf-8") as f:
                json.dump(updated_data, f, ensure_ascii=False, indent=4)
            return jsonify({"status": "success"})
        return render_template("admin_cities.html", cities=cities_data)

    # Управление маршрутами
    @app.route("/admin/routes", methods=["GET"])
    def admin_routes():
        cities_data = load_json("static/data/cities.json") or []
        return render_template("admin_routes.html", cities=cities_data)

    # Редактирование маршрутов города
    @app.route("/admin/routes/edit/<city_id>", methods=["GET", "POST"])
    def edit_city_routes(city_id):
        json_file_path = f"static/data/routes/{city_id}_routes.json"
        routes_data = load_json(json_file_path) or []
        if request.method == "POST":
            updated_routes = request.json
            with open(json_file_path, "w", encoding="utf-8") as f:
                json.dump(updated_routes, f, ensure_ascii=False, indent=4)
            return jsonify({"status": "success"})
        return render_template("edit_city_routes.html", city_id=city_id, routes=routes_data)

    # Редактирование города
    @app.route("/admin/cities/edit/<city_id>", methods=["GET", "POST"])
    def edit_city(city_id):
        cities_data = load_json("static/data/cities.json") or []
        city = next((c for c in cities_data if c["id"] == city_id), None)
        if not city:
            return "Город не найден", 404

        if request.method == "POST":
            try:
                city["city"] = request.form["city"]
                city["country"] = request.form["country"]
                city["coat"] = request.form["coat"]
                city["cover"] = request.form["cover"]
                city["distance"] = float(request.form["distance"])
                city["zoom"] = int(request.form["zoom"])
                city["coordinates"] = [
                    float(request.form["longitude"]),
                    float(request.form["latitude"]),
                ]
                city["rating"] = float(request.form["rating"])

                with open("static/data/cities.json", "w", encoding="utf-8") as f:
                    json.dump(cities_data, f, ensure_ascii=False, indent=4)
                return redirect(url_for("admin_cities"))
            except (KeyError, ValueError):
                return "Некорректные данные в форме", 400

        return render_template("edit_city.html", city=city)

    # Удаление города
    @app.route("/admin/cities/delete/<city_id>", methods=["POST"])
    def delete_city(city_id):
        cities_data = load_json("static/data/cities.json") or []
        cities_data = [c for c in cities_data if c["id"] != city_id]
        with open("static/data/cities.json", "w", encoding="utf-8") as f:
            json.dump(cities_data, f, ensure_ascii=False, indent=4)
        return jsonify({"status": "success"})

    # Добавление города
    @app.route("/admin/cities/add", methods=["GET", "POST"])
    def add_city():
        if request.method == "POST":
            cities_data = load_json("static/data/cities.json") or []
            new_id = request.form["id"]
            if any(c["id"] == new_id for c in cities_data):
                return "Город с таким ID уже существует", 400

            try:
                new_city = {
                    "id": new_id,
                    "city": request.form["city"],
                    "country": request.form["country"],
                    "coat": request.form["coat"],
                    "cover": request.form["cover"],
                    "distance": float(request.form["distance"]),
                    "zoom": int(request.form["zoom"]),
                    "coordinates": [
                        float(request.form["longitude"]),
                        float(request.form["latitude"])
                    ],
                    "rating": float(request.form["rating"]),
                }
                cities_data.append(new_city)
                with open("static/data/cities.json", "w", encoding="utf-8") as f:
                    json.dump(cities_data, f, ensure_ascii=False, indent=4)
                return redirect(url_for("admin_cities"))
            except (KeyError, ValueError):
                return "Некорректные данные в форме", 400

        return render_template("add_city.html")

    # Управление велодорожками
    @app.route("/admin/city/<city_id>/bikelanes", methods=["GET", "POST"])
    def admin_bikelanes(city_id):
        json_file_path = f"static/data/cities/{city_id}.json"
        bikelanes_data = load_json(json_file_path) or []

        for bikelane in bikelanes_data:
            photo_folder = f"static/img/bikelanes/{city_id}/{bikelane['id']}"
            if os.path.isdir(photo_folder):
                bikelane["photo_files"] = [
                    os.path.join(photo_folder, file)
                    for file in os.listdir(photo_folder)
                    if os.path.isfile(os.path.join(photo_folder, file))
                ]
            else:
                bikelane["photo_files"] = []

        if request.method == "POST":
            updated_bikelanes = request.json
            with open(json_file_path, "w", encoding="utf-8") as f:
                json.dump(updated_bikelanes, f, ensure_ascii=False, indent=4)
            return jsonify({"status": "success"})

        return render_template("admin_bikelanes.html", city_id=city_id, bikelanes=bikelanes_data)