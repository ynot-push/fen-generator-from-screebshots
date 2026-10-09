from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import torch
from torchvision import transforms

from services.real_crops import crop_window
from services.Board_model import BoardDetectorCNN
from services.checker_snap import refine_checker
from services.square_model import SquareNet
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

detector = BoardDetectorCNN(pretrained=False)
device= torch.device("cuda" if torch.cuda.is_available() else "cpu")
checkpoint = torch.load(
    "models/mobilenet_v3_large_best.pt",
    map_location=device,
    weights_only=True,
)
detector.load_state_dict(checkpoint["model"])
detector.to(device)
detector.eval()
print(f"Using device: {device}")
print("the detector is loaded and ready to use")

transform = transforms.Compose([
    transforms.ToPILImage(),
    transforms.Resize((256, 448)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])

piece_classifier = SquareNet()
piece_checkpoint = torch.load(
    "models/piece_classifier_final.pt",
    map_location=device,
    weights_only=True,
)

piece_classifier.load_state_dict(piece_checkpoint["model"])
piece_classifier.to(device)
piece_classifier.eval()
print("the piece classifier is loaded and ready to use")

def sqaure_crop(img,box,row,col,out=64):
   x0, y0, x1, y1 = box
   square_w = (x1 - x0) / 8.0
   square_h = (y1 - y0) / 8.0
   s_X0=int(round(x0 + col * square_w))
   s_Y0=int(round(y0 + row * square_h))
   s_X1=int(round(x0 + (col + 1) * square_w))
   s_Y1=int(round(y0 + (row + 1) * square_h))   

   crop=img[s_Y0:s_Y1, s_X0:s_X1]

   return cv2.resize(crop, (out, out), interpolation=cv2.INTER_AREA)
CODES = [
    "wK", "wQ", "wR", "wB", "wN", "wP",
    "bK", "bQ", "bR", "bB", "bN", "bP"
]
classes = sorted(["empty"] + CODES)
CLASS_TO_FEN = {
    "empty": "",
    "bB": "b",
    "bK": "k",
    "bN": "n",
    "bP": "p",
    "bQ": "q",
    "bR": "r",
    "wB": "B",
    "wK": "K",
    "wN": "N",
    "wP": "P",
    "wQ": "Q",
    "wR": "R",
}
def predictions_to_fen(predictions):
    rows = []

    for row in range(8):
        fen_row = ""
        empty = 0

        for col in range(8):
            prediction = predictions[row * 8 + col]

            class_name = classes[prediction["class_id"]]

            piece = CLASS_TO_FEN[class_name]

            if piece == "":
                empty += 1
            else:
                if empty:
                    fen_row += str(empty)
                    empty = 0

                fen_row += piece

        if empty:
            fen_row += str(empty)

        rows.append(fen_row)

    return "/".join(rows)

@app.post("/")
def root():
        return{
                "status": "ok",
                "message": "FEN Extractor API is running"
        }

@app.post("/extract_fen")
async def extract_fen(image: UploadFile = File(...)):
        if not image.content_type or not image.content_type.startswith("image/"):
                raise HTTPException(status_code=400, detail="Invalid image file")
        data = await image.read()
        array = np.frombuffer(data, np.uint8)
        img = cv2.imdecode(array, cv2.IMREAD_COLOR)

        if img is None:
                raise HTTPException(status_code=400, detail="Failed to decode image")

        rgb = cv2.cvtColor(img,cv2.COLOR_BGR2RGB)
        tensor = transform(rgb).unsqueeze(0).to(device)

        with torch.inference_mode():
                flag_logits, box_logits = detector(tensor)
                board_confidence = torch.sigmoid(flag_logits).item()
                box=box_logits[0].cpu().numpy()

        height, width = img.shape[:2]
        x1, y1, x2, y2 = box
        x1 *= width
        x2 *= width
        y1 *= height
        y2 *= height

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        refined_box, checker_score = refine_checker(gray,[x1, y1, x2, y2])

        squares=[]
        predictions = []
        for row in range(8):
            for col in range(8):
                square_crop_img = sqaure_crop(gray, refined_box, row, col)
                squares.append(square_crop_img)
                crop_tensor = torch.from_numpy(square_crop_img).float() / 255.0
                crop_tensor = (crop_tensor - 0.5) / 0.5
                crop_tensor = crop_tensor.to(device)
                crop_tensor=crop_tensor.unsqueeze(0).unsqueeze(0)
                crop_tensor = crop_tensor.to(device)

                with torch.inference_mode():
                    output=piece_classifier(crop_tensor)
                    probs = torch.softmax(output, dim=1)
                    confidence, class_id = torch.max(probs, dim=1)
                    predictions.append({
                    "row": row,
                    "col": col,
                    "class_id": class_id.item(),
                    "confidence": confidence.item(),
                })
                print(f"row={row}, col={col}, class_id={class_id.item()}, confidence={confidence.item():.4f}")   
                                        
           
        fen = predictions_to_fen(predictions)

        print(f"FEN: {fen}")
        return {
            "board_confidence": board_confidence,
            "board_box": [
                float(x1),
                float(y1),
                float(x2),
                float(y2),
            ],
             "refined_box": [
                float(v)
                for v in refined_box
            ],

             "checker_score": float(checker_score),
             "fen":fen,
             "predictions": predictions,
        }        


