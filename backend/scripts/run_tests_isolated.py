"""Roda a suíte de testes num SCHEMA ISOLADO do mesmo Postgres, sem precisar de
um banco/branch separado só pra testes (e sem tocar nas tabelas reais).

Como funciona:
  * abre uma conexão DIRETA (sem "-pooler" — o pooler do Neon não aceita
    `options`) com `options=-csearch_path=<schema>,public`;
  * cria o schema completo lá e CONFERE que todas as tabelas que a suíte
    trunca (lista `_TABLES` do conftest) resolvem pro schema de teste — se
    qualquer uma resolvesse pra `public`, aborta (o conftest faz TRUNCATE
    CASCADE por teste e apagaria dados reais);
  * só então define TEST_DATABASE_URL e chama o pytest.

Uso (a partir de backend/):
    python scripts/run_tests_isolated.py tests/test_social_services.py -x
    python scripts/run_tests_isolated.py tests            # suíte inteira (lenta: ~1 s por teste)
Variável opcional ISOLATED_TEST_SCHEMA (padrão: tdd_isolated_tests). Duas
execuções simultâneas precisam de schemas diferentes.
"""
from __future__ import annotations

import os
import re
import sys
import urllib.parse
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
os.chdir(BACKEND)
sys.path.insert(0, str(BACKEND))

import psycopg  # noqa: E402

from config import Config  # noqa: E402

SCHEMA = os.getenv("ISOLATED_TEST_SCHEMA", "tdd_isolated_tests")
if not re.fullmatch(r"[a-z_][a-z0-9_]{0,40}", SCHEMA) or SCHEMA in ("public", "pg_catalog", "information_schema"):
    sys.exit(f"Nome de schema inválido/proibido: {SCHEMA}")
if not Config.DATABASE_URL:
    sys.exit("DATABASE_URL não definida em backend/.env")

ORIG_URL = Config.DATABASE_URL
direct = ORIG_URL.replace("-pooler", "")
sep = "&" if "?" in direct else "?"
iso = direct + sep + "options=" + urllib.parse.quote(f"-csearch_path={SCHEMA},public")

with psycopg.connect(direct, autocommit=True) as c:
    c.execute(f"create schema if not exists {SCHEMA}")

Config.DATABASE_URL = iso
import db  # noqa: E402

db.init_schema()
conftest_src = (BACKEND / "tests" / "conftest.py").read_text(encoding="utf-8")
block = re.search(r"_TABLES = \((.*?)\n\)", conftest_src, re.S).group(1)
tables = re.findall(r'"([a-z_]+)"', block)
bad = []
with psycopg.connect(iso, autocommit=True) as c:
    for t in tables:
        row = c.execute(
            "select n.nspname from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.oid = to_regclass(%s)", (t,),
        ).fetchone()
        if not row or row[0] != SCHEMA:
            bad.append((t, row))
db.close_pool()
if bad:
    sys.exit(f"ABORTADO: tabelas que NÃO estão no schema isolado: {bad}")
Config.DATABASE_URL = ORIG_URL  # o conftest exige TEST_DATABASE_URL != DATABASE_URL
print(f"isolamento OK ({len(tables)} tabelas em {SCHEMA})")

os.environ["TEST_DATABASE_URL"] = iso
import pytest  # noqa: E402

sys.exit(pytest.main(["-p", "no:cacheprovider", "--no-cov", "-q"] + sys.argv[1:]))
