# Poultry Disease Classifier

Classifies poultry images into: **healthy**, **ncd**, **cocci**, **salmo**.

## Project structure

```
S8/
├── server/     # Python FastAPI backend + ML model
├── client/     # React frontend
└── README.md
```

## Setup

### Backend (server)

Use **Python 3.11, 3.12, or 3.13** for the backend. On Windows, this project runs with
the CPU build of TensorFlow.

```bash
cd server
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

If your default `python` is 3.13, you can use it directly. For example:

```bash
python -m venv .venv
```

**Train the model** (run once; takes ~20-40 min):

```bash
cd server
py train.py
```

### Frontend (client)

```bash
cd client
npm install
```

## Run

1. **Start the backend** (from `S8` folder):

   ```bash
   cd server
   py -m uvicorn app:app --reload --port 8000
   ```

2. **Start the frontend** (new terminal):

   ```bash
   cd client
   npm run dev
   ```

3. Open **http://localhost:5173** in your browser.

## API

- `GET /` - API info
- `GET /status` - Model status and classes
- `POST /predict` - Upload image (form field `file`), returns disease + confidence + probabilities
