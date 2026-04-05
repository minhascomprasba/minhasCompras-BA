from __future__ import annotations

import logging
from pathlib import Path


def setup_logger(log_file: str = "logs/phase1.log", logger_name: str = "phase1") -> logging.Logger:
    logger = logging.getLogger(logger_name)
    if logger.handlers:
        return logger

    Path(log_file).parent.mkdir(parents=True, exist_ok=True)

    logger.setLevel(logging.INFO)
    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")

    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(formatter)

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(stream_handler)
    logger.propagate = False
    return logger
