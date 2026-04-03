import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from sqlalchemy import String
from sqlalchemy.types import TypeDecorator

from config import get_settings

_NONCE_SIZE = 12  # GCM standard nonce size in bytes


class EncryptedString(TypeDecorator):
    """AES-256-GCM 컬럼 레벨 암호화 TypeDecorator.

    저장 형식: base64(nonce[12] + ciphertext)
    """

    impl = String(512)
    cache_ok = True

    def _get_key(self) -> bytes:
        settings = get_settings()
        return base64.b64decode(settings.ENCRYPTION_KEY)

    def process_bind_param(self, value: str | None, dialect) -> str | None:  # type: ignore[override]
        if value is None:
            return None
        key = self._get_key()
        aesgcm = AESGCM(key)
        nonce = os.urandom(_NONCE_SIZE)
        ciphertext = aesgcm.encrypt(nonce, value.encode("utf-8"), None)
        return base64.b64encode(nonce + ciphertext).decode("ascii")

    def process_result_value(self, value: str | None, dialect) -> str | None:  # type: ignore[override]
        if value is None:
            return None
        raw = base64.b64decode(value)
        nonce = raw[:_NONCE_SIZE]
        ciphertext = raw[_NONCE_SIZE:]
        key = self._get_key()
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ciphertext, None).decode("utf-8")
