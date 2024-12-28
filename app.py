from flask import Flask, render_template, request, jsonify ,redirect, url_for
import json 
import random
import os

app = Flask(__name__)

@app.route("/photos/<city_id>/<bikelane_id>", methods=["GET"])
def get_bikelane_photos(city_id, bikelane_id):
    """
    Возвращает список файлов в папке велодорожки.
    """
    folder_path = os.path.join("static", "img", "bikelanes", city_id, bikelane_id)
    if not os.path.exists(folder_path) or not os.path.isdir(folder_path):
        return jsonify({"error": "Папка не найдена"}), 404

    # Получаем список файлов с разрешенными расширениями
    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    files = [
        os.path.join(f"/static/img/bikelanes/{city_id}/{bikelane_id}", file)
        for file in os.listdir(folder_path)
        if os.path.isfile(os.path.join(folder_path, file)) and os.path.splitext(file)[1].lower() in allowed_extensions
    ]

    if not files:
        return jsonify({"error": "Файлы не найдены"}), 404

    return jsonify({"photos": files})

# Главная страница
@app.route("/")
def home():
    """
    Отображает главную страницу с 6 случайными городами.
    """
    try:
        with open("static/data/cities.json", "r", encoding="utf-8") as f:
            cities_data = json.load(f)
        # Перемешиваем города и берем максимум 6
        random_cities = random.sample(cities_data, min(len(cities_data), 6))
    except FileNotFoundError:
        random_cities = []
    except json.JSONDecodeError:
        return "Ошибка в формате файла cities.json", 500

    return render_template("index.html", cities=random_cities)

# Страница списка городов
@app.route("/cities")
def cities():
    """
    Загружает данные из cities.json и отображает страницу списка городов.
    Если файл отсутствует или поврежден, обрабатывает ошибку.
    """
    try:
        with open("static/data/cities.json", "r", encoding="utf-8") as f:
            cities_data = json.load(f)
    except FileNotFoundError:
        cities_data = []  # Если файл не найден, возвращаем пустой список
    except json.JSONDecodeError:
        return "Ошибка в формате файла cities.json", 500  # Если JSON поврежден
    return render_template("cities.html", cities=cities_data)

# Страница конкретного города
@app.route("/<city_id>")
def city_details(city_id):
    """
    Отображает информацию о конкретном городе по его id.
    """
    try:
        with open("static/data/cities.json", "r", encoding="utf-8") as f:
            cities_data = json.load(f)

        # Поиск города по id
        city = next((c for c in cities_data if c["id"] == city_id), None)
        if not city:
            return "Город не найден", 404

    except FileNotFoundError:
        return "Файл cities.json не найден", 500
    except json.JSONDecodeError:
        return "Ошибка в формате файла cities.json", 500

    return render_template("city_details.html", city=city)

# Страница карты города
@app.route("/<city_id>_map")
def city_map(city_id):
    """
    Отображает страницу карты для конкретного города.
    Загружает данные из cities.json и динамический JSON для карты.
    """
    try:
        # Загружаем общие данные о городах
        with open("static/data/cities.json", "r", encoding="utf-8") as f:
            cities_data = json.load(f)

        # Поиск города по id
        city = next((c for c in cities_data if c["id"] == city_id), None)
        if not city:
            return "Город не найден", 404

        # Проверка обязательных данных
        required_fields = ["coordinates", "zoom", "city", "id"]
        for field in required_fields:
            if city.get(field) is None:
                return f"Ошибка: Поле '{field}' отсутствует в данных города {city_id}", 500

        # Дополнительно проверяем наличие файла с данными для карты
        city_json_path = f"static/data/cities/{city_id}.json"
        bikeparkings_json_path = f"static/data/cities/{city_id}-parkings.geojson"

        with open(city_json_path, "r", encoding="utf-8") as f:
            city_map_data = json.load(f)

        # Проверяем, существует ли файл велопарковок
        bikeparkings_data_exists = os.path.exists(bikeparkings_json_path)

    except FileNotFoundError:
        return f"Данные для города {city_id} не найдены", 404
    except json.JSONDecodeError:
        return f"Ошибка в формате файла {city_id}.json", 500

    # Передаем данные в шаблон
    return render_template(
        "map.html",
        city=city,
        map_data=city_map_data,
        bikeparkings_json_path=bikeparkings_json_path if bikeparkings_data_exists else None,
    )


