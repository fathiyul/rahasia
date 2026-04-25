import re


USERNAME_MIN_LENGTH = 3
USERNAME_MAX_LENGTH = 30
USERNAME_PATTERN = re.compile(
    rf"^[a-z0-9._]{{{USERNAME_MIN_LENGTH},{USERNAME_MAX_LENGTH}}}$"
)


def normalize_username(username: str) -> str:
    return username.strip().lower()


def is_valid_username(username: str) -> bool:
    normalized = normalize_username(username)
    return bool(USERNAME_PATTERN.fullmatch(normalized))
