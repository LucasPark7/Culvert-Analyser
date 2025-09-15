import cv2
import pytesseract
import re

# Load a frame from video
video_path = r"C:\Users\Lucas\Desktop\Culvert-Analyser\Culvert POC\TestVid1.mp4"
cap = cv2.VideoCapture(video_path)
cap.set(cv2.CAP_PROP_POS_FRAMES, (2*60)+2)
ret, frame = cap.read()
cap.release()

if not ret:
    raise Exception("Could not read frame from video")

# Window for display
cv2.namedWindow("ROI Selector")

# Initial ROI values (x, y, w, h)
h_frame, w_frame, _ = frame.shape
init_x, init_y, init_w, init_h = 1000, 70, 130, 30

# Trackbar callback (does nothing, just needed)
def nothing(val):
    pass

# Create trackbars
cv2.createTrackbar("X", "ROI Selector", init_x, w_frame, nothing)
cv2.createTrackbar("Y", "ROI Selector", init_y, h_frame, nothing)
cv2.createTrackbar("W", "ROI Selector", init_w, w_frame, nothing)
cv2.createTrackbar("H", "ROI Selector", init_h, h_frame, nothing)

while True:
    # Get values from trackbars
    x = cv2.getTrackbarPos("X", "ROI Selector")
    y = cv2.getTrackbarPos("Y", "ROI Selector")
    w = cv2.getTrackbarPos("W", "ROI Selector")
    h = cv2.getTrackbarPos("H", "ROI Selector")

    # Make a copy of the frame to draw on
    display_frame = frame.copy()

    # Draw rectangle ROI
    cv2.rectangle(display_frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

    # Show cropped ROI in a separate window
    roi = frame[y:y+h, x:x+w]
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 94, 255, cv2.THRESH_BINARY)

    if roi.size > 0:
        cv2.imshow("Cropped ROI", thresh)

    # Show frame with rectangle
    cv2.imshow("ROI Selector", display_frame)

    # Press 'q' to quit
    if cv2.waitKey(30) & 0xFF == ord("q"):
        # Convert to grayscale for better OCR
        #gray = cv2.cvtColor(display_frame, cv2.COLOR_BGR2GRAY)
        #_, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)

        text = pytesseract.image_to_string(thresh, config="--psm 6 digits")
        match = re.search(r"\d+", text)
        print(int(match.group())) if match else None

        print(f"Final ROI: (x={x}, y={y}, w={w}, h={h})")
        break

cv2.destroyAllWindows()
