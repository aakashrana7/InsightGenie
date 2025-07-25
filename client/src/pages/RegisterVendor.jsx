// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import './RegisterVendor.css'; // optional CSS styling

// const RegisterVendor = () => {
//   const [formData, setFormData] = useState({
//     name: '',
//     businessName: '',
//     address: '',
//     businessType: '',
//     description: '',
//   });

//   const navigate = useNavigate();

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({ ...prev, [name]: value }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     try {
//       // 🚀 Replace this URL with your Flask backend endpoint
//       const res = await axios.post('http://localhost:5000/api/vendor/register', formData);

//       if (res.status === 200 || res.status === 201) {
//         alert('Profile created successfully!');
//         navigate('/dashboard');
//       } else {
//         alert('Something went wrong');
//       }
//     } catch (err) {
//       console.error(err);
//       alert('Failed to register vendor');
//     }
//   };

//   return (
//     <div className="register-container">
//       <h2>Vendor Profile Setup</h2>
//       <form onSubmit={handleSubmit} className="register-form">
//         <input name="name" placeholder="Your Name" onChange={handleChange} required />
//         <input name="businessName" placeholder="Business Name" onChange={handleChange} required />
//         <input name="address" placeholder="Address" onChange={handleChange} required />
//         <input name="businessType" placeholder="Business Type" onChange={handleChange} required />
//         <textarea name="description" placeholder="Short Description" onChange={handleChange} required />

//         <button type="submit">Continue to Dashboard</button>
//       </form>
//     </div>
//   );
// };

// export default RegisterVendor;
// navigate("/");
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './RegisterVendor.css';

const RegisterVendor = () => {
  const [formData, setFormData] = useState({
    name: '',
    emailOrPhone: '',
    profilePic: null,
    businessName: '',
    address: '',
    businessType: '',
    website: '',
    gstNo: '',
    description: '',
  });

  const [previewUrl, setPreviewUrl] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === 'profilePic') {
      const file = files[0];
      setFormData((prev) => ({ ...prev, profilePic: file }));

      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result);
      reader.readAsDataURL(file);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const data = new FormData();
      for (const key in formData) {
        data.append(key, formData[key]);
      }

      const res = await axios.post('http://localhost:5000/api/vendor/register', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.status === 200 || res.status === 201) {
        alert('Profile created successfully!');
        navigate('/dashboard');
      } else {
        alert('Something went wrong');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to register vendor');
    }
  };

  return (
    <div className="register-container">
      <h2>Vendor Profile Setup</h2>
      <form onSubmit={handleSubmit} className="register-form" encType="multipart/form-data">
        <div className="profile-pic-section">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="profile-preview" />
          ) : (
            <div className="profile-placeholder">Upload Profile Pic</div>
          )}
          <input
            type="file"
            accept="image/*"
            name="profilePic"
            onChange={handleChange}
            className="file-input"
          />
        </div>

        <input name="name" placeholder="Your Name" onChange={handleChange} required />
        <input name="emailOrPhone" placeholder="Email or Phone" onChange={handleChange} required />
        <input name="businessName" placeholder="Business Name" onChange={handleChange} required />
        <input name="address" placeholder="Business Address" onChange={handleChange} required />
        <input name="businessType" placeholder="Business Type" onChange={handleChange} required />
        <input name="website" placeholder="Business Website (optional)" onChange={handleChange} />
        <input name="gstNo" placeholder="GST/VAT No (optional)" onChange={handleChange} />
        <textarea name="description" placeholder="Short Description" onChange={handleChange} required />

        <button type="submit">Continue to Dashboard</button>
      </form>
    </div>
  );
};

export default RegisterVendor;
