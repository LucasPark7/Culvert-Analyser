import requests
import time

API_BASE = "https://culvert-analyse.onrender.com"

def upload_video(video_path: str):
    with open(video_path, "rb") as f:
        files = {"file": f}
        resp = requests.post(f"{API_BASE}/analyse", files=files)
        print(resp)
        
        try:
            data = resp.json()
        except Exception:
            print("Non-JSON response:", resp.text)
            resp.raise_for_status()
        
        if "job_id" not in data:
            raise KeyError(f"'job_id' missing in response: {data}")
        
        return data["job_id"]


def poll_status(task_id: str, interval: int = 3, timeout: int = 300):
    """Poll the status endpoint until completion or timeout (in seconds)."""
    start = time.time()
    while time.time() - start < timeout:
        resp = requests.get(f"{API_BASE}/status/{task_id}")
        resp.raise_for_status()
        status_data = resp.json()

        print("Status:", status_data)

        if status_data["status"] == "complete":
            return status_data["results"]
        elif status_data["status"] == "failed":
            raise RuntimeError(f"Task {task_id} failed: {status_data}")

        time.sleep(interval)
    
    raise TimeoutError(f"Task {task_id} did not complete within {timeout} seconds")


if __name__ == "__main__":
    video_file = r"C:\Users\Lucas\Desktop\Culvert-Analyser\src\TestVid1Cut.mp4"
    task_id = upload_video(video_file)
    print(f"Task started with ID: {task_id}")

    try:
        result = poll_status(task_id)
        print("Final result:", result)
    except Exception as e:
        print("Error during polling:", e)
