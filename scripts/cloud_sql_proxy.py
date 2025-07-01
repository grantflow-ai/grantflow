"""
Cloud SQL Proxy Manager - Start, stop, and check status of Cloud SQL Proxy
"""

import os
import signal
import subprocess
import sys
import time
from pathlib import Path

INSTANCE_CONNECTION = "grantflow:us-central1:grantflow"
PROXY_PORT = 5432
PROXY_HOST = "127.0.0.1"
PID_FILE = Path("/tmp/cloud-sql-proxy.pid")
LOG_FILE = Path("/tmp/cloud-sql-proxy.log")


def find_proxy_binary() -> str | None:
    """Find Cloud SQL Proxy binary in common locations."""
    locations = [
        str(Path.home() / "bin" / "cloud-sql-proxy"),
        "/usr/local/bin/cloud-sql-proxy",
        "/opt/homebrew/bin/cloud-sql-proxy",
        "cloud-sql-proxy",
    ]

    for loc in locations:
        if Path(loc).exists() or subprocess.run(["which", loc], check=False, capture_output=True).returncode == 0:
            return loc

    return None


def is_proxy_running() -> tuple[bool, int | None]:
    """Check if proxy is running and return (is_running, pid)."""
    if PID_FILE.exists():
        try:
            pid = int(PID_FILE.read_text().strip())

            os.kill(pid, 0)
            return True, pid
        except (ValueError, OSError):
            PID_FILE.unlink(missing_ok=True)

    try:
        result = subprocess.run(
            ["pgrep", "-f", f"cloud-sql-proxy.*{INSTANCE_CONNECTION}"], check=False, capture_output=True, text=True
        )
        if result.returncode == 0:
            pid = int(result.stdout.strip().split("\n")[0])
            return True, pid
    except (ValueError, subprocess.SubprocessError):
        pass

    return False, None


def start_proxy() -> bool:
    """Start the Cloud SQL Proxy."""
    is_running, pid = is_proxy_running()
    if is_running:
        return True

    proxy_path = find_proxy_binary()
    if not proxy_path:
        return False

    with LOG_FILE.open("w") as log:
        process = subprocess.Popen([proxy_path, INSTANCE_CONNECTION], stdout=log, stderr=log, start_new_session=True)

    PID_FILE.write_text(str(process.pid))

    time.sleep(2)

    is_running, pid = is_proxy_running()
    if is_running:
        return True
    if LOG_FILE.exists():
        pass
    return False


def stop_proxy() -> bool:
    """Stop the Cloud SQL Proxy."""
    is_running, pid = is_proxy_running()

    if not is_running:
        return True

    try:
        if pid is not None:
            os.kill(pid, signal.SIGTERM)
            time.sleep(1)

            try:
                os.kill(pid, 0)

                os.kill(pid, signal.SIGKILL)
            except OSError:
                pass

        PID_FILE.unlink(missing_ok=True)
        return True
    except Exception:
        return False


def status_proxy() -> bool:
    """Check and display proxy status."""
    is_running, pid = is_proxy_running()

    if is_running:
        if LOG_FILE.exists():
            result = subprocess.run(["tail", "-3", str(LOG_FILE)], check=False, capture_output=True, text=True)
            if result.stdout:
                pass
        return True
    return False


def restart_proxy() -> bool:
    """Restart the Cloud SQL Proxy."""
    stop_proxy()
    time.sleep(1)
    return start_proxy()


def main() -> None:
    """Main entry point."""
    if len(sys.argv) < 2:
        sys.exit(1)

    command = sys.argv[1].lower()

    commands = {
        "start": start_proxy,
        "stop": stop_proxy,
        "status": status_proxy,
        "restart": restart_proxy,
    }

    if command not in commands:
        sys.exit(1)

    success = commands[command]()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()