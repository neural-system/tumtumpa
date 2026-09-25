"""Tipos de mídia aceitos/servidos.

O `Content-Type` de um upload vem do próprio cliente (multipart/JSON), então
nunca pode ser repassado como está: um SVG ou HTML enviado como "logo" ou
"áudio" e servido na mesma origem do app (o front e a API ficam no mesmo
domínio, ver vercel.json) executaria script com acesso ao token de login
guardado no navegador. Aqui ficam as listas fechadas — usadas tanto pra
recusar o upload quanto pra sanear o que já está guardado, na hora de servir."""
from __future__ import annotations

IMAGE_TYPES = frozenset({"image/png", "image/jpeg", "image/webp", "image/gif"})
VIDEO_TYPES = frozenset({"video/mp4", "video/webm", "video/ogg", "video/quicktime"})
FALLBACK = "application/octet-stream"


def _base(content_type: str | None) -> str:
    return (content_type or "").split(";", 1)[0].strip().lower()


def is_audio(content_type: str | None) -> bool:
    b = _base(content_type)
    return b.startswith("audio/") and "/" in b and b.count("/") == 1 and " " not in b


def is_image(content_type: str | None) -> bool:
    return _base(content_type) in IMAGE_TYPES


def is_video(content_type: str | None) -> bool:
    return _base(content_type) in VIDEO_TYPES


def safe_media_type(content_type: str | None) -> str:
    """Tipo seguro pra devolver ao navegador: só áudio, vídeo e imagem raster
    conhecidos; qualquer outra coisa (svg, html, xml, js…) vira binário
    genérico, que o navegador baixa em vez de executar."""
    if is_audio(content_type) or is_image(content_type) or is_video(content_type):
        return _base(content_type)
    return FALLBACK
