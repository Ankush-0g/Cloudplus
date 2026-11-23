# CloudPulse — Cloud Server Health Monitor Simulator

[![Python](https://img.shields.io/badge/Python-3.x-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.x-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![HTML5](https://img.shields.io/badge/HTML5-Plain-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-Responsive%20UI-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla%20ES6+-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Matplotlib](https://img.shields.io/badge/Matplotlib-CLI%20Charts-11557C?logo=plotly&logoColor=white)](https://matplotlib.org/)

A cloud server health monitoring simulator built with **Python** and **Flask** on the backend, paired with a zero-dependency **HTML, CSS, and JavaScript** frontend. By default, it simulates CPU utilization across **3 servers** over **24 time steps**, flags readings at or above an **80% threshold**, supports load pattern presets and manual spike injection, and renders live telemetry in an interactive light/dark dashboard—alongside an optional **Matplotlib** CLI chart.

---

## Tech Stack

| Layer | Technology | Role in CloudPulse |
| :--- | :--- | :--- |
| **Backend API** | **Python & Flask** | Serves static frontend files and exposes JSON REST endpoints (`/api/*`) |
| **Simulation Engine** | **Python (`random` + OOP)** | Generates server CPU time series, load patterns, spike overrides, and threshold alerts |
| **Frontend UI** | **HTML5, CSS3, Vanilla JS** | Renders controls, KPIs, SVG telemetry chart, server cards, alert log, and theme toggle (no build tools or CDN) |
| **CLI Visualization** | **Matplotlib** | Optional standalone script (`plot_cli.py`) for plotting simulation runs locally |

---

## Quick Start (Local)

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate     macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python app.py
