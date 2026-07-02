from cryptography.fernet import Fernet, InvalidToken

from app.integrations.slack.config import SlackConfigurationError


class TokenEncryptionError(RuntimeError):
    """Raised when an integration token cannot be encrypted or decrypted."""


class TokenCipher:
    def __init__(self, encryption_key: str) -> None:
        try:
            self.fernet = Fernet(encryption_key.encode("utf-8"))
        except (TypeError, ValueError) as error:
            raise SlackConfigurationError(
                "INTEGRATION_ENCRYPTION_KEY must be a valid Fernet key"
            ) from error

    def encrypt(self, token: str) -> str:
        if not token:
            raise TokenEncryptionError("Cannot encrypt an empty integration token")
        return self.fernet.encrypt(token.encode("utf-8")).decode("utf-8")

    def decrypt(self, ciphertext: str) -> str:
        try:
            return self.fernet.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
        except (InvalidToken, ValueError) as error:
            raise TokenEncryptionError("Integration token could not be decrypted") from error
