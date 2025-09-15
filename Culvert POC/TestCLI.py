import cv2
import pytesseract
import re
import pandas as pd
import matplotlib.pyplot as plt
import math
from pathlib import Path
import threading
import queue
import time

# --------- CONFIG ---------
FRAME_STEP = 60  # process every 60th frame (~1s at 60fps)
ROI = (1000, 70, 130, 30)  # (x, y, w, h) adjust to where numbers appear
path = str(Path().absolute()) + "\Culvert POC\\"
# ---------------------------

def extract_frames(video_path, step=FRAME_STEP):
    cap = cv2.VideoCapture(video_path)
    frames = []
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % step == 0:
            frames.append(frame)
        frame_idx += 1

    cap.release()
    return frames

def extract_info_from_frame(frame, roi=None):
    full_frame = frame
    if roi:
        x, y, w, h = roi
        frame = frame[y:y+h, x:x+w]

    # Convert to grayscale for better OCR
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 108, 255, cv2.THRESH_BINARY)
    _, thresh2 = cv2.threshold(gray, 94, 255, cv2.THRESH_BINARY)

    text1 = pytesseract.image_to_string(thresh, config="--psm 6 digits")
    text2 = pytesseract.image_to_string(thresh2, config="--psm 6 digits")

    # Scan for fatal strike using template matching
    fullGray = gray = cv2.cvtColor(full_frame, cv2.COLOR_BGR2GRAY)
    fatal = cv2.imread(path + "FatalStrikeIcon.png")
    grayFatal = cv2.cvtColor(fatal, cv2.COLOR_BGR2GRAY)
    res = cv2.matchTemplate(fullGray, grayFatal, cv2.TM_CCOEFF_NORMED)
    min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)

    threshold = 0.78
    if max_val >= threshold:
        fatal_active = True
    else:
        fatal_active = False

    return [clean_number(text1, text2), fatal_active]

# convert text from pytesseract to integer
def clean_number(text1, text2):
    num1 = re.search(r"\d+", text1)
    num1 = int(num1.group()) if num1 else None

    num2 = re.search(r"\d+", text2)
    num2 = int(num2.group()) if num2 else None
   
    return [num1, num2]

# get all frames from video and add all numbers from each frame to list
def process_video(video_path):
    frames = extract_frames(video_path)
    values = []
    for f in range(len(frames)):
        result = extract_info_from_frame(frames[f], ROI)
        print(result)
        if result[0][0] == result[0][1]: # if both OCR checks match then confidence in result is high
            if (result[0][0] is None) or (result[0][1] is None):
                continue
            else:
                entry = [result[0][0], result[1]]
                values.append(entry)
        else:   # if OCR checks do not match check which one is more likely to be real
            num1 = result[0][0]
            num2 = result[0][1]
        
            if num1 is None:
                result[0] = num2
            elif num2 is None:
                result[0] = num1
            else:
                pre = num1 - values[-1][0]
                if (abs(num2 - values[-1][0]) < abs(pre)):
                    result[0] = num2
                else:
                    result[0] = num1
            
            values.append(result)
    
    #print(values)
    #print(check)
   
    return values

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

if __name__ == "__main__":
    video1 = path + "78kCulvCut2.mp4"
    video2 = path + "78kCulvCut.mp4"

    #df = compare_videos(video1, video2)
    
    # code to test 1 video
    series1 = process_video(video1)
    data = []
    for i in range(len(series1)):
        data.append({
            "time": i,
            "score": series1[i][0],
            "fatal_active": series1[i][1]
        })
    df = pd.DataFrame(data)

    #print(df.to_string())

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
