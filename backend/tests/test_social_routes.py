"""Rede social — camada HTTP: autenticação, erros -> JSON/status, leitura
anônima e limitadores (a regra de negócio fica em test_social_services.py)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app import create_app
from middlewares.rate_limit import RateLimiter


@pytest.fixture
def client():
    app = create_app()
    return app.test_client()


@pytest.fixture
def ctx_of(client):
    # o container de serviços fica preso nas closures das rotas; pegamos o mesmo
    # pelo blueprint só pra trocar limitadores nos testes de 429
    return client.application


def _register(client, username, name=None):
    r = client.post("/api/auth/register", json={
        "username": username, "password": "senha1234", "name": name or username.title(), "email": f"{username}@ex.com",
        "accept_terms": True,
    })
    assert r.status_code == 200, r.get_data(as_text=True)
    return {"Authorization": f"Bearer {r.get_json()['token']}"}


def _publish(client, h, handle, **extra):
    body = {"handle": handle, "display_name": handle.title(), "visibility": "public", **extra}
    r = client.put("/api/social/me", json=body, headers=h)
    assert r.status_code == 200, r.get_data(as_text=True)
    return r.get_json()


def test_writes_require_login(client):
    for method, path in [("put", "/api/social/me"), ("post", "/api/social/posts"), ("post", "/api/social/bands"),
                         ("post", "/api/social/follow"), ("post", "/api/social/report"), ("post", "/api/social/gigs"),
                         ("get", "/api/social/me"), ("get", "/api/admin/social/reports")]:
        r = getattr(client, method)(path, json={})
        assert r.status_code == 401, (method, path)


def test_admin_moderation_requires_admin(client):
    h = _register(client, "comum")
    assert client.get("/api/admin/social/reports", headers=h).status_code == 403


def test_profile_flow_and_anonymous_visibility(client):
    h = _register(client, "joao")
    draft = client.get("/api/social/me", headers=h).get_json()
    assert draft["exists"] is False and draft["visibility"] == "private"
    saved = _publish(client, h, "joao_sax", contact="wpp 123", bio="Sax e flauta")
    assert saved["exists"] and saved["visibility"] == "public"
    anon = client.get("/api/social/profiles/joao_sax")
    assert anon.status_code == 200 and anon.get_json()["contact"] == ""  # contato só logado
    logged = client.get("/api/social/profiles/joao_sax", headers=_register(client, "maria"))
    assert logged.get_json()["contact"] == "wpp 123"
    assert client.get("/api/social/profiles/naoexiste").status_code == 404


def test_private_profile_is_404_for_visitors_and_others(client):
    h = _register(client, "joao")
    client.put("/api/social/me", json={"handle": "joao_priv", "display_name": "J"}, headers=h)
    assert client.get("/api/social/profiles/joao_priv").status_code == 404
    assert client.get("/api/social/profiles/joao_priv", headers=_register(client, "maria")).status_code == 404
    assert client.get("/api/social/profiles/joao_priv", headers=h).status_code == 200


def test_business_errors_map_to_status_and_code(client):
    h = _register(client, "joao")
    r = client.put("/api/social/me", json={"handle": "ab", "display_name": "J"}, headers=h)
    assert r.status_code == 400 and r.get_json()["error_code"] == "SOCIAL_HANDLE_INVALID"
    _publish(client, h, "joao_ok")
    other = _register(client, "maria")
    r = client.put("/api/social/me", json={"handle": "JOAO_OK", "display_name": "M"}, headers=other)
    assert r.status_code == 409 and r.get_json()["error_code"] == "SOCIAL_HANDLE_TAKEN"
    r = client.post("/api/social/posts", json={"body": "oi"}, headers=other)  # perfil ainda privado
    assert r.status_code == 400 and r.get_json()["error_code"] == "SOCIAL_PROFILE_NOT_PUBLIC"
    r = client.delete("/api/social/posts/00000000-0000-0000-0000-000000000000", headers=other)
    assert r.status_code == 404


def test_invalid_json_body_is_a_clean_400_not_500(client):
    h = _register(client, "joao")
    r = client.put("/api/social/me", data="isso nao e json", content_type="application/json", headers=h)
    assert r.status_code == 400
    r = client.put("/api/social/me", json=["lista"], headers=h)
    assert r.status_code == 400


def test_post_like_comment_over_http(client):
    h = _register(client, "joao")
    _publish(client, h, "joao_p")
    post = client.post("/api/social/posts", json={"body": "primeiro!"}, headers=h).get_json()
    m = _register(client, "maria")
    assert client.post(f"/api/social/posts/{post['id']}/like", json={"liked": True}, headers=m).get_json()["likes"] == 1
    c = client.post(f"/api/social/posts/{post['id']}/comments", json={"body": "show"}, headers=m)
    assert c.status_code == 201
    anon_feed = client.get("/api/social/feed").get_json()
    assert anon_feed["items"][0]["likes"] == 1 and anon_feed["items"][0]["liked"] is False
    assert client.get("/api/social/feed", headers=m).get_json()["items"][0]["liked"] is True
    assert client.get("/api/social/feed?scope=following").status_code == 400  # exige login
    assert client.get(f"/api/social/posts/{post['id']}/comments").get_json()["items"][0]["body"] == "show"
    assert client.post(f"/api/social/posts/{post['id']}/like", json={}).status_code == 401  # curtir exige login


def test_band_and_agenda_over_http(client):
    a, b = _register(client, "ana"), _register(client, "beto")
    assert client.post("/api/social/bands", json={"handle": "duo_x", "name": "Duo X"}, headers=a).status_code == 201
    assert client.get("/api/social/bands/duo_x").status_code == 404  # privada
    assert client.post("/api/social/bands/duo_x/invite", json={"target": "beto"}, headers=a).status_code == 201
    assert client.post("/api/social/bands/duo_x/invite/respond", json={"accept": True}, headers=b).status_code == 200
    assert client.put("/api/social/bands/duo_x", json={"visibility": "public"}, headers=a).status_code == 200
    when = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
    ev = client.post("/api/social/bands/duo_x/events", json={"title": "Bar", "starts_at": when, "city": "Santos"}, headers=a)
    assert ev.status_code == 201
    assert client.post("/api/social/bands/duo_x/events", json={"title": "Bar", "starts_at": when}, headers=b).status_code == 403
    agenda = client.get("/api/social/agenda?city=santos").get_json()
    assert agenda["total"] == 1 and agenda["items"][0]["band"]["handle"] == "duo_x"
    assert client.get("/api/social/bands/duo_x").get_json()["members_count"] == 2


def test_report_and_admin_queue_over_http(client):
    h = _register(client, "joao")
    _publish(client, h, "joao_r")
    post = client.post("/api/social/posts", json={"body": "compre!"}, headers=h).get_json()
    m = _register(client, "maria")
    r = client.post("/api/social/report", json={"kind": "post", "target_id": post["id"], "reason": "spam"}, headers=m)
    assert r.status_code == 201
    from services.auth_service import AuthService  # cria um admin e usa a fila
    AuthService().register("chefe", "senha1234", "Chefe", is_admin=True)
    tok = client.post("/api/auth/login", json={"username": "chefe", "password": "senha1234"}).get_json()["token"]
    adm = {"Authorization": f"Bearer {tok}"}
    q = client.get("/api/admin/social/reports", headers=adm).get_json()
    assert q["total"] == 1
    res = client.post("/api/admin/social/reports/resolve", json={"kind": "post", "target_id": post["id"], "action": "hide"}, headers=adm)
    assert res.status_code == 200
    assert client.get(f"/api/social/posts/{post['id']}").status_code == 404


def test_post_rate_limit_returns_429(client):
    h = _register(client, "joao")
    _publish(client, h, "joao_l")
    limits = None
    # o limite de posts é 10 por 10 min por usuário
    codes = [client.post("/api/social/posts", json={"body": f"p{i}"}, headers=h).status_code for i in range(12)]
    assert codes[:10] == [201] * 10 and 429 in codes[10:]
    assert limits is None


def test_login_is_rate_limited_per_username(client):
    client.post("/api/auth/register", json={"username": "alvo", "password": "senha1234", "name": "A", "email": "a@ex.com", "accept_terms": True})
    codes = [client.post("/api/auth/login", json={"username": "alvo", "password": f"errada{i}"}).status_code for i in range(10)]
    assert codes[0] == 401 and codes[-1] == 429


def test_security_headers_on_api_responses(client):
    r = client.get("/api/social/agenda")
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert "sandbox" in r.headers["Content-Security-Policy"]


def test_anonymous_social_reads_are_ip_limited(client):
    codes = [client.get("/api/social/agenda").status_code for _ in range(65)]
    assert 429 in codes


def test_gig_flow_over_http(client):
    a, b = _register(client, "contratante"), _register(client, "banda")
    _publish(client, a, "contrat_x")
    _publish(client, b, "banda_y")
    g = client.post("/api/social/gigs", json={"kind": "gig", "title": "Casamento", "city": "Santos"}, headers=a).get_json()
    assert client.post(f"/api/social/gigs/{g['id']}/reply", json={"message": "topamos"}, headers=b).status_code == 201
    assert client.get(f"/api/social/gigs/{g['id']}/replies", headers=b).status_code == 403
    assert client.get(f"/api/social/gigs/{g['id']}/replies", headers=a).get_json()[0]["message"] == "topamos"
    assert client.get("/api/social/gigs?city=santos").get_json()["total"] == 1


def test_register_requires_terms_acceptance_and_records_it(client):
    body = {"username": "novo", "password": "senha1234", "name": "Novo", "email": "novo@ex.com"}
    r = client.post("/api/auth/register", json=body)
    assert r.status_code == 400 and r.get_json()["error_code"] == "AUTH_TERMS_REQUIRED"
    assert client.post("/api/auth/register", json={**body, "accept_terms": "sim"}).status_code == 400  # só True vale
    assert client.post("/api/auth/register", json={**body, "accept_terms": True}).status_code == 200
    import db
    with db.get_pool().connection() as conn:
        assert conn.execute("select terms_accepted_at from users where username = 'novo'").fetchone()["terms_accepted_at"] is not None


def test_delete_own_account_over_http(client):
    h = _register(client, "sairei")
    assert client.post("/api/me/delete", json={"password": "errada"}, headers=h).status_code == 400
    assert client.post("/api/me/delete", json={"password": "senha1234"}, headers=h).status_code == 204
    assert client.get("/api/social/me", headers=h).status_code in (401, 404)
