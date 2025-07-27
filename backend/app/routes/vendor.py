from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from flask_cors import cross_origin
from ..models.user import User
from .. import db

vendor_bp = Blueprint('vendor', __name__, url_prefix='/vendor')

@vendor_bp.route('/register', methods=['POST'])
@cross_origin()
def register_vendor():
    data = request.get_json()

    phone = data.get('phone_number')
    name = data.get('username')               # Person’s name
    password = data.get('password', 'defaultpassword')
    business_name = data.get('business_name')
    business_type = data.get('business_type')
    address = data.get('address')
    website = data.get('website')
    gst_no = data.get('gst_no')

    if not phone or not name or not password:
        return jsonify({'success': False, 'message': 'Missing phone, name, or password'}), 400

    existing = User.query.filter_by(phone_number=phone).first()
    if existing:
        return jsonify({'success': False, 'message': 'Phone number already exists'}), 400

    user = User(
        phone_number=phone,
        username=name,
        password=generate_password_hash(password),
        business_name=business_name,
        business_type=business_type,
        address=address,
        website=website,
        gst_no=gst_no
    )

    db.session.add(user)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Vendor registered successfully'}), 201


@vendor_bp.route('/login', methods=['POST'])
@cross_origin()
def login_vendor():
    data = request.get_json()
    phone = data.get('phone_number')
    password = data.get('password')

    if not phone or not password:
        return jsonify({'success': False, 'message': 'Phone and password are required'}), 400

    user = User.query.filter_by(phone_number=phone).first()

    if not user or not check_password_hash(user.password, password):
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

    return jsonify({'success': True, 'message': f'Welcome {user.username}'}), 200
