import cv2
import pytesseract
import re
import pandas as pd
import matplotlib.pyplot as plt

# --------- CONFIG ---------
FRAME_STEP = 60  # process every 30th frame (~1s at 60fps)
ROI = (1000, 70, 130, 30)  # (x, y, w, h) adjust to where numbers appear
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

def extract_number_from_frame(frame, roi=None):
    if roi:
        x, y, w, h = roi
        frame = frame[y:y+h, x:x+w]

    # Convert to grayscale for better OCR
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 108, 255, cv2.THRESH_BINARY)
    _, thresh2 = cv2.threshold(gray, 94, 255, cv2.THRESH_BINARY)

    text1 = pytesseract.image_to_string(thresh, config="--psm 6 digits")
    text2 = pytesseract.image_to_string(thresh2, config="--psm 6 digits")
    return clean_number(text1, text2)

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
    check = []
    for f in range(len(frames)):
        results = extract_number_from_frame(frames[f], ROI)
        if results[0] == results[1]:
            values.append(results[0])
        else:
            values.append(results)
            check.append(f)
    
    #print(values)
    #print(check)

    # reprocess possible incorrect values for marked frames
    for c in check:
        num1 = values[c][0]
        num2 = values[c][1]
        
        if num1 is None:
            values[c] = num2
        elif num2 is None:
            values[c] = num1
        elif c < 1 or c > len(values)-1:
            values[c] = num1
        else:
            pre = values[c][0] - values[c-1]
            if (pre > 0) and (values[c][1] - values[c-1]) < pre:
                values[c] = num2
            else:
                values[c] = num1
    
    return values

def compare_videos(video1_path, video2_path):
    series1 = process_video(video1_path)
    series2 = process_video(video2_path)

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
    video2 = r"C:\Users\Lucas\Desktop\Culvert-Analyser\Culvert POC\78kCulvCut2.mp4"
    #video2 = r"C:\Users\Lucas\Desktop\Culvert-Analyser\Culvert POC\78kCulvCut.mp4"

    #df = compare_videos(video1, video2)
    series1 = process_video(video2)
    df = pd.DataFrame({
        "time": list(range(len(series1))),
        "video1": series1
    })


    print(df.to_string())

    # Plot
    plt.plot(df["time"], df["video1"], label="Video 1")
    #plt.plot(df["time"], df["video2"], label="Video 2")
    plt.xlabel("Frame Index (sampled)")
    plt.ylabel("Extracted Number")
    plt.legend()
    plt.show()
