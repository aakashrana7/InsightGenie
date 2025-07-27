import React, { useState, useEffect, useRef } from 'react';
import { FiSave, FiArrowLeft, FiPlus, FiTrash2, FiUpload, FiEdit2, FiCheck } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import OCRUploadCard from '../components/OCRUploadCard';
import './UploadData.css'; // Assuming you have a CSS file for styling this component

const UploadData = () => {
  // State to hold inventory data fetched from the backend
  const [inventory, setInventory] = useState([]);
  // State to track which item is currently being edited
  const [editingId, setEditingId] = useState(null);
  // State for loading and error indicators
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // State for new item form
  const [newItem, setNewItem] = useState({
    name: '',
    price: '',
    quantity_in_stock: '',
    quantity_sold: '',
    sale_date: new Date().toISOString().slice(0, 10) // Default to today's date
  });

  const [showOCR, setShowOCR] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [fileUploadProgress, setFileUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Retrieve phone number from localStorage (assuming it's set during login)
  const userPhoneNumber = localStorage.getItem('phone_number');

  // Function to fetch the 10 most recently added sales data
  const fetchRecentSales = async () => {
    setLoading(true);
    setError(null);
    if (!userPhoneNumber) {
      setError("User phone number not found. Please log in.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/recent-sales', {
        method: 'POST', // Using POST as per Flask route design for user-specific data
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone_number: userPhoneNumber }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Map backend data to frontend inventory structure, adding a unique 'id' if not present
      // For simplicity, we'll use a combination of item and sale_date as a pseudo-ID if no actual ID exists
      const mappedData = data.map((item, index) => ({
        id: `${item.item}-${item.sale_date}-${index}`, // Simple unique ID
        date: item.sale_date, // Corresponds to sale_date from DB
        name: item.item,
        price: item.price,
        stock: item.quantity_in_stock, // Corresponds to quantity_in_stock from DB
        sales: item.quantity_sold, // Corresponds to quantity_sold from DB
        reorderLevel: 5, // Assuming a default reorder level for display, or fetch if available
      }));
      setInventory(mappedData);
    } catch (err) {
      console.error("Failed to fetch recent sales data:", err);
      setError("Failed to load recent sales data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Effect hook to fetch data when the component mounts or phone number changes
  useEffect(() => {
    fetchRecentSales();
  }, [userPhoneNumber]); // Re-fetch if userPhoneNumber changes

  // Handler for input changes in edit mode
  const handleInputChange = (id, field, value) => {
    setInventory(prevInventory =>
      prevInventory.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  // Handler for new item form changes
  const handleNewItemChange = (field, value) => {
    setNewItem({ ...newItem, [field]: value });
  };

  // Add a new item to the local state and then send to server
  const addNewItem = async () => {
    if (newItem.name && newItem.price && newItem.quantity_in_stock && newItem.sale_date) {
      const newId = inventory.length > 0 ? Math.max(...inventory.map(item => item.id.split('-')[2]).filter(Number).map(Number)) + 1 : 1; // Generate a unique ID
      
      const itemToSave = {
        phone_number: userPhoneNumber,
        item: newItem.name,
        price: parseFloat(newItem.price),
        quantity_in_stock: parseInt(newItem.quantity_in_stock),
        quantity_sold: parseInt(newItem.quantity_sold) || 0,
        sale_date: newItem.sale_date
      };

      try {
        const response = await fetch('http://localhost:5000/add_sale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemToSave)
        });

        const result = await response.json();
        if (!response.ok) {
          console.error(`Failed to add new item "${newItem.name}":`, result.error);
          alert(`Failed to add item: ${result.error}`);
        } else {
          console.log(`✅ Added new item "${newItem.name}"`);
          alert('Item added successfully!');
          // Re-fetch recent sales to update the table with the new item
          fetchRecentSales(); 
          setNewItem({ // Reset form
            name: '',
            price: '',
            quantity_in_stock: '',
            quantity_sold: '',
            sale_date: new Date().toISOString().slice(0, 10)
          });
        }
      } catch (error) {
        console.error('❌ Error adding new item:', error);
        alert('Error adding item. Please try again.');
      }
    } else {
      alert('Please fill in all required fields for the new item (Product Name, Price, Quantity In Stock, Sale Date).');
    }
  };

  // Remove an item (sends delete request to backend in a real app)
  const removeItem = async (idToRemove) => {
    // In a real application, you would send a delete request to your backend here
    // For now, we'll just filter it out from the local state
    // You'd also need a backend endpoint for deleting sales records by ID
    
    // Find the item to remove to get its actual database ID if available
    const itemToDelete = inventory.find(item => item.id === idToRemove);
    if (!itemToDelete) {
      console.error("Item not found for deletion:", idToRemove);
      return;
    }

    // --- Placeholder for actual backend deletion logic ---
    // try {
    //   const response = await fetch(`http://localhost:5000/delete_sale/${itemToDelete.db_id}`, { // Assuming a db_id
    //     method: 'DELETE',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ phone_number: userPhoneNumber })
    //   });
    //   if (!response.ok) {
    //     const errorData = await response.json();
    //     throw new Error(errorData.error || 'Failed to delete item on server.');
    //   }
    //   alert('Item deleted successfully from database!');
    //   fetchRecentSales(); // Re-fetch to update the table
    // } catch (error) {
    //   console.error('Error deleting item from backend:', error);
    //   alert('Failed to delete item from backend. Please try again.');
    // }
    // --- End Placeholder ---

    setInventory(prevInventory => prevInventory.filter(item => item.id !== idToRemove));
    alert('Item removed from table (local only). Implement backend deletion for permanent removal.');
    console.log("Removed item with ID:", idToRemove);
  };

  // Start editing an item
  const startEditing = (id) => {
    setEditingId(id);
  };

  // Stop editing and save changes (sends update request to backend in a real app)
  const stopEditing = () => {
    // In a real application, you would send the updated item to your backend here
    // This would typically be a PUT/PATCH request to an endpoint like /update_sale/:id
    console.log("Saving changes for item:", inventory.find(item => item.id === editingId));
    alert('Changes saved (local only). Implement backend update for permanent changes.');
    setEditingId(null);
  };

  // This function is for the "Save Changes" button at the top,
  // which implies saving all current table data.
  // Given that individual adds are handled by addNewItem, and edits/deletes
  // would ideally be handled immediately, this function might be redundant
  // or need a different purpose (e.g., bulk update).
  // For now, it will just re-fetch recent sales to ensure the table is up-to-date.
  const saveChanges = async () => {
    // In a real application, you would iterate through `inventory` and send updates/deletes
    // for any modified items. For simplicity, we'll just re-fetch.
    alert('Changes saved (table refreshed).');
    fetchRecentSales();
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
            // Instead of parseCSV directly, send to backend for processing
            sendCSVToBackend(file); 
            return 100;
          }
          return prev + 10;
        });
      }, 300);
    }
  };

  const sendCSVToBackend = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('phone_number', userPhoneNumber); // Attach phone number

    try {
      const response = await fetch('http://localhost:5000/upload_icr_csv', {
        method: 'POST',
        body: formData, // FormData handles Content-Type automatically
      });

      const result = await response.json();
      if (!response.ok) {
        console.error('CSV upload failed:', result.error);
        alert(`CSV upload failed: ${result.error}`);
      } else {
        console.log('CSV upload successful:', result.message);
        alert('CSV data uploaded and processed successfully!');
        fetchRecentSales(); // Refresh table after successful upload
      }
    } catch (error) {
      console.error('Error during CSV upload:', error);
      alert('Error uploading CSV. Please check your network and try again.');
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  if (loading) {
    return (
      <div className="upload-data-container loading-state">
        <div className="spinner"></div>
        <p>Loading recent sales data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="upload-data-container error-state">
        <p>Error: {error}</p>
        <button onClick={fetchRecentSales}>Retry</button>
      </div>
    );
  }

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

          <div>
            <div className="ocr-upload-card">
              <h3>Use ICR</h3>
              <p>Scan a receipt using Intelligent Character Recognition</p>
              <button className="ocr-btn" onClick={() => setShowOCR(true)}>
                📷 Upload via ICR
              </button>
            </div>
          
            {showOCR && (
              <OCRUploadCard onClose={() => setShowOCR(false)} />
            )}
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
              placeholder="Quantity In Stock"
              value={newItem.quantity_in_stock}
              onChange={(e) => handleNewItemChange('quantity_in_stock', e.target.value)}
              min="0"
            />
          </div>
        <div className="form-group">
            <input
              type="number"
              placeholder="Quantity Sold"
              value={newItem.quantity_sold}
              onChange={(e) => handleNewItemChange('quantity_sold', e.target.value)}
              min="0"
            />
          </div>
        <div className="form-group">
          <input
            type="date"
            value={newItem.sale_date}
            onChange={(e) => handleNewItemChange('sale_date', e.target.value)}
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
          <h2>Recently Added Items</h2> {/* Changed title to reflect recent items */}
          <span className="item-count">{inventory.length} items shown</span>
        </div>
        <div className="table-scroll">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Sales</th>
                <th>Reorder Level</th> {/* Added Reorder Level column */}
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.length > 0 ? (
                inventory.map(item => (
                  <tr key={item.id} className={item.stock <= item.reorderLevel ? 'low-stock' : ''}>
                    <td>{item.date}</td> {/* Display sale_date */}
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
                      {/* Display quantity_sold as 'Sales' */}
                      {editingId === item.id ? (
                        <input
                          type="number"
                          value={item.sales}
                          onChange={(e) => handleInputChange(item.id, 'sales', e.target.value)}
                          min="0"
                        />
                      ) : (
                        item.sales
                      )}
                    </td>
                    <td>
                      {/* Reorder Level is a frontend concept, not directly from DB in this flow */}
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
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="no-data-message">No recent sales data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UploadData;
