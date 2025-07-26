from flask import Flask
from flask_cors import CORS 
from .database import db
from .routes.auth import auth_bp
from .routes.vendor import vendor_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object("app.config.Config")

    db.init_app(app)
    #Enable CORS for your frontend origin (React running at localhost:5173)
    CORS(app, origins=["http://localhost:5173"])

    app.register_blueprint(auth_bp)
    app.register_blueprint(vendor_bp)

    return app
