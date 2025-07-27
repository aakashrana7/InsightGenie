// src/components/OCRUploadCard.jsx
import React, { useState } from 'react';
import './OCRUploadCard.css'; // Ensure you have this CSS file for styling

const OCRUploadCard = ({ onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false); // For OCR extraction
  const [isUploadingToDB, setIsUploadingToDB] = useState(false); // NEW: For database upload
  const [error, setError] = useState(null); // State to store any error messages
  const [csvData, setCsvData] = useState(null); // Stores the extracted CSV string

  // States for file inputs
  const [images, setImages] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);
  
  // Get user phone number from localStorage (assuming it's stored there after login)
  const userPhoneNumber = localStorage.getItem('phone_number');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true); // Indicate OCR processing has started
    setError(null);       // Clear any previous errors
    setCsvData(null);     // Clear previous CSV data
    setIsUploadingToDB(false); // Reset DB upload state

    const formData = new FormData();
    
    // Append images if any are selected
    if (images.length > 0) {
      images.forEach(image => formData.append("images", image));
    }

    // Append PDF file if selected
    if (pdfFile) {
      formData.append("pdf", pdfFile);
    }

    // Ensure at least one file type is selected
    if (images.length === 0 && !pdfFile) {
        setError("Please select at least one image or a PDF file to upload.");
        setIsProcessing(false);
        return;
    }

    try {
      const response = await fetch("http://localhost:5000/ocr/extract", {
        method: "POST",
        body: formData,
      });

      const contentType = response.headers.get("content-type");

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch (parseError) {
            errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();

        if (data.status === "success" && data.csv_data) {
          setCsvData(data.csv_data); // Store the extracted CSV data
          setError(null); // Clear any previous errors if extraction was successful
        } else {
          throw new Error(data.error || "Failed to extract data: No CSV data received.");
        }
      } else {
        throw new Error("Unexpected server response format. Expected JSON.");
      }
    } catch (err) {
      console.error("OCR extraction failed:", err);
      setError(err.message || "An unexpected error occurred during extraction.");
    } finally {
      setIsProcessing(false); // Always stop processing indicator
    }
  };

  const handleDownload = () => {
    if (csvData) {
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'extracted_data.csv';
      document.body.appendChild(a); // Append to body to ensure it's clickable
      a.click();
      document.body.removeChild(a); // Clean up
      URL.revokeObjectURL(url);
    }
  };

  // NEW FUNCTION: Handle uploading extracted CSV data to the database
  const handleUploadToDB = async () => {
    if (!csvData) {
      setError("No CSV data to upload. Please extract data first.");
      return;
    }
    if (!userPhoneNumber) {
      setError("User phone number not found. Please log in.");
      return;
    }

    setIsUploadingToDB(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:5000/api/upload-ocr-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone_number: userPhoneNumber,
          csv_data: csvData, // Send the extracted CSV string
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch (parseError) {
            errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data.status === "success") {
        alert("CSV data successfully uploaded to your sales database!"); // Use alert for simple confirmation
        onClose(); // Close the modal after successful upload
      } else {
        throw new Error(data.error || "Failed to upload CSV data to database.");
      }
    } catch (err) {
      console.error("Error uploading CSV to DB:", err);
      setError(err.message || "An unexpected error occurred during database upload.");
    } finally {
      setIsUploadingToDB(false);
    }
  };

  return (
    <div className="ocr-modal-overlay">
      <div className="ocr-modal">
        <div className="ocr-card">
          <h2>Extract Table from Images or PDF</h2>
          <form onSubmit={handleSubmit}>
            <label>Upload Images (you can select multiple):</label><br />
            <input
              type="file"
              name="images"
              accept="image/*"
              multiple
              onChange={(e) => setImages(Array.from(e.target.files))}
            /><br /><br />

            <label>Or Upload a PDF:</label><br />
            <input
              type="file"
              name="pdf"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files[0])}
            /><br /><br />

            <button type="submit" disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Extract CSV'}
            </button>
          </form>

          {/* Display error message if any */}
          {error && <p className="error-message">{error}</p>}

          <textarea
            value={csvData || (isProcessing ? "Processing..." : "Extracted CSV will appear here...")}
            onChange={() => {}} // Read-only, so onChange is a no-op
            placeholder="Extracted CSV will appear here..."
            readOnly
            style={{ width: '100%', height: '300px', marginTop: '20px' }}
          />

          {csvData && ( // Only show buttons if csvData is available
            <div style={{ marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={handleDownload}>
                Download CSV
              </button>
              {/* NEW BUTTON: Upload to Database */}
              <button onClick={handleUploadToDB} disabled={isUploadingToDB}>
                {isUploadingToDB ? 'Uploading...' : 'Upload to Database'}
              </button>
            </div>
          )}

          <button onClick={onClose} style={{ marginTop: '10px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OCRUploadCard;
