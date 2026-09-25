"""Fábrica da aplicação Flask — TUMTUMPA.

Camadas:
    routes -> services -> Postgres (db.py) + Vercel Blob (blob_client.py)
Nenhuma regra de negócio nas rotas; nenhum SQL/HTTP de storage fora dos
services. Não sobra I/O de disco local nenhum — tudo fala com Postgres
(Neon) ou Vercel Blob, pronto pro filesystem efêmero de uma função
serverless (ver plano de migração em .claude/plans).
"""
from __future__ import annotations

import logging

from flask import Flask, jsonify
from flask_cors import CORS

import db
from config import Config

_DEFAULT_SECRET_KEY = "troque-esta-chave-em-producao"  # mesmo valor padrão de config.py
from middlewares.auth_middleware import require_admin, require_auth, require_not_blocked
from middlewares.rate_limit import RateLimiter
from routes.api_routes import build_blueprint
from services.ai_service import AIService
from services.alerts_service import AlertsService
from services.audio_service import AudioService
from services.auth_service import AuthService
from services.billing_service import BillingService
from services.band_board_service import BandBoardService
from services.branding_service import BrandingService
from services.chord_dictionary_service import ChordDictionaryService
from services.clip_queue_service import ClipQueueService
from services.favorites_service import FavoritesService
from services.feedback_service import FeedbackService
from services.admin_stats_service import AdminStatsService
from services.history_service import HistoryService
from services.karaoke_service import KaraokeService
from services.plans_service import PlansService
from services.quota_service import QuotaService
from services.search_service import SearchService
from services.setlist_service import SetlistService
from services.settings_service import SettingsService
from services.songs_service import SongsService
from services.telemetry_service import TelemetryService
from services.youtube_service import YoutubeService


class Services:
    """Container de injeção de dependências."""

    def __init__(self):
        self.auth = AuthService()
        self.search = SearchService()
        self.setlists = SetlistService()
        self.audio = AudioService()
        self.clips = ClipQueueService()
        self.youtube = YoutubeService()
        self.songs = SongsService(setlists=self.setlists, audio=self.audio, clips=self.clips, youtube=self.youtube)
        self.audio.songs = self.songs  # injetado depois pra evitar ciclo
        self.clips.songs = self.songs  # idem
        self.karaoke = KaraokeService(self.songs, self.audio, self.clips)
        self.history = HistoryService(self.songs)
        self.settings = SettingsService()
        self.chords = ChordDictionaryService()
        self.ai = AIService()
        self.plans = PlansService()
        self.billing = BillingService()
        self.quota = QuotaService(setlists=self.setlists)
        self.setlists.quota = self.quota  # injetado depois pra evitar ciclo
        self.feedback = FeedbackService()
        self.telemetry = TelemetryService()
        self.favorites = FavoritesService()
        self.branding = BrandingService()
        self.band_board = BandBoardService()
        self.alerts = AlertsService()
        self.admin_stats = AdminStatsService(setlists=self.setlists, telemetry=self.telemetry)
        self.require_auth = require_auth(self.auth)
        self.require_admin = require_admin(self.auth)
        self.require_not_blocked = require_not_blocked(self.billing)
        # Proteção básica contra abuso, só pra biblioteca pública sem login
        # (ver hook em api_routes.py) — 60 req/min por IP.
        self.public_rate_limit = RateLimiter(max_requests=60, window_seconds=60)
        # autenticação: por IP (varredura/criação em massa) e por usuário-alvo
        # (força bruta numa conta só, mesmo vindo de vários IPs)
        self.login_ip_limit = RateLimiter(max_requests=20, window_seconds=60)
        self.login_user_limit = RateLimiter(max_requests=8, window_seconds=300)
        self.register_ip_limit = RateLimiter(max_requests=6, window_seconds=600)


def create_app() -> Flask:
    logging.basicConfig(
        level=Config.LOG_LEVEL,
        format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
    )
    app = Flask(__name__)
    app.config.from_object(Config)
    if Config.SECRET_KEY == _DEFAULT_SECRET_KEY or len(Config.SECRET_KEY) < 32:
        # o JWT (e o is_admin dentro dele) é assinado com esta chave: com o
        # valor padrão público (ou uma chave curta) qualquer pessoa forja um
        # token de administrador. Não derruba o app (poderia tirar o site do
        # ar por engano), mas grita no log a cada inicialização.
        logging.getLogger(__name__).critical(
            "SECRET_KEY ausente, padrão ou curta (<32 caracteres) — defina uma chave aleatória forte "
            "(ex.: python -c \"import secrets; print(secrets.token_urlsafe(48))\") nas variáveis de ambiente.")
    CORS(app, origins=Config.CORS_ORIGINS.split(","))

    db.init_schema()  # idempotente (CREATE ... IF NOT EXISTS) — garante o schema em qualquer ambiente novo

    ctx = Services()
    app.register_blueprint(build_blueprint(ctx))

    @app.after_request
    def security_headers(resp):
        # nosniff: o navegador não "adivinha" outro tipo pra um upload. A CSP
        # com sandbox em toda resposta da API: mesmo que algum arquivo enviado
        # por usuário fosse aberto direto, rodaria numa origem isolada, sem
        # acesso ao localStorage/token do app.
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("Content-Security-Policy", "default-src 'none'; sandbox")
        resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        resp.headers.setdefault("Cross-Origin-Resource-Policy", "same-site")
        return resp

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "app": "tumtumpa"})

    return app


if __name__ == "__main__":
    # exclude_patterns: o projeto (e o venv "env/") vive dentro de uma pasta
    # sincronizada pelo OneDrive, que mexe em metadados de arquivo por conta
    # própria — o reloader do Werkzeug (watchdog) interpreta isso como
    # "mudou", e reinicia o processo Flask NO MEIO de uma requisição em
    # andamento (ex.: derrubou uma chamada à Stripe já em voo). Excluir o
    # venv do watch evita esses restarts espúrios sem perder o auto-reload
    # de verdade pro código do próprio backend.
    create_app().run(host="0.0.0.0", port=5000, debug=True,
                      exclude_patterns=["*/env/*", "*\\env\\*"])
