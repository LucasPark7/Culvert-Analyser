import tempfile, uuid, json, boto3, os
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path
from itertools import groupby
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from threading import Event
from redis import Redis

# --------- CONFIG ---------
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://lucaspark7.github.io"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
redis = Redis.from_url(os.getenv("REDIS_URL"), decode_responses=True)

AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
BUCKET_NAME = os.getenv("BUCKET_NAME")

s3 = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY,
    region_name=AWS_REGION
)
# ---------------------------

@app.get("/")
def home():
    return {"status": "ok", "message": "Good Response"}

@app.post("/analyse")
async def anaylse(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    # reset global vars
    job_id = str(uuid.uuid4())

    if not file.filename.endswith(".mp4"):
        raise HTTPException(status_code=400, detail="Only .mp4 files supported")

    try:
        # Save the uploaded file to a temporary file
        temp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
        temp.write(await file.read())
        temp.close()

        #df = compare_videos(video1, video2)

        '''
        reader_thread = threading.Thread(target=extract_frames, args=(temp.name,))
        analyzer_thread = threading.Thread(target=process_video)

        reader_thread.start()
        analyzer_thread.start()

        reader_thread.join()
        analyzer_thread.join()
        '''

        s3.upload_file(temp.name, BUCKET_NAME)
        job = {"job_id": job_id, "s3_key": f"{temp.name}"}
        redis.lpush("video_jobs", json.dumps(job))

        return {"job_id": job_id, "status": "processing"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


    '''
    # code to test 1 video
    series1 = values
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
    '''
    
@app.get("/status/{job_id}")
def get_status(job_id: str):
    result = redis.get(f"result:{job_id}")
    if result:
        return {"task_id": job_id, "result": json.loads(result)}
    return {"task_id": job_id, "status": "processing"}
