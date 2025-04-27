# utils.py
import json
import os
from typing import Any, Optional


# ──────────────────────────────────────────────────────────────────────────
#  Настройки путей
# ──────────────────────────────────────────────────────────────────────────
# Абсолютный путь к каталогу, где лежит utils.py  →  /home/.../public_html
BASE_DIR: str = os.path.dirname(os.path.abspath(__file__))


def abs_path(rel_path: str) -> str:
    """
    Преобразует путь вида 'static/…' в абсолютный,
    чтобы код одинаково работал и локально, и под WSGI.
    """
    return os.path.join(BASE_DIR, rel_path)


# ──────────────────────────────────────────────────────────────────────────
#  Локализация числительных
# ──────────────────────────────────────────────────────────────────────────
def pluralize_stores(count: int) -> str:
    if count % 10 == 1 and count % 100 != 11:
        return f"{count} магазин"
    elif count % 10 in (2, 3, 4) and count % 100 not in (12, 13, 14):
        return f"{count} магазина"
    return f"{count} магазинов"


def pluralize_routes(count: int) -> str:
    if count % 10 == 1 and count % 100 != 11:
        return f"{count} маршрут"
    elif count % 10 in (2, 3, 4) and count % 100 not in (12, 13, 14):
        return f"{count} маршрута"
    return f"{count} маршрутов"


# ──────────────────────────────────────────────────────────────────────────
#  Работа с JSON-файлами  (исправленная версия)
# ──────────────────────────────────────────────────────────────────────────
def load_json(rel_path: str, *, default=None):
    """
    Безопасно читает JSON.
    • rel_path — путь относительно public_html.
    • default  — что вернуть, если файла нет или он битый
                 (по умолчанию [] — пустой список).
    """
    if default is None:
        default = []          # чаще всего нам нужен именно пустой список

    full_path = abs_path(rel_path)

    try:
        with open(full_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        # Логируем, но НЕ бросаем исключение
        print(f"[load_json] {full_path} – {e}")
        return default


def load_data_count(city_id: str, data_type: str) -> int:
    """
    Считает количество объектов в GeoJSON
    static/data/cities/{city_id}-{data_type}.geojson
    """
    rel_path = f"static/data/cities/{city_id}-{data_type}.geojson"
    full_path = abs_path(rel_path)

    if not os.path.exists(full_path):
        return 0

    try:
        with open(full_path, encoding="utf-8") as f:
            data = json.load(f)
            return len(data.get("features", []))
    except (json.JSONDecodeError, FileNotFoundError) as e:
        print(f"Ошибка при загрузке JSON ({data_type}): {e}")
        return 0


def load_routes_count(city_id: str) -> int:
    """
    Считает количество маршрутов в
    static/data/routes/{city_id}_routes.json
    """
    rel_path = f"static/data/routes/{city_id}_routes.json"
    routes_data = load_json(rel_path)
    if routes_data is None:
        return 0
    return len(routes_data)
