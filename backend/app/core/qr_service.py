import secrets
import string


def generate_qr_code() -> str:
    """
    Generate a unique 6-character alphanumeric QR code.
    
    Uses uppercase letters and digits for:
    - Easy to read/type if needed
    - 36^6 = 2.17 billion combinations (very low collision risk)
    - Much smaller QR code = faster scanning
    """
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(6))


def validate_qr_code(qr_code: str) -> bool:
    """
    Validate QR code format.
    Accepts both:
    - New format: 6-char alphanumeric (e.g., 'A7B3X9')
    - Legacy format: UUID (e.g., '550e8400-e29b-41d4-a716-446655440000')
    """
    if not qr_code or not isinstance(qr_code, str):
        return False
    
    # New short code format: exactly 6 alphanumeric uppercase chars
    if len(qr_code) == 6 and qr_code.isalnum() and qr_code.isupper():
        return True
    
    # Legacy UUID format (for existing orders)
    try:
        import uuid
        uuid.UUID(qr_code)
        return True
    except (ValueError, AttributeError):
        return False
