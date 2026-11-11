import structlog

from app.config import get_settings
from app.consumer import run_consumer


def main() -> None:
    settings = get_settings()
    structlog.configure(
        wrapper_class=structlog.make_filtering_bound_logger(
            {"DEBUG": 10, "INFO": 20, "WARNING": 30, "ERROR": 40}.get(
                settings.log_level.upper(), 20
            )
        ),
    )
    run_consumer(settings)


if __name__ == "__main__":
    main()
