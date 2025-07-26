import React from "react";

const StepOne = ({ formData, setFormData }) => {
  return (
    <div className="space-y-6">
      <div>
        <label className="block mb-2 text-sm font-medium text-gray-700">Full Name</label>
        <input
          type="text"
          className="w-full px-4 py-2 border border-gray-300 rounded-md"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div>
        <label className="block mb-2 text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          className="w-full px-4 py-2 border border-gray-300 rounded-md"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>
      <div>
        <label className="block mb-2 text-sm font-medium text-gray-700">Profile Picture</label>
        <input
          type="file"
          className="w-full px-4 py-2 border border-gray-300 rounded-md"
          onChange={(e) => setFormData({ ...formData, profile: e.target.files[0] })}
        />
      </div>
    </div>
  );
};

export default StepOne;
