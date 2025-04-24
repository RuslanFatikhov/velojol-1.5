from flask import Flask, request, redirect
from routes import init_routes
from admin import init_admin_routes

app = Flask(__name__)

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

if __name__ == "__main__":
    app.run(debug=True, port=5027)
