import cv2

# Load a frame from video
video_path = r"C:\Users\Lucas\Desktop\Culvert-Analyser\src\103kCulv.mp4"
cap = cv2.VideoCapture(video_path)
cap.set(cv2.CAP_PROP_POS_FRAMES, (105*60)+2)
ret, frame = cap.read()
cap.release()

if not ret:
    raise Exception("Could not read frame from video")

# Window for display
cv2.namedWindow("ROI Selector")

# Initial ROI values (x, y, w, h)
h_frame, w_frame, _ = frame.shape
init_x, init_y, init_w, init_h = 1265, 35, 900, 225

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
    #roi = cv2.resize(roi, (720, 240))
    fatal = cv2.imread(r"C:\Users\Lucas\Desktop\Culvert-Analyser\resources\FatalStrikeIcon.png")

    # Convert to grayscale for better template matching
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    grayFatal = cv2.cvtColor(fatal, cv2.COLOR_BGR2GRAY)

    if roi.size > 0:
        cv2.imshow("Cropped ROI", gray)

    # Show frame with rectangle
    cv2.imshow("ROI Selector", display_frame)

    # Press 'q' to quit
    if cv2.waitKey(30) & 0xFF == ord("q"):
        
        # template matching
        res = cv2.matchTemplate(gray, grayFatal, cv2.TM_CCOEFF_NORMED)
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)

        threshold = 0.75
        print(max_val)
        if max_val >= threshold:
            top_left = max_loc
            bottom_right = (top_left[0] + w, top_left[1] + h)
            cv2.rectangle(frame, top_left, bottom_right, (0, 255, 0), 2)
            print("Fatal Strike detected at:", top_left, "Confidence:", max_val)
        else:
            print("Fatal Strike not detected")

        print(f"Final ROI: (x={x}, y={y}, w={w}, h={h})")
        break

cv2.destroyAllWindows()
