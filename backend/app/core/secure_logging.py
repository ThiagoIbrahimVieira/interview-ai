import logging
import re
import hashlib
import secrets


class SecureLogger:
    """Logger that sanitizes sensitive data before output."""

    SENSITIVE_PATTERNS = [
        (re.compile(r'password["\s:=]+\S+', re.IGNORECASE), 'password=***'),
        (re.compile(r'token["\s:=]+\S+', re.IGNORECASE), 'token=***'),
        (re.compile(r'authorization["\s:=]+\S+', re.IGNORECASE), 'authorization=***'),
        (re.compile(r'api[_-]?key["\s:=]+\S+', re.IGNORECASE), 'api_key=***'),
        (re.compile(r'secret["\s:=]+\S+', re.IGNORECASE), 'secret=***'),
        (re.compile(r'cookie["\s:=]+\S+', re.IGNORECASE), 'cookie=***'),
        (re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'), lambda m: _hash_email(m.group())),
    ]

    @staticmethod
    def sanitize(message: str) -> str:
        result = message
        for pattern, replacement in SecureLogger.SENSITIVE_PATTERNS:
            if callable(replacement):
                result = pattern.sub(replacement, result)
            else:
                result = pattern.sub(replacement, result)
        return result

    @staticmethod
    def safe_email(email: str) -> str:
        return _hash_email(email)

    @staticmethod
    def safe_token(token: str) -> str:
        if not token or len(token) < 8:
            return "***"
        return f"{token[:4]}...{token[-4:]}"


def _hash_email(email: str) -> str:
    return hashlib.sha256(email.encode()).hexdigest()[:12] + "@***"


secure_logger = SecureLogger()


def get_secure_logger():
    return secure_logger
