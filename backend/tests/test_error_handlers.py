import pytest

from app import create_app


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = False  # exercita o handler, não a propagação do Flask
    return app.test_client()


def test_unknown_api_route_is_json(client):
    r = client.get("/api/nao-existe")
    assert r.status_code == 404
    assert r.get_json()["error_code"] == "NOT_FOUND"


def test_wrong_method_is_json(client):
    r = client.post("/api/health")
    assert r.status_code == 405
    assert r.get_json()["error_code"] == "METHOD_NOT_ALLOWED"


def test_unexpected_error_hides_details(client, monkeypatch):
    import app as app_module

    flask_app = app_module.create_app()

    @flask_app.get("/api/_boom")
    def boom():
        raise RuntimeError("select * from secreto")

    r = flask_app.test_client().get("/api/_boom")
    assert r.status_code == 500
    body = r.get_json()
    assert body["error_code"] == "INTERNAL_ERROR" and "secreto" not in body["error"]
