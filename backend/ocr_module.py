# ocr_module.py
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
import os
import google.generativeai as genai
from PIL import Image
from io import BytesIO
import fitz  # PyMuPDF
import traceback
import logging

# Configure logging for the module
# Set to DEBUG to see all detailed logs
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Load Gemini API key
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Configure Gemini
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")

# Create a Blueprint for OCR routes
ocr_bp = Blueprint('ocr', __name__)

@ocr_bp.route("/extract", methods=["POST"])
def extract_csv():
    """
    Extracts table data from uploaded images or PDF files and returns it as CSV.
    Uses Google Gemini for OCR and table extraction, with a precise output schema.
    """
    logging.info("Received /ocr/extract request.")
    try:
        # --- MODIFIED PROMPT for precise output schema ---
        prompt = """
You are a highly accurate data extraction AI. Your task is to extract tabular data from the provided image(s) or PDF pages and convert it into a CSV format.

The CSV must strictly adhere to the following schema:
Headers: item,price,quantity_in_stock,quantity_sold,sale_date

Data Types and Format:
- item (TEXT): The name of the product.
- price (REAL): The price of a single item. Must be a number (e.g., 120.50).
- quantity_in_stock (INTEGER): The current quantity of the item in stock. Must be an integer (e.g., 10).
- quantity_sold (INTEGER): The number of units sold in a transaction. Must be an integer (e.g., 5).
- sale_date (TEXT): The date of the sale. Must be in YYYY-MM-DD format (e.g., 2025-07-27).

Instructions:
1. Extract only the tabular data. Do NOT include any introductory text, explanations, or conversational phrases.
2. The first line of your output MUST be the exact headers: item,price,quantity_in_stock,quantity_sold,sale_date
3. Each subsequent line must be a row of data, with values separated by commas.
4. If a value for a column is not available or cannot be extracted, use "null" (without quotes) or leave it empty, but ensure the correct number of commas for the row.
5. If there are multiple images or PDF pages, combine all extracted rows under a single header. Do NOT repeat the header for subsequent tables.
6. Ensure numeric values do not contain currency symbols or commas (e.g., "1,200.00" should be "1200.00").
7. Dates must be parsed into YYYY-MM-DD format.

"""

        csv_rows = []
        header = None

        # --- Process images ---
        image_files = request.files.getlist("images")
        logging.info(f"Received {len(image_files)} image files.")
        
        for img_file in image_files:
            if img_file.filename == "":
                logging.debug("Skipping empty image file entry.")
                continue
            logging.info(f"Processing image: {img_file.filename}")
            try:
                img = Image.open(img_file.stream).convert("RGB")
            except Exception as img_e:
                logging.error(f"Error opening image {img_file.filename}: {img_e}")
                continue
            
            logging.debug(f"Sending image {img_file.filename} to Gemini model.")
            response = model.generate_content([prompt, img], stream=False)
            extracted = response.text.strip()
            logging.debug(f"Raw extracted from image {img_file.filename}: \n---\n{extracted}\n---")

            lines = [line.strip() for line in extracted.splitlines() if line.strip()]
            logging.debug(f"Processed lines from image {img_file.filename}: {lines}")

            if len(lines) < 2:
                logging.warning(f"No valid table data (less than 2 lines) extracted from image {img_file.filename}. Extracted: '{extracted}'")
                continue

            current_header = lines[0]
            current_rows = lines[1:]

            if header is None:
                header = current_header
                logging.info(f"First header set: '{header}'")
            elif current_header != header:
                logging.warning(f"Header mismatch detected in image {img_file.filename}. Expected '{header}', got '{current_header}'. Appending rows without header.")
            else:
                logging.info(f"Header matches for image {img_file.filename}.")

            csv_rows.extend(current_rows)
            logging.debug(f"Current csv_rows after image {img_file.filename}: {csv_rows}")

        # --- Process PDF pages ---
        if "pdf" in request.files:
            pdf_file = request.files["pdf"]
            if pdf_file.filename != "":
                logging.info(f"Processing PDF: {pdf_file.filename}")
                try:
                    doc = fitz.open(stream=pdf_file.read(), filetype="pdf")
                except Exception as pdf_e:
                    logging.error(f"Error opening PDF {pdf_file.filename}: {pdf_e}")
                    doc = None

                if doc:
                    for i, page in enumerate(doc):
                        logging.info(f"Processing page {i+1} of PDF.")
                        try:
                            pix = page.get_pixmap(dpi=300)
                            img = Image.open(BytesIO(pix.tobytes())).convert("RGB")
                        except Exception as page_e:
                            logging.error(f"Error processing page {i+1} of PDF: {page_e}")
                            continue

                        logging.debug(f"Sending PDF page {i+1} to Gemini model.")
                        response = model.generate_content([prompt, img], stream=False)
                        extracted = response.text.strip()
                        logging.debug(f"Raw extracted from PDF page {i+1}: \n---\n{extracted}\n---")

                        lines = [line.strip() for line in extracted.splitlines() if line.strip()]
                        logging.debug(f"Processed lines from PDF page {i+1}: {lines}")

                        if len(lines) < 2:
                            logging.warning(f"No valid table data (less than 2 lines) extracted from PDF page {i+1}. Extracted: '{extracted}'")
                            continue

                        current_header = lines[0]
                        current_rows = lines[1:]

                        if header is None:
                            header = current_header
                            logging.info(f"First header set (from PDF page {i+1}): '{header}'")
                        elif current_header != header:
                            logging.warning(f"Header mismatch in PDF page {i+1}. Expected '{header}', got '{current_header}'. Appending rows without header.")
                        else:
                            logging.info(f"Header matches for PDF page {i+1}.")

                        csv_rows.extend(current_rows)
                        logging.debug(f"Current csv_rows after PDF page {i+1}: {csv_rows}")
                else:
                    logging.error(f"Failed to open PDF file: {pdf_file.filename}")
            else:
                logging.info("PDF file field was present but empty.")
        else:
            logging.info("No PDF file provided.")

        if header is None or not csv_rows:
            logging.warning("No valid table data found in any processed images or PDF pages. Returning error.")
            return jsonify({"status": "error", "error": "No valid table data found in images or PDF. Please ensure the files contain clear tables."}), 400

        # Construct the final CSV string
        final_csv_content = ""
        if header:
            final_csv_content += header + "\n"
        final_csv_content += "\n".join(csv_rows)

        logging.info(f"CSV data extracted successfully. Final CSV content length: {len(final_csv_content)} bytes.")
        logging.debug(f"Final CSV content: \n---\n{final_csv_content}\n---")

        # Return the CSV content as JSON
        return jsonify({
            "status": "success",
            "csv_data": final_csv_content,
            "message": "CSV data extracted successfully."
        }), 200

    except Exception as e:
        logging.error(f"Unhandled error in /ocr/extract: {traceback.format_exc()}")
        return jsonify({"status": "error", "error": f"An unexpected server error occurred: {str(e)}"}), 500

