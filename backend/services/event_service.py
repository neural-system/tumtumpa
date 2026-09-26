"""Agenda de shows das bandas. Só admins da banda criam/editam/cancelam;
a agenda pública lista apenas shows FUTUROS de bandas PÚBLICAS."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import db
from services.social_common import (
    MAX_CITY, MAX_DESC, MAX_TITLE, Forbidden, NotFound, SocialError, clamp_limit, clean_text, clean_url, like_pattern,
    one_of,
)

MAX_UPCOMING_PER_BAND = 100


def _parse_dt(value) -> datetime:
    """ISO 8601 (com ou sem fuso; sem fuso vale UTC). Aceita o 'Z' do JavaScript."""
    if not isinstance(value, str) or not value.strip():
        raise SocialError("Informe a data e a hora do show.", "SOCIAL_FIELD_REQUIRED")
    try:
        dt = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        raise SocialError("Data inválida.", "SOCIAL_DATE_INVALID") from None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _event_dict(r: dict) -> dict:
    return {
        "id": str(r["id"]), "title": r["title"], "description": r["description"],
        "starts_at": r["starts_at"].isoformat(), "venue": r["venue"], "city": r["city"],
        "ticket_url": r["ticket_url"], "status": r["status"],
        "band": {"handle": r["band_handle"], "name": r["band_name"]} if "band_handle" in r else None,
    }


class EventService:
    def __init__(self, bands=None):
        self.bands = bands  # BandService (injetado)

    def _require_band_admin(self, conn, handle: str, user_id: str, is_platform_admin: bool):
        band = self.bands._require_admin(conn, handle, user_id, is_platform_admin)
        return band

    def create(self, user_id: str, band_handle: str, data: dict, is_platform_admin: bool = False) -> dict:
        if not isinstance(data, dict):
            raise SocialError("Corpo inválido.", "SOCIAL_FIELD_INVALID")
        title = clean_text(data.get("title"), MAX_TITLE, field="título", required=True)
        description = clean_text(data.get("description"), MAX_DESC, field="descrição", multiline=True)
        starts_at = _parse_dt(data.get("starts_at"))
        if starts_at < datetime.now(timezone.utc):
            raise SocialError("A data do show precisa estar no futuro.", "SOCIAL_DATE_PAST")
        venue = clean_text(data.get("venue"), 120, field="local")
        city = clean_text(data.get("city"), MAX_CITY, field="cidade")
        ticket = clean_url(data.get("ticket_url"), field="link do ingresso")
        with db.get_pool().connection() as conn:
            band = self._require_band_admin(conn, band_handle, user_id, is_platform_admin)
            n = conn.execute(
                "select count(*) as n from band_events where band_id = %s and deleted_at is null and starts_at >= now()",
                (band["id"],),
            ).fetchone()["n"]
            if n >= MAX_UPCOMING_PER_BAND:
                raise SocialError("Limite de shows futuros da banda atingido.", "SOCIAL_EVENT_LIMIT")
            row = conn.execute(
                """insert into band_events (band_id, title, description, starts_at, venue, city, ticket_url, created_by)
                   values (%s, %s, %s, %s, %s, %s, %s, %s) returning *""",
                (band["id"], title, description, starts_at, venue, city or band["city"], ticket, user_id),
            ).fetchone()
        return _event_dict({**row, "band_handle": band["handle"], "band_name": band["name"]})

    def _load(self, conn, event_id: str):
        try:
            uuid.UUID(str(event_id))  # id malformado: nem chega no banco (uma query com uuid inválido abortaria a transação)
        except ValueError:
            return None
        return conn.execute(
            """select e.*, b.handle as band_handle, b.name as band_name, b.visibility as band_visibility
               from band_events e join bands b on b.id = e.band_id
               where e.id = %s and e.deleted_at is null and b.deleted_at is null""",
            (event_id,),
        ).fetchone()

    def update(self, user_id: str, event_id: str, data: dict, is_platform_admin: bool = False) -> dict:
        with db.get_pool().connection() as conn:
            ev = self._load(conn, event_id)
            if not ev:
                raise NotFound("Show não encontrado.", "SOCIAL_EVENT_NOT_FOUND")
            self._require_band_admin(conn, ev["band_handle"], user_id, is_platform_admin)
            title = clean_text(data.get("title", ev["title"]), MAX_TITLE, field="título", required=True)
            description = clean_text(data.get("description", ev["description"]), MAX_DESC, field="descrição", multiline=True)
            starts_at = _parse_dt(data["starts_at"]) if "starts_at" in data else ev["starts_at"]
            venue = clean_text(data.get("venue", ev["venue"]), 120, field="local")
            city = clean_text(data.get("city", ev["city"]), MAX_CITY, field="cidade")
            ticket = clean_url(data.get("ticket_url", ev["ticket_url"]), field="link do ingresso")
            status = one_of(data.get("status", ev["status"]), ("scheduled", "cancelled"), field="situação")
            row = conn.execute(
                """update band_events set title=%s, description=%s, starts_at=%s, venue=%s, city=%s, ticket_url=%s, status=%s
                   where id = %s returning *""",
                (title, description, starts_at, venue, city, ticket, status, ev["id"]),
            ).fetchone()
        return _event_dict({**row, "band_handle": ev["band_handle"], "band_name": ev["band_name"]})

    def delete(self, user_id: str, event_id: str, is_platform_admin: bool = False) -> None:
        with db.get_pool().connection() as conn:
            ev = self._load(conn, event_id)
            if not ev:
                raise NotFound("Show não encontrado.", "SOCIAL_EVENT_NOT_FOUND")
            self._require_band_admin(conn, ev["band_handle"], user_id, is_platform_admin)
            conn.execute("update band_events set deleted_at = now() where id = %s", (ev["id"],))

    def list_for_band(self, band_handle: str, viewer_id: str | None, include_past: bool = False,
                      is_platform_admin: bool = False) -> list[dict]:
        with db.get_pool().connection() as conn:
            band = self.bands._by_handle(conn, band_handle)
            member = self.bands._membership(conn, band["id"], viewer_id) if band else None
            if not band or not (band["visibility"] == "public" or member or is_platform_admin):
                raise NotFound("Banda não encontrada.", "SOCIAL_BAND_NOT_FOUND")
            rows = conn.execute(
                f"""select e.*, b.handle as band_handle, b.name as band_name from band_events e join bands b on b.id = e.band_id
                    where e.band_id = %s and e.deleted_at is null {'' if include_past else 'and e.starts_at >= now()'}
                    order by e.starts_at {'desc' if include_past else 'asc'} limit 100""",
                (band["id"],),
            ).fetchall()
        return [_event_dict(r) for r in rows]

    def upcoming(self, city: str = "", q: str = "", page: int = 1, page_size: int = 20) -> dict:
        """Agenda pública: próximos shows (não cancelados) de bandas públicas."""
        page_size = clamp_limit(page_size, 20, 50)
        page = max(1, int(page or 1))
        where = ["e.deleted_at is null", "e.status = 'scheduled'", "e.starts_at >= now()", "b.deleted_at is null",
                 "b.visibility = 'public'"]
        params: dict = {"limit": page_size, "offset": (page - 1) * page_size}
        if city:
            where.append("e.city ilike %(city)s escape '\\'")
            params["city"] = like_pattern(city[:60])
        if q:
            where.append("(e.title ilike %(q)s escape '\\' or b.name ilike %(q)s escape '\\' or e.venue ilike %(q)s escape '\\')")
            params["q"] = like_pattern(q[:60])
        sql = f"""select e.*, b.handle as band_handle, b.name as band_name, count(*) over() as total_count
                  from band_events e join bands b on b.id = e.band_id where {' and '.join(where)}
                  order by e.starts_at asc limit %(limit)s offset %(offset)s"""
        with db.get_pool().connection() as conn:
            rows = conn.execute(sql, params).fetchall()
        return {"items": [_event_dict(r) for r in rows], "page": page, "page_size": page_size,
                "total": rows[0]["total_count"] if rows else 0}
