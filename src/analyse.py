import cv2, pytesseract, re, math, threading, queue, os, time, json, boto3, tempfile, logging, sys, shutil, glob
import pandas as pd
import matplotlib.pyplot as plt
from itertools import groupby
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from threading import Event
from redis import Redis
from concurrent.futures import ThreadPoolExecutor

redis = Redis.from_url(os.environ.get("REDIS_URL"), decode_responses=True)

AWS_ACCESS_KEY = os.environ.get("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.environ.get("AWS_SECRET_KEY")
AWS_REGION = os.environ.get("AWS_DEFAULT_REGION", "us-west-2")
BUCKET_NAME = os.environ.get("BUCKET_NAME")

# initialize boto3 client for aws
s3 = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY,
    region_name=AWS_REGION
)

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)
logger.info("Worker started and waiting for jobs...")

FRAME_STEP = 60  # process every 60th frame (1s at 60fps), possible user option later

def process_video(file_path, resolution, job_id):
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

    def extract_info_from_frame(frame, roi):
        full_frame = frame
        if roi:
            x, y, w, h = roi
            frame = frame[y:y+h, x:x+w]

        # convert to grayscale for better OCR
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # thresholds for comparison
        thresholds = [108, 94, 80, 116, 72]

        # read each threshold with pytesseract
        def process_threshold(threshold_value):
            _, thresh = cv2.threshold(gray, threshold_value, 255, cv2.THRESH_BINARY)
            return pytesseract.image_to_string(thresh, config="--psm 6 digits")
        
        # multithread for efficiency
        with ThreadPoolExecutor(max_workers=5) as executor:
            results = list(executor.map(process_threshold, thresholds))

        text1, text2, text3, text4, text5 = results

        # scan for fatal strike using template matching
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

        # free temp files after each OCR cycle
        for file in glob.glob("/tmp/*.png)"):
            try:
                os.remove(file)
            except:
                pass

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
    def process_frames(roi):
        while not pause_queue.is_set() or not frame_queue.empty():
            try:
                frame = frame_queue.get(timeout=1)
                result = extract_info_from_frame(frame, roi)

                OCRList = result[0]
                logging.info(f"TESSERACT RESULT: {result}")
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
                # update redis with values for live results
                redis.set(f"result:{job_id}", json.dumps(values))
            except queue.Empty:
                continue
    
    def process(video_path, roi):

        reader_thread = threading.Thread(target=extract_frames, args=(video_path,))
        analyzer_thread = threading.Thread(target=process_frames, args=((roi),))

        reader_thread.start()
        analyzer_thread.start()

        reader_thread.join()
        analyzer_thread.join()

    # get ROI from resolution selected
    ROI_dict = {
        "1920x1080" : (995, 85, 150, 50),
        "1366x768" : (1020, 95, 180, 47),
        "1280x720" : (1025, 105, 190, 50),
        "1024x768" : (1038, 97, 240, 47)
    }

    roi = ROI_dict[resolution]
    
    values = []
    frame_queue = queue.Queue()
    lock = threading.Lock()
    pause_queue = Event()

    process(file_path, roi)
    
    return values

if __name__ == "__main__":
    while True:
        try:
            job_data = redis.brpop("video_jobs")
            if job_data:
                _, job_json = job_data
                job = json.loads(job_json)
                job_id = job["job_id"]
                job_reso = job["resolution"]
                logger.info(f"Job Found: {job_id}")
                redis.set(f"status:{job_id}", "processing")

                with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp:
                    logger.info(f"Downloading from bucket={BUCKET_NAME}, key={job_id}")
                    s3.download_file(BUCKET_NAME, f"videos/{job_id}.mp4", temp.name)
                    temp_path = temp.name

                result = process_video(temp_path, job_reso, job_id)

                # save result
                logger.info(f"JOB COMPLETED")
                redis.set(f"result:{job_id}", json.dumps(result))
                redis.set(f"status:{job_id}", "complete")

            else:
                time.sleep(1)
        except Exception as e:
            logger.info("Worker loop crashed: %s", e)
