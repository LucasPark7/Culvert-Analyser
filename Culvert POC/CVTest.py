import cv2

img = cv2.imread(r"C:\Users\Lucas\Desktop\Culvert POC\TestPic.png")  # any image you have

cv2.imshow("Test", img)
cv2.waitKey(0)
cv2.destroyAllWindows()
