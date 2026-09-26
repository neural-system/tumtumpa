"""Rede social: perfis, bandas, agenda, feed, contratações e moderação —
regras de visibilidade, posse e limites (contra Postgres real, ver conftest)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

import db
from services.band_service import BandService
from services.event_service import EventService
from services.feed_service import FeedService
from services.gig_service import GigService
from services.moderation_service import ModerationService
from services.profile_service import ProfileService
from services.social_common import Conflict, Forbidden, NotFound, SocialError


@pytest.fixture
def svc():
    bands = BandService()
    return {
        "profiles": ProfileService(), "bands": bands, "events": EventService(bands), "feed": FeedService(bands),
        "gigs": GigService(bands), "mod": ModerationService(),
    }


def _user(uid: str, username: str):
    with db.get_pool().connection() as conn:
        conn.execute(
            "insert into users (id, username, name, password_hash) values (%s, %s, %s, 'x') on conflict do nothing",
            (uid, username, username.title()),
        )


@pytest.fixture
def users(user_id, other_user_id):
    _user("u3", "terceiro")
    return "u1", "u2", "u3"


def _publish(svc, uid, handle):
    return svc["profiles"].save_mine(uid, {"handle": handle, "display_name": handle.title(), "visibility": "public"})


def _band(svc, uid="u1", handle="banda_um", publish_with="u2", login="outro"):
    """Cria banda e, se `publish_with` (id), convida (pelo `login`), aceita e publica."""
    svc["bands"].create(uid, {"handle": handle, "name": "Banda Um"})
    if publish_with:
        svc["bands"].invite(uid, handle, login)
        svc["bands"].respond_to_invite(publish_with, handle, True)
        svc["bands"].update(uid, handle, {"visibility": "public"})


# ---------------- validação ----------------

def test_handle_rules(svc, users):
    for bad in ("ab", "Tem Espaço", "admin", "a" * 31, "com-hifen"):
        with pytest.raises(SocialError):
            svc["profiles"].save_mine("u1", {"handle": bad, "display_name": "X"})
    ok = svc["profiles"].save_mine("u1", {"handle": "@Joao_99", "display_name": "João"})
    assert ok["handle"] == "joao_99" and ok["visibility"] == "private"


def test_urls_must_be_http(svc, users):
    with pytest.raises(SocialError):
        svc["profiles"].save_mine("u1", {"handle": "joao", "display_name": "J", "links": ["javascript:alert(1)"]})
    with pytest.raises(SocialError):
        svc["profiles"].save_mine("u1", {"handle": "joao", "display_name": "J", "links": ["https://user:pw@x.com"]})
    p = svc["profiles"].save_mine("u1", {"handle": "joao", "display_name": "J", "links": ["https://instagram.com/joao"]})
    assert p["links"] == ["https://instagram.com/joao"]


def test_control_characters_are_stripped(svc, users):
    p = svc["profiles"].save_mine("u1", {"handle": "joao", "display_name": "Jo\x00ão\x07", "bio": "oi\x1b[0m"})
    assert p["display_name"] == "João" and "\x1b" not in p["bio"]


# ---------------- perfis ----------------

def test_profile_is_private_by_default_and_hidden_from_others(svc, users):
    svc["profiles"].save_mine("u1", {"handle": "joao", "display_name": "João", "contact": "joao@x.com"})
    assert svc["profiles"].get_public("joao", "u1")["is_owner"] is True
    with pytest.raises(NotFound):
        svc["profiles"].get_public("joao", "u2")  # privado responde como "não existe"
    with pytest.raises(NotFound):
        svc["profiles"].get_public("joao", None)
    assert svc["profiles"].get_public("joao", "u2", is_admin=True)["handle"] == "joao"


def test_public_profile_hides_contact_from_anonymous(svc, users):
    svc["profiles"].save_mine("u1", {"handle": "joao", "display_name": "J", "contact": "wpp 1", "visibility": "public"})
    assert svc["profiles"].get_public("joao", None)["contact"] == ""
    assert svc["profiles"].get_public("joao", "u2")["contact"] == "wpp 1"


def test_handle_uniqueness_is_case_insensitive(svc, users):
    svc["profiles"].save_mine("u1", {"handle": "joao", "display_name": "J"})
    with pytest.raises(Conflict):
        svc["profiles"].save_mine("u2", {"handle": "JOAO", "display_name": "K"})


def test_draft_suggests_free_handle(svc, users):
    svc["profiles"].save_mine("u2", {"handle": "demo", "display_name": "Já uso"})  # ocupa o login de u1 ("demo")
    draft = svc["profiles"].get_mine("u1")
    assert draft["exists"] is False and draft["handle"] != "demo" and draft["handle"].startswith("demo")


def test_search_lists_only_public_profiles(svc, users):
    _publish(svc, "u1", "guitarrista")
    svc["profiles"].save_mine("u2", {"handle": "escondido", "display_name": "Guitarra Privada"})
    res = svc["profiles"].search(q="guitar")
    assert [i["handle"] for i in res["items"]] == ["guitarrista"]


def test_banned_user_cannot_publish_and_disappears(svc, users):
    _publish(svc, "u1", "joao")
    with db.get_pool().connection() as conn:
        conn.execute("update users set social_banned = true where id = 'u1'")
    with pytest.raises(NotFound):
        svc["profiles"].get_public("joao", "u2")
    with pytest.raises(Forbidden):
        svc["profiles"].save_mine("u1", {"handle": "joao", "display_name": "J", "visibility": "public"})


# ---------------- bandas ----------------

def test_creator_becomes_active_admin_and_band_starts_private(svc, users):
    b = svc["bands"].create("u1", {"handle": "banda_um", "name": "Banda Um"})
    assert b["my_role"] == "admin" and b["visibility"] == "private" and b["members_count"] == 1
    with pytest.raises(NotFound):
        svc["bands"].get("banda_um", "u2")
    with pytest.raises(NotFound):
        svc["bands"].get("banda_um", None)


def test_band_needs_two_active_members_to_publish(svc, users):
    svc["bands"].create("u1", {"handle": "banda_um", "name": "Banda Um"})
    with pytest.raises(SocialError) as e:
        svc["bands"].update("u1", "banda_um", {"visibility": "public"})
    assert e.value.code == "SOCIAL_BAND_TOO_SMALL"
    svc["bands"].invite("u1", "banda_um", "outro")  # por login
    with pytest.raises(SocialError):  # convite pendente ainda não conta
        svc["bands"].update("u1", "banda_um", {"visibility": "public"})
    svc["bands"].respond_to_invite("u2", "banda_um", True)
    assert svc["bands"].update("u1", "banda_um", {"visibility": "public"})["visibility"] == "public"
    assert svc["bands"].get("banda_um", None)["members_count"] == 2


def test_only_band_admin_can_edit_invite_or_delete(svc, users):
    _band(svc)
    for fn in (
        lambda: svc["bands"].update("u2", "banda_um", {"name": "Golpe"}),
        lambda: svc["bands"].invite("u2", "banda_um", "terceiro"),
        lambda: svc["bands"].delete("u2", "banda_um"),
    ):
        with pytest.raises(Forbidden):
            fn()
    with pytest.raises(Forbidden):  # nem quem é de fora de uma banda PÚBLICA
        svc["bands"].update("u3", "banda_um", {"name": "Golpe"})


def test_invite_accept_decline_and_no_user_enumeration(svc, users):
    svc["bands"].create("u1", {"handle": "banda_um", "name": "Banda Um"})
    with pytest.raises(NotFound) as e1:
        svc["bands"].invite("u1", "banda_um", "ninguem_assim")
    with pytest.raises(NotFound) as e2:
        svc["bands"].invite("u1", "banda_um", "demo")  # a si mesmo
    assert e1.value.code == e2.value.code  # mesma resposta: não revela quem existe
    svc["bands"].invite("u1", "banda_um", "outro")
    assert svc["bands"].list_mine("u2")["invites"][0]["handle"] == "banda_um"
    svc["bands"].respond_to_invite("u2", "banda_um", False)
    assert svc["bands"].list_mine("u2")["invites"] == []
    with pytest.raises(NotFound):
        svc["bands"].respond_to_invite("u3", "banda_um", True)  # sem convite


def test_blocked_user_cannot_be_invited_by_blocker_target(svc, users):
    _publish(svc, "u1", "joao")
    svc["bands"].create("u1", {"handle": "banda_um", "name": "Banda Um"})
    with db.get_pool().connection() as conn:
        conn.execute("insert into user_blocks (blocker_id, blocked_id) values ('u2', 'u1')")
    with pytest.raises(NotFound):
        svc["bands"].invite("u1", "banda_um", "outro")


def test_last_admin_cannot_leave_or_be_demoted(svc, users):
    _band(svc)
    with pytest.raises(SocialError) as e:
        svc["bands"].leave("u1", "banda_um")
    assert e.value.code == "SOCIAL_LAST_ADMIN"
    with pytest.raises(SocialError):
        svc["bands"].set_member("u1", "banda_um", "demo", role="member")
    svc["bands"].set_member("u1", "banda_um", "outro", role="admin")
    svc["bands"].leave("u1", "banda_um")  # agora há outro admin
    # sobrou 1 integrante: a banda deixa de ser pública
    with pytest.raises(NotFound):
        svc["bands"].get("banda_um", None)


def test_removing_members_below_two_unpublishes(svc, users):
    _band(svc)
    svc["bands"].remove_member("u1", "banda_um", "outro")
    assert svc["bands"].get("banda_um", "u1")["visibility"] == "private"


def test_band_handle_conflict_and_limit(svc, users):
    svc["bands"].create("u1", {"handle": "banda_um", "name": "A"})
    with pytest.raises(Conflict):
        svc["bands"].create("u2", {"handle": "BANDA_UM", "name": "B"})
    for i in range(9):
        svc["bands"].create("u1", {"handle": f"outra_{i}", "name": "X"})
    with pytest.raises(SocialError) as e:
        svc["bands"].create("u1", {"handle": "demais", "name": "X"})
    assert e.value.code == "SOCIAL_BAND_LIMIT"


def test_members_listing_hides_private_member_names(svc, users):
    _publish(svc, "u1", "joao")
    _band(svc)  # u2 não tem perfil público
    members = svc["bands"].members("banda_um", None)
    by_role = {m["role"]: m for m in members}
    assert by_role["admin"]["profile_handle"] == "joao"
    assert by_role["member"]["display_name"] == "Integrante" and by_role["member"]["profile_handle"] is None


def test_deleted_band_disappears(svc, users):
    _band(svc)
    svc["bands"].delete("u1", "banda_um")
    with pytest.raises(NotFound):
        svc["bands"].get("banda_um", "u1")


# ---------------- agenda ----------------

def _show(days=7, **extra):
    return {"title": "Show no bar", "starts_at": (datetime.now(timezone.utc) + timedelta(days=days)).isoformat(),
            "venue": "Bar do Zé", "city": "Santos", **extra}


def test_events_only_admins_and_future(svc, users):
    _band(svc)
    ev = svc["events"].create("u1", "banda_um", _show())
    assert ev["band"]["handle"] == "banda_um"
    with pytest.raises(Forbidden):
        svc["events"].create("u2", "banda_um", _show())
    with pytest.raises(SocialError):
        svc["events"].create("u1", "banda_um", _show(days=-1))
    with pytest.raises(SocialError):
        svc["events"].create("u1", "banda_um", _show(ticket_url="javascript:x"))


def test_public_agenda_shows_only_future_scheduled_public_band_events(svc, users):
    _band(svc)
    ev = svc["events"].create("u1", "banda_um", _show(days=3))
    other = svc["events"].create("u1", "banda_um", _show(days=5, title="Cancelado"))
    svc["events"].update("u1", other["id"], {"status": "cancelled"})
    assert [e["title"] for e in svc["events"].upcoming(city="santos")["items"]] == ["Show no bar"]
    svc["bands"].update("u1", "banda_um", {"visibility": "private"})
    assert svc["events"].upcoming()["items"] == []
    with pytest.raises(NotFound):
        svc["events"].list_for_band("banda_um", "u3")
    assert len(svc["events"].list_for_band("banda_um", "u2")) == 2  # integrante vê
    with pytest.raises(NotFound):
        svc["events"].update("u1", "nao-e-uuid", {"title": "x"})
    assert ev["id"]


def test_event_delete_and_permissions(svc, users):
    _band(svc)
    ev = svc["events"].create("u1", "banda_um", _show())
    with pytest.raises(Forbidden):
        svc["events"].delete("u3", ev["id"])
    svc["events"].delete("u1", ev["id"])
    assert svc["events"].upcoming()["items"] == []


# ---------------- feed ----------------

def test_posting_requires_public_profile(svc, users):
    svc["profiles"].save_mine("u1", {"handle": "joao", "display_name": "J"})
    with pytest.raises(SocialError) as e:
        svc["feed"].create_post("u1", {"body": "olá"})
    assert e.value.code == "SOCIAL_PROFILE_NOT_PUBLIC"
    _publish(svc, "u1", "joao")
    p = svc["feed"].create_post("u1", {"body": "olá"})
    assert p["author"]["handle"] == "joao" and p["can_delete"]


def test_post_validation(svc, users):
    _publish(svc, "u1", "joao")
    with pytest.raises(SocialError):
        svc["feed"].create_post("u1", {"body": "  "})
    with pytest.raises(SocialError):
        svc["feed"].create_post("u1", {"body": "x" * 2001})
    with pytest.raises(SocialError):
        svc["feed"].create_post("u1", {"body": "x", "link_url": "data:text/html,<script>"})
    with pytest.raises(SocialError):
        svc["feed"].create_post("u1", {"body": "x", "youtube": "https://evil.com/watch?v=aaaaaaaaaaa"})
    yt = svc["feed"].create_post("u1", {"youtube": "https://youtu.be/dQw4w9WgXcQ"})
    assert yt["youtube_id"] == "dQw4w9WgXcQ"
    txt = svc["feed"].create_post("u1", {"body": "<script>alert(1)</script>"})
    assert txt["body"] == "<script>alert(1)</script>"  # texto puro, guardado como veio; a tela escapa


def test_band_posts_need_admin_and_public_band(svc, users):
    _publish(svc, "u1", "joao")
    svc["bands"].create("u1", {"handle": "banda_um", "name": "Banda Um"})
    with pytest.raises(SocialError) as e:
        svc["feed"].create_post("u1", {"body": "oi", "band": "banda_um"})
    assert e.value.code == "SOCIAL_BAND_NOT_PUBLIC"
    svc["bands"].invite("u1", "banda_um", "outro")
    svc["bands"].respond_to_invite("u2", "banda_um", True)
    svc["bands"].update("u1", "banda_um", {"visibility": "public"})
    p = svc["feed"].create_post("u1", {"body": "novo show!", "band": "banda_um"})
    assert p["author"] == {"type": "band", "handle": "banda_um", "name": "Banda Um"}
    _publish(svc, "u2", "maria")
    with pytest.raises(Forbidden):  # integrante comum não posta pela banda
        svc["feed"].create_post("u2", {"body": "x", "band": "banda_um"})
    svc["bands"].update("u1", "banda_um", {"visibility": "private"})
    assert svc["feed"].feed("u3")["items"] == []  # banda privada some do feed


def test_feed_pagination_and_scopes(svc, users):
    _publish(svc, "u1", "joao")
    _publish(svc, "u2", "maria")
    for i in range(5):
        svc["feed"].create_post("u1", {"body": f"j{i}"})
    svc["feed"].create_post("u2", {"body": "m0"})
    first = svc["feed"].feed(None, limit=4)
    assert [p["body"] for p in first["items"]] == ["m0", "j4", "j3", "j2"] and first["next_cursor"]
    rest = svc["feed"].feed(None, limit=4, cursor=first["next_cursor"])
    assert [p["body"] for p in rest["items"]] == ["j1", "j0"] and rest["next_cursor"] is None
    assert len(svc["feed"].feed(None, scope="user", handle="maria")["items"]) == 1
    with pytest.raises(SocialError):
        svc["feed"].feed(None, scope="following")
    assert svc["feed"].feed("u3", scope="following")["items"] == []
    svc["feed"].set_follow("u3", "user", "joao", True)
    assert len(svc["feed"].feed("u3", scope="following")["items"]) == 5


def test_private_profile_posts_disappear_and_bad_cursor(svc, users):
    _publish(svc, "u1", "joao")
    p = svc["feed"].create_post("u1", {"body": "oi"})
    svc["profiles"].save_mine("u1", {"handle": "joao", "display_name": "J", "visibility": "private"})
    assert svc["feed"].feed(None)["items"] == []
    with pytest.raises(NotFound):
        svc["feed"].get_post(p["id"], None)
    with pytest.raises(SocialError):
        svc["feed"].feed(None, cursor="lixo")


def test_delete_post_permissions(svc, users):
    _publish(svc, "u1", "joao")
    _publish(svc, "u2", "maria")
    p = svc["feed"].create_post("u1", {"body": "oi"})
    with pytest.raises(Forbidden):
        svc["feed"].delete_post("u2", p["id"])
    assert svc["feed"].get_post(p["id"], "u2")["can_delete"] is False
    svc["feed"].delete_post("u1", p["id"])
    with pytest.raises(NotFound):
        svc["feed"].get_post(p["id"], "u1")
    p2 = svc["feed"].create_post("u1", {"body": "outro"})
    svc["feed"].delete_post("u3", p2["id"], is_platform_admin=True)  # admin da plataforma


def test_likes_are_idempotent_and_counted(svc, users):
    _publish(svc, "u1", "joao")
    p = svc["feed"].create_post("u1", {"body": "oi"})
    assert svc["feed"].set_like("u2", p["id"], True)["likes"] == 1
    assert svc["feed"].set_like("u2", p["id"], True)["likes"] == 1
    assert svc["feed"].set_like("u3", p["id"], True)["likes"] == 2
    assert svc["feed"].get_post(p["id"], "u2")["liked"] is True
    assert svc["feed"].set_like("u2", p["id"], False)["likes"] == 1
    with pytest.raises(NotFound):
        svc["feed"].set_like("u2", "00000000-0000-0000-0000-000000000000", True)


def test_comments_flow_and_permissions(svc, users):
    _publish(svc, "u1", "joao")
    _publish(svc, "u2", "maria")
    p = svc["feed"].create_post("u1", {"body": "oi"})
    c = svc["feed"].add_comment("u2", p["id"], "muito bom!")
    with pytest.raises(SocialError):
        svc["feed"].add_comment("u2", p["id"], "   ")
    with pytest.raises(SocialError):
        svc["feed"].add_comment("u2", p["id"], "x" * 601)
    listed = svc["feed"].list_comments(p["id"], "u1")["items"]
    assert [x["body"] for x in listed] == ["muito bom!"] and listed[0]["can_delete"] is True  # dono do post modera
    assert svc["feed"].get_post(p["id"], None)["comments"] == 1
    with pytest.raises(Forbidden):
        svc["feed"].delete_comment("u3", c["id"])
    svc["feed"].delete_comment("u2", c["id"])
    assert svc["feed"].list_comments(p["id"], "u1")["items"] == []


def test_comment_author_without_public_profile_is_anonymous(svc, users):
    _publish(svc, "u1", "joao")
    p = svc["feed"].create_post("u1", {"body": "oi"})
    svc["feed"].add_comment("u3", p["id"], "opa")
    assert svc["feed"].list_comments(p["id"], None)["items"][0]["author"] == {"handle": None, "name": "Músico"}


def test_follow_rules(svc, users):
    _publish(svc, "u1", "joao")
    with pytest.raises(SocialError):
        svc["feed"].set_follow("u1", "user", "joao", True)  # a si mesmo
    assert svc["feed"].set_follow("u2", "user", "joao", True) == {"following": True, "followers": 1}
    assert svc["feed"].set_follow("u2", "user", "joao", True)["followers"] == 1
    assert svc["profiles"].get_public("joao", "u2")["is_following"] is True
    assert svc["feed"].set_follow("u2", "user", "joao", False)["followers"] == 0
    svc["profiles"].save_mine("u3", {"handle": "quieto", "display_name": "Q"})
    with pytest.raises(NotFound):
        svc["feed"].set_follow("u2", "user", "quieto", True)  # perfil privado não é seguível


def test_block_hides_both_ways_and_removes_follows(svc, users):
    _publish(svc, "u1", "joao")
    _publish(svc, "u2", "maria")
    svc["feed"].set_follow("u2", "user", "joao", True)
    p = svc["feed"].create_post("u1", {"body": "oi"})
    svc["feed"].set_block("u1", "maria", True)
    assert svc["feed"].feed("u2")["items"] == []  # quem foi bloqueado não vê
    with pytest.raises(NotFound):
        svc["profiles"].get_public("joao", "u2")
    with pytest.raises(NotFound):
        svc["feed"].add_comment("u2", p["id"], "oi")
    assert svc["profiles"].get_public("joao", None)["followers"] == 0
    svc["feed"].set_block("u1", "maria", False)
    assert len(svc["feed"].feed("u2")["items"]) == 1
    with pytest.raises(SocialError):
        svc["feed"].set_block("u1", "joao", True)


# ---------------- contratações ----------------

def _gig(**extra):
    return {"kind": "gig", "title": "Banda para casamento", "body": "Sábado à noite", "city": "Santos", **extra}


def test_gigs_require_public_profile_and_are_listed(svc, users):
    with pytest.raises(SocialError):
        svc["gigs"].create("u1", _gig())
    _publish(svc, "u1", "contratante")
    g = svc["gigs"].create("u1", _gig(event_date="2030-01-15", budget_note="R$ 800"))
    assert g["is_mine"] and g["event_date"] == "2030-01-15"
    assert svc["gigs"].list_open("u2", city="santos")["total"] == 1
    assert svc["gigs"].list_open("u2", kind="aula")["total"] == 0
    assert svc["gigs"].list_open("u1", mine=True)["total"] == 1
    with pytest.raises(SocialError):
        svc["gigs"].create("u1", _gig(kind="golpe"))


def test_gig_replies_are_private_to_the_author(svc, users):
    _publish(svc, "u1", "contratante")
    _publish(svc, "u2", "banda_x")
    g = svc["gigs"].create("u1", _gig())
    with pytest.raises(SocialError):
        svc["gigs"].reply("u1", g["id"], "eu mesmo")
    svc["gigs"].reply("u2", g["id"], "Topamos! R$ 700")
    with pytest.raises(Conflict):
        svc["gigs"].reply("u2", g["id"], "de novo")
    with pytest.raises(SocialError):  # sem perfil público não responde
        svc["gigs"].reply("u3", g["id"], "oi")
    with pytest.raises(Forbidden):
        svc["gigs"].list_replies("u2", g["id"])
    replies = svc["gigs"].list_replies("u1", g["id"])
    assert replies[0]["message"] == "Topamos! R$ 700" and replies[0]["from"]["handle"] == "banda_x"
    assert svc["gigs"].get(g["id"], "u2")["replies"] is None  # contagem só pro autor
    assert svc["gigs"].get(g["id"], "u1")["replies"] == 1
    assert svc["gigs"].answer_reply("u1", g["id"], replies[0]["id"], True)["status"] == "accepted"


def test_closed_and_deleted_gigs_stop_receiving_replies(svc, users):
    _publish(svc, "u1", "contratante")
    _publish(svc, "u2", "banda_x")
    g = svc["gigs"].create("u1", _gig())
    with pytest.raises(Forbidden):
        svc["gigs"].set_status("u2", g["id"], "closed")
    svc["gigs"].set_status("u1", g["id"], "closed")
    assert svc["gigs"].list_open("u2")["total"] == 0
    with pytest.raises(NotFound):
        svc["gigs"].reply("u2", g["id"], "ainda dá?")
    svc["gigs"].delete("u1", g["id"])
    with pytest.raises(NotFound):
        svc["gigs"].get(g["id"], "u1")


def test_gig_limit_per_author(svc, users):
    _publish(svc, "u1", "contratante")
    for i in range(10):
        svc["gigs"].create("u1", _gig(title=f"g{i}"))
    with pytest.raises(SocialError) as e:
        svc["gigs"].create("u1", _gig(title="demais"))
    assert e.value.code == "SOCIAL_GIG_LIMIT"


# ---------------- moderação ----------------

def test_report_rules(svc, users):
    _publish(svc, "u1", "joao")
    p = svc["feed"].create_post("u1", {"body": "compre já!!"})
    with pytest.raises(SocialError):
        svc["mod"].report("u1", "post", p["id"], "spam")  # o próprio conteúdo
    assert svc["mod"].report("u2", "post", p["id"], "spam") == {"ok": True, "auto_hidden": False}
    with pytest.raises(Conflict):
        svc["mod"].report("u2", "post", p["id"], "spam")
    with pytest.raises(SocialError):
        svc["mod"].report("u2", "post", p["id"], "motivo-inventado")
    with pytest.raises(NotFound):
        svc["mod"].report("u2", "post", "00000000-0000-0000-0000-000000000000", "spam")
    with pytest.raises(NotFound):
        svc["mod"].report("u2", "comment", "nao-uuid", "spam")


def test_three_reports_auto_hide_a_post(svc, users):
    _publish(svc, "u1", "joao")
    _user("u4", "quarto")
    p = svc["feed"].create_post("u1", {"body": "golpe"})
    svc["mod"].report("u2", "post", p["id"], "golpe")
    svc["mod"].report("u3", "post", p["id"], "golpe")
    assert svc["feed"].get_post(p["id"], None)["id"] == p["id"]  # ainda visível com 2
    assert svc["mod"].report("u4", "post", p["id"], "spam")["auto_hidden"] is True
    with pytest.raises(NotFound):
        svc["feed"].get_post(p["id"], None)


def test_admin_queue_and_actions(svc, users):
    _publish(svc, "u1", "joao")
    p = svc["feed"].create_post("u1", {"body": "duvidoso"})
    svc["mod"].report("u2", "post", p["id"], "spam")
    svc["mod"].report("u3", "post", p["id"], "outro")
    q = svc["mod"].queue()
    assert q["total"] == 1 and q["items"][0]["reports"] == 2 and q["items"][0]["preview"]["text"] == "duvidoso"
    # hide: some do feed e a fila fecha como "resolved"
    with db.get_pool().connection() as conn:
        conn.execute("insert into users (id, username, name, password_hash, is_admin) values ('adm', 'adm', 'Adm', 'x', true)")
    assert svc["mod"].resolve("adm", "post", p["id"], "hide")["status"] == "resolved"
    with pytest.raises(NotFound):
        svc["feed"].get_post(p["id"], None)
    assert svc["mod"].queue()["total"] == 0 and svc["mod"].queue(status="resolved")["total"] == 1
    svc["mod"].resolve("adm", "post", p["id"], "restore")
    assert svc["feed"].get_post(p["id"], None)["body"] == "duvidoso"


def test_admin_can_ban_and_unban_author(svc, users):
    _publish(svc, "u1", "joao")
    p = svc["feed"].create_post("u1", {"body": "spam"})
    svc["mod"].report("u2", "post", p["id"], "spam")
    with db.get_pool().connection() as conn:
        conn.execute("insert into users (id, username, name, password_hash, is_admin) values ('adm', 'adm', 'Adm', 'x', true)")
    svc["mod"].resolve("adm", "post", p["id"], "ban_user")
    with pytest.raises(Forbidden):
        svc["feed"].create_post("u1", {"body": "outro"})
    with pytest.raises(NotFound):
        svc["profiles"].get_public("joao", None)
    svc["mod"].resolve("adm", "profile", "joao", "unban_user")
    assert svc["profiles"].get_public("joao", None)["handle"] == "joao"


def test_report_profile_and_band(svc, users):
    _publish(svc, "u1", "joao")
    _band(svc)
    assert svc["mod"].report("u3", "profile", "joao", "impersonacao")["ok"]
    assert svc["mod"].report("u3", "band", "banda_um", "outro")["ok"]
    kinds = sorted(i["kind"] for i in svc["mod"].queue()["items"])
    assert kinds == ["band", "profile"]
