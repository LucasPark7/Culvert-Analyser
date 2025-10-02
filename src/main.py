import tempfile, uuid, json, boto3, os, botocore, logging
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
redis = Redis.from_url(os.environ.get('REDIS_URL'), decode_responses=True)
AWS_ACCESS_KEY = os.environ.get('AWS_ACCESS_KEY')
AWS_SECRET_KEY = os.environ.get('AWS_SECRET_KEY')
AWS_REGION = os.environ.get('AWS_DEFAULT_REGION')
BUCKET_NAME = os.environ.get('BUCKET_NAME')

s3 = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY,
    region_name=AWS_REGION
)

boto3.set_stream_logger(name="botocore", level=logging.DEBUG)

logger = logging.getLogger("uvicorn.error")

logger.info(f"AWS_ACCESS_KEY={os.environ.get('AWS_ACCESS_KEY')}")
logger.info(f"AWS_SECRET_KEY exists={os.environ.get('AWS_SECRET_KEY') is not None}")
logger.info(f"AWS_DEFAULT_REGION={os.environ.get('AWS_DEFAULT_REGION')}")
logger.info(f"BUCKET_NAME={os.environ.get('BUCKET_NAME')}")
# ---------------------------

@app.get("/")
def home():
    return {"status": "ok", "message": "Good Response"}

@app.post("/analyse")
async def anaylse(file: UploadFile = File(...)):
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

        try:
            logger.info(f"Uploading {temp.name} to s3://{BUCKET_NAME}/{job_id}")
            s3.upload_file(temp.name, BUCKET_NAME, f"videos/{job_id}.mp4")
            logger.info("Upload successful")
        except Exception as e:
            logger.error("S3 upload failed", exc_info=True)  # full traceback
            raise HTTPException(status_code=500, detail=f"S3 upload failed: {str(e)}")
        redis.lpush("video_jobs", job_id)
        os.remove(temp.name)

        return {"job_id": job_id, "status": "processing"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/status/{job_id}")
def get_status(job_id: str):
    result = redis.get(f"result:{job_id}")
    if result:
        return {"task_id": job_id, "results": json.loads(result), "status": "complete"}
    return {"task_id": job_id, "status": "processing"}
