from flask import Flask
from routes import init_routes  # Импортируем функцию для публичных маршрутов
from admin import init_admin_routes  # Импортируем функцию для админ-маршрутов

# Создаем экземпляр Flask-приложения
app = Flask(__name__)

# Подключаем маршруты
init_routes(app)
init_admin_routes(app)

# Запускаем приложение
if __name__ == "__main__":
    app.run(debug=True, port=5025)