import logging


LOGGER_NAME = "kanbankaii"


def get_application_logger(component: str) -> logging.Logger:
    """Return a visible logger shared by Uvicorn and standalone ARQ workers."""
    root = logging.getLogger(LOGGER_NAME)
    root.setLevel(logging.INFO)
    if not root.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s %(levelname)s %(name)s: %(message)s"
            )
        )
        root.addHandler(handler)
        root.propagate = False
    return logging.getLogger(f"{LOGGER_NAME}.{component}")
