// import React, { useEffect, useState, useContext } from 'react';
// import './VendorProfile.css';
// import { AuthContext } from '../context/AuthContext';
// import { getVendorProfile } from '../services/api';

// const VendorProfile = () => {
//   const { user } = useContext(AuthContext); // Assuming you store vendor ID here
//   const [profile, setProfile] = useState(null);

//   useEffect(() => {
//     const fetchProfile = async () => {
//       try {
//         const res = await getVendorProfile(user.id);
//         setProfile(res.data);
//       } catch (error) {
//         console.error('Error fetching profile:', error);
//       }
//     };
//     fetchProfile();
//   }, [user]);

//   if (!profile) return <div>Loading profile...</div>;

//   return (
//     <div className="vendor-profile">
//       <div className="profile-card">
//         <img
//           src={profile.profilePic || '/assets/default-profile.png'}
//           alt="Profile"
//           className="profile-img"
//         />
//         <h2>{profile.name}</h2>
//         <p><strong>Phone:</strong> {profile.phone}</p>
//         <p><strong>Business Name:</strong> {profile.businessName}</p>
//         <p><strong>Category:</strong> {profile.businessCategory}</p>
//         <p><strong>Address:</strong> {profile.businessAddress}</p>
//         <p><strong>GST Number:</strong> {profile.gstNumber}</p>
//       </div>
//     </div>
//   );
// };

// export default VendorProfile;
import React from 'react';
import './VendorProfile.css';

const VendorProfile = () => {
  const profile = {
    name: "Aakash Rana",
    phone: "+977-9812345678",
    businessName: "Rana Retailers",
    businessCategory: "Grocery & Daily Needs",
    businessAddress: "Kathmandu, Nepal",
    gstNumber: "NP-GST-9876543210",
    profilePic: "/profile.jpg", // Make sure this is in your public folder
  };

  return (
    <div className="vendor-profile">
      <div className="profile-card">
        <img
          src={profile.profilePic}
          alt="Vendor"
          className="profile-img"
        />
        <h2>{profile.name}</h2>
        <p className="tagline">Empowering Local Commerce</p>
        <div className="profile-info">
          <p><strong>📞 Phone:</strong> {profile.phone}</p>
          <p><strong>🏪 Business:</strong> {profile.businessName}</p>
          <p><strong>📂 Category:</strong> {profile.businessCategory}</p>
          <p><strong>📍 Address:</strong> {profile.businessAddress}</p>
          <p><strong>🧾 GST Number:</strong> {profile.gstNumber}</p>
        </div>
        <button className="edit-btn">Edit Profile</button>
      </div>
    </div>
  );
};

export default VendorProfile;
