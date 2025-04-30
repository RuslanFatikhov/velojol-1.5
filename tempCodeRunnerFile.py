from flask import Flask, request, redirect
from routes import init_routes
from admin import init_admin_routes
from config import Config  # ← оставляем это
from routes.calendar import calendar_bp  # ← НОВОЕ

app = Flask(__name__)
app.config.from_object(Config)  # ← оставляем это

@app.before_request
def redirect_www():
    """Принудительный редирект с www на основной домен."""
    url = request.url
    if url.startswith("http://www.") or url.startswith("https://www."):
        new_url = url.replace("www.", "", 1)
        new_url = new_url.replace("http://", "https://", 1)
        return redirect(new_url, code=301)

# Подключаем маршруты
init_routes(app)
init_admin_routes(app)
app.register_blueprint(calendar_bp)  # ← НОВОЕ!

if __name__ == "__main__":
    app.run(debug=True, port=5028)
