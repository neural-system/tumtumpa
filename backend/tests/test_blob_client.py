"""Testes puros (sem rede) pra assinatura de upload direto — a lógica mais
arriscada de blob_client.py, replicada a partir do SDK oficial em JS (ver
comentário no topo de presign_put_url). issue_signed_token/put/get/delete
batem na API de verdade e não são exercitados aqui (ver fake_blob_store em
conftest.py pra esses, usado pelos testes de AudioService)."""
import base64
import hashlib
import hmac

import pytest

from services import blob_client


def test_presign_put_url_is_deterministic():
    url1 = blob_client.presign_put_url("audio/u1/some-song/track.mp3", "deleg-token", "signing-key")
    url2 = blob_client.presign_put_url("audio/u1/some-song/track.mp3", "deleg-token", "signing-key")
    assert url1 == url2


def test_presign_put_url_signature_matches_expected_canonical_string():
    pathname = "audio/u1/some-song/track.mp3"
    url = blob_client.presign_put_url(pathname, "deleg-token", "signing-key")

    # mesma string canônica que canonicalString() do SDK produziria: linhas
    # "chave=valor" ordenadas por bytes UTF-8 (aqui já em ordem alfabética).
    canonical = "\n".join([
        "operation=put",
        f"pathname={pathname}",
        "vercel-blob-add-random-suffix=false",
        "vercel-blob-allow-overwrite=true",
    ])
    expected_sig = base64.urlsafe_b64encode(
        hmac.new(b"signing-key", canonical.encode("utf-8"), hashlib.sha256).digest(),
    ).decode("ascii").rstrip("=")

    assert f"vercel-blob-signature={expected_sig}" in url


def test_presign_put_url_different_pathname_changes_signature():
    url1 = blob_client.presign_put_url("audio/u1/song-a/track.mp3", "deleg-token", "signing-key")
    url2 = blob_client.presign_put_url("audio/u1/song-b/track.mp3", "deleg-token", "signing-key")
    sig1 = url1.split("vercel-blob-signature=")[1]
    sig2 = url2.split("vercel-blob-signature=")[1]
    assert sig1 != sig2


def test_presign_put_url_never_leaks_client_signing_token():
    url = blob_client.presign_put_url("audio/u1/some-song/track.mp3", "deleg-token", "super-secret-signing-key")
    assert "super-secret-signing-key" not in url


# ---------- trava de domínio (o token mestre só vai pro blob de verdade) ----------

def test_is_trusted_url_accepts_only_https_blob_hosts():
    assert blob_client.is_trusted_url("https://abc123.private.blob.vercel-storage.com/audio/u1/x/track.mp3")
    assert blob_client.is_trusted_url("https://abc123.blob.vercel-storage.com/a.mp3")


@pytest.mark.parametrize("url", [
    "http://abc.private.blob.vercel-storage.com/a.mp3",          # sem TLS
    "https://evil.example/audio/u1/x/track.mp3",                  # outro host
    "https://blob.vercel-storage.com.evil.example/a.mp3",         # sufixo falso
    "https://user:pw@abc.private.blob.vercel-storage.com/a.mp3",  # credenciais embutidas
    "https://evilblob.vercel-storage.com/a.mp3",                  # não é subdomínio real
    "", "not a url", "file:///etc/passwd",
])
def test_is_trusted_url_rejects_everything_else(url):
    assert not blob_client.is_trusted_url(url)


def test_url_matches_pathname_requires_exact_path():
    url = "https://abc.private.blob.vercel-storage.com/audio/u1/musica/track.mp3"
    assert blob_client.url_matches_pathname(url, "audio/u1/musica/track.mp3")
    assert not blob_client.url_matches_pathname(url, "audio/u2/outra/track.mp3")
    assert not blob_client.url_matches_pathname(url + "?x=1&../", "audio/u1/musica/track.mp3/..")


def test_blob_reads_refuse_untrusted_urls_without_sending_the_token(monkeypatch):
    sent = []
    monkeypatch.setattr(blob_client.requests, "get", lambda *a, **k: sent.append((a, k)))
    monkeypatch.setattr(blob_client.requests, "head", lambda *a, **k: sent.append((a, k)))
    monkeypatch.setattr(blob_client.requests, "post", lambda *a, **k: sent.append((a, k)))
    with pytest.raises(blob_client.BlobError):
        blob_client.get("https://evil.example/x")
    with pytest.raises(blob_client.BlobError):
        blob_client.size_of("https://evil.example/x")
    with pytest.raises(blob_client.BlobError):
        blob_client.delete(["https://evil.example/x"])
    assert sent == []
