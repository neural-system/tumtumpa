"""O slug de um setlist só é único POR USUÁRIO: dois usuários podem ter "ensaio".
Cada um precisa enxergar/editar o SEU, sem cair no homônimo do outro."""
import pytest

from services.setlist_service import SetlistService


@pytest.fixture
def two_setlists(user_id, other_user_id):
    svc = SetlistService()
    a = svc.save(user_id, "Ensaio", ["Coldplay/Yellow"])
    b = svc.save(other_user_id, "Ensaio", ["Legião Urbana/Pais e Filhos"])
    assert a["id"] == b["id"] == "ensaio"
    return svc


def test_get_returns_the_callers_own_setlist(two_setlists):
    assert two_setlists.get("u1", "ensaio")["items"][0]["ref"] == "Coldplay/Yellow"
    assert two_setlists.get("u2", "ensaio")["items"][0]["ref"] == "Legião Urbana/Pais e Filhos"


def test_owner_can_edit_and_share_their_own_despite_the_namesake(two_setlists):
    two_setlists.save("u2", "Ensaio", ["Coldplay/Yellow", "X/Y"], setlist_id="ensaio")  # editar o próprio
    assert len(two_setlists.get("u2", "ensaio")["items"]) == 2
    assert len(two_setlists.get("u1", "ensaio")["items"]) == 1  # o do outro ficou intacto
    two_setlists.set_shared("u2", "ensaio", False)
    assert two_setlists.get("u1", "ensaio")["shared"] is True


def test_delete_only_touches_the_callers_setlist(two_setlists):
    two_setlists.delete("u1", "ensaio")
    assert two_setlists.get("u2", "ensaio")["items"][0]["ref"] == "Legião Urbana/Pais e Filhos"
