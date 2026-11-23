"""Optional: the original Python + Matplotlib version of the project (no web needed)."""
import matplotlib.pyplot as plt
from simulator import Simulation, PATTERNS

names = list(PATTERNS)
print("Patterns:", ", ".join(names))
sim = Simulation()
pats = []
for k in range(3):
    p = input(f"Pattern for Server-{k + 1} [normal]: ").strip() or "normal"
    pats.append(p)
th = int(input("Threshold % [80]: ") or 80)
sim.configure(3, 24, th, pats)
while not sim.finished:
    sim.tick()

for k, d in enumerate(sim.data):
    plt.plot(range(1, 25), d, label=f"Server-{k + 1} ({sim.patterns[k]})")
plt.axhline(sim.threshold, color="red", linestyle="--", label=f"{sim.threshold}% threshold")
plt.scatter([a["step"] for a in sim.alerts], [a["value"] for a in sim.alerts], color="red", zorder=5, label="Alert")
for a in sim.alerts:
    print(f"ALERT: Server-{a['server'] + 1} at step {a['step']}: CPU {a['value']}%")
plt.title("Cloud Server Health Monitor"); plt.xlabel("Time step"); plt.ylabel("CPU usage (%)")
plt.legend(); plt.show()
