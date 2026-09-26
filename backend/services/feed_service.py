"""Feed da rede social: postagens, curtidas, comentários, seguir e bloquear.

Visibilidade — só existe conteúdo PÚBLICO na rede:
 * post de músico só é criado/visível se o perfil dele está público;
 * post de banda só se a banda está pública;
 * conta suspensa (users.social_banned), post/comentário ocultado pela
   moderação (hidden) ou apagado (deleted_at) somem pra todo mundo;
 * bloqueio é nos dois sentidos: quem bloqueou não vê o bloqueado e vice-versa.

Feed cronológico (sem algoritmo), paginado por cursor (created_at, id)."""
from __future__ import annotations

import uuid
from datetime import datetime

import db
from services.social_common import (
    MAX_COMMENT, MAX_POST, Conflict, Forbidden, NotFound, SocialError, clamp_limit, clean_text, clean_url,
    one_of, youtube_id_from,
)

POST_KINDS = ("text", "show", "release")
MAX_FOLLOWS = 500

# colunas + joins de leitura — usados por todas as listagens de post
_POST_SELECT = """
    select p.id, p.kind, p.body, p.link_url, p.youtube_id, p.created_at, p.author_id, p.band_id,
           pr.handle as user_handle, coalesce(nullif(pr.display_name, ''), pr.handle) as user_name,
           b.handle as band_handle, b.name as band_name,
           (select count(*) from post_likes l where l.post_id = p.id) as like_count,
           (select count(*) from post_comments c where c.post_id = p.id and c.deleted_at is null and c.hidden = false) as comment_count,
           exists (select 1 from post_likes l where l.post_id = p.id and l.user_id = %(viewer)s) as liked
    from posts p
    join users u on u.id = p.author_id
    left join profiles pr on pr.user_id = p.author_id
    left join bands b on b.id = p.band_id and b.deleted_at is null
"""
_VISIBLE = """
    p.deleted_at is null and p.hidden = false and u.social_banned = false
    and ((p.band_id is null and pr.visibility = 'public') or (p.band_id is not null and b.visibility = 'public'))
    and not exists (select 1 from user_blocks k where (k.blocker_id = %(viewer)s and k.blocked_id = p.author_id)
                                                     or (k.blocked_id = %(viewer)s and k.blocker_id = p.author_id))
"""


def _cursor(created_at: datetime, row_id) -> str:
    return f"{created_at.isoformat()}|{row_id}"


def _parse_cursor(value: str | None):
    if not value:
        return None
    try:
        ts, rid = value.split("|", 1)
        uuid.UUID(rid)
        return datetime.fromisoformat(ts), rid
    except (ValueError, TypeError):
        raise SocialError("Cursor inválido.", "SOCIAL_CURSOR_INVALID") from None


