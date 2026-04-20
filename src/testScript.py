import cv2, math, threading, queue, os
import pandas as pd
import matplotlib.pyplot as plt
from fastapi import HTTPException
from threading import Event
from concurrent.futures import ThreadPoolExecutor
import cProfile
import pstats
import easyocr
import numpy as np

API_BASE = "https://culvert-analyse.onrender.com"

FRAME_STEP = 60  # process every 60th frame (~1s at 60fps)
ROI = (1020, 95, 180, 47)  # (x, y, w, h) adjust to where numbers appear
fatal = cv2.imread(r"C:\Users\Lucas\Desktop\Culvert-Analyser\resources\fatal_icon.png")
mapae = cv2.imread(r"C:\Users\Lucas\Desktop\Culvert-Analyser\resources\mapae_icon.png")
cont = cv2.imread(r"C:\Users\Lucas\Desktop\Culvert-Analyser\resources\cont_active.png")
ror = cv2.imread(r"C:\Users\Lucas\Desktop\Culvert-Analyser\resources\ror_active.png")

def process_video(file_path):
    reader = easyocr.Reader(['en'])

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

    def extract_info_from_frame(frame, executor, roi=None):
        full_frame = frame
        
        if roi:
            x, y, w, h = roi
            frame = frame[y:y+h, x:x+w]

        # Convert to grayscale for better OCR
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        easyResult = reader.readtext(frame)
        easyNum = [item[1] for item in easyResult]

        # Scan for fatal strike using template matching
        fullGray = cv2.cvtColor(full_frame, cv2.COLOR_BGR2GRAY)
        grayFatal = cv2.cvtColor(fatal, cv2.COLOR_BGR2GRAY)
        grayMapae = cv2.cvtColor(mapae, cv2.COLOR_BGR2GRAY)
        grayCont = cv2.cvtColor(cont, cv2.COLOR_BGR2GRAY)
        grayRor = cv2.cvtColor(ror, cv2.COLOR_BGR2GRAY)


        resFatal = cv2.matchTemplate(fullGray, grayFatal, cv2.TM_CCOEFF_NORMED)
        resMapae = cv2.matchTemplate(fullGray, grayMapae, cv2.TM_CCOEFF_NORMED)
        resCont = cv2.matchTemplate(fullGray, grayCont, cv2.TM_CCOEFF_NORMED)
        resRor = cv2.matchTemplate(fullGray, grayRor, cv2.TM_CCOEFF_NORMED)

        min_val, max_val_fatal, min_loc, max_loc = cv2.minMaxLoc(resFatal)
        min_val, max_val_mapae, min_loc, max_loc = cv2.minMaxLoc(resMapae)
        min_val_cont, max_val_cont, min_loc_cont, max_loc_cont = cv2.minMaxLoc(resCont)
        min_val_ror, max_val_ror, min_loc_ror, max_loc_ror = cv2.minMaxLoc(resRor)

        threshold = 0.75
        cont_threshold = 0.6
        
        if max_val_fatal >= threshold:
            fatal_active = True
        else:
            fatal_active = False

        cont_loc = np.where(resCont >= cont_threshold)
        if len(cont_loc[0]) > 1:
            if cont_loc[0][0] == cont_loc[0][1]:
                cont_active = True
            else:
                cont_active = False
        else:
            cont_active = False

        if max_val_ror >= threshold:
            ror_active = True
        else:
            ror_active = False

        return [easyNum, fatal_active, cont_active, ror_active]

    # get all frames from video and add all numbers from each frame to list
    def process_video(executor):
        while not pause_queue.is_set() or not frame_queue.empty():
            try:
                frame = frame_queue.get(timeout=1)
                result = extract_info_from_frame(frame, executor, ROI)
                if result[0]:
                    print(result)
                    values.append(result)
                
            except queue.Empty:
                continue
    
    def process(video_path, executor):
        reader_thread = threading.Thread(target=extract_frames, args=(video_path,))
        analyzer_thread = threading.Thread(target=process_video, args=(executor,))

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
    
    executor = ThreadPoolExecutor(max_workers=5)

    values = []
    frame_queue = queue.Queue()
    lock = threading.Lock()
    pause_queue = Event()

    process(file_path, executor)
    
    return values

if __name__ == "__main__":
    profiler = cProfile.Profile()
    profiler.enable()

    video_file = r"C:\Users\Lucas\Desktop\Culvert-Analyser\src\testvideos\lucasproject2.mp4"

    result = process_video(video_file)

    profiler.disable()
    stats = pstats.Stats(profiler)
    stats.sort_stats('cumulative')
    stats.print_stats(10)
    
    # code to test 1 video
    series1 = result
    data = []
    print(series1)
    for i in range(len(series1)):
        print(series1[i][0])
        data.append({
            "time": i,
            "score": int(series1[i][0][0]),
            "fatal_active": series1[i][1],
            "cont_active": series1[i][2],
            "ror_active": series1[i][3]
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

    # Shade cont time
    active_periods = []
    active_start = None
    for i, row in df.iterrows():
        if row["cont_active"] and active_start is None:
            active_start = row["time"]
        if not row["cont_active"] and active_start is not None:
            active_periods.append((active_start, row["time"]))
            active_start = None
    if active_start is not None:  # if buff was active till the end
        active_periods.append((active_start, df["time"].iloc[-1]))

    for start, end in active_periods:
        plt.axvspan(start, end, color="green", alpha=0.3, label="Cont Active")

    # Shade ror time
    active_periods = []
    active_start = None
    for i, row in df.iterrows():
        if row["ror_active"] and active_start is None:
            active_start = row["time"]
        if not row["ror_active"] and active_start is not None:
            active_periods.append((active_start, row["time"]))
            active_start = None
    if active_start is not None:  # if buff was active till the end
        active_periods.append((active_start, df["time"].iloc[-1]))

    for start, end in active_periods:
        plt.axvspan(start, end, color="red", alpha=0.3, label="Ror Active")

    plt.xlabel("Frame")
    plt.ylabel("Score")
    plt.legend()
    plt.show()