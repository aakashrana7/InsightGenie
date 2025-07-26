import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RegisterVendor.css";

const RegisterVendor = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    emailOrPhone: "",
    profilePic: null,
    businessName: "",
    businessType: "",
    address: "",
    website: "",
    gstNo: "",
    terms: false,
  });
  const [previewURL, setPreviewURL] = useState(null);
  const [errors, setErrors] = useState({});

  const validateStep = () => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = "Name is required";
      if (!formData.emailOrPhone.trim()) newErrors.emailOrPhone = "Email or phone is required";
    } else if (step === 2) {
      if (!formData.businessName.trim()) newErrors.businessName = "Business name is required";
      if (!formData.businessType) newErrors.businessType = "Business type is required";
      if (!formData.address.trim()) newErrors.address = "Address is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === "checkbox") {
      setFormData({ ...formData, [name]: checked });
    } else if (type === "file") {
      const file = files[0];
      setFormData({ ...formData, profilePic: file });
      if (file) {
        setPreviewURL(URL.createObjectURL(file));
      } else {
        setPreviewURL(null);
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleSubmit = () => {
    if (!formData.terms) {
      alert("Please accept terms and conditions");
      return;
    }
    
     console.log("Form submitted:", formData);
    alert("Registration successful! You will be redirected to login.");
    
    // Redirect to login after 2 seconds
    setTimeout(() => {
      navigate("/"); // Assuming your login route is "/"
    }, 2000);
  };

  return (
    <div className="register-vendor-container">
      <div className="register-vendor-card">
        <div className="progress-steps">
          {["Basic Info", "Business Details", "Review & Submit"].map((label, idx) => (
            <div key={idx} className="step-container">
              {idx > 0 && <div className={`step-connector ${step > idx ? 'completed' : ''}`}></div>}
              <div className={`step-circle ${step === idx + 1 ? 'active' : step > idx + 1 ? 'completed' : ''}`}>
                {idx + 1}
              </div>
              <span className={`step-label ${step === idx + 1 ? 'active' : ''}`}>{label}</span>
            </div>
          ))}
        </div>

        <div className="form-content">
          <h1 className="form-title">Vendor Registration</h1>
          <p className="form-subtitle">Complete your vendor profile in just a few steps</p>

          {step === 1 && (
            <div className="form-step">
              <div className="form-group">
                <label className="form-label">Full Name*</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`form-input ${errors.name ? 'error' : ''}`}
                  placeholder="John Doe"
                />
                {errors.name && <p className="error-message">{errors.name}</p>}
              </div>
              
              <div className="form-group">
                <label className="form-label">Email or Phone*</label>
                <input
                  type="text"
                  name="emailOrPhone"
                  value={formData.emailOrPhone}
                  onChange={handleChange}
                  className={`form-input ${errors.emailOrPhone ? 'error' : ''}`}
                  placeholder="your@email.com or +1234567890"
                />
                {errors.emailOrPhone && <p className="error-message">{errors.emailOrPhone}</p>}
              </div>
              
              <div className="form-group">
                <label className="form-label">Profile Picture</label>
                <div className="file-input-container">
                  <label className="file-input-label">
                    <svg className="file-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Choose File
                    <input
                      type="file"
                      accept="image/*"
                      name="profilePic"
                      onChange={handleChange}
                      className="file-input"
                    />
                  </label>
                  {formData.profilePic && (
                    <span className="file-name">{formData.profilePic.name}</span>
                  )}
                </div>
                {previewURL && (
                  <div className="image-preview-container">
                    <img
                      src={previewURL}
                      alt="Preview"
                      className="image-preview"
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        setFormData({...formData, profilePic: null});
                        setPreviewURL(null);
                      }}
                      className="remove-image-button"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="form-step">
              <div className="form-group">
                <label className="form-label">Business Name*</label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  className={`form-input ${errors.businessName ? 'error' : ''}`}
                  placeholder="Acme Inc."
                />
                {errors.businessName && <p className="error-message">{errors.businessName}</p>}
              </div>
              
              <div className="form-group">
                <label className="form-label">Business Type*</label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleChange}
                  className={`form-input ${errors.businessType ? 'error' : ''}`}
                >
                  <option value="" disabled>Select business type</option>
                  <option value="retail">Retail</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="service">Service Provider</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="other">Other</option>
                </select>
                {errors.businessType && <p className="error-message">{errors.businessType}</p>}
              </div>
              
              <div className="form-group">
                <label className="form-label">Address*</label>
                <textarea
                  name="address"
                  rows="3"
                  value={formData.address}
                  onChange={handleChange}
                  className={`form-input ${errors.address ? 'error' : ''}`}
                  placeholder="123 Business St, City, Country"
                ></textarea>
                {errors.address && <p className="error-message">{errors.address}</p>}
              </div>
              
              <div className="form-columns">
                <div className="form-group">
                  <label className="form-label">Website</label>
                  <div className="website-input-container">
                    <span className="website-prefix">https://</span>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="yourbusiness.com"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">GST Number</label>
                  <input
                    type="text"
                    name="gstNo"
                    value={formData.gstNo}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="review-step">
              <div className="review-notice">
                <h3>Review Your Information</h3>
                <p>Please verify all details before submitting your application.</p>
              </div>
              
              <div className="review-grid">
                {Object.entries(formData).map(([key, value]) => (
                  key !== "profilePic" && key !== "terms" && (
                    <div key={key} className="review-item">
                      <span className="review-label">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <div className={`review-value ${!value ? 'empty' : ''}`}>
                        {value || "Not provided"}
                      </div>
                    </div>
                  )
                ))}
              </div>
              
              {previewURL && (
                <div className="review-image-container">
                  <span className="review-label">Profile Picture</span>
                  <div className="image-preview-container">
                    <img
                      src={previewURL}
                      alt="Preview"
                      className="image-preview"
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        setFormData({...formData, profilePic: null});
                        setPreviewURL(null);
                      }}
                      className="remove-image-button"
                    >
                      Remove Photo
                    </button>
                  </div>
                </div>
              )}
              
              <div className="terms-container">
                <input
                  type="checkbox"
                  name="terms"
                  checked={formData.terms}
                  onChange={handleChange}
                  className="terms-checkbox"
                />
                <div className="terms-text">
                  I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>. I understand that my information will be used in accordance with these terms.
                </div>
              </div>
              {!formData.terms && (
                <p className="error-message">You must accept the terms to submit your application</p>
              )}
            </div>
          )}

          <div className="form-navigation">
            {step > 1 && (
              <button onClick={prevStep} className="secondary-button">
                Previous
              </button>
            )}
            {step < 3 ? (
              <button onClick={nextStep} className="primary-button">
                Next Step
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!formData.terms}
                className={`submit-button ${!formData.terms ? 'disabled' : ''}`}
              >
                Submit Application
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterVendor;