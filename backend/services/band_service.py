"""Bandas da rede social. Uma banda é formada por músicos (integrantes).

Regras:
 * quem cria vira integrante ATIVO com papel 'admin';
 * outros entram por CONVITE (por @handle público ou login) e só passam a
   valer quando aceitam — ninguém é colocado numa banda sem querer;
 * a banda nasce PRIVADA e só pode ser PUBLICADA com 2+ integrantes ativos;
 * sempre resta pelo menos 1 admin ativo (não dá pra sair/rebaixar o último);
 * só admin da banda edita, convida, remove, publica ou exclui (soft delete)."""
from __future__ import annotations

import db
from services.social_common import (
    MAX_BIO, MAX_CITY, MAX_CONTACT, MAX_NAME, Conflict, Forbidden, NotFound, SocialError, clamp_limit,
    clean_handle, clean_links, clean_text, like_pattern, one_of,
)

ROLES = ("admin", "member")
MIN_MEMBERS_TO_PUBLISH = 2
MAX_ACTIVE_BANDS_PER_USER = 10
MAX_PENDING_INVITES_PER_BAND = 20


def _band_dict(row: dict, *, viewer_id: str | None, member: dict | None, members_count: int) -> dict:
    is_member = bool(member and member["status"] == "active")
    return {
        "handle": row["handle"], "name": row["name"], "bio": row["bio"], "city": row["city"], "genre": row["genre"],
        "links": list(row["links"] or []), "visibility": row["visibility"],
        "contact": row["contact"] if viewer_id is not None else "",
        "members_count": members_count,
        "my_role": member["role"] if is_member else None,
        "my_status": member["status"] if member else None,
        "can_manage": bool(is_member and member["role"] == "admin"),
    }


