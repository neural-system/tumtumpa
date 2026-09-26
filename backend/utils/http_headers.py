"""Cabeçalhos HTTP montados a partir de texto de usuário."""
from __future__ import annotations

import re
import unicodedata
from urllib.parse import quote


def attachment_disposition(name: str, ext: str = ".txt") -> str:
    """`Content-Disposition: attachment` seguro pra um título vindo do usuário.

    Aspas, barras invertidas e quebras de linha no título quebrariam (ou
    injetariam) o cabeçalho; por isso o `filename=` leva só uma versão ASCII
    limpa e o nome real (com acentos) vai em `filename*` (RFC 5987)."""
    clean = re.sub(r'[\x00-\x1f\x7f"\/:*?<>|]+', " ", name or "").strip() or "cifra"
    clean = clean[:120]
    ascii_name = unicodedata.normalize("NFKD", clean).encode("ascii", "ignore").decode("ascii").strip() or "cifra"
    return f'attachment; filename="{ascii_name}{ext}"; filename*=UTF-8\'\'{quote(clean + ext)}'
