import sys


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python manage.py runserver")
        return 1

    command = sys.argv[1].lower()
    if command not in {"runserver", "runsserver"}:
        print(f"Unknown command: {sys.argv[1]}")
        print("Supported commands: runserver")
        return 1

    if sys.version_info >= (3, 14):
        print(
            "This backend requires Python 3.11, 3.12, or 3.13. "
            f"Python {sys.version_info.major}.{sys.version_info.minor} is not supported by the TensorFlow setup in this project."
        )
        return 1

    try:
        import uvicorn
    except ImportError:
        print(
            "uvicorn is not installed. Activate your backend virtual environment and run "
            "`python -m pip install -r requirements.txt` inside `server/`."
        )
        return 1

    host = "127.0.0.1"
    port = 8000

    if len(sys.argv) >= 3:
        target = sys.argv[2]
        if ":" in target:
            host_part, port_part = target.rsplit(":", 1)
            host = host_part or host
            try:
                port = int(port_part)
            except ValueError:
                print(f"Invalid port: {port_part}")
                return 1
        else:
            try:
                port = int(target)
            except ValueError:
                print(f"Invalid host/port value: {target}")
                return 1

    uvicorn.run("app:app", host=host, port=port, reload=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
