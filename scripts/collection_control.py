"""Bound collection work without discarding already verified branch checkpoints."""
import subprocess
import threading
import time


class ChainBudget:
    def __init__(self, seconds=900, max_failures=6, clock=time.monotonic):
        self.clock = clock
        self.deadline = clock() + seconds
        self.max_failures = max_failures
        self.failures = 0
        self.reason = None
        self.lock = threading.Lock()

    def allowed(self):
        with self.lock:
            if self.clock() >= self.deadline and not self.reason:
                self.reason = 'Chain time budget reached; remaining branches deferred'
            return self.reason is None

    def record(self, succeeded):
        with self.lock:
            self.failures = 0 if succeeded else self.failures + 1
            if self.failures >= self.max_failures and not self.reason:
                self.reason = 'Source paused after repeated failures; last verified prices retained'


def supervise(process, seconds, publish, interval=300, poll=10):
    """Return a real terminal state, and stop the child before the CI hard timeout."""
    deadline = time.monotonic() + seconds
    next_publish = time.monotonic() + interval
    while process.poll() is None:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=10)
            return 'time_budget'
        try:
            process.wait(timeout=min(poll, remaining))
        except subprocess.TimeoutExpired:
            pass
        if process.poll() is None and time.monotonic() >= next_publish:
            try:
                publish()
            except Exception as exc:
                print('Progress publish deferred:', exc, flush=True)
            next_publish = time.monotonic() + interval
    return 'finished' if process.returncode == 0 else 'failed'
