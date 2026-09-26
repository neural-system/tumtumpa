"""Moderação da rede social: denúncias -> fila do admin.

* Qualquer usuário logado denuncia post, comentário, perfil, banda, show ou
  pedido (uma vez por alvo). Não dá pra denunciar o próprio conteúdo.
* Ao juntar `AUTO_HIDE_THRESHOLD` denúncias abertas de pessoas diferentes,
  posts/comentários/pedidos são ocultados automaticamente até um admin
  decidir (freio contra spam/golpe enquanto ninguém está olhando).
* Admin: lista a fila, e decide: ocultar/restaurar o conteúdo, suspender ou
  reativar a conta na comunidade (users.social_banned), ou arquivar."""
from __future__ import annotations

import uuid

import db
from services.social_common import MAX_NOTE, Conflict, NotFound, SocialError, clamp_limit, clean_text, one_of

TARGET_KINDS = ("post", "comment", "profile", "band", "event", "gig")
REASONS = ("spam", "golpe", "assedio", "conteudo_improprio", "impersonacao", "outro")
ACTIONS = ("hide", "restore", "ban_user", "unban_user", "dismiss")
AUTO_HIDE_THRESHOLD = 3
# tabelas com coluna `hidden` (as demais só são decididas manualmente)
_HIDEABLE = {"post": "posts", "comment": "post_comments", "gig": "gigs"}


