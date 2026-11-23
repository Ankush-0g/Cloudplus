"""Simulation engine: random CPU readings + threshold alarms (no web code here)."""
import random

BASE = 38
MAX_SERVERS = 5
PATTERNS = {
    "normal": "Normal traffic",
    "leak": "Memory leak (slow climb)",
    "spike": "Sudden spike",
    "burst": "Random bursts",
}


def clamp(v):
    return max(5.0, min(99.0, v))


class Simulation:
    def __init__(self):
        self.configure()

    def configure(self, servers=3, steps=24, threshold=80, patterns=None):
        self.servers = max(2, min(MAX_SERVERS, int(servers)))
        self.steps = max(12, min(48, int(steps)))
        self.threshold = max(50, min(95, int(threshold)))
        pats = [p if p in PATTERNS else "normal" for p in (patterns or [])][: self.servers]
        self.patterns = pats + ["normal"] * (self.servers - len(pats))
        self.data = [[] for _ in range(self.servers)]
        self.alerts = []
        self.forced = [0] * self.servers  # remaining "injected spike" ticks per server
        self.step = 0

    # ---- data generation (uses the random module) ----
    def _next_value(self, k, i):
        if self.forced[k] > 0:
            self.forced[k] -= 1
            return random.uniform(90, 97)
        pattern = self.patterns[k]
        noise = (random.random() - 0.5) * 10
        prev = self.data[k][-1] if self.data[k] else BASE
        if pattern == "normal":
            return BASE + noise + (i % 3) * 2
        if pattern == "leak":
            return prev + 1.4 + random.random() * 2.2
        if pattern == "spike":
            start = int(self.steps * 0.4) + k * 2
            return random.uniform(90, 97) if start <= i < start + 5 else BASE + noise
        burst = random.uniform(35, 60) if random.random() < 0.18 else 0  # "burst"
        return BASE + noise + burst

    # ---- one simulation step + alarm detection ----
    def tick(self):
        if self.finished:
            return
        for k in range(self.servers):
            v = round(clamp(self._next_value(k, self.step)), 1)
            self.data[k].append(v)
            if v >= self.threshold:
                self.alerts.append({"step": self.step + 1, "server": k, "value": v})
        self.step += 1

    def inject_spike(self, k):
        if 0 <= k < self.servers and not self.finished:
            self.forced[k] = 4

    @property
    def finished(self):
        return self.step >= self.steps

    def state(self):
        n = self.servers
        last = [d[-1] if d else None for d in self.data]
        critical = [v is not None and v >= self.threshold for v in last]
        values = [v for d in self.data for v in d]
        counts = [sum(1 for a in self.alerts if a["server"] == k) for k in range(n)]
        return {
            "config": {"servers": n, "steps": self.steps, "threshold": self.threshold,
                       "patterns": self.patterns},
            "step": self.step,
            "finished": self.finished,
            "data": self.data,
            "critical": critical,
            "alerts": self.alerts,
            "summary": {
                "average": round(sum(values) / len(values), 1) if values else 0,
                "peak": max(values) if values else 0,
                "active_alarms": sum(critical),
                "total_alerts": len(self.alerts),
                "most_affected": max(range(n), key=lambda k: counts[k]) if any(counts) else None,
            },
        }
