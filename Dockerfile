# Use slim Python base
FROM python:3.11-slim

# Install system packages (tesseract + deps)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your code
COPY . .

# Expose Render's required port
EXPOSE 10000

# Run FastAPI with uvicorn
CMD ["uvicorn", "src.VidAnalyse:app", "--host", "0.0.0.0", "--port", "10000"]