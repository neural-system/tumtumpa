"""Contratações: pedidos de show, vagas em banda e aulas.

O TumTumPa NÃO intermedeia pagamento nem contrato — o pedido é só divulgação
e as respostas são mensagens privadas pro autor, que decide o que fazer e
combina o resto por fora. O texto de tela deixa isso claro ("nunca pague
adiantado"). Só usuários com perfil público podem publicar ou responder
(quem contrata precisa ser alguém identificável)."""
from __future__ import annotations

import uuid
from datetime import date

import db
from services.social_common import (
    MAX_CITY, MAX_DESC, MAX_TITLE, Conflict, Forbidden, NotFound, SocialError, clamp_limit, clean_text, like_pattern,
    one_of,
)

KINDS = ("gig", "vaga", "aula", "outro")
MAX_OPEN_GIGS_PER_USER = 10


def _valid_uuid(v) -> bool:
    try:
        uuid.UUID(str(v))
        return True
    except ValueError:
        return False


class GigService:
    def __init__(self, bands=None):
        self.bands = bands

    def _require_public_profile(self, conn, user_id: str):
        r = conn.execute(
            """select p.handle, p.display_name, u.social_banned from users u left join profiles p on p.user_id = u.id
               where u.id = %s""", (user_id,),
        ).fetchone()
        if not r:
            raise NotFound("Usuário não encontrado.", "SOCIAL_USER_NOT_FOUND")
        if r["social_banned"]:
            raise Forbidden("Sua conta está suspensa na comunidade.", "SOCIAL_BANNED")
        ok = conn.execute("select 1 from profiles where user_id = %s and visibility = 'public'", (user_id,)).fetchone()
        if not ok:
            raise SocialError("Publique seu perfil para usar as contratações.", "SOCIAL_PROFILE_NOT_PUBLIC")

    _SELECT = """
        select g.id, g.kind, g.title, g.body, g.city, g.event_date, g.budget_note, g.status, g.created_at, g.author_id,
               pr.handle as author_handle, coalesce(nullif(pr.display_name, ''), pr.handle) as author_name,
               b.handle as band_handle, b.name as band_name,
               (select count(*) from gig_replies r where r.gig_id = g.id) as replies
        from gigs g join users u on u.id = g.author_id
             left join profiles pr on pr.user_id = g.author_id
             left join bands b on b.id = g.band_id and b.deleted_at is null and b.visibility = 'public'
    """
    _VISIBLE = """g.deleted_at is null and g.hidden = false and u.social_banned = false and pr.visibility = 'public'"""

    def _dict(self, r: dict, viewer_id: str | None, is_platform_admin: bool = False) -> dict:
        return {
            "id": str(r["id"]), "kind": r["kind"], "title": r["title"], "body": r["body"], "city": r["city"],
            "event_date": r["event_date"].isoformat() if r["event_date"] else None, "budget_note": r["budget_note"],
            "status": r["status"], "created_at": r["created_at"].isoformat(),
            "author": {"handle": r["author_handle"], "name": r["author_name"]},
            "band": {"handle": r["band_handle"], "name": r["band_name"]} if r["band_handle"] else None,
            "is_mine": viewer_id is not None and r["author_id"] == viewer_id,
            "replies": r["replies"] if (viewer_id == r["author_id"] or is_platform_admin) else None,
        }

    def create(self, user_id: str, data: dict) -> dict:
        if not isinstance(data, dict):
            raise SocialError("Corpo inválido.", "SOCIAL_FIELD_INVALID")
        kind = one_of(data.get("kind"), KINDS, field="tipo", default="gig")
        title = clean_text(data.get("title"), MAX_TITLE, field="título", required=True)
        body = clean_text(data.get("body"), MAX_DESC, field="descrição", multiline=True)
        city = clean_text(data.get("city"), MAX_CITY, field="cidade")
        budget = clean_text(data.get("budget_note"), 120, field="cachê/observação")
        ev_date = None
        if data.get("event_date"):
            try:
                ev_date = date.fromisoformat(str(data["event_date"])[:10])
            except ValueError:
                raise SocialError("Data inválida.", "SOCIAL_DATE_INVALID") from None
        with db.get_pool().connection() as conn:
            self._require_public_profile(conn, user_id)
            band_id = None
            if data.get("band"):
                band = self.bands._by_handle(conn, str(data["band"]))
                if not band or not self.bands.is_active_admin(conn, band["id"], user_id):
                    raise Forbidden("Só administradores da banda publicam por ela.", "SOCIAL_BAND_ADMIN_REQUIRED")
                band_id = band["id"]
            open_n = conn.execute(
                "select count(*) as n from gigs where author_id = %s and status = 'open' and deleted_at is null", (user_id,),
            ).fetchone()["n"]
            if open_n >= MAX_OPEN_GIGS_PER_USER:
                raise SocialError(f"Limite de {MAX_OPEN_GIGS_PER_USER} pedidos abertos.", "SOCIAL_GIG_LIMIT")
            row = conn.execute(
                """insert into gigs (author_id, band_id, kind, title, body, city, event_date, budget_note)
                   values (%s, %s, %s, %s, %s, %s, %s, %s) returning id""",
                (user_id, band_id, kind, title, body, city, ev_date, budget),
            ).fetchone()
            return self._dict(conn.execute(f"{self._SELECT} where g.id = %s", (row["id"],)).fetchone(), user_id)

    def list_open(self, viewer_id: str | None, kind: str = "", city: str = "", q: str = "", mine: bool = False,
                  page: int = 1, page_size: int = 20) -> dict:
        page_size = clamp_limit(page_size, 20, 50)
        page = max(1, int(page or 1))
        params: dict = {"limit": page_size, "offset": (page - 1) * page_size, "viewer": viewer_id or ""}
        if mine:
            if not viewer_id:
                raise SocialError("Entre para ver seus pedidos.", "AUTH_REQUIRED")
            where = ["g.deleted_at is null", "g.author_id = %(viewer)s"]
        else:
            where = [self._VISIBLE, "g.status = 'open'",
                     """not exists (select 1 from user_blocks k where (k.blocker_id = %(viewer)s and k.blocked_id = g.author_id)
                                     or (k.blocked_id = %(viewer)s and k.blocker_id = g.author_id))"""]
        if kind in KINDS:
            where.append("g.kind = %(kind)s")
            params["kind"] = kind
        if city:
            where.append("g.city ilike %(city)s escape '\\'")
            params["city"] = like_pattern(city[:60])
        if q:
            where.append("(g.title ilike %(q)s escape '\\' or g.body ilike %(q)s escape '\\')")
            params["q"] = like_pattern(q[:60])
        with db.get_pool().connection() as conn:
            rows = conn.execute(
                f"{self._SELECT.replace('select g.id,', 'select count(*) over() as total_count, g.id,')} where {' and '.join(where)} "
                "order by g.created_at desc limit %(limit)s offset %(offset)s", params,
            ).fetchall()
        return {"items": [self._dict(r, viewer_id) for r in rows], "page": page, "page_size": page_size,
                "total": rows[0]["total_count"] if rows else 0}

    def get(self, gig_id: str, viewer_id: str | None, is_platform_admin: bool = False) -> dict:
        if not _valid_uuid(gig_id):
            raise NotFound("Pedido não encontrado.", "SOCIAL_GIG_NOT_FOUND")
        with db.get_pool().connection() as conn:
            r = conn.execute(f"{self._SELECT} where g.id = %s and g.deleted_at is null", (gig_id,)).fetchone()
            if not r:
                raise NotFound("Pedido não encontrado.", "SOCIAL_GIG_NOT_FOUND")
            if not (r["author_id"] == viewer_id or is_platform_admin):
                visible = conn.execute(
                    f"select 1 from gigs g join users u on u.id = g.author_id left join profiles pr on pr.user_id = g.author_id "
                    f"where g.id = %s and {self._VISIBLE}", (gig_id,),
                ).fetchone()
                if not visible:
                    raise NotFound("Pedido não encontrado.", "SOCIAL_GIG_NOT_FOUND")
            return self._dict(r, viewer_id, is_platform_admin)

    def _own(self, conn, user_id: str, gig_id: str, is_platform_admin: bool):
        if not _valid_uuid(gig_id):
            raise NotFound("Pedido não encontrado.", "SOCIAL_GIG_NOT_FOUND")
        r = conn.execute("select * from gigs where id = %s and deleted_at is null", (gig_id,)).fetchone()
        if not r:
            raise NotFound("Pedido não encontrado.", "SOCIAL_GIG_NOT_FOUND")
        if r["author_id"] != user_id and not is_platform_admin:
            raise Forbidden()
        return r

    def set_status(self, user_id: str, gig_id: str, status: str, is_platform_admin: bool = False) -> dict:
        status = one_of(status, ("open", "closed"), field="situação")
        with db.get_pool().connection() as conn:
            r = self._own(conn, user_id, gig_id, is_platform_admin)
            conn.execute("update gigs set status = %s where id = %s", (status, r["id"]))
        return {"status": status}

    def delete(self, user_id: str, gig_id: str, is_platform_admin: bool = False) -> None:
        with db.get_pool().connection() as conn:
            r = self._own(conn, user_id, gig_id, is_platform_admin)
            conn.execute("update gigs set deleted_at = now() where id = %s", (r["id"],))

    # ---------- respostas (mensagens privadas pro autor) ----------
    def reply(self, user_id: str, gig_id: str, message, band_handle: str | None = None) -> dict:
        text = clean_text(message, 1000, field="mensagem", required=True, multiline=True)
        with db.get_pool().connection() as conn:
            self._require_public_profile(conn, user_id)
            if not _valid_uuid(gig_id):
                raise NotFound("Pedido não encontrado.", "SOCIAL_GIG_NOT_FOUND")
            g = conn.execute(
                f"select g.* from gigs g join users u on u.id = g.author_id left join profiles pr on pr.user_id = g.author_id "
                f"where g.id = %s and {self._VISIBLE} and g.status = 'open'", (gig_id,),
            ).fetchone()
            if not g:
                raise NotFound("Pedido não encontrado ou já encerrado.", "SOCIAL_GIG_NOT_FOUND")
            if g["author_id"] == user_id:
                raise SocialError("Você não pode responder ao seu próprio pedido.", "SOCIAL_SELF_REPLY")
            if conn.execute(
                "select 1 from user_blocks where blocker_id = %s and blocked_id = %s", (g["author_id"], user_id),
            ).fetchone():
                raise NotFound("Pedido não encontrado ou já encerrado.", "SOCIAL_GIG_NOT_FOUND")
            band_id = None
            if band_handle:
                band = self.bands._by_handle(conn, str(band_handle))
                if not band or not self.bands.is_active_admin(conn, band["id"], user_id):
                    raise Forbidden("Só administradores da banda respondem por ela.", "SOCIAL_BAND_ADMIN_REQUIRED")
                band_id = band["id"]
            if conn.execute("select 1 from gig_replies where gig_id = %s and from_user = %s", (g["id"], user_id)).fetchone():
                raise Conflict("Você já respondeu a este pedido.", "SOCIAL_ALREADY_REPLIED")
            conn.execute(
                "insert into gig_replies (gig_id, from_user, band_id, message) values (%s, %s, %s, %s)",
                (g["id"], user_id, band_id, text),
            )
        return {"ok": True}

    def list_replies(self, user_id: str, gig_id: str, is_platform_admin: bool = False) -> list[dict]:
        with db.get_pool().connection() as conn:
            g = self._own(conn, user_id, gig_id, is_platform_admin)
            rows = conn.execute(
                """select r.id, r.message, r.status, r.created_at, pr.handle, coalesce(nullif(pr.display_name, ''), pr.handle) as name,
                          pr.contact, b.handle as band_handle, b.name as band_name
                   from gig_replies r join users u on u.id = r.from_user left join profiles pr on pr.user_id = r.from_user
                        left join bands b on b.id = r.band_id and b.deleted_at is null
                   where r.gig_id = %s and u.social_banned = false order by r.created_at""", (g["id"],),
            ).fetchall()
        return [{
            "id": str(r["id"]), "message": r["message"], "status": r["status"], "created_at": r["created_at"].isoformat(),
            "from": {"handle": r["handle"], "name": r["name"]}, "contact": r["contact"],
            "band": {"handle": r["band_handle"], "name": r["band_name"]} if r["band_handle"] else None,
        } for r in rows]

    def answer_reply(self, user_id: str, gig_id: str, reply_id: str, accept: bool, is_platform_admin: bool = False) -> dict:
        if not _valid_uuid(reply_id):
            raise NotFound("Resposta não encontrada.", "SOCIAL_REPLY_NOT_FOUND")
        with db.get_pool().connection() as conn:
            g = self._own(conn, user_id, gig_id, is_platform_admin)
            r = conn.execute("select id from gig_replies where id = %s and gig_id = %s", (reply_id, g["id"])).fetchone()
            if not r:
                raise NotFound("Resposta não encontrada.", "SOCIAL_REPLY_NOT_FOUND")
            conn.execute("update gig_replies set status = %s where id = %s", ("accepted" if accept else "declined", r["id"]))
        return {"status": "accepted" if accept else "declined"}
