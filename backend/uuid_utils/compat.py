# Mock compat.py for uuid_utils
import uuid

def uuid7(*args, **kwargs):
    # Fallback to standard uuid4 if uuid7 is needed but unavailable
    return uuid.uuid4()
