import requests
import os
import cv2

url = "http://127.0.0.1:10000/analyse"
video_path = r"C:\Users\Lucas\Desktop\Culvert-Analyser\src\TestVid1.mp4"

if not os.path.exists(video_path):
    print("Video file does not exist:", video_path)

cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    print("Failed to open video")

ret, frame = cap.read()
if not ret:
    print("Failed to read first frame")
else:
    print("First frame shape:", frame.shape)

with open(video_path, "wb") as f:
    f.write(contents)
cap = cv2.VideoCapture("temp_video.mp4")

# Open the file in binary mode and send a POST request
with open(video_path, "rb") as f:
    files = {"file": (video_path, f, "video/mp4")}
    response = requests.post(url, files=files)

# Print the response from the API
print("Status code:", response.status_code)
print("Response body:", response.text)
