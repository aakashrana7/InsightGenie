import { useState } from 'react';
import * as XLSX from 'xlsx';
import './UploadData.css';

const UploadData = () => {
  const [uploadedData, setUploadedData] = useState([]);
  const [manualData, setManualData] = useState([{ product: '', sales: '' }]);
  const [mode, setMode] = useState('upload'); // or 'manual'

  // 📂 Handle CSV or Excel upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      setUploadedData(jsonData);
    };
    reader.readAsArrayBuffer(file);
  };

  // ➕ Handle manual table input
  const handleManualChange = (index, field, value) => {
    const newData = [...manualData];
    newData[index][field] = value;
    setManualData(newData);
  };

  const addRow = () => {
    setManualData([...manualData, { product: '', sales: '' }]);
  };

  const removeRow = (index) => {
    const newData = manualData.filter((_, i) => i !== index);
    setManualData(newData);
  };

  // 📨 Submit to backend (add later)
  const handleSubmit = () => {
    const finalData = mode === 'upload' ? uploadedData : manualData;
    console.log('Submitting Data:', finalData);
    // TODO: send to backend via axios
  };

  return (
    <div className="upload-container">
      <h2>📊 Upload Sales Data</h2>

      <div className="mode-switch">
        <button onClick={() => setMode('upload')} className={mode === 'upload' ? 'active' : ''}>Upload File</button>
        <button onClick={() => setMode('manual')} className={mode === 'manual' ? 'active' : ''}>Manual Entry</button>
      </div>

      {/* 📂 File Upload Section */}
      {mode === 'upload' && (
        <div>
          <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} />
          {uploadedData.length > 0 && (
            <table className="data-table">
              <thead>
                <tr>{Object.keys(uploadedData[0]).map((key, idx) => <th key={idx}>{key}</th>)}</tr>
              </thead>
              <tbody>
                {uploadedData.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => <td key={j}>{val}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ➕ Manual Table Section */}
      {mode === 'manual' && (
        <div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Sales</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {manualData.map((row, i) => (
                <tr key={i}>
                  <td><input value={row.product} onChange={e => handleManualChange(i, 'product', e.target.value)} /></td>
                  <td><input value={row.sales} onChange={e => handleManualChange(i, 'sales', e.target.value)} /></td>
                  <td><button onClick={() => removeRow(i)}>🗑️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={addRow}>➕ Add Row</button>
        </div>
      )}

      <button onClick={handleSubmit} className="submit-btn">Submit Data</button>
    </div>
  );
}

export default UploadData; // ← Make sure this line is present
