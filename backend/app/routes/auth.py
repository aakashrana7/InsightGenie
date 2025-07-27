from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from app.database import db
from app.models.user import User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    phone_number = data.get('emailOrPhone')  # keeping frontend key
    username = data.get('name')
    password = data.get('password')

    if not phone_number or not username or not password:
        return jsonify({'error': 'All fields are required'}), 400

    # Check if phone number is already registered
    if User.query.filter_by(phone_number=phone_number).first():
        return jsonify({'error': 'Phone number already registered'}), 400

    hashed_pw = generate_password_hash(password)
    new_user = User(phone_number=phone_number, username=username, password=hashed_pw)

    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully'}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    phone_number = data.get('emailOrPhone')
    password = data.get('password')

    user = User.query.filter_by(phone_number=phone_number).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({'error': 'Invalid credentials'}), 401

    return jsonify({'message': f'Welcome {user.username}', 'user': {'id': user.id, 'username': user.username}}), 200