class BandService:
    # ---------- helpers ----------
    def _by_handle(self, conn, handle: str):
        return conn.execute(
            "select * from bands where lower(handle) = lower(%s) and deleted_at is null", (handle,),
        ).fetchone()

    def _membership(self, conn, band_id, user_id: str | None):
        if not user_id:
            return None
        return conn.execute(
            "select * from band_members where band_id = %s and user_id = %s", (band_id, user_id),
        ).fetchone()

    def _active_count(self, conn, band_id) -> int:
        return conn.execute(
            "select count(*) as n from band_members where band_id = %s and status = 'active'", (band_id,),
        ).fetchone()["n"]

    def _require_admin(self, conn, handle: str, user_id: str, is_platform_admin: bool = False):
        band = self._by_handle(conn, handle)
        if not band:
            raise NotFound("Banda não encontrada.", "SOCIAL_BAND_NOT_FOUND")
        m = self._membership(conn, band["id"], user_id)
        if not is_platform_admin and not (m and m["status"] == "active" and m["role"] == "admin"):
            # quem nem é da banda recebe o mesmo "não encontrada" (não vaza banda privada)
            if not m and band["visibility"] != "public":
                raise NotFound("Banda não encontrada.", "SOCIAL_BAND_NOT_FOUND")
            raise Forbidden("Só administradores da banda podem fazer isso.", "SOCIAL_BAND_ADMIN_REQUIRED")
        return band

    def _last_admin(self, conn, band_id, user_id: str) -> bool:
        """user_id é o único admin ativo?"""
        admins = conn.execute(
            "select user_id from band_members where band_id = %s and status = 'active' and role = 'admin'", (band_id,),
        ).fetchall()
        return len(admins) == 1 and admins[0]["user_id"] == user_id

    # ---------- criação / edição ----------
    def create(self, user_id: str, data: dict) -> dict:
        if not isinstance(data, dict):
            raise SocialError("Corpo inválido.", "SOCIAL_FIELD_INVALID")
        handle = clean_handle(data.get("handle", ""), field="identificador da banda")
        name = clean_text(data.get("name"), MAX_NAME, field="nome da banda", required=True)
        bio = clean_text(data.get("bio"), MAX_BIO, field="bio", multiline=True)
        city = clean_text(data.get("city"), MAX_CITY, field="cidade")
        genre = clean_text(data.get("genre"), 60, field="gênero")
        links = clean_links(data.get("links"))
        contact = clean_text(data.get("contact"), MAX_CONTACT, field="contato")
        instrument = clean_text(data.get("my_instrument"), 40, field="seu instrumento")
        with db.get_pool().connection() as conn:
            u = conn.execute("select social_banned from users where id = %s", (user_id,)).fetchone()
            if not u:
                raise NotFound("Usuário não encontrado.", "SOCIAL_USER_NOT_FOUND")
            if u["social_banned"]:
                raise Forbidden("Sua conta está suspensa na comunidade.", "SOCIAL_BANNED")
            mine = conn.execute(
                """select count(*) as n from band_members m join bands b on b.id = m.band_id
                   where m.user_id = %s and m.status = 'active' and b.deleted_at is null""", (user_id,),
            ).fetchone()["n"]
            if mine >= MAX_ACTIVE_BANDS_PER_USER:
                raise SocialError(f"Limite de {MAX_ACTIVE_BANDS_PER_USER} bandas por pessoa.", "SOCIAL_BAND_LIMIT")
            if conn.execute("select 1 from bands where lower(handle) = %s and deleted_at is null", (handle,)).fetchone():
                raise Conflict("Este identificador já está em uso.", "SOCIAL_HANDLE_TAKEN")
            row = conn.execute(
                """insert into bands (handle, name, bio, city, genre, links, contact, created_by)
                   values (%s, %s, %s, %s, %s, %s, %s, %s) returning *""",
                (handle, name, bio, city, genre, links, contact, user_id),
            ).fetchone()
            conn.execute(
                """insert into band_members (band_id, user_id, role, instrument, status, invited_by, joined_at)
                   values (%s, %s, 'admin', %s, 'active', %s, now())""",
                (row["id"], user_id, instrument, user_id),
            )
            member = self._membership(conn, row["id"], user_id)
        return _band_dict(row, viewer_id=user_id, member=member, members_count=1)

    def update(self, user_id: str, handle: str, data: dict, is_platform_admin: bool = False) -> dict:
        if not isinstance(data, dict):
            raise SocialError("Corpo inválido.", "SOCIAL_FIELD_INVALID")
        with db.get_pool().connection() as conn:
            band = self._require_admin(conn, handle, user_id, is_platform_admin)
            name = clean_text(data.get("name", band["name"]), MAX_NAME, field="nome da banda", required=True)
            bio = clean_text(data.get("bio", band["bio"]), MAX_BIO, field="bio", multiline=True)
            city = clean_text(data.get("city", band["city"]), MAX_CITY, field="cidade")
            genre = clean_text(data.get("genre", band["genre"]), 60, field="gênero")
            links = clean_links(data.get("links", band["links"]))
            contact = clean_text(data.get("contact", band["contact"]), MAX_CONTACT, field="contato")
            visibility = one_of(data.get("visibility", band["visibility"]), ("private", "public"), field="visibilidade")
            if visibility == "public" and self._active_count(conn, band["id"]) < MIN_MEMBERS_TO_PUBLISH:
                raise SocialError(
                    f"Uma banda só pode ser publicada com {MIN_MEMBERS_TO_PUBLISH} ou mais integrantes ativos.",
                    "SOCIAL_BAND_TOO_SMALL",
                )
            row = conn.execute(
                """update bands set name = %s, bio = %s, city = %s, genre = %s, links = %s, contact = %s,
                       visibility = %s, updated_at = now() where id = %s returning *""",
                (name, bio, city, genre, links, contact, visibility, band["id"]),
            ).fetchone()
            member = self._membership(conn, band["id"], user_id)
            count = self._active_count(conn, band["id"])
        return _band_dict(row, viewer_id=user_id, member=member, members_count=count)

    def delete(self, user_id: str, handle: str, is_platform_admin: bool = False) -> None:
        with db.get_pool().connection() as conn:
            band = self._require_admin(conn, handle, user_id, is_platform_admin)
            conn.execute("update bands set deleted_at = now(), visibility = 'private' where id = %s", (band["id"],))

    # ---------- leitura ----------
    def get(self, handle: str, viewer_id: str | None, is_platform_admin: bool = False) -> dict:
        with db.get_pool().connection() as conn:
            band = self._by_handle(conn, handle)
            member = self._membership(conn, band["id"], viewer_id) if band else None
            visible = band and (band["visibility"] == "public" or member or is_platform_admin)
            if not visible:
                raise NotFound("Banda não encontrada.", "SOCIAL_BAND_NOT_FOUND")
            out = _band_dict(band, viewer_id=viewer_id, member=member, members_count=self._active_count(conn, band["id"]))
            out["followers"] = conn.execute(
                "select count(*) as n from follows where target_kind = 'band' and target_id = %s", (str(band["id"]),),
            ).fetchone()["n"]
            out["is_following"] = bool(viewer_id and conn.execute(
                "select 1 from follows where follower_id = %s and target_kind = 'band' and target_id = %s",
                (viewer_id, str(band["id"])),
            ).fetchone())
        out["members"] = self.members(handle, viewer_id, is_platform_admin)
        return out

    def members(self, handle: str, viewer_id: str | None, is_platform_admin: bool = False) -> list[dict]:
        """Integrantes ativos com perfil público visível; admin da banda vê também os convites pendentes."""
        with db.get_pool().connection() as conn:
            band = self._by_handle(conn, handle)
            me = self._membership(conn, band["id"], viewer_id) if band else None
            if not band or not (band["visibility"] == "public" or me or is_platform_admin):
                raise NotFound("Banda não encontrada.", "SOCIAL_BAND_NOT_FOUND")
            manage = is_platform_admin or bool(me and me["status"] == "active" and me["role"] == "admin")
            rows = conn.execute(
                """select m.user_id, m.role, m.instrument, m.status, u.username, u.name, p.handle as profile_handle,
                          coalesce(p.visibility, 'private') as profile_visibility, p.display_name
                   from band_members m join users u on u.id = m.user_id
                        left join profiles p on p.user_id = m.user_id
                   where m.band_id = %s and (m.status = 'active' or %s)
                   order by m.status, m.role, u.name""",
                (band["id"], manage),
            ).fetchall()
        out = []
        for r in rows:
            public = r["profile_visibility"] == "public"
            out.append({
                "role": r["role"], "instrument": r["instrument"], "status": r["status"],
                # nome de exibição só sai se o perfil do integrante é público (ou pra quem administra a banda)
                "display_name": (r["display_name"] or r["name"]) if (public or manage or r["user_id"] == viewer_id) else "Integrante",
                "profile_handle": r["profile_handle"] if public else None,
                # login só pra quem administra a banda (alvo de "remover"/"promover" de quem não tem perfil público)
                "login": r["username"] if manage else None,
                "is_me": r["user_id"] == viewer_id,
            })
        return out

    def list_mine(self, user_id: str) -> dict:
        with db.get_pool().connection() as conn:
            rows = conn.execute(
                """select b.handle, b.name, b.genre, b.city, b.visibility, m.role, m.status
                   from band_members m join bands b on b.id = m.band_id
                   where m.user_id = %s and b.deleted_at is null order by m.status, b.name""",
                (user_id,),
            ).fetchall()
        active = [dict(r) for r in rows if r["status"] == "active"]
        invites = [dict(r) for r in rows if r["status"] == "invited"]
        return {"bands": active, "invites": invites}

    def search(self, q: str = "", city: str = "", genre: str = "", page: int = 1, page_size: int = 20) -> dict:
        page_size = clamp_limit(page_size, 20, 50)
        page = max(1, int(page or 1))
        where = ["b.deleted_at is null", "b.visibility = 'public'"]
        params: dict = {"limit": page_size, "offset": (page - 1) * page_size}
        for key, col, val in (("q", "b.name", q), ("city", "b.city", city), ("genre", "b.genre", genre)):
            if val:
                where.append(f"{col} ilike %({key})s escape '\\'")
                params[key] = like_pattern(val[:60])
        sql = f"""select b.handle, b.name, b.genre, b.city, left(b.bio, 160) as bio, count(*) over() as total_count
                  from bands b where {' and '.join(where)} order by b.updated_at desc, b.handle
                  limit %(limit)s offset %(offset)s"""
        with db.get_pool().connection() as conn:
            rows = conn.execute(sql, params).fetchall()
        return {"items": [{k: r[k] for k in ("handle", "name", "genre", "city", "bio")} for r in rows],
                "page": page, "page_size": page_size, "total": rows[0]["total_count"] if rows else 0}

    # ---------- integrantes ----------
    def invite(self, user_id: str, handle: str, target: str, role: str = "member", instrument: str = "",
               is_platform_admin: bool = False) -> dict:
        """Convida por @handle público OU login. Responde igual se o alvo não
        existe ou não pode ser convidado (não permite descobrir logins)."""
        role = one_of(role, ROLES, field="papel", default="member")
        instrument = clean_text(instrument, 40, field="instrumento")
        target = clean_text(target, 60, field="pessoa", required=True).lstrip("@").lower()
        with db.get_pool().connection() as conn:
            band = self._require_admin(conn, handle, user_id, is_platform_admin)
            pending = conn.execute(
                "select count(*) as n from band_members where band_id = %s and status = 'invited'", (band["id"],),
            ).fetchone()["n"]
            if pending >= MAX_PENDING_INVITES_PER_BAND:
                raise SocialError("Convites pendentes demais — aguarde respostas.", "SOCIAL_INVITE_LIMIT")
            person = conn.execute(
                """select u.id, u.social_banned from users u left join profiles p on p.user_id = u.id
                   where lower(u.username) = %(t)s or (p.visibility = 'public' and lower(p.handle) = %(t)s) limit 1""",
                {"t": target},
            ).fetchone()
            if not person or person["social_banned"] or person["id"] == user_id:
                raise NotFound("Não encontramos essa pessoa para convidar.", "SOCIAL_INVITE_TARGET_NOT_FOUND")
            if conn.execute(
                "select 1 from user_blocks where blocker_id = %s and blocked_id = %s", (person["id"], user_id),
            ).fetchone():
                raise NotFound("Não encontramos essa pessoa para convidar.", "SOCIAL_INVITE_TARGET_NOT_FOUND")
            existing = self._membership(conn, band["id"], person["id"])
            if existing and existing["status"] == "active":
                raise Conflict("Essa pessoa já está na banda.", "SOCIAL_ALREADY_MEMBER")
            if not existing:
                conn.execute(
                    """insert into band_members (band_id, user_id, role, instrument, status, invited_by)
                       values (%s, %s, %s, %s, 'invited', %s)""",
                    (band["id"], person["id"], role, instrument, user_id),
                )
        return {"ok": True}

    def respond_to_invite(self, user_id: str, handle: str, accept: bool) -> dict:
        with db.get_pool().connection() as conn:
            band = self._by_handle(conn, handle)
            m = self._membership(conn, band["id"], user_id) if band else None
            if not m or m["status"] != "invited":
                raise NotFound("Convite não encontrado.", "SOCIAL_INVITE_NOT_FOUND")
            if accept:
                u = conn.execute("select social_banned from users where id = %s", (user_id,)).fetchone()
                if u and u["social_banned"]:
                    raise Forbidden("Sua conta está suspensa na comunidade.", "SOCIAL_BANNED")
                conn.execute(
                    "update band_members set status = 'active', joined_at = now() where band_id = %s and user_id = %s",
                    (band["id"], user_id),
                )
            else:
                conn.execute("delete from band_members where band_id = %s and user_id = %s", (band["id"], user_id))
        return {"ok": True, "accepted": bool(accept)}

    def set_member(self, user_id: str, handle: str, member_profile_or_login: str, *, role: str | None = None,
                   instrument: str | None = None, is_platform_admin: bool = False) -> dict:
        """Admin altera papel/instrumento de um integrante ativo (procurado por @handle público ou login)."""
        target = clean_text(member_profile_or_login, 60, field="pessoa", required=True).lstrip("@").lower()
        with db.get_pool().connection() as conn:
            band = self._require_admin(conn, handle, user_id, is_platform_admin)
            row = conn.execute(
                """select m.user_id from band_members m join users u on u.id = m.user_id
                        left join profiles p on p.user_id = m.user_id
                   where m.band_id = %(b)s and m.status = 'active' and (lower(u.username) = %(t)s or lower(p.handle) = %(t)s)""",
                {"b": band["id"], "t": target},
            ).fetchone()
            if not row:
                raise NotFound("Integrante não encontrado.", "SOCIAL_MEMBER_NOT_FOUND")
            if role is not None:
                role = one_of(role, ROLES, field="papel")
                if role != "admin" and self._last_admin(conn, band["id"], row["user_id"]):
                    raise SocialError("A banda precisa de pelo menos um administrador.", "SOCIAL_LAST_ADMIN")
                conn.execute("update band_members set role = %s where band_id = %s and user_id = %s",
                             (role, band["id"], row["user_id"]))
            if instrument is not None:
                conn.execute("update band_members set instrument = %s where band_id = %s and user_id = %s",
                             (clean_text(instrument, 40, field="instrumento"), band["id"], row["user_id"]))
        return {"ok": True}

    def leave(self, user_id: str, handle: str) -> None:
        with db.get_pool().connection() as conn:
            band = self._by_handle(conn, handle)
            m = self._membership(conn, band["id"], user_id) if band else None
            if not m or m["status"] != "active":
                raise NotFound("Você não está nesta banda.", "SOCIAL_NOT_A_MEMBER")
            if self._last_admin(conn, band["id"], user_id) and self._active_count(conn, band["id"]) > 1:
                raise SocialError("Passe a administração para outra pessoa antes de sair.", "SOCIAL_LAST_ADMIN")
            conn.execute("delete from band_members where band_id = %s and user_id = %s", (band["id"], user_id))
            remaining = self._active_count(conn, band["id"])
            if remaining == 0:  # ninguém sobrou: a banda é encerrada
                conn.execute("update bands set deleted_at = now(), visibility = 'private' where id = %s", (band["id"],))
            elif remaining < MIN_MEMBERS_TO_PUBLISH:  # deixou de ter 2 integrantes: volta a ser privada
                conn.execute("update bands set visibility = 'private' where id = %s", (band["id"],))

    def remove_member(self, user_id: str, handle: str, target: str, is_platform_admin: bool = False) -> None:
        target = clean_text(target, 60, field="pessoa", required=True).lstrip("@").lower()
        with db.get_pool().connection() as conn:
            band = self._require_admin(conn, handle, user_id, is_platform_admin)
            row = conn.execute(
                """select m.user_id, m.status from band_members m join users u on u.id = m.user_id
                        left join profiles p on p.user_id = m.user_id
                   where m.band_id = %(b)s and (lower(u.username) = %(t)s or lower(p.handle) = %(t)s)""",
                {"b": band["id"], "t": target},
            ).fetchone()
            if not row:
                raise NotFound("Integrante não encontrado.", "SOCIAL_MEMBER_NOT_FOUND")
            if row["status"] == "active" and self._last_admin(conn, band["id"], row["user_id"]):
                raise SocialError("A banda precisa de pelo menos um administrador.", "SOCIAL_LAST_ADMIN")
            conn.execute("delete from band_members where band_id = %s and user_id = %s", (band["id"], row["user_id"]))
            if self._active_count(conn, band["id"]) < MIN_MEMBERS_TO_PUBLISH:
                conn.execute("update bands set visibility = 'private' where id = %s", (band["id"],))

    # ---------- usado por outros serviços ----------
    def is_active_admin(self, conn, band_id, user_id: str) -> bool:
        m = self._membership(conn, band_id, user_id)
        return bool(m and m["status"] == "active" and m["role"] == "admin")
