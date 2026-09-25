import pytest

from utils.media_types import is_audio, is_image, is_video, safe_media_type


@pytest.mark.parametrize("ct,expected", [
    ("audio/mpeg", "audio/mpeg"),
    ("audio/wav; charset=binary", "audio/wav"),
    ("image/png", "image/png"),
    ("IMAGE/JPEG", "image/jpeg"),
    ("video/mp4", "video/mp4"),
    ("image/svg+xml", "application/octet-stream"),   # SVG executa script na origem do app
    ("text/html", "application/octet-stream"),
    ("application/javascript", "application/octet-stream"),
    ("audio/x y", "application/octet-stream"),
    ("", "application/octet-stream"),
    (None, "application/octet-stream"),
])
def test_safe_media_type(ct, expected):
    assert safe_media_type(ct) == expected


def test_predicates():
    assert is_audio("audio/ogg") and not is_audio("video/ogg")
    assert is_image("image/webp") and not is_image("image/svg+xml")
    assert is_video("video/webm") and not is_video("video/x-msvideo")
