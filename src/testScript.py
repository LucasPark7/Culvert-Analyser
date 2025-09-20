import requests

url = "http://127.0.0.1:10000/analyse"
video_path = r"C:\Users\Lucas\Desktop\Culvert-Analyser\src\TestVid1.mp4"

# Open the file in binary mode and send a POST request
with open(video_path, "rb") as f:
    files = {"file": (video_path, f, "video/mp4")}
    response = requests.post(url, files=files)

# Print the response from the API
print("Status code:", response.status_code)
print("Response body:", response.text)
