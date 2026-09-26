"""Perfis públicos de músicos (rede social). Cada usuário pode ter UM perfil,
que nasce PRIVADO (só o dono vê) e só aparece pra outras pessoas depois que
ele o publica (visibility='public'). O contato (e-mail/telefone) só é
mostrado a quem está logado — o perfil público na web aberta nunca o expõe.

A API pública identifica o músico pelo `handle`, nunca pelo id interno."""
from __future__ import annotations

import re

import db
from services.social_common import (
    MAX_BIO, MAX_CITY, MAX_CONTACT, MAX_NAME, Conflict, Forbidden, NotFound, SocialError, clamp_limit,
    clean_handle, clean_links, clean_text, like_pattern, one_of,
)

VISIBILITIES = ("private", "public")


def suggest_handle(username: str, taken) -> str:
    """Sugestão a partir do login: só [a-z0-9_], 3-30 chars, único."""
    base = re.sub(r"[^a-z0-9_]", "", (username or "").lower())[:24] or "musico"
    if len(base) < 3:
        base = (base + "musico")[:24]
    candidate, n = base, 1
    while taken(candidate):
        n += 1
        candidate = f"{base}{n}"[:30]
    return candidate


def _profile_dict(row: dict, *, viewer_id: str | None, include_private: bool = False) -> dict:
    is_owner = viewer_id is not None and viewer_id == row["user_id"]
    out = {
        "handle": row["handle"],
        "display_name": row["display_name"] or row["handle"],
        "bio": row["bio"],
        "city": row["city"],
        "links": list(row["links"] or []),
        "visibility": row["visibility"],
        "available_for_hire": row["available_for_hire"],
        "is_owner": is_owner,
        # contato só pra quem está logado (ver docstring do módulo)
        "contact": row["contact"] if (viewer_id is not None or include_private) else "",
    }
    return out


class ProfileService:
    # ---------- consulta ----------
    def _row_by_user(self, conn, user_id: str):
        return conn.execute("select * from profiles where user_id = %s", (user_id,)).fetchone()

    def _row_by_handle(self, conn, handle: str):
        return conn.execute("select * from profiles where lower(handle) = lower(%s)", (handle,)).fetchone()

    def get_mine(self, user_id: str) -> dict:
        """Meu perfil; se ainda não existe, devolve um rascunho (não grava)."""
        with db.get_pool().connection() as conn:
            row = self._row_by_user(conn, user_id)
            if row:
                return {**_profile_dict(row, viewer_id=user_id), "exists": True}
            u = conn.execute("select username, name, city from users where id = %s", (user_id,)).fetchone()
            if not u:
                raise NotFound("Usuário não encontrado.", "SOCIAL_USER_NOT_FOUND")
            handle = suggest_handle(
                u["username"], lambda h: bool(conn.execute("select 1 from profiles where lower(handle) = %s", (h,)).fetchone()),
            )
        return {
            "handle": handle, "display_name": u["name"] or u["username"], "bio": "", "city": u["city"] or "",
            "links": [], "visibility": "private", "available_for_hire": False, "is_owner": True,
            "contact": "", "exists": False,
        }

    def save_mine(self, user_id: str, data: dict) -> dict:
        if not isinstance(data, dict):
            raise SocialError("Corpo inválido.", "SOCIAL_FIELD_INVALID")
        handle = clean_handle(data.get("handle", ""))
        display_name = clean_text(data.get("display_name"), MAX_NAME, field="nome", required=True)
        bio = clean_text(data.get("bio"), MAX_BIO, field="bio", multiline=True)
        city = clean_text(data.get("city"), MAX_CITY, field="cidade")
        links = clean_links(data.get("links"))
        contact = clean_text(data.get("contact"), MAX_CONTACT, field="contato")
        visibility = one_of(data.get("visibility"), VISIBILITIES, field="visibilidade", default="private")
        hire = bool(data.get("available_for_hire"))
        with db.get_pool().connection() as conn:
            banned = conn.execute("select social_banned from users where id = %s", (user_id,)).fetchone()
            if not banned:
                raise NotFound("Usuário não encontrado.", "SOCIAL_USER_NOT_FOUND")
            if banned["social_banned"] and visibility == "public":
                raise Forbidden("Sua conta está suspensa na comunidade.", "SOCIAL_BANNED")
            clash = conn.execute(
                "select user_id from profiles where lower(handle) = %s and user_id <> %s", (handle, user_id),
            ).fetchone()
            if clash:
                raise Conflict("Este identificador já está em uso.", "SOCIAL_HANDLE_TAKEN")
            conn.execute(
                """insert into profiles (user_id, handle, display_name, bio, city, links, visibility, contact, available_for_hire)
                   values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                   on conflict (user_id) do update set handle = excluded.handle, display_name = excluded.display_name,
                       bio = excluded.bio, city = excluded.city, links = excluded.links, visibility = excluded.visibility,
                       contact = excluded.contact, available_for_hire = excluded.available_for_hire, updated_at = now()""",
                (user_id, handle, display_name, bio, city, links, visibility, contact, hire),
            )
            row = self._row_by_user(conn, user_id)
        return {**_profile_dict(row, viewer_id=user_id), "exists": True}

    def can_be_seen(self, row: dict, viewer_id: str | None, is_admin: bool = False) -> bool:
        return row["visibility"] == "public" or (viewer_id is not None and viewer_id == row["user_id"]) or is_admin

    def get_public(self, handle: str, viewer_id: str | None, is_admin: bool = False) -> dict:
        with db.get_pool().connection() as conn:
            row = self._row_by_handle(conn, handle)
            # perfil privado responde igual a "não existe" (não confirma o handle)
            if not row or not self.can_be_seen(row, viewer_id, is_admin):
                raise NotFound("Perfil não encontrado.", "SOCIAL_PROFILE_NOT_FOUND")
            banned = conn.execute("select social_banned from users where id = %s", (row["user_id"],)).fetchone()
            if banned and banned["social_banned"] and not is_admin and viewer_id != row["user_id"]:
                raise NotFound("Perfil não encontrado.", "SOCIAL_PROFILE_NOT_FOUND")
            if viewer_id and viewer_id != row["user_id"] and conn.execute(
                "select 1 from user_blocks where blocker_id = %s and blocked_id = %s", (row["user_id"], viewer_id),
            ).fetchone():
                raise NotFound("Perfil não encontrado.", "SOCIAL_PROFILE_NOT_FOUND")
            out = _profile_dict(row, viewer_id=viewer_id)
            out["followers"] = conn.execute(
                "select count(*) as n from follows where target_kind = 'user' and target_id = %s", (row["user_id"],),
            ).fetchone()["n"]
            out["is_following"] = bool(viewer_id and conn.execute(
                "select 1 from follows where follower_id = %s and target_kind = 'user' and target_id = %s",
                (viewer_id, row["user_id"]),
            ).fetchone())
            out["instruments"] = [r["instrument"] for r in conn.execute(
                "select instrument from user_instruments where user_id = %s order by instrument", (row["user_id"],),
            ).fetchall()]
            bands = conn.execute(
                """select b.handle, b.name, b.genre, b.city, m.role, m.instrument
                   from band_members m join bands b on b.id = m.band_id
                   where m.user_id = %s and m.status = 'active' and b.deleted_at is null and b.visibility = 'public'
                   order by b.name""",
                (row["user_id"],),
            ).fetchall()
            out["bands"] = [dict(b) for b in bands]
        return out

    def search(self, q: str = "", city: str = "", instrument: str = "", hire_only: bool = False,
               page: int = 1, page_size: int = 20) -> dict:
        page_size = clamp_limit(page_size, 20, 50)
        page = max(1, int(page or 1))
        where = ["p.visibility = 'public'", "coalesce(u.social_banned, false) = false"]
        params: dict = {"limit": page_size, "offset": (page - 1) * page_size}
        if q:
            where.append("(p.display_name ilike %(q)s escape '\\' or p.handle ilike %(q)s escape '\\')")
            params["q"] = like_pattern(q[:60])
        if city:
            where.append("p.city ilike %(city)s escape '\\'")
            params["city"] = like_pattern(city[:60])
        if instrument:
            where.append("exists (select 1 from user_instruments i where i.user_id = p.user_id and i.instrument = %(instr)s)")
            params["instr"] = instrument[:30]
        if hire_only:
            where.append("p.available_for_hire = true")
        sql = f"""select p.handle, p.display_name, p.city, p.bio, p.available_for_hire, count(*) over() as total_count
                  from profiles p join users u on u.id = p.user_id
                  where {' and '.join(where)}
                  order by p.updated_at desc, p.handle limit %(limit)s offset %(offset)s"""
        with db.get_pool().connection() as conn:
            rows = conn.execute(sql, params).fetchall()
        return {
            "items": [{"handle": r["handle"], "display_name": r["display_name"] or r["handle"], "city": r["city"],
                       "bio": r["bio"][:160], "available_for_hire": r["available_for_hire"]} for r in rows],
            "page": page, "page_size": page_size, "total": rows[0]["total_count"] if rows else 0,
        }