class FeedService:
    def __init__(self, bands=None):
        self.bands = bands  # BandService (injetado)

    # ---------- montagem ----------
    def _post_dict(self, r: dict, viewer_id: str | None, can_delete: bool) -> dict:
        is_band = r["band_id"] is not None
        return {
            "id": str(r["id"]), "kind": r["kind"], "body": r["body"], "link_url": r["link_url"],
            "youtube_id": r["youtube_id"], "created_at": r["created_at"].isoformat(),
            "author": ({"type": "band", "handle": r["band_handle"], "name": r["band_name"]} if is_band
                       else {"type": "user", "handle": r["user_handle"], "name": r["user_name"]}),
            "likes": r["like_count"], "comments": r["comment_count"], "liked": bool(r["liked"]),
            "can_delete": can_delete,
        }

    def _can_delete(self, conn, r: dict, viewer_id: str | None, is_platform_admin: bool) -> bool:
        if not viewer_id:
            return False
        if is_platform_admin or r["author_id"] == viewer_id:
            return True
        return bool(r["band_id"] and self.bands.is_active_admin(conn, r["band_id"], viewer_id))

    def _one(self, conn, post_id: str, viewer_id: str | None):
        try:
            uuid.UUID(str(post_id))
        except ValueError:
            return None
        return conn.execute(
            f"{_POST_SELECT} where p.id = %(id)s and {_VISIBLE}", {"id": post_id, "viewer": viewer_id or ""},
        ).fetchone()

    # ---------- posts ----------
    def create_post(self, user_id: str, data: dict, is_platform_admin: bool = False) -> dict:
        if not isinstance(data, dict):
            raise SocialError("Corpo inválido.", "SOCIAL_FIELD_INVALID")
        body = clean_text(data.get("body"), MAX_POST, field="texto", multiline=True)
        link = clean_url(data.get("link_url"), field="link")
        yt = youtube_id_from(data.get("youtube"))
        kind = one_of(data.get("kind"), POST_KINDS, field="tipo", default="text")
        if not (body or link or yt):
            raise SocialError("Escreva algo, ou adicione um link ou vídeo.", "SOCIAL_POST_EMPTY")
        band_handle = data.get("band")
        with db.get_pool().connection() as conn:
            u = conn.execute("select social_banned from users where id = %s", (user_id,)).fetchone()
            if not u:
                raise NotFound("Usuário não encontrado.", "SOCIAL_USER_NOT_FOUND")
            if u["social_banned"]:
                raise Forbidden("Sua conta está suspensa na comunidade.", "SOCIAL_BANNED")
            band_id = None
            if band_handle:
                band = self.bands._by_handle(conn, str(band_handle))
                if not band or not self.bands.is_active_admin(conn, band["id"], user_id):
                    raise Forbidden("Só administradores da banda publicam por ela.", "SOCIAL_BAND_ADMIN_REQUIRED")
                if band["visibility"] != "public":
                    raise SocialError("Publique a banda antes de postar por ela.", "SOCIAL_BAND_NOT_PUBLIC")
                band_id = band["id"]
            else:
                prof = conn.execute("select visibility from profiles where user_id = %s", (user_id,)).fetchone()
                if not prof or prof["visibility"] != "public":
                    raise SocialError("Publique seu perfil para postar na comunidade.", "SOCIAL_PROFILE_NOT_PUBLIC")
            row = conn.execute(
                """insert into posts (author_id, band_id, kind, body, link_url, youtube_id) values (%s, %s, %s, %s, %s, %s)
                   returning id""",
                (user_id, band_id, kind, body, link, yt),
            ).fetchone()
            r = self._one(conn, str(row["id"]), user_id)
            return self._post_dict(r, user_id, True)

    def delete_post(self, user_id: str, post_id: str, is_platform_admin: bool = False) -> None:
        with db.get_pool().connection() as conn:
            r = self._one(conn, post_id, user_id)
            if not r:
                raise NotFound("Post não encontrado.", "SOCIAL_POST_NOT_FOUND")
            if not self._can_delete(conn, r, user_id, is_platform_admin):
                raise Forbidden()
            conn.execute("update posts set deleted_at = now() where id = %s", (r["id"],))

    def get_post(self, post_id: str, viewer_id: str | None, is_platform_admin: bool = False) -> dict:
        with db.get_pool().connection() as conn:
            r = self._one(conn, post_id, viewer_id)
            if not r:
                raise NotFound("Post não encontrado.", "SOCIAL_POST_NOT_FOUND")
            return self._post_dict(r, viewer_id, self._can_delete(conn, r, viewer_id, is_platform_admin))

    def feed(self, viewer_id: str | None, scope: str = "explore", handle: str = "", cursor: str | None = None,
             limit: int = 20, is_platform_admin: bool = False) -> dict:
        scope = one_of(scope, ("explore", "following", "user", "band"), field="feed", default="explore")
        limit = clamp_limit(limit, 20, 50)
        cur = _parse_cursor(cursor)
        params: dict = {"viewer": viewer_id or "", "limit": limit + 1}
        extra = ""
        if scope == "following":
            if not viewer_id:
                raise SocialError("Entre para ver quem você segue.", "AUTH_REQUIRED")
            extra = """and (p.author_id = %(viewer)s
                        or (p.band_id is null and exists (select 1 from follows f where f.follower_id = %(viewer)s
                                                            and f.target_kind = 'user' and f.target_id = p.author_id))
                        or (p.band_id is not null and exists (select 1 from follows f where f.follower_id = %(viewer)s
                                                                and f.target_kind = 'band' and f.target_id = p.band_id::text)))"""
        elif scope == "user":
            extra = "and p.band_id is null and lower(pr.handle) = lower(%(handle)s)"
            params["handle"] = handle
        elif scope == "band":
            extra = "and lower(b.handle) = lower(%(handle)s)"
            params["handle"] = handle
        if cur:
            extra += " and (p.created_at, p.id) < (%(c_ts)s, %(c_id)s::uuid)"
            params["c_ts"], params["c_id"] = cur
        with db.get_pool().connection() as conn:
            rows = conn.execute(
                f"{_POST_SELECT} where {_VISIBLE} {extra} order by p.created_at desc, p.id desc limit %(limit)s", params,
            ).fetchall()
            more = len(rows) > limit
            rows = rows[:limit]
            items = [self._post_dict(r, viewer_id, self._can_delete(conn, r, viewer_id, is_platform_admin)) for r in rows]
        return {"items": items, "next_cursor": _cursor(rows[-1]["created_at"], rows[-1]["id"]) if (rows and more) else None}

    # ---------- curtidas ----------
    def set_like(self, user_id: str, post_id: str, liked: bool) -> dict:
        with db.get_pool().connection() as conn:
            r = self._one(conn, post_id, user_id)
            if not r:
                raise NotFound("Post não encontrado.", "SOCIAL_POST_NOT_FOUND")
            if liked:
                conn.execute("insert into post_likes (post_id, user_id) values (%s, %s) on conflict do nothing", (r["id"], user_id))
            else:
                conn.execute("delete from post_likes where post_id = %s and user_id = %s", (r["id"], user_id))
            n = conn.execute("select count(*) as n from post_likes where post_id = %s", (r["id"],)).fetchone()["n"]
        return {"liked": bool(liked), "likes": n}

    # ---------- comentários ----------
    def add_comment(self, user_id: str, post_id: str, body) -> dict:
        text = clean_text(body, MAX_COMMENT, field="comentário", required=True, multiline=True)
        with db.get_pool().connection() as conn:
            u = conn.execute("select social_banned from users where id = %s", (user_id,)).fetchone()
            if not u or u["social_banned"]:
                raise Forbidden("Sua conta está suspensa na comunidade.", "SOCIAL_BANNED")
            r = self._one(conn, post_id, user_id)
            if not r:
                raise NotFound("Post não encontrado.", "SOCIAL_POST_NOT_FOUND")
            c = conn.execute(
                "insert into post_comments (post_id, user_id, body) values (%s, %s, %s) returning id, created_at",
                (r["id"], user_id, text),
            ).fetchone()
            return self._comment_dict(conn, str(c["id"]), user_id, False)

    def _comment_dict(self, conn, comment_id: str, viewer_id: str | None, is_platform_admin: bool) -> dict:
        r = conn.execute(
            """select c.id, c.body, c.created_at, c.user_id, c.post_id, p.author_id as post_author, p.band_id as post_band,
                      pr.handle, coalesce(nullif(pr.display_name, ''), pr.handle, 'Músico') as name,
                      coalesce(pr.visibility, 'private') as vis
               from post_comments c join posts p on p.id = c.post_id left join profiles pr on pr.user_id = c.user_id
               where c.id = %s""", (comment_id,),
        ).fetchone()
        can = bool(viewer_id) and (
            is_platform_admin or r["user_id"] == viewer_id or r["post_author"] == viewer_id
            or bool(r["post_band"] and self.bands.is_active_admin(conn, r["post_band"], viewer_id))
        )
        return {
            "id": str(r["id"]), "body": r["body"], "created_at": r["created_at"].isoformat(),
            # quem comenta sem perfil público aparece sem link/handle
            "author": {"handle": r["handle"] if r["vis"] == "public" else None, "name": r["name"] if r["vis"] == "public" else "Músico"},
            "can_delete": can,
        }

    def list_comments(self, post_id: str, viewer_id: str | None, cursor: str | None = None, limit: int = 30,
                      is_platform_admin: bool = False) -> dict:
        limit = clamp_limit(limit, 30, 100)
        cur = _parse_cursor(cursor)  # ascendente: cursor = (created_at, id) do último já mostrado
        with db.get_pool().connection() as conn:
            r = self._one(conn, post_id, viewer_id)
            if not r:
                raise NotFound("Post não encontrado.", "SOCIAL_POST_NOT_FOUND")
            params: dict = {"post": r["id"], "viewer": viewer_id or "", "limit": limit + 1}
            extra = ""
            if cur:
                extra = "and (c.created_at, c.id) > (%(c_ts)s, %(c_id)s::uuid)"
                params["c_ts"], params["c_id"] = cur
            rows = conn.execute(
                f"""select c.id, c.created_at from post_comments c join users u on u.id = c.user_id
                    where c.post_id = %(post)s and c.deleted_at is null and c.hidden = false and u.social_banned = false
                      and not exists (select 1 from user_blocks k where (k.blocker_id = %(viewer)s and k.blocked_id = c.user_id)
                                                                     or (k.blocked_id = %(viewer)s and k.blocker_id = c.user_id))
                      {extra} order by c.created_at, c.id limit %(limit)s""", params,
            ).fetchall()
            more = len(rows) > limit
            rows = rows[:limit]
            items = [self._comment_dict(conn, str(c["id"]), viewer_id, is_platform_admin) for c in rows]
        return {"items": items, "next_cursor": _cursor(rows[-1]["created_at"], rows[-1]["id"]) if (rows and more) else None}

    def delete_comment(self, user_id: str, comment_id: str, is_platform_admin: bool = False) -> None:
        try:
            uuid.UUID(str(comment_id))
        except ValueError:
            raise NotFound("Comentário não encontrado.", "SOCIAL_COMMENT_NOT_FOUND") from None
        with db.get_pool().connection() as conn:
            exists = conn.execute(
                "select 1 from post_comments where id = %s and deleted_at is null", (comment_id,),
            ).fetchone()
            if not exists:
                raise NotFound("Comentário não encontrado.", "SOCIAL_COMMENT_NOT_FOUND")
            if not self._comment_dict(conn, comment_id, user_id, is_platform_admin)["can_delete"]:
                raise Forbidden()
            conn.execute("update post_comments set deleted_at = now() where id = %s", (comment_id,))

    # ---------- seguir / bloquear ----------
    def _resolve_target(self, conn, kind: str, handle: str):
        """(target_id, dono) de um perfil/banda PÚBLICO pelo handle."""
        kind = one_of(kind, ("user", "band"), field="tipo")
        if kind == "user":
            r = conn.execute(
                """select p.user_id from profiles p join users u on u.id = p.user_id
                   where lower(p.handle) = lower(%s) and p.visibility = 'public' and u.social_banned = false""", (handle,),
            ).fetchone()
            if not r:
                raise NotFound("Perfil não encontrado.", "SOCIAL_PROFILE_NOT_FOUND")
            return kind, r["user_id"]
        b = conn.execute(
            "select id from bands where lower(handle) = lower(%s) and deleted_at is null and visibility = 'public'", (handle,),
        ).fetchone()
        if not b:
            raise NotFound("Banda não encontrada.", "SOCIAL_BAND_NOT_FOUND")
        return kind, str(b["id"])

    def set_follow(self, user_id: str, kind: str, handle: str, follow: bool) -> dict:
        with db.get_pool().connection() as conn:
            kind, target = self._resolve_target(conn, kind, handle)
            if kind == "user" and target == user_id:
                raise SocialError("Você não pode seguir a si mesmo.", "SOCIAL_SELF_FOLLOW")
            if follow:
                if conn.execute("select count(*) as n from follows where follower_id = %s", (user_id,)).fetchone()["n"] >= MAX_FOLLOWS:
                    raise SocialError(f"Limite de {MAX_FOLLOWS} seguidos.", "SOCIAL_FOLLOW_LIMIT")
                conn.execute(
                    "insert into follows (follower_id, target_kind, target_id) values (%s, %s, %s) on conflict do nothing",
                    (user_id, kind, target),
                )
            else:
                conn.execute("delete from follows where follower_id = %s and target_kind = %s and target_id = %s",
                             (user_id, kind, target))
            n = conn.execute("select count(*) as n from follows where target_kind = %s and target_id = %s", (kind, target)).fetchone()["n"]
        return {"following": bool(follow), "followers": n}

    def set_block(self, user_id: str, handle: str, block: bool) -> dict:
        with db.get_pool().connection() as conn:
            r = conn.execute("select user_id from profiles where lower(handle) = lower(%s)", (handle,)).fetchone()
            if not r:
                raise NotFound("Perfil não encontrado.", "SOCIAL_PROFILE_NOT_FOUND")
            if r["user_id"] == user_id:
                raise SocialError("Você não pode bloquear a si mesmo.", "SOCIAL_SELF_BLOCK")
            if block:
                conn.execute("insert into user_blocks (blocker_id, blocked_id) values (%s, %s) on conflict do nothing",
                             (user_id, r["user_id"]))
                # bloquear também desfaz o "seguir" nos dois sentidos
                conn.execute(
                    """delete from follows where target_kind = 'user' and
                       ((follower_id = %s and target_id = %s) or (follower_id = %s and target_id = %s))""",
                    (user_id, r["user_id"], r["user_id"], user_id),
                )
            else:
                conn.execute("delete from user_blocks where blocker_id = %s and blocked_id = %s", (user_id, r["user_id"]))
        return {"blocked": bool(block)}
