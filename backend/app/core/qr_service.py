import uuid


def generate_qr_code() -> str:
    """Generate a unique QR code (UUID as string)."""
    return str(uuid.uuid4())


def validate_qr_code(qr_code: str) -> bool:
    """Validate QR code format (should be UUID)."""
    try:
        uuid.UUID(qr_code)
        return True
    except (ValueError, AttributeError):
        return False

