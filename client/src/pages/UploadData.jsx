import React, { useState, useRef } from 'react';
import { FiSave, FiArrowLeft, FiPlus, FiTrash2, FiUpload, FiEdit2, FiCheck } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import './UploadData.css';

const UploadData = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [inventory, setInventory] = useState([
    { id: 1, name: 'Smartphone', category: 'Electronics', price: 25000, stock: 50, reorderLevel: 10 },
    { id: 2, name: 'T-Shirt', category: 'Clothing', price: 599, stock: 120, reorderLevel: 30 },
    { id: 3, name: 'Coffee Table', category: 'Furniture', price: 8500, stock: 15, reorderLevel: 5 },
  ]);
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    price: '',
    stock: '',
    reorderLevel: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [fileUploadProgress, setFileUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleInputChange = (id, field, value) => {
    setInventory(inventory.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleNewItemChange = (field, value) => {
    setNewItem({ ...newItem, [field]: value });
  };

  const addNewItem = () => {
    if (newItem.name && newItem.category && newItem.price && newItem.stock) {
      const newId = inventory.length > 0 ? Math.max(...inventory.map(item => item.id)) + 1 : 1;
      setInventory([
        ...inventory,
        {
          id: newId,
          name: newItem.name,
          category: newItem.category,
          price: parseFloat(newItem.price),
          stock: parseInt(newItem.stock),
          reorderLevel: parseInt(newItem.reorderLevel) || 0
        }
      ]);
      setNewItem({
        name: '',
        category: '',
        price: '',
        stock: '',
        reorderLevel: ''
      });
    }
  };

  const removeItem = (id) => {
    setInventory(inventory.filter(item => item.id !== id));
  };

  const startEditing = (id) => {
    setEditingId(id);
  };

  const stopEditing = () => {
    setEditingId(null);
  };

  const saveChanges = () => {
    alert('Inventory updated successfully!');
    navigate('/dashboard');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading(true);
      setFileUploadProgress(0);
      
      // Simulate file upload progress
      const interval = setInterval(() => {
        setFileUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsUploading(false);
            parseCSV(file); // In a real app, you would upload to server first
            return 100;
          }
          return prev + 10;
        });
      }, 300);
    }
  };

  const parseCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const lines = content.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const newItems = lines.slice(1).map(line => {
        const values = line.split(',');
        return {
          id: inventory.length + 1 + values[0],
          name: values[0],
          category: values[1],
          price: parseFloat(values[2]),
          stock: parseInt(values[3]),
          reorderLevel: parseInt(values[4]) || 0
        };
      }).filter(item => item.name);
      
      setInventory([...inventory, ...newItems]);
    };
    reader.readAsText(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="upload-data-container">
      <div className="upload-data-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <FiArrowLeft /> Back to Dashboard
        </button>
        <h1>Inventory Management</h1>
        <button className="save-btn" onClick={saveChanges}>
          <FiSave /> Save Changes
        </button>
      </div>

      <div className="inventory-actions">
        <div className="bulk-upload-card">
          <div className="upload-area" onClick={triggerFileInput}>
            <FiUpload className="upload-icon" />
            <p>Drag & drop your inventory file here or</p>
            <button className="browse-btn">Browse Files</button>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
            />
            <p className="file-format">Supported formats: .csv, .xlsx, .xls</p>
            {isUploading && (
              <div className="upload-progress">
                <div 
                  className="progress-bar" 
                  style={{ width: `${fileUploadProgress}%` }}
                ></div>
                <span>{fileUploadProgress}%</span>
              </div>
            )}
          </div>
        </div>

        <div className="manual-entry-card">
          <h3>Add New Item</h3>
          <div className="new-item-form">
            <div className="form-group">
              <input
                type="text"
                placeholder="Product Name"
                value={newItem.name}
                onChange={(e) => handleNewItemChange('name', e.target.value)}
              />
            </div>
            <div className="form-group">
              <select
                value={newItem.category}
                onChange={(e) => handleNewItemChange('category', e.target.value)}
              >
                <option value="">Select Category</option>
                <option value="Electronics">Electronics</option>
                <option value="Clothing">Clothing</option>
                <option value="Furniture">Furniture</option>
                <option value="Groceries">Groceries</option>
                <option value="Home Goods">Home Goods</option>
              </select>
            </div>
            <div className="form-group">
              <input
                type="number"
                placeholder="Price (₹)"
                value={newItem.price}
                onChange={(e) => handleNewItemChange('price', e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <input
                type="number"
                placeholder="Stock"
                value={newItem.stock}
                onChange={(e) => handleNewItemChange('stock', e.target.value)}
                min="0"
              />
            </div>
            <div className="form-group">
              <input
                type="number"
                placeholder="Reorder Level"
                value={newItem.reorderLevel}
                onChange={(e) => handleNewItemChange('reorderLevel', e.target.value)}
                min="0"
              />
            </div>
            <button className="add-btn" onClick={addNewItem}>
              <FiPlus /> Add Item
            </button>
          </div>
        </div>
      </div>

      <div className="inventory-table-container">
        <div className="table-header">
          <h2>Current Inventory</h2>
          <span className="item-count">{inventory.length} items</span>
        </div>
        <div className="table-scroll">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Reorder</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map(item => (
                <tr key={item.id} className={item.stock <= item.reorderLevel ? 'low-stock' : ''}>
                  <td>
                    {editingId === item.id ? (
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleInputChange(item.id, 'name', e.target.value)}
                      />
                    ) : (
                      item.name
                    )}
                  </td>
                  <td>
                    {editingId === item.id ? (
                      <select
                        value={item.category}
                        onChange={(e) => handleInputChange(item.id, 'category', e.target.value)}
                      >
                        <option value="Electronics">Electronics</option>
                        <option value="Clothing">Clothing</option>
                        <option value="Furniture">Furniture</option>
                        <option value="Groceries">Groceries</option>
                        <option value="Home Goods">Home Goods</option>
                      </select>
                    ) : (
                      item.category
                    )}
                  </td>
                  <td>
                    {editingId === item.id ? (
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => handleInputChange(item.id, 'price', e.target.value)}
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      `₹${item.price.toLocaleString()}`
                    )}
                  </td>
                  <td>
                    {editingId === item.id ? (
                      <input
                        type="number"
                        value={item.stock}
                        onChange={(e) => handleInputChange(item.id, 'stock', e.target.value)}
                        min="0"
                      />
                    ) : (
                      item.stock
                    )}
                  </td>
                  <td>
                    {editingId === item.id ? (
                      <input
                        type="number"
                        value={item.reorderLevel}
                        onChange={(e) => handleInputChange(item.id, 'reorderLevel', e.target.value)}
                        min="0"
                      />
                    ) : (
                      item.reorderLevel
                    )}
                  </td>
                  <td>
                    <span className={`stock-status ${
                      item.stock <= item.reorderLevel ? 'danger' : 
                      item.stock <= item.reorderLevel * 2 ? 'warning' : 'good'
                    }`}>
                      {item.stock <= item.reorderLevel ? 'Low Stock' : 
                       item.stock <= item.reorderLevel * 2 ? 'Medium Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {editingId === item.id ? (
                        <button className="confirm-btn" onClick={stopEditing}>
                          <FiCheck />
                        </button>
                      ) : (
                        <button className="edit-btn" onClick={() => startEditing(item.id)}>
                          <FiEdit2 />
                        </button>
                      )}
                      <button 
                        className="remove-btn"
                        onClick={() => removeItem(item.id)}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UploadData;