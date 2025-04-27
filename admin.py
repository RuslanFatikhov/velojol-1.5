from flask import render_template, request, jsonify, redirect, url_for, session
import os
import json
from functools import wraps
from config import Config
from utils import load_json

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get("admin_logged_in"):
            return redirect(url_for("admin_login"))
        return f(*args, **kwargs)
    return decorated_function

def init_admin_routes(app):
    # ===== ЛОГИН / ЛОГАУТ =====
    @app.route("/admin/login", methods=["GET", "POST"])
    def admin_login():
        if request.method == "POST":
            username = request.form.get("username")
            password = request.form.get("password")
            if username == Config.ADMIN_USERNAME and password == Config.ADMIN_PASSWORD:
                session["admin_logged_in"] = True
                return redirect(url_for("admin_panel"))
            return render_template("admin.html", error="Неверные данные", cities=[])
        return render_template("admin.html", cities=[])

    @app.route("/admin/logout")
    def admin_logout():
        session.pop("admin_logged_in", None)
        return redirect(url_for("admin_login"))

    # ===== АДМИН-ПАНЕЛЬ =====
    @app.route("/admin", methods=["GET"])
    @admin_required
    def admin_panel():
        cities_data = load_json("static/data/cities.json") or []
        return render_template("admin.html", cities=cities_data)

    @app.route("/admin/cities", methods=["GET", "POST"])
    @admin_required
    def admin_cities():
        cities_data = load_json("static/data/cities.json") or []
        if request.method == "POST":
            updated_data = request.json
            with open("static/data/cities.json", "w", encoding="utf-8") as f:
                json.dump(updated_data, f, ensure_ascii=False, indent=4)
            return jsonify({"status": "success"})
        return render_template("admin_cities.html", cities=cities_data)

    @app.route("/admin/routes", methods=["GET"])
    @admin_required
    def admin_routes():
        cities_data = load_json("static/data/cities.json") or []
        return render_template("admin_routes.html", cities=cities_data)

    @app.route("/admin/routes/edit/<city_id>", methods=["GET", "POST"])
    @admin_required
    def edit_city_routes(city_id):
        json_file_path = f"static/data/routes/{city_id}_routes.json"
        routes_data = load_json(json_file_path)
        if request.method == "POST":
            updated_routes = request.json
            with open(json_file_path, "w", encoding="utf-8") as f:
                json.dump(updated_routes, f, ensure_ascii=False, indent=4)
            return jsonify({"status": "success"})
        return render_template("edit_city_routes.html", city_id=city_id, routes=routes_data)

    @app.route("/admin/cities/edit/<city_id>", methods=["GET", "POST"])
    @admin_required
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

    @app.route("/admin/cities/delete/<city_id>", methods=["POST"])
    @admin_required
    def delete_city(city_id):
        cities_data = load_json("static/data/cities.json") or []
        cities_data = [c for c in cities_data if c["id"] != city_id]
        with open("static/data/cities.json", "w", encoding="utf-8") as f:
            json.dump(cities_data, f, ensure_ascii=False, indent=4)
        return jsonify({"status": "success"})

    @app.route("/admin/cities/add", methods=["GET", "POST"])
    @admin_required
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

    @app.route("/admin/city/<city_id>/bikelanes", methods=["GET", "POST"])
    @admin_required
    def admin_bikelanes(city_id):
        json_file_path = f"static/data/cities/{city_id}.json"
        bikelanes_data = load_json(json_file_path) or []

        if request.method == "POST":
            updated_bikelanes = request.json
            with open(json_file_path, "w", encoding="utf-8") as f:
                json.dump(updated_bikelanes, f, ensure_ascii=False, indent=4)
            return jsonify({"status": "success"})

        return render_template("admin_bikelanes.html", city_id=city_id, bikelanes=bikelanes_data)

    
