"""Testes HTTP-level da rota de cron (/api/cron/*) — ninguém loga pra
chamar essas rotas (é a própria Vercel, uma vez por dia — ver "crons" em
vercel.json), então o que está sob teste aqui é o gate de autenticação por
CRON_SECRET e o clamp do limite do lote, não a lógica de preenchimento em
si (já coberta pelos testes de SongsService.youtube_link_batch em
test_services.py)."""
from __future__ import annotations

import pytest

from app import create_app
from config import Config
from services.songs_service import SongsService
from services.youtube_service import YoutubeService


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    return app.test_client()


def test_cron_youtube_link_batch_rejects_when_secret_not_configured(client, monkeypatch):
    monkeypatch.setattr(Config, "CRON_SECRET", "")
    resp = client.get("/api/cron/youtube-link-batch", headers={"Authorization": "Bearer qualquer-coisa"})
    assert resp.status_code == 401


def test_cron_youtube_link_batch_rejects_wrong_token(client, monkeypatch):
    monkeypatch.setattr(Config, "CRON_SECRET", "segredo-certo")
    resp = client.get("/api/cron/youtube-link-batch", headers={"Authorization": "Bearer segredo-errado"})
    assert resp.status_code == 401


def test_cron_youtube_link_batch_rejects_missing_header(client, monkeypatch):
    monkeypatch.setattr(Config, "CRON_SECRET", "segredo-certo")
    resp = client.get("/api/cron/youtube-link-batch")
    assert resp.status_code == 401


def test_cron_youtube_link_batch_accepts_correct_token(client, monkeypatch):
    monkeypatch.setattr(Config, "CRON_SECRET", "segredo-certo")
    monkeypatch.setattr(YoutubeService, "search_videos", lambda self, interprete, titulo, max_results=5: [])
    resp = client.get("/api/cron/youtube-link-batch", headers={"Authorization": "Bearer segredo-certo"})
    assert resp.status_code == 200
    data = resp.get_json()
    assert set(data) == {"processed", "found", "remaining", "remaining_in_setlists"}


def test_cron_youtube_link_batch_respects_configured_limit(client, monkeypatch, user_id):
    monkeypatch.setattr(Config, "CRON_SECRET", "segredo-certo")
    monkeypatch.setattr(Config, "YOUTUBE_CRON_BATCH_LIMIT", 2)
    calls = []

    def fake_search(self, interprete, titulo, max_results=5):
        calls.append((interprete, titulo))
        return []
    monkeypatch.setattr(YoutubeService, "search_videos", fake_search)

    songs = SongsService()
    for i in range(5):
        songs.create("u1", "Pop", f"Artista {i}", f"Musica {i}", f"@titulo: Musica {i}\n\ncorpo {i}")

    resp = client.get("/api/cron/youtube-link-batch", headers={"Authorization": "Bearer segredo-certo"})
    assert resp.status_code == 200
    assert resp.get_json()["processed"] == 2
    assert len(calls) == 2


def test_cron_youtube_link_batch_clamps_limit_above_fifty(client, monkeypatch, user_id):
    monkeypatch.setattr(Config, "CRON_SECRET", "segredo-certo")
    monkeypatch.setattr(Config, "YOUTUBE_CRON_BATCH_LIMIT", 999)
    monkeypatch.setattr(YoutubeService, "search_videos", lambda self, interprete, titulo, max_results=5: [])

    songs = SongsService()
    for i in range(60):
        songs.create("u1", "Pop", f"Artista {i}", f"Musica {i}", f"@titulo: Musica {i}\n\ncorpo {i}")

    resp = client.get("/api/cron/youtube-link-batch", headers={"Authorization": "Bearer segredo-certo"})
    assert resp.get_json()["processed"] == 50
