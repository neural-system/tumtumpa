"""Validações e erros compartilhados pelos serviços da rede social
(perfis, bandas, agenda, feed, contratações, moderação).

Regra de ouro: tudo que o usuário escreve é TEXTO PURO. Nada de HTML/markdown
interpretado no servidor — o React escapa na hora de mostrar, e aqui só
recusamos caracteres de controle, limitamos tamanhos e validamos URLs/handles."""
from __future__ import annotations

import re
import urllib.parse

# ---------- erros ----------


class SocialError(Exception):
    """Erro de regra de negócio da rede social. `code` vira error_code na API."""

    status = 400

    def __init__(self, message: str, code: str = "SOCIAL_INVALID"):
        super().__init__(message)
        self.code = code


class NotFound(SocialError):
    status = 404

    def __init__(self, message: str = "Não encontrado.", code: str = "SOCIAL_NOT_FOUND"):
        super().__init__(message, code)


class Forbidden(SocialError):
    status = 403

    def __init__(self, message: str = "Você não tem permissão para isso.", code: str = "SOCIAL_FORBIDDEN"):
        super().__init__(message, code)


class Conflict(SocialError):
    status = 409

    def __init__(self, message: str, code: str = "SOCIAL_CONFLICT"):
        super().__init__(message, code)


# ---------- limites ----------

MAX_NAME = 80
MAX_BIO = 1000
MAX_CITY = 80
MAX_POST = 2000
MAX_COMMENT = 600
MAX_TITLE = 120
MAX_DESC = 1500
MAX_LINKS = 8
MAX_CONTACT = 160
MAX_REASON = 40
MAX_NOTE = 500

HANDLE_RE = re.compile(r"^[a-z0-9_]{3,30}$")
# palavras que não podem virar @handle (rotas, marcas, papéis de sistema)
RESERVED_HANDLES = frozenset({
    "admin", "administrador", "root", "suporte", "support", "api", "app", "www", "mural", "comunidade",
    "agenda", "bandas", "perfil", "musicas", "setlists", "login", "cadastro", "planos", "tumtumpa",
    "sistema", "moderacao", "moderador", "null", "undefined", "me", "eu",
})
_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_YT_ID_RE = re.compile(r"^[\w-]{11}$")
_YT_URL_RE = re.compile(
    r"(?:youtube\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/)|youtu\.be/)([\w-]{11})", re.I,
)


def clean_text(value, max_len: int, *, field: str = "texto", required: bool = False, multiline: bool = False) -> str:
    """Normaliza texto de usuário: só str, sem caracteres de controle, aparado
    e limitado. Quebras de linha só se `multiline`."""
    if value is None:
        value = ""
    if not isinstance(value, str):
        raise SocialError(f"Campo inválido: {field}.", "SOCIAL_FIELD_INVALID")
    text = value.replace("\r\n", "\n").replace("\r", "\n")
    text = _CONTROL_RE.sub("", text)
    if not multiline:
        text = re.sub(r"\s+", " ", text)
    text = text.strip()
    if required and not text:
        raise SocialError(f"Preencha o campo: {field}.", "SOCIAL_FIELD_REQUIRED")
    if len(text) > max_len:
        raise SocialError(f"O campo {field} passou de {max_len} caracteres.", "SOCIAL_FIELD_TOO_LONG")
    return text


def clean_url(value, *, field: str = "link", allow_empty: bool = True) -> str:
    """Só http(s), sem credenciais embutidas, com host — bloqueia javascript:,
    data:, file: e afins que virariam XSS num <a href>."""
    text = clean_text(value, 500, field=field)
    if not text:
        if allow_empty:
            return ""
        raise SocialError(f"Preencha o campo: {field}.", "SOCIAL_FIELD_REQUIRED")
    try:
        parsed = urllib.parse.urlparse(text)
        host = parsed.hostname
    except ValueError:
        raise SocialError(f"O {field} não é um endereço válido.", "SOCIAL_URL_INVALID") from None
    if parsed.scheme not in ("http", "https") or not host or "." not in host or parsed.username or parsed.password:
        raise SocialError(f"O {field} precisa começar com http:// ou https://.", "SOCIAL_URL_INVALID")
    return text


def clean_links(values, *, field: str = "links") -> list[str]:
    if values is None:
        return []
    if not isinstance(values, list):
        raise SocialError(f"Campo inválido: {field}.", "SOCIAL_FIELD_INVALID")
    if len(values) > MAX_LINKS:
        raise SocialError(f"No máximo {MAX_LINKS} links.", "SOCIAL_FIELD_TOO_LONG")
    out: list[str] = []
    for v in values:
        url = clean_url(v, field="link")
        if url and url not in out:
            out.append(url)
    return out


def clean_handle(value, *, field: str = "nome de usuário público") -> str:
    if not isinstance(value, str):
        raise SocialError(f"Campo inválido: {field}.", "SOCIAL_FIELD_INVALID")
    handle = value.strip().lower().lstrip("@")
    if not HANDLE_RE.match(handle):
        raise SocialError(
            "O identificador precisa ter de 3 a 30 caracteres: letras minúsculas, números e _.", "SOCIAL_HANDLE_INVALID",
        )
    if handle in RESERVED_HANDLES:
        raise SocialError("Este identificador é reservado.", "SOCIAL_HANDLE_RESERVED")
    return handle


def youtube_id_from(value) -> str:
    """Aceita o ID de 11 caracteres ou uma URL do YouTube; devolve só o ID."""
    text = clean_text(value, 300, field="vídeo do YouTube")
    if not text:
        return ""
    if _YT_ID_RE.match(text):
        return text
    m = _YT_URL_RE.search(text)
    if not m:
        raise SocialError("Link do YouTube inválido.", "SOCIAL_YOUTUBE_INVALID")
    return m.group(1)


def one_of(value, allowed, *, field: str, default: str | None = None) -> str:
    if value in (None, "") and default is not None:
        return default
    if value not in allowed:
        raise SocialError(f"Valor inválido para {field}.", "SOCIAL_FIELD_INVALID")
    return value


def clamp_limit(value, default: int = 20, maximum: int = 50) -> int:
    try:
        n = int(value)
    except (TypeError, ValueError):
        return default
    return max(1, min(n, maximum))


def like_pattern(term: str) -> str:
    """Termo de busca seguro pra ILIKE (escapa %, _ e \\)."""
    return "%" + term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
