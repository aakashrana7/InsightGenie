from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import os
from ..models.user import User
from .. import db
from werkzeug.security import generate_password_hash
from flask_cors import cross_origin

vendor_bp = Blueprint('vendor', __name__, url_prefix='/vendor')

@vendor_bp.route('/register', methods=['POST'])
@cross_origin()
def register_vendor():
    form = request.form
    phone = form.get('emailOrPhone')
    name = form.get('name')
    password = form.get('password', 'defaultpassword')
    profile_pic = request.files.get('profilePic')

    if not phone or not name:
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400

    existing = User.query.filter_by(phone_number=phone).first()
    if existing:
        return jsonify({'success': False, 'message': 'Phone number already exists'}), 400

    filename = None
    if profile_pic:
        os.makedirs('uploads', exist_ok=True)
        filename = secure_filename(profile_pic.filename)
        profile_pic.save(os.path.join('uploads', filename))

    user = User(phone_number=phone, username=name, password=generate_password_hash(password))
    db.session.add(user)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Vendor registered'})
