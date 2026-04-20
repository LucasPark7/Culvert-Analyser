import cv2
import numpy as np

# Load a frame from video
video_path = r"C:\Users\Lucas\Desktop\Culvert-Analyser\src\testvideos\lucasproject2.mp4"
#video_path = r"C:\Users\Lucas\Desktop\Culvert-Analyser\src\testvideos\154kCulv.mp4"
cap = cv2.VideoCapture(video_path)
cap.set(cv2.CAP_PROP_POS_FRAMES, (56*60)+2)
ret, frame = cap.read()
cap.release()

#frame = cv2.imread(r"C:\Users\Lucas\Desktop\Culvert-Analyser\src\testvideos\low_res_fatal.png")

cv2.imshow("result", frame)
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

    fatal = cv2.imread(r"C:\Users\Lucas\Desktop\Culvert-Analyser\resources\test_fatal.png")
    mapae = cv2.imread(r"C:\Users\Lucas\Desktop\Culvert-Analyser\resources\mapae_icon.png")
    cont = cv2.imread(r"C:\Users\Lucas\Desktop\Culvert-Analyser\resources\cont_active.png")
    ror = cv2.imread(r"C:\Users\Lucas\Desktop\Culvert-Analyser\resources\ror_active.png")

    scale_up = 3
    sg_up = cv2.resize(roi, (roi.shape[1]*scale_up, roi.shape[0]*scale_up), interpolation=cv2.INTER_CUBIC)
    tg_up = cv2.resize(fatal, (fatal.shape[1]*scale_up, fatal.shape[0]*scale_up), interpolation=cv2.INTER_CUBIC)


    # Convert to grayscale for better template matching
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    grayFatal = cv2.cvtColor(fatal, cv2.COLOR_BGR2GRAY)
    grayMapae = cv2.cvtColor(mapae, cv2.COLOR_BGR2GRAY)
    grayCont = cv2.cvtColor(cont, cv2.COLOR_BGR2GRAY)
    grayRor = cv2.cvtColor(ror, cv2.COLOR_BGR2GRAY)

    if roi.size > 0:
        cv2.imshow("Cropped ROI", gray)

    # Show frame with rectangle
    cv2.imshow("ROI Selector", display_frame)

    # Press 'q' to quit
    if cv2.waitKey(30) & 0xFF == ord("q"):
    
        # template matching
        #resFatal = cv2.matchTemplate(gray, grayFatal, cv2.TM_CCOEFF_NORMED)
        resFatal = cv2.matchTemplate(sg_up, tg_up, cv2.TM_CCOEFF_NORMED)

        resMapae = cv2.matchTemplate(gray, grayMapae, cv2.TM_CCOEFF_NORMED)
        resCont = cv2.matchTemplate(gray, grayCont, cv2.TM_CCOEFF_NORMED)
        resRor = cv2.matchTemplate(gray, grayRor, cv2.TM_CCOEFF_NORMED)

        cv2.imshow("rescont", resFatal)
        cv2.waitKey(0)

        min_val, max_val_fatal, min_loc, max_loc = cv2.minMaxLoc(resFatal)
        min_val, max_val_mapae, min_loc, max_loc = cv2.minMaxLoc(resMapae)
        min_val_cont, max_val_cont, min_loc_cont, max_loc_cont = cv2.minMaxLoc(resCont)
        min_val_ror, max_val_ror, min_loc_ror, max_loc_ror = cv2.minMaxLoc(resRor)

        threshold = 0.75
        cont_thresh = 0.6

        print(max_val_fatal)
        cont_loc = np.where(resCont >= cont_thresh)

        if len(cont_loc[0]) > 1:
            print("Cont detected, confidence:", cont_loc[0])
        else:
            print("Cont not detected")

        if max_val_ror >= threshold:
            top_left = max_loc_ror
            print("Ror detected at:", top_left, "Confidence:", max_val_ror)
        else:
            print("Ror not detected")


        if max_val_fatal >= threshold or max_val_mapae >= threshold:
            top_left = max_loc
            print("Fatal Strike detected at:", top_left, "Confidence:", max_val_fatal, max_val_mapae)
        else:
            print("Fatal Strike not detected")
    

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