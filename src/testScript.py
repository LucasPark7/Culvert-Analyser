import requests
import time
import cv2, pytesseract, re, math, threading, queue, os, time, json, boto3, tempfile, logging, sys
import pandas as pd
import matplotlib.pyplot as plt
from itertools import groupby
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from threading import Event
from redis import Redis

API_BASE = "https://culvert-analyse.onrender.com"

FRAME_STEP = 60  # process every 60th frame (~1s at 60fps)
ROI = (1000, 70, 130, 30)  # (x, y, w, h) adjust to where numbers appear

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

def process_video(file_path):
    def extract_frames(video_path, step=FRAME_STEP):
        cap = cv2.VideoCapture(video_path)
        frame_idx = 0

        if not cap.isOpened():
            os.remove(video_path)
            raise HTTPException(status_code=400, detail="Could not open video")

        while cap.isOpened() and not pause_queue.is_set():
            ret, frame = cap.read()
            if not ret:
                break
            try:
                if frame_idx % step == 0:
                    frame_queue.put(frame, timeout=1)
                frame_idx += 1
            except queue.Full:
                pass
        
        pause_queue.set()

        cap.release()

    def extract_info_from_frame(frame, roi=None):
        full_frame = frame
        if roi:
            x, y, w, h = roi
            frame = frame[y:y+h, x:x+w]

        # Convert to grayscale for better OCR
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 108, 255, cv2.THRESH_BINARY)
        _, thresh2 = cv2.threshold(gray, 94, 255, cv2.THRESH_BINARY)
        _, thresh3 = cv2.threshold(gray, 80, 255, cv2.THRESH_BINARY)
        _, thresh4 = cv2.threshold(gray, 116, 255, cv2.THRESH_BINARY)
        _, thresh5 = cv2.threshold(gray, 72, 255, cv2.THRESH_BINARY)

        text1 = pytesseract.image_to_string(thresh, config="--psm 6 digits")
        text2 = pytesseract.image_to_string(thresh2, config="--psm 6 digits")
        text3 = pytesseract.image_to_string(thresh3, config="--psm 6 digits")
        text4 = pytesseract.image_to_string(thresh4, config="--psm 6 digits")
        text5 = pytesseract.image_to_string(thresh5, config="--psm 6 digits")

        # Scan for fatal strike using template matching
        fullGray = cv2.cvtColor(full_frame, cv2.COLOR_BGR2GRAY)
        fatal = cv2.imread("resources/FatalStrikeIcon.png")
        grayFatal = cv2.cvtColor(fatal, cv2.COLOR_BGR2GRAY)
        res = cv2.matchTemplate(fullGray, grayFatal, cv2.TM_CCOEFF_NORMED)
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)

        threshold = 0.75
        if max_val >= threshold:
            fatal_active = True
        else:
            fatal_active = False

        return [clean_number(text1, text2, text3, text4, text5), fatal_active]

    # convert text from pytesseract to integer
    def clean_number(text1, text2, text3, text4, text5):
        num1 = re.search(r"\d+", text1)
        num1 = int(num1.group()) if num1 else None

        num2 = re.search(r"\d+", text2)
        num2 = int(num2.group()) if num2 else None

        num3 = re.search(r"\d+", text3)
        num3 = int(num3.group()) if num3 else None

        num4 = re.search(r"\d+", text4)
        num4 = int(num4.group()) if num4 else None

        num5 = re.search(r"\d+", text5)
        num5 = int(num5.group()) if num5 else None
    
        return [num1, num2, num3, num4, num5]

    # helper function for processing frames
    def all_equal(iterable):
        g = groupby(iterable)
        return next(g, True) and not next(g, False)

    # get all frames from video and add all numbers from each frame to list
    def process_video():
        while not pause_queue.is_set() or not frame_queue.empty():
            try:
                frame = frame_queue.get(timeout=1)
                result = extract_info_from_frame(frame, ROI)

                OCRList = result[0]
                print(OCRList)
                if all_equal(OCRList): # if all OCR checks match then confidence in result is high
                    if OCRList[0] is None or OCRList[0] == 4:
                        continue
                    else:
                        result[0] = result[0][0]
                        values.append(result)
                else:   # if OCR checks do not match check which one is more likely to be real
                    with lock:
                        if values:
                            max_diff = math.inf
                        else:
                            max_diff = OCRList[0]

                        freq = max(set(OCRList), key=OCRList.count)
                        if OCRList.count(freq) == 1:
                            for num in OCRList:
                                if values:
                                    if num is None or num < values[-1][0]:
                                        continue
                                    elif num - values[-1][0] < max_diff:
                                        max_diff = num - values[-1][0]
                                        result[0] = num
                                else:
                                    min_val = min(min_val for min_val in OCRList if min_val is not None)
                                    result[0] = min_val
                        else:
                            if freq is None or freq == 4:
                                continue
                            else:
                                result[0] = freq
                                values.append(result)

                        values.append(result)
            except queue.Empty:
                continue
    
    def process(video_path):
        reader_thread = threading.Thread(target=extract_frames, args=(video_path,))
        analyzer_thread = threading.Thread(target=process_video)

        reader_thread.start()
        analyzer_thread.start()

        reader_thread.join()
        analyzer_thread.join()

    # normalize values to scale one score to the other
    def normalize(video1, video2):
        end1 = video1[-1]
        end2 = video2[-1]

        scale = max(end1, end2) / min(end1, end2)

        if min(end1, end2) == end1:
            for i in range(len(video1)):
                video1[i] = math.floor(video1[i] * scale)
        else:
            for i in range(len(video2)):
                video2[i] = math.floor(video2[i] * scale)
        
        return [video1, video2]

    def compare_videos(video1_path, video2_path):
        series1 = process_video(video1_path)
        series2 = process_video(video2_path)

        # call normalize on two videos
        '''
        normResult = normalize(series1, series2)
        series1 = normResult[0]
        series2 = normResult[1]
        '''

        # Align lengths
        min_len = min(len(series1), len(series2))
        series1, series2 = series1[:min_len], series2[:min_len]

        df = pd.DataFrame({
            "time": list(range(min_len)),
            "video1": series1,
            "video2": series2
        })

        return df
    
    values = []
    frame_queue = queue.Queue()
    lock = threading.Lock()
    pause_queue = Event()

    process(file_path)
    
    return values

if __name__ == "__main__":
    video_file = r"C:\Users\Lucas\Desktop\Culvert-Analyser\src\103kCulv.mp4"

    result = process_video(video_file)

    '''
    task_id = upload_video(video_file)
    print(f"Task started with ID: {task_id}")

    try:
        result = poll_status(task_id)
        print("Final result:", result)
    except Exception as e:
        print("Error during polling:", e)
    '''
    
    # code to test 1 video
    series1 = result
    data = []
    for i in range(len(series1)):
        data.append({
            "time": i,
            "score": series1[i][0],
            "fatal_active": series1[i][1]
        })
    df = pd.DataFrame(data)

    print(df.to_string())

    # Plot
    plt.plot(df["time"], df["score"], label="Video 1")
    #plt.plot(df["time"], df["video2"], label="Video 2")

    # Shade fatal time
    active_periods = []
    active_start = None
    for i, row in df.iterrows():
        if row["fatal_active"] and active_start is None:
            active_start = row["time"]
        if not row["fatal_active"] and active_start is not None:
            active_periods.append((active_start, row["time"]))
            active_start = None
    if active_start is not None:  # if buff was active till the end
        active_periods.append((active_start, df["time"].iloc[-1]))

    for start, end in active_periods:
        plt.axvspan(start, end, color="blue", alpha=0.3, label="Fatal Active")

    plt.xlabel("Frame")
    plt.ylabel("Score")
    plt.legend()
    plt.show()