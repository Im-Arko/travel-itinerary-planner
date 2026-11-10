from datetime import datetime, timezone


def utcnow():
    """Naive UTC for the existing timestamp-without-time-zone database columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