# Страница маршрутов города
@app.route("/<city_id>_routes")
def city_routes(city_id):
    """
    Отображает список маршрутов для конкретного города.
    Загружает данные из файла city_id_routes.json.
    """
    try:
        # Путь к JSON-файлу маршрутов
        json_file_path = f"static/data/routes/{city_id}_routes.json"

        # Загружаем JSON-файл маршрутов
        with open(json_file_path, "r", encoding="utf-8") as f:
            routes_data = json.load(f)

    except FileNotFoundError:
        return f"Файл {city_id}_routes.json не найден в static/data/routes.", 404
    except json.JSONDecodeError:
        return f"Ошибка в формате файла {city_id}_routes.json.", 500

    return render_template("city_routes.html", city_id=city_id, routes=routes_data)


    """
    Отображает информацию о конкретном маршруте.
    """
    try:
        # Путь к JSON-файлам маршрутов
        routes_directory = "static/data/routes"
        
        # Поиск всех файлов маршрутов
        from glob import glob
        routes_files = glob(f"{routes_directory}/*_routes.json")
        
        # Ищем маршрут в каждом JSON-файле
        route = None
        for file_path in routes_files:
            with open(file_path, "r", encoding="utf-8") as f:
                routes_data = json.load(f)
                route = next((r for r in routes_data if r["id"] == route_id), None)
                if route:
                    break  # Если маршрут найден, выходим из цикла
        
        if not route:
            return "Маршрут не найден", 404

    except FileNotFoundError:
        return "Файлы маршрутов не найдены", 500
    except json.JSONDecodeError:
        return "Ошибка в формате одного из файлов маршрутов", 500

    return render_template("route_details.html", route=route)

# Страница маршрута
@app.route("/route/<route_id>")
def route_details(route_id):
    """
    Отображает информацию о конкретном маршруте.
    Ищет маршрут в файлах city_id_routes.json.
    """
    try:
        # Путь к директории с файлами маршрутов
        routes_directory = "static/data/routes"

        # Поиск маршрута в файлах city_id_routes.json
        from glob import glob
        routes_files = glob(f"{routes_directory}/*_routes.json")
        
        route = None
        city_id = None

        for file_path in routes_files:
            with open(file_path, "r", encoding="utf-8") as f:
                routes_data = json.load(f)
                route = next((r for r in routes_data if r["id"] == route_id), None)
                if route:
                    city_id = file_path.split("/")[-1].split("_")[0]  # Извлекаем city_id из имени файла
                    break

        if not route:
            return "Маршрут не найден", 404

        # Убедимся, что city_id найден
        if not city_id:
            return "Город не найден для данного маршрута", 404

    except FileNotFoundError:
        return "Файлы маршрутов не найдены", 500
    except json.JSONDecodeError:
        return "Ошибка в формате одного из файлов маршрутов", 500

    return render_template("route_details.html", route=route, city_id=city_id)

# Админка
@app.route("/admin", methods=["GET"])
def admin_panel():
    """
    Главная страница админ-панели.
    """
    try:
        # Загружаем данные о городах из cities.json
        with open("static/data/cities.json", "r", encoding="utf-8") as f:
            cities_data = json.load(f)
    except FileNotFoundError:
        cities_data = []
    except json.JSONDecodeError:
        return "Ошибка в формате файла cities.json", 500

    return render_template("admin.html", cities=cities_data)


# Управление cities.json / путь
@app.route("/admin/cities", methods=["GET", "POST"])
def admin_cities():
    """
    Управление городами: просмотр и редактирование cities.json.
    """
    try:
        with open("static/data/cities.json", "r", encoding="utf-8") as f:
            cities_data = json.load(f)
    except FileNotFoundError:
        cities_data = []
    except json.JSONDecodeError:
        return "Ошибка в формате файла cities.json", 500

    if request.method == "POST":
        updated_data = request.json  # Получаем обновленные данные
        with open("static/data/cities.json", "w", encoding="utf-8") as f:
            json.dump(updated_data, f, ensure_ascii=False, indent=4)
        return {"status": "success"}

    return render_template("admin_cities.html", cities=cities_data)


# Управление маршрутами / путь
@app.route("/admin/routes", methods=["GET"])
def admin_routes():
    """
    Отображает список городов для управления маршрутами.
    """
    try:
        # Загружаем данные из cities.json
        with open("static/data/cities.json", "r", encoding="utf-8") as f:
            cities_data = json.load(f)
    except FileNotFoundError:
        return "Файл cities.json не найден", 500
    except json.JSONDecodeError:
        return "Ошибка в формате файла cities.json", 500

    return render_template("admin_routes.html", cities=cities_data)