class ModerationService:
    def _owner_of(self, conn, kind: str, target_id: str):
        """user_id do autor do alvo (ou None se o alvo não existe)."""
        if kind == "profile":
            r = conn.execute("select user_id from profiles where lower(handle) = lower(%s)", (target_id,)).fetchone()
            return r["user_id"] if r else None
        if kind == "band":
            r = conn.execute("select created_by from bands where lower(handle) = lower(%s) and deleted_at is null", (target_id,)).fetchone()
            return (r["created_by"] or "") if r else None
        try:
            uuid.UUID(str(target_id))
        except ValueError:
            return None
        table = {"post": ("posts", "author_id"), "comment": ("post_comments", "user_id"), "event": ("band_events", "created_by"),
                 "gig": ("gigs", "author_id")}[kind]
        r = conn.execute(f"select {table[1]} as owner from {table[0]} where id = %s", (target_id,)).fetchone()
        return (r["owner"] or "") if r else None

    def report(self, reporter_id: str, kind: str, target_id: str, reason: str, note: str = "") -> dict:
        kind = one_of(kind, TARGET_KINDS, field="tipo")
        reason = one_of(reason, REASONS, field="motivo")
        note = clean_text(note, MAX_NOTE, field="observação", multiline=True)
        target_id = clean_text(target_id, 80, field="alvo", required=True)
        with db.get_pool().connection() as conn:
            owner = self._owner_of(conn, kind, target_id)
            if owner is None:
                raise NotFound("Conteúdo não encontrado.", "SOCIAL_REPORT_TARGET_NOT_FOUND")
            if owner == reporter_id:
                raise SocialError("Você não pode denunciar o seu próprio conteúdo.", "SOCIAL_SELF_REPORT")
            if conn.execute(
                "select 1 from social_reports where reporter_id = %s and target_kind = %s and target_id = %s",
                (reporter_id, kind, target_id),
            ).fetchone():
                raise Conflict("Você já denunciou este conteúdo.", "SOCIAL_ALREADY_REPORTED")
            conn.execute(
                "insert into social_reports (reporter_id, target_kind, target_id, reason, note) values (%s, %s, %s, %s, %s)",
                (reporter_id, kind, target_id, reason, note),
            )
            hidden = False
            if kind in _HIDEABLE:
                n = conn.execute(
                    "select count(*) as n from social_reports where target_kind = %s and target_id = %s and status = 'open'",
                    (kind, target_id),
                ).fetchone()["n"]
                if n >= AUTO_HIDE_THRESHOLD:
                    conn.execute(f"update {_HIDEABLE[kind]} set hidden = true where id = %s", (target_id,))
                    hidden = True
        return {"ok": True, "auto_hidden": hidden}

    # ---------- fila do admin ----------
    def queue(self, status: str = "open", page: int = 1, page_size: int = 30) -> dict:
        status = one_of(status, ("open", "resolved", "dismissed"), field="situação", default="open")
        page_size = clamp_limit(page_size, 30, 100)
        page = max(1, int(page or 1))
        with db.get_pool().connection() as conn:
            rows = conn.execute(
                """select target_kind, target_id, status, count(*) as reports, min(created_at) as first_at,
                          array_agg(distinct reason) as reasons, count(*) over() as total_count
                   from social_reports where status = %s group by target_kind, target_id, status
                   order by count(*) desc, min(created_at) limit %s offset %s""",
                (status, page_size, (page - 1) * page_size),
            ).fetchall()
            items = []
            for r in rows:
                items.append({
                    "kind": r["target_kind"], "target_id": r["target_id"], "reports": r["reports"],
                    "reasons": sorted(r["reasons"]), "first_at": r["first_at"].isoformat(),
                    "preview": self._preview(conn, r["target_kind"], r["target_id"]),
                })
        return {"items": items, "page": page, "page_size": page_size, "total": rows[0]["total_count"] if rows else 0}

    def _preview(self, conn, kind: str, target_id: str) -> dict:
        try:
            if kind == "post":
                r = conn.execute("select body, hidden, deleted_at from posts where id = %s", (target_id,)).fetchone()
            elif kind == "comment":
                r = conn.execute("select body, hidden, deleted_at from post_comments where id = %s", (target_id,)).fetchone()
            elif kind == "gig":
                r = conn.execute("select title as body, hidden, deleted_at from gigs where id = %s", (target_id,)).fetchone()
            elif kind == "event":
                r = conn.execute("select title as body, false as hidden, deleted_at from band_events where id = %s", (target_id,)).fetchone()
            elif kind == "band":
                r = conn.execute("select name as body, false as hidden, deleted_at from bands where lower(handle) = lower(%s)", (target_id,)).fetchone()
            else:
                r = conn.execute("select display_name as body, false as hidden, null::timestamptz as deleted_at from profiles where lower(handle) = lower(%s)", (target_id,)).fetchone()
        except Exception:
            return {"text": "", "hidden": False, "deleted": True}
        if not r:
            return {"text": "", "hidden": False, "deleted": True}
        return {"text": (r["body"] or "")[:300], "hidden": bool(r["hidden"]), "deleted": r["deleted_at"] is not None}

    def resolve(self, admin_id: str, kind: str, target_id: str, action: str) -> dict:
        kind = one_of(kind, TARGET_KINDS, field="tipo")
        action = one_of(action, ACTIONS, field="ação")
        with db.get_pool().connection() as conn:
            owner = self._owner_of(conn, kind, target_id)
            if owner is None and action != "dismiss":
                raise NotFound("Conteúdo não encontrado.", "SOCIAL_REPORT_TARGET_NOT_FOUND")
            if action == "hide" or action == "restore":
                if kind not in _HIDEABLE:
                    raise SocialError("Este tipo de conteúdo não pode ser ocultado por aqui — use suspender a conta.", "SOCIAL_ACTION_INVALID")
                conn.execute(f"update {_HIDEABLE[kind]} set hidden = %s where id = %s", (action == "hide", target_id))
            elif action in ("ban_user", "unban_user"):
                if not owner:
                    raise NotFound("Autor não encontrado.", "SOCIAL_REPORT_TARGET_NOT_FOUND")
                conn.execute("update users set social_banned = %s where id = %s", (action == "ban_user", owner))
            new_status = "dismissed" if action in ("dismiss", "restore", "unban_user") else "resolved"
            conn.execute(
                """update social_reports set status = %s, resolved_by = %s, resolved_at = now()
                   where target_kind = %s and target_id = %s and status = 'open'""",
                (new_status, admin_id, kind, target_id),
            )
        return {"ok": True, "status": new_status}
