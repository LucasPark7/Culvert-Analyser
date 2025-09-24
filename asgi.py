import sys
import os
from pathlib import Path

# Make sure project is on sys.path
project_home = str(Path(__file__).resolve().parent)
if project_home not in sys.path:
    sys.path.append(project_home)

from src.main import app
application = app