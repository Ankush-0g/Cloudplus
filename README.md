# CloudPulse: Cloud Server Health Monitor Simulator

Python (Flask + random) backend, plain HTML/CSS/JS frontend (no build tools, no CDN).

## Run
```
cd backend
python -m venv venv
# Windows: venv\Scripts\activate     macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python app.py
```
Open http://127.0.0.1:5000

## Deploy on Render
1. Push this repository to GitHub.
2. In Render, choose **New +** → **Blueprint** and connect the GitHub repository.
3. Render will read `render.yaml`, install the backend dependencies, and start the Flask app with Gunicorn.
4. Open the generated `onrender.com` URL. The `/api/state` health check confirms the service is responding.

The simulation runs in memory, so its state resets when the Render service restarts. It does not require a database or environment secrets.

## Optional: original Matplotlib version
```
cd backend
python plot_cli.py
```

## Structure
- backend/simulator.py  random CPU data, patterns, threshold alarms
- backend/app.py        Flask API (/api/state, /api/config, /api/tick, /api/spike/<id>, /api/reset)
- backend/plot_cli.py   Matplotlib version of the same simulation
- frontend/             responsive dashboard with persistent light/dark themes, simulation controls, telemetry chart, and alert history
