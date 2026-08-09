import cv2
import numpy as np

# Load a frame from video
video_path = r"C:\Users\Lucas\Desktop\Culvert-Analyser\src\testvideos\wjtest.mp4"
cap = cv2.VideoCapture(video_path)
cap.set(cv2.CAP_PROP_POS_FRAMES, (92*60)+2)
ret, frame = cap.read()
cap.release()

cv2.imshow("result", cv2.Canny(frame, 10, 150))
cv2.waitKey(0)

if not ret:
    raise Exception("Could not read frame from video")

# Window for display
cv2.namedWindow("ROI Selector")

# Initial ROI values (x, y, w, h)
h_frame, w_frame, _ = frame.shape
init_x, init_y, init_w, init_h = 0, 0, 1920, 1080
#init_x, init_y, init_w, init_h = 995, 85, 150, 50

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

    resources = [cv2.imread(r"C:\Users\Lucas\Desktop\Culvert-Analyser\resources\test_fatal.png"),
                 cv2.imread(r"C:\Users\Lucas\Desktop\Culvert-Analyser\resources\mapae_icon.png"),
                 cv2.imread(r"C:\Users\Lucas\Desktop\Culvert-Analyser\resources\cont_active.png"),
                 cv2.imread(r"C:\Users\Lucas\Desktop\Culvert-Analyser\resources\ror_active.png"),
                 cv2.imread(r"C:\Users\Lucas\Desktop\Culvert-Analyser\resources\wj_active.png"),
                 cv2.imread(r"C:\Users\Lucas\Desktop\Culvert-Analyser\resources\risk_active.png"),
                 cv2.imread(r"C:\Users\Lucas\Desktop\Culvert-Analyser\resources\total_active.png")]


    # Convert to grayscale for better template matching
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)

    grayResources = []
    for resource in resources:
        grayResources.append(cv2.cvtColor(resource, cv2.COLOR_BGR2GRAY))

    if roi.size > 0:
        cv2.imshow("Cropped ROI", gray)

    # Show frame with rectangle
    cv2.imshow("ROI Selector", display_frame)

    # Press 'q' to quit
    if cv2.waitKey(30) & 0xFF == ord("q"):
    
        # template matching
        threshold = 0.75
        cont_thresh = 0.6

        for i in range(len(grayResources)):
            templateRes = cv2.matchTemplate(gray, grayResources[i], cv2.TM_CCOEFF_NORMED)
            _, max_val, min_loc, max_loc = cv2.minMaxLoc(templateRes)
            print(max_val)
            # always check for fatal/mapae
            if i == 0 or i == 1:
                if max_val >= threshold:
                    print("Special Node detected, confidence:", max_val)
            # look for oz rings
            match i:
                case 2:
                    cont_loc = np.where(templateRes >= cont_thresh)
                    if len(cont_loc[0]) > 1:
                        print("Cont detected, confidence:", max_val)
                case 3:
                    cv2.imshow("ror", templateRes)
                    cv2.waitKey(0)
                    if max_val >= threshold:
                        print("Ror detected, confidence:", max_val, min_loc)
                case 4 | 5 | 6:
                    if max_val >= threshold:
                        print("Extra Ring detected, confidence:", max_val)
    

        print(f"Final ROI: (x={x}, y={y}, w={w}, h={h})")
        break

cv2.destroyAllWindows()

# --------------------------------
# Planning on testing an AI upscaler to detect fatal/oz
# Outsource or train own model as new project
#
# Testing Results:
# - template matching algorithms need more work
# - seemingly impossible to find oz rings when capturing full screen
# - possible options:
#   - force users to take oz rings off buff favourites
#       - can capture top right buffs
#       - kind of a hassle
#   - find a way to properly detect oz rings off full screen
#       - maybe AI?
# --------------------------------