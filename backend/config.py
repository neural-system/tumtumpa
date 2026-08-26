"""Configuração via variáveis de ambiente (.env)."""
from __future__ import annotations

import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


class Config:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "troque-esta-chave-em-producao")
    JWT_HOURS: int = int(os.getenv("JWT_HOURS", "12"))
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    BLOB_READ_WRITE_TOKEN: str = os.getenv("BLOB_READ_WRITE_TOKEN", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY", "")
    STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_PUBLISHABLE_KEY: str = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
    STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    # autentica a rota GET /cron/youtube-link-batch — a própria Vercel envia
    # "Authorization: Bearer <CRON_SECRET>" nas chamadas de cron sozinha
    # quando a env var tem exatamente esse nome, sem precisar de código
    # extra pra isso (ver api_routes.py::cron_youtube_link_batch).
    CRON_SECRET: str = os.getenv("CRON_SECRET", "")
    # músicas processadas por disparo do cron diário de link do YouTube —
    # baixo de propósito: cada música custa 2 chamadas sequenciais de rede
    # (busca + duração), e o teto de tempo de execução da função serverless
    # é o limite real aqui, não a cota da API (~100 buscas/dia permitiria
    # bem mais que isso numa passada só, mas o timeout não deixa).
    YOUTUBE_CRON_BATCH_LIMIT: int = int(os.getenv("YOUTUBE_CRON_BATCH_LIMIT", "10"))
