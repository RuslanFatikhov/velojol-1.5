import json
import os

def pluralize_stores(count):
    """
    Возвращает строку с правильным окончанием для слова 'магазин' в зависимости от числа.
    """
    if count % 10 == 1 and count % 100 != 11:
        return f"{count} магазин"
    elif count % 10 in [2, 3, 4] and count % 100 not in [12, 13, 14]:
        return f"{count} магазина"
    else:
        return f"{count} магазинов"

def pluralize_routes(count):
    """
    Возвращает строку с правильным окончанием для слова 'маршрут' в зависимости от числа.
    """
    if count % 10 == 1 and count % 100 != 11:
        return f"{count} маршрут"
    elif count % 10 in [2, 3, 4] and count % 100 not in [12, 13, 14]:
        return f"{count} маршрута"
    else:
        return f"{count} маршрутов"

def load_json(file_path):
    """
    Загружает данные из указанного JSON-файла.
    Возвращает None, если файл не найден или поврежден.
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Ошибка загрузки {file_path}: {e}")
        return None

def load_data_count(city_id, data_type):
    """
    Загружает количество объектов из JSON-файла по указанному типу (парковки или велостанции).
    Возвращает 0, если файл не найден или поврежден.
    """
    file_path = f"static/data/cities/{city_id}-{data_type}.geojson"
    if os.path.exists(file_path):
        try:
            with open(file_path, encoding="utf-8") as f:
                data = json.load(f)
                return len(data.get("features", []))
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"Ошибка при загрузке JSON ({data_type}): {e}")
            return 0
    return 0

def load_routes_count(city_id):
    """
    Загружает количество маршрутов для города из файла static/data/routes/{city_id}_routes.json.
    Возвращает 0, если файл не найден или повреждён.
    """
    file_path = f"static/data/routes/{city_id}_routes.json"
    routes_data = load_json(file_path)
    if routes_data is None:
        return 0
    return len(routes_data)