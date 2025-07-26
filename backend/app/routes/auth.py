from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from app.database import db
from app.models.user import User  # Adjust if your model path is different

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    emailOrPhone = data.get('emailOrPhone')
    name = data.get('name')
    password = data.get('password')

    if not emailOrPhone or not name or not password:
        return jsonify({'error': 'All fields are required'}), 400

    # Check for existing user
    if User.query.filter_by(emailOrPhone=emailOrPhone).first():
        return jsonify({'error': 'Phone number already registered'}), 400

    hashed_pw = generate_password_hash(password)
    new_user = User(emailOrPhone=emailOrPhone, name=name, password=hashed_pw)

    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully'}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    emailOrPhone = data.get('emailOrPhone')
    password = data.get('password')

    user = User.query.filter_by(emailOrPhone=emailOrPhone).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({'error': 'Invalid credentials'}), 401

    return jsonify({'message': f'Welcome {user.name}', 'user': {'id': user.id, 'name': user.name}}), 200
