# FEN Generator from Screenshots

A browser-based chess utility that turns a screenshot of a chessboard into a FEN string using computer vision and a lightweight ML pipeline.

This project combines a React + Vite frontend with a FastAPI backend that detects the board, identifies pieces, and converts the board state into Standard FEN notation.

## What it does

- Upload, drag-and-drop, or paste a chessboard screenshot
- Detect the board region automatically
- Classify each square and infer the position
- Generate a FEN string for the board state
- Visualize the resulting board in the app
- Adjust turn and castling metadata before using the output

## Tech stack

- Frontend: React, Vite, CSS
- Backend: Python, FastAPI
- ML / CV: OpenCV, PyTorch, TorchVision
- Model assets: pretrained board detector and piece classifier weights

## Repository structure

```text
.
├── backend/
│   ├── main.py
│   ├── models/
│   │   ├── mobilenet_v3_large_best.pt
│   │   └── piece_classifier_final.pt
│   ├── services/
│   │   ├── Board_model.py
│   │   ├── checker_snap.py
│   │   ├── real_crops.py
│   │   └── square_model.py
│   └── requirement.txt
├── src/
│   ├── App.jsx
│   ├── App.css
│   ├── header.jsx
│   ├── result_board.jsx
│   ├── sidebar.jsx
│   └── ...
├── index.html
├── package.json
├── vite.config.js
├── eslint.config.js
└── README.md
```

## Features

### Screenshot to FEN

The app accepts an image of a chessboard and sends it to the backend API at `/extract_fen`.

The backend:

1. Reads the uploaded image
2. Detects the board within the screenshot
3. Refines the board box using checkerboard detection logic
4. Crops each square
5. Runs piece classification over each square
6. Builds the FEN string from the classified grid

### Frontend experience

- Upload image from disk or paste clipboard image
- Drag-and-drop support
- Preview image before generation
- Loading / status messages
- Immediate display of extracted board and predicted piece layout

## Getting started

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- A GPU is optional; CPU inference works too

### 1) Install frontend dependencies

```bash
npm install
```

### 2) Start the frontend

```bash
npm run dev
```

The app will typically run at:

- http://localhost:5173

### 3) Set up the Python backend

From the project root:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install fastapi uvicorn python-multipart opencv-python numpy torch torchvision
```

If you want to use a requirements file for your environment, this repo already includes `backend/requirement.txt`, but it is currently empty and should be populated if you prefer a pinned environment setup.

### 4) Start the API server

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend exposes:

- `GET /` health check
- `POST /extract_fen` for screenshot-based FEN extraction

## Example workflow

1. Open the Vite frontend in the browser
2. Drop or upload a chess screenshot
3. Click `Generate FEN`
4. Review the detected board position
5. Copy the output FEN for chess tools, analysis boards, or PGN workflows

## Notes

- The board detector and piece classifier model weights are included in `backend/models/`.
- The backend currently allows local frontend origins for development (`http://localhost:5173` and `http://127.0.0.1:5173`).
- This project is aimed at board screenshots and performs best on clear, straight-on images with minimal perspective distortion.

## License

This project does not currently include a license file. If you intend to publish or share it publicly, add an appropriate license such as MIT before distribution.

## Contributing

Contributions are welcome. If you want to improve detection quality, add better preprocessing, or generalize the app to more board types, feel free to open a pull request.

## Acknowledgements

This project uses:

- React + Vite for the frontend
- FastAPI for the backend API
- OpenCV and PyTorch for board analysis and piece recognition
