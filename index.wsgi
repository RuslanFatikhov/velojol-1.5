import sys, os, logging
from logging.handlers import RotatingFileHandler

# --- PYTHON PATHS ---
sys.path.insert(0, '/home/c/cc91451/velojol.kz/public_html')
sys.path.insert(1, '/home/c/cc91451/velojol.kz/venv/lib/python3.10/site-packages')
# --------------------

# ----------  Л О Г И Р О В А Н И Е  ----------
LOG_PATH = '/home/c/cc91451/velojol_error.log'
handler = RotatingFileHandler(LOG_PATH, maxBytes=1_000_000, backupCount=3)
handler.setLevel(logging.INFO)
fmt = logging.Formatter('[%(asctime)s] %(levelname)s in %(module)s: %(message)s')
handler.setFormatter(fmt)
logging.getLogger().addHandler(handler)
logging.getLogger().setLevel(logging.INFO)
# -------------------------------------------

from app import app

def strip_wsgi_prefix(environ):
    prefix = '/index.wsgi'
    if environ.get('SCRIPT_NAME', '').startswith(prefix):
        environ['SCRIPT_NAME'] = environ['SCRIPT_NAME'][len(prefix):] or ''
    if environ.get('PATH_INFO', '').startswith(prefix):
        environ['PATH_INFO'] = environ['PATH_INFO'][len(prefix):] or '/'
    return environ

def application(environ, start_response):
    environ = strip_wsgi_prefix(environ)
    return app(environ, start_response)