# Редактирование маршрута
@app.route("/admin/routes/edit/<city_id>", methods=["GET", "POST"])
def edit_city_routes(city_id):
    """
    Редактирует маршруты для конкретного города.
    """
    json_file_path = f"static/data/routes/{city_id}_routes.json"

    try:
        # Загружаем данные маршрутов
        with open(json_file_path, "r", encoding="utf-8") as f:
            routes_data = json.load(f)
    except FileNotFoundError:
        return f"Файл {city_id}_routes.json не найден", 404
    except json.JSONDecodeError:
        return f"Ошибка в формате файла {city_id}_routes.json", 500

    if request.method == "POST":
        # Сохраняем обновленные данные
        updated_routes = request.json
        with open(json_file_path, "w", encoding="utf-8") as f:
            json.dump(updated_routes, f, ensure_ascii=False, indent=4)
        return {"status": "success"}

    return render_template("edit_city_routes.html", city_id=city_id, routes=routes_data)


# Редактирование города
@app.route("/admin/cities/edit/<city_id>", methods=["GET", "POST"])
def edit_city(city_id):
    """
    Обработчик для редактирования данных города.
    """
    try:
        # Загружаем данные из cities.json
        with open("static/data/cities.json", "r", encoding="utf-8") as f:
            cities_data = json.load(f)

        # Поиск города по id
        city = next((c for c in cities_data if c["id"] == city_id), None)
        if not city:
            return "Город не найден", 404

    except FileNotFoundError:
        return "Файл cities.json не найден", 500
    except json.JSONDecodeError:
        return "Ошибка в формате файла cities.json", 500

    if request.method == "POST":
        # Обновляем все поля
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

        # Сохраняем обновления в файле
        with open("static/data/cities.json", "w", encoding="utf-8") as f:
            json.dump(cities_data, f, ensure_ascii=False, indent=4)

        # Перенаправляем обратно на страницу управления городами
        return redirect(url_for("admin_cities"))

    # Отображение формы редактирования
    return render_template("edit_city.html", city=city)


# Удаление города
@app.route("/admin/cities/delete/<city_id>", methods=["POST"])
def delete_city(city_id):
    """
    Удаляет город из списка.
    """
    try:
        # Загружаем данные из cities.json
        with open("static/data/cities.json", "r", encoding="utf-8") as f:
            cities_data = json.load(f)

        # Фильтруем список, исключая удаляемый город
        cities_data = [c for c in cities_data if c["id"] != city_id]

        # Сохраняем изменения
        with open("static/data/cities.json", "w", encoding="utf-8") as f:
            json.dump(cities_data, f, ensure_ascii=False, indent=4)

    except FileNotFoundError:
        return "Файл cities.json не найден", 500
    except json.JSONDecodeError:
        return "Ошибка в формате файла cities.json", 500

    return {"status": "success"}

# Добавление города
@app.route("/admin/cities/add", methods=["GET", "POST"])
def add_city():
    """
    Страница для добавления нового города.
    """
    if request.method == "POST":
        try:
            # Загружаем существующие данные
            with open("static/data/cities.json", "r", encoding="utf-8") as f:
                cities_data = json.load(f)
        except FileNotFoundError:
            cities_data = []
        except json.JSONDecodeError:
            return "Ошибка в формате файла cities.json", 500

        # Получаем данные из формы
        new_city = {
            "id": request.form["id"],
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

        # Добавляем новый город
        cities_data.append(new_city)

        # Сохраняем изменения
        with open("static/data/cities.json", "w", encoding="utf-8") as f:
            json.dump(cities_data, f, ensure_ascii=False, indent=4)

        return redirect(url_for("admin_cities"))

    return render_template("add_city.html")

# Редактирование велодорожек


@app.route("/admin/city/<city_id>/bikelanes", methods=["GET", "POST"])
def admin_bikelanes(city_id):
    """
    Управление велодорожками для конкретного города.
    """
    json_file_path = f"static/data/cities/{city_id}.json"

    try:
        with open(json_file_path, "r", encoding="utf-8") as f:
            bikelanes_data = json.load(f)

        # Для каждой велодорожки определяем папку с фото
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

    except FileNotFoundError:
        return f"Файл {city_id}.json не найден", 404
    except json.JSONDecodeError:
        return f"Ошибка в формате файла {city_id}.json", 500

    if request.method == "POST":
        updated_bikelanes = request.json
        with open(json_file_path, "w", encoding="utf-8") as f:
            json.dump(updated_bikelanes, f, ensure_ascii=False, indent=4)
        return {"status": "success"}

    return render_template("admin_bikelanes.html", city_id=city_id, bikelanes=bikelanes_data)


if __name__ == "__main__":
    app.run(debug=True, port=5011)

