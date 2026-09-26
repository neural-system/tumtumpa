"""Rotas da rede social (perfis, bandas, agenda, feed, contratações, moderação).
Nenhuma regra de negócio aqui — só HTTP <-> serviços (ver services/*_service.py
e docs/PROPOSTA_REDE_SOCIAL.md).

Leituras de conteúdo PÚBLICO aceitam visitante sem login (o token, se vier, só
serve pra personalizar: curtidas, "seguindo", permissões). Toda escrita exige
login e passa por um limitador por usuário (ver ctx.social_limits)."""
from __future__ import annotations

from flask import g, jsonify, request

from services.auth_service import AuthError
from services.social_common import SocialError


def register(api, ctx):
    protected = ctx.require_auth
    admin_only = ctx.require_admin

    # ---------- utilidades ----------
    def viewer():
        """(user_id, is_admin) do token opcional; token inválido = visitante."""
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return None, False
        try:
            payload = ctx.auth.verify_token(header[7:])
            is_admin = ctx.auth.check_session(payload)
        except AuthError:
            return None, False
        return payload["sub"], is_admin

    def limited(action: str):
        """Resposta 429 se o usuário logado passou do limite dessa ação; senão None."""
        hit = ctx.social_limits[action].check(g.user_id)
        if hit:
            body, status = hit
            return jsonify(body), status
        return None

    def body() -> dict:
        d = request.get_json(silent=True)
        return d if isinstance(d, dict) else {}

    @api.errorhandler(SocialError)
    def _social_error(e):
        return jsonify({"error": str(e), "error_code": e.code}), e.status

    # ---------- perfis ----------
    @api.get("/social/me")
    @protected
    def social_me():
        return jsonify(ctx.profiles.get_mine(g.user_id))

    @api.put("/social/me")
    @protected
    def social_save_me():
        if (r := limited("profile")):
            return r
        return jsonify(ctx.profiles.save_mine(g.user_id, body()))

    @api.get("/social/profiles")
    def social_profiles():
        a = request.args
        return jsonify(ctx.profiles.search(
            q=a.get("q", ""), city=a.get("city", ""), instrument=a.get("instrument", ""),
            hire_only=a.get("hire") == "1", page=a.get("page", 1, type=int), page_size=a.get("page_size", 20, type=int),
        ))

    @api.get("/social/profiles/<handle>")
    def social_profile(handle):
        uid, is_admin = viewer()
        return jsonify(ctx.profiles.get_public(handle, uid, is_admin))

    # ---------- bandas ----------
    @api.get("/social/bands/mine")
    @protected
    def social_my_bands():
        return jsonify(ctx.bands.list_mine(g.user_id))

    @api.post("/social/bands")
    @protected
    def social_create_band():
        if (r := limited("band")):
            return r
        return jsonify(ctx.bands.create(g.user_id, body())), 201

    @api.get("/social/bands")
    def social_bands():
        a = request.args
        return jsonify(ctx.bands.search(
            q=a.get("q", ""), city=a.get("city", ""), genre=a.get("genre", ""),
            page=a.get("page", 1, type=int), page_size=a.get("page_size", 20, type=int),
        ))

    @api.get("/social/bands/<handle>")
    def social_band(handle):
        uid, is_admin = viewer()
        return jsonify(ctx.bands.get(handle, uid, is_admin))

    @api.put("/social/bands/<handle>")
    @protected
    def social_update_band(handle):
        if (r := limited("band")):
            return r
        return jsonify(ctx.bands.update(g.user_id, handle, body(), g.is_admin))

    @api.delete("/social/bands/<handle>")
    @protected
    def social_delete_band(handle):
        ctx.bands.delete(g.user_id, handle, g.is_admin)
        return "", 204

    @api.post("/social/bands/<handle>/invite")
    @protected
    def social_invite(handle):
        if (r := limited("invite")):
            return r
        d = body()
        return jsonify(ctx.bands.invite(g.user_id, handle, d.get("target", ""), d.get("role", "member"),
                                        d.get("instrument", ""), g.is_admin)), 201

    @api.post("/social/bands/<handle>/invite/respond")
    @protected
    def social_respond_invite(handle):
        return jsonify(ctx.bands.respond_to_invite(g.user_id, handle, bool(body().get("accept"))))

    @api.put("/social/bands/<handle>/members")
    @protected
    def social_set_member(handle):
        d = body()
        return jsonify(ctx.bands.set_member(g.user_id, handle, d.get("target", ""), role=d.get("role"),
                                            instrument=d.get("instrument"), is_platform_admin=g.is_admin))

    @api.post("/social/bands/<handle>/members/remove")
    @protected
    def social_remove_member(handle):
        ctx.bands.remove_member(g.user_id, handle, body().get("target", ""), g.is_admin)
        return "", 204

    @api.post("/social/bands/<handle>/leave")
    @protected
    def social_leave(handle):
        ctx.bands.leave(g.user_id, handle)
        return "", 204

    # ---------- agenda ----------
    @api.get("/social/agenda")
    def social_agenda():
        a = request.args
        return jsonify(ctx.events.upcoming(city=a.get("city", ""), q=a.get("q", ""),
                                           page=a.get("page", 1, type=int), page_size=a.get("page_size", 20, type=int)))

    @api.get("/social/bands/<handle>/events")
    def social_band_events(handle):
        uid, is_admin = viewer()
        return jsonify(ctx.events.list_for_band(handle, uid, include_past=request.args.get("past") == "1",
                                                is_platform_admin=is_admin))

    @api.post("/social/bands/<handle>/events")
    @protected
    def social_create_event(handle):
        if (r := limited("event")):
            return r
        return jsonify(ctx.events.create(g.user_id, handle, body(), g.is_admin)), 201

    @api.put("/social/events/<event_id>")
    @protected
    def social_update_event(event_id):
        if (r := limited("event")):
            return r
        return jsonify(ctx.events.update(g.user_id, event_id, body(), g.is_admin))

    @api.delete("/social/events/<event_id>")
    @protected
    def social_delete_event(event_id):
        ctx.events.delete(g.user_id, event_id, g.is_admin)
        return "", 204

    # ---------- feed ----------
    @api.get("/social/feed")
    def social_feed():
        uid, is_admin = viewer()
        a = request.args
        return jsonify(ctx.feed.feed(uid, scope=a.get("scope", "explore"), handle=a.get("handle", ""),
                                     cursor=a.get("cursor"), limit=a.get("limit", 20, type=int), is_platform_admin=is_admin))

    @api.post("/social/posts")
    @protected
    def social_create_post():
        if (r := limited("post")):
            return r
        return jsonify(ctx.feed.create_post(g.user_id, body(), g.is_admin)), 201

    @api.get("/social/posts/<post_id>")
    def social_post(post_id):
        uid, is_admin = viewer()
        return jsonify(ctx.feed.get_post(post_id, uid, is_admin))

    @api.delete("/social/posts/<post_id>")
    @protected
    def social_delete_post(post_id):
        ctx.feed.delete_post(g.user_id, post_id, g.is_admin)
        return "", 204

    @api.post("/social/posts/<post_id>/like")
    @protected
    def social_like(post_id):
        if (r := limited("like")):
            return r
        return jsonify(ctx.feed.set_like(g.user_id, post_id, bool(body().get("liked", True))))

    @api.get("/social/posts/<post_id>/comments")
    def social_comments(post_id):
        uid, is_admin = viewer()
        a = request.args
        return jsonify(ctx.feed.list_comments(post_id, uid, cursor=a.get("cursor"), limit=a.get("limit", 30, type=int),
                                              is_platform_admin=is_admin))

    @api.post("/social/posts/<post_id>/comments")
    @protected
    def social_add_comment(post_id):
        if (r := limited("comment")):
            return r
        return jsonify(ctx.feed.add_comment(g.user_id, post_id, body().get("body"))), 201

    @api.delete("/social/comments/<comment_id>")
    @protected
    def social_delete_comment(comment_id):
        ctx.feed.delete_comment(g.user_id, comment_id, g.is_admin)
        return "", 204

    @api.post("/social/follow")
    @protected
    def social_follow():
        if (r := limited("follow")):
            return r
        d = body()
        return jsonify(ctx.feed.set_follow(g.user_id, d.get("kind", "user"), str(d.get("handle", "")), bool(d.get("follow", True))))

    @api.post("/social/block")
    @protected
    def social_block():
        if (r := limited("follow")):
            return r
        d = body()
        return jsonify(ctx.feed.set_block(g.user_id, str(d.get("handle", "")), bool(d.get("block", True))))

    # ---------- contratações ----------
    @api.get("/social/gigs")
    def social_gigs():
        uid, _ = viewer()
        a = request.args
        return jsonify(ctx.gigs.list_open(uid, kind=a.get("kind", ""), city=a.get("city", ""), q=a.get("q", ""),
                                          mine=a.get("mine") == "1", page=a.get("page", 1, type=int),
                                          page_size=a.get("page_size", 20, type=int)))

    @api.post("/social/gigs")
    @protected
    def social_create_gig():
        if (r := limited("gig")):
            return r
        return jsonify(ctx.gigs.create(g.user_id, body())), 201

    @api.get("/social/gigs/<gig_id>")
    def social_gig(gig_id):
        uid, is_admin = viewer()
        return jsonify(ctx.gigs.get(gig_id, uid, is_admin))

    @api.post("/social/gigs/<gig_id>/status")
    @protected
    def social_gig_status(gig_id):
        return jsonify(ctx.gigs.set_status(g.user_id, gig_id, body().get("status", ""), g.is_admin))

    @api.delete("/social/gigs/<gig_id>")
    @protected
    def social_delete_gig(gig_id):
        ctx.gigs.delete(g.user_id, gig_id, g.is_admin)
        return "", 204

    @api.post("/social/gigs/<gig_id>/reply")
    @protected
    def social_gig_reply(gig_id):
        if (r := limited("reply")):
            return r
        d = body()
        return jsonify(ctx.gigs.reply(g.user_id, gig_id, d.get("message"), d.get("band"))), 201

    @api.get("/social/gigs/<gig_id>/replies")
    @protected
    def social_gig_replies(gig_id):
        return jsonify(ctx.gigs.list_replies(g.user_id, gig_id, g.is_admin))

    @api.post("/social/gigs/<gig_id>/replies/<reply_id>")
    @protected
    def social_gig_answer(gig_id, reply_id):
        return jsonify(ctx.gigs.answer_reply(g.user_id, gig_id, reply_id, bool(body().get("accept")), g.is_admin))

    # ---------- moderação ----------
    @api.post("/social/report")
    @protected
    def social_report():
        if (r := limited("report")):
            return r
        d = body()
        return jsonify(ctx.moderation.report(g.user_id, d.get("kind", ""), str(d.get("target_id", "")),
                                             d.get("reason", ""), d.get("note", ""))), 201

    @api.get("/admin/social/reports")
    @admin_only
    def admin_social_reports():
        a = request.args
        return jsonify(ctx.moderation.queue(status=a.get("status", "open"), page=a.get("page", 1, type=int)))

    @api.post("/admin/social/reports/resolve")
    @admin_only
    def admin_social_resolve():
        d = body()
        return jsonify(ctx.moderation.resolve(g.user_id, d.get("kind", ""), str(d.get("target_id", "")), d.get("action", "")))
