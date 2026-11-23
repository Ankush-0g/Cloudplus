"""Flask backend. Run:  python app.py   then open http://127.0.0.1:5000"""
import os
from flask import Flask, jsonify, request, send_from_directory
from simulator import Simulation, PATTERNS

FRONTEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")
app = Flask(__name__, static_folder=FRONTEND, static_url_path="")
sim = Simulation()


@app.get("/")
def index():
    return send_from_directory(FRONTEND, "index.html")


@app.get("/api/state")
def get_state():
    return jsonify(sim.state())


@app.post("/api/config")
def set_config():
    body = request.get_json(silent=True) or {}
    sim.configure(body.get("servers", 3), body.get("steps", 24),
                  body.get("threshold", 80), body.get("patterns"))
    return jsonify(sim.state())


@app.post("/api/tick")
def tick():
    sim.tick()
    return jsonify(sim.state())


@app.post("/api/spike/<int:server_id>")
def spike(server_id):
    sim.inject_spike(server_id)
    return jsonify(sim.state())


@app.post("/api/reset")
def reset():
    c = sim.state()["config"]
    sim.configure(c["servers"], c["steps"], c["threshold"], c["patterns"])
    return jsonify(sim.state())


@app.get("/api/patterns")
def patterns():
    return jsonify(PATTERNS)


if __name__ == "__main__":
    app.run(debug=True)
