"""Pesquisa sobre a tabela `songs` via SQL — substitui o índice em memória
(IndexService) por queries diretas: sempre corretas/atualizadas, sem
precisar reconstruir nada. Busca fuzzy usa `pg_trgm::similarity()` no lugar
do `rapidfuzz` de antes (mesma ideia — aproximação por texto parecido —
threshold não é diretamente comparável ao antigo, só a mesma finalidade).

Biblioteca compartilhada, não mais 100% global: a busca vale sobre as
músicas que o usuário PODE VER — próprias, marcadas como compartilhadas
(`songs.shared`), ou órfãs (dono excluído) — não sobre o acervo inteiro
incondicionalmente (ver `_VISIBLE_SQL`, mesma condição de
songs_service.py). `only_mine=True` restringe ainda mais, só às músicas
criadas pelo usuário. `favorita`/`nota` não são mais colunas de `songs`
(são preferência de quem vê, ver `user_song_prefs`) — todo SELECT aqui faz
LEFT JOIN nessa tabela pro usuário logado pra continuar devolvendo o valor
certo por pessoa."""
from __future__ import annotations

import db
from services.songs_service import _row_to_dict

MAX_PAGE_SIZE = 500
_SORTABLE = {"titulo", "autor", "interprete", "genero", "tom", "ritmo", "velocidade", "nota", "slug", "created_at"}
# colunas ordenáveis que não são colunas simples de `songs` (tela Minhas Músicas):
# favorita vem de user_song_prefs, bpm mora no header jsonb (só se for número) e
# setlists é a contagem de setlists do usuário em que a música está, passada
# pela rota como JSON {slug: n} (`sl_counts`).
_SORT_EXPR = {
    "favorita": "coalesce(p.favorita, false)",
    "bpm": "case when songs.header->>'bpm' ~ '^[0-9]+$' then (songs.header->>'bpm')::int end",
    "setlists": "coalesce((%(sl_counts)s::jsonb ->> songs.slug)::int, 0)",
}
_SIMILARITY_THRESHOLD = 0.25

# Sem header/body — a listagem não usa (_row_to_dict só lê estas colunas),
# e são as colunas grandes (corpo inteiro da cifra, cabeçalho em jsonb); num
# acervo grande, incluí-las no SELECT * de toda busca/dashboard multiplicava
# o payload por linha à toa. "songs." explícito porque toda query aqui faz
# LEFT JOIN com user_song_prefs, que também tem uma coluna user_id.
_LIST_COLUMNS = (
    "songs.slug, songs.titulo, songs.autor, songs.interprete, songs.genero, songs.tom, "
    "songs.ritmo, songs.tags, songs.velocidade, songs.normalizada, songs.user_id, songs.shared, "
    "songs.header->>'bpm' as bpm_raw"
)
_PREFS_JOIN = "left join user_song_prefs p on p.song_id = songs.id and p.user_id = %(user_id)s"
_PREFS_SELECT = "coalesce(p.favorita, false) as favorita, coalesce(p.nota, '') as nota"

# visibilidade multi-tenant — mesma condição de songs_service.py::_VISIBLE_SQL
# (mantida separada aqui pra não criar um import cruzado só por uma string).
_VISIBLE_SQL = "(songs.user_id = %(user_id)s OR songs.shared = true OR songs.user_id IS NULL)"


def _visible_sql(is_admin: bool) -> str:
    """Admin vê tudo, independente de `shared`/dono — ver
    songs_service.py::_visible_sql (mesma decisão de design, duplicada de
    propósito pelo mesmo motivo do _VISIBLE_SQL acima)."""
    return "true" if is_admin else _VISIBLE_SQL


def _rows_to_dicts(rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        d = _row_to_dict(r)
        bpm = (r.get("bpm_raw") or "").strip()
        d["bpm"] = int(bpm) if bpm.isdigit() else None
        out.append(d)
    return out


class SearchService:
    def search(
        self,
        user_id: str,
        q: str = "",
        genero: str = "",
        interprete: str = "",
        tom: str = "",
        ritmo: str = "",
        tag: str = "",
        favoritas: bool = False,
        favorite_interpretes: list[str] | None = None,
        favorite_generos: list[str] | None = None,
        only_mine: bool = False,
        page: int = 1,
        page_size: int = 50,
        sort: str = "",
        is_admin: bool = False,
        mine_slugs: list[str] | None = None,
        mine_fav_interpretes: list[str] | None = None,
        mine_fav_generos: list[str] | None = None,
        only_slugs: list[str] | None = None,
        exclude_slugs: list[str] | None = None,
        origin: str = "",
        only_favorite: bool = False,
        sl_counts: dict | None = None,
    ) -> dict:
        """`mine_slugs` (não None) liga o modo "Minhas Músicas": criadas/
        importadas/clonadas pelo usuário (`songs.user_id`), favoritadas por ele
        ou dentro de um setlist dele (as slugs vêm de SetlistService.song_slugs)
        — em vez da regra de visibilidade da biblioteca compartilhada, porque
        uma música de outra pessoa que está num setlist dele já é "dele"."""
        params: dict = {"user_id": user_id}
        if mine_slugs is not None:
            # Minhas Músicas = criadas/clonadas/importadas + favoritadas + nos
            # setlists + de artista/gênero favorito (só as que o usuário pode ver)
            mine_clauses = ["songs.user_id = %(user_id)s", "coalesce(p.favorita, false) = true", "songs.slug = ANY(%(mine_slugs)s)"]
            params["mine_slugs"] = mine_slugs
            fav_parts = []
            if mine_fav_interpretes:
                fav_parts.append("songs.interprete = ANY(%(mine_fav_i)s)")
                params["mine_fav_i"] = mine_fav_interpretes
            if mine_fav_generos:
                fav_parts.append("lower(songs.genero) = ANY(%(mine_fav_g)s)")
                params["mine_fav_g"] = [g.lower() for g in mine_fav_generos]
            if fav_parts:
                mine_clauses.append(f"(({' OR '.join(fav_parts)}) AND {_visible_sql(is_admin)})")
            where = ["(" + " OR ".join(mine_clauses) + ")"]
        else:
            where = [_visible_sql(is_admin)]
        if only_slugs is not None:
            where.append("songs.slug = ANY(%(only_slugs)s)")
            params["only_slugs"] = only_slugs
        if exclude_slugs:
            where.append("NOT (songs.slug = ANY(%(exclude_slugs)s))")
            params["exclude_slugs"] = exclude_slugs
        if only_favorite:
            where.append("coalesce(p.favorita, false) = true")
        if origin == "mine":
            where.append("songs.user_id = %(user_id)s")
        elif origin == "others":
            where.append("songs.user_id IS DISTINCT FROM %(user_id)s")

        if only_mine:
            where.append("songs.user_id = %(user_id)s")
        if genero:
            where.append("lower(songs.genero) = lower(%(genero)s)")
            params["genero"] = genero
        if interprete:
            where.append("songs.interprete ILIKE %(interprete)s")
            params["interprete"] = f"%{interprete}%"
        if tom:
            where.append("lower(trim(songs.tom)) = lower(trim(%(tom)s))")
            params["tom"] = tom
        if ritmo:
            where.append("songs.ritmo ILIKE %(ritmo)s")
            params["ritmo"] = f"%{ritmo}%"
        if tag:
            where.append("EXISTS (SELECT 1 FROM unnest(songs.tags) t WHERE lower(t) = lower(%(tag)s))")
            params["tag"] = tag
        # Fase 6: "favoritas" passa a significar música favoritada OU de um
        # artista/gênero favorito — três formas independentes de favoritar,
        # unidas por OR (ver favorites_service.py, chamado pela rota antes
        # de montar esta busca). Cada cláusula só entra se tiver conteúdo,
        # pra não gerar um "OR false" à toa quando só `favoritas` é usado
        # (caso mais comum, mantém o comportamento de antes).
        if favoritas or favorite_interpretes or favorite_generos:
            fav_clauses = []
            if favoritas:
                fav_clauses.append("coalesce(p.favorita, false) = true")
            if favorite_interpretes:
                fav_clauses.append("songs.interprete = ANY(%(favorite_interpretes)s)")
                params["favorite_interpretes"] = favorite_interpretes
            if favorite_generos:
                fav_clauses.append("lower(songs.genero) = ANY(%(favorite_generos_lower)s)")
                params["favorite_generos_lower"] = [g.lower() for g in favorite_generos]
            where.append("(" + " OR ".join(fav_clauses) + ")")

        where_sql = " AND ".join(where)

        page = max(1, page)
        page_size = max(1, min(page_size, MAX_PAGE_SIZE))
        params["limit"] = page_size
        params["offset"] = (page - 1) * page_size

        # LIMIT/OFFSET no SQL (com count(*) OVER() pro total) em vez de
        # trazer a tabela inteira pra paginar em Python — com um acervo
        # grande (`body` é o texto completo da cifra), buscar tudo a cada
        # busca/dashboard não escala.
        # ordenação explícita (clique no cabeçalho) vale mesmo com busca; sem
        # ela, busca ordena por relevância e a lista pura por título.
        sort_key = sort.lstrip("-")
        direction = "DESC" if sort.startswith("-") else "ASC"
        order_sql = None
        if sort_key in _SORT_EXPR and (sort_key != "setlists" or sl_counts is not None):
            order_sql = f"{_SORT_EXPR[sort_key]} {direction} NULLS LAST, songs.titulo ASC"
            if sort_key == "setlists":
                import json as _json
                params["sl_counts"] = _json.dumps(sl_counts)
        elif sort_key in _SORTABLE and sort:
            col = f"nullif(songs.{sort_key}, '')" if sort_key in ("genero", "tom", "ritmo", "autor") else f"songs.{sort_key}"
            order_sql = f"{col} {direction} NULLS LAST, songs.titulo ASC"
        if q:
            params["q"] = q
            params["qlike"] = f"%{q}%"
            score_expr = """
                CASE
                    WHEN songs.titulo ILIKE %(qlike)s OR songs.autor ILIKE %(qlike)s OR songs.interprete ILIKE %(qlike)s
                         OR EXISTS (SELECT 1 FROM unnest(songs.tags) t WHERE t ILIKE %(qlike)s)
                    THEN 100 + (CASE WHEN songs.titulo ILIKE %(qlike)s THEN 10 ELSE 0 END)
                    ELSE GREATEST(similarity(songs.titulo, %(q)s), similarity(songs.autor, %(q)s), similarity(songs.interprete, %(q)s)) * 100
                END
            """
            sql = f"""
                SELECT {_LIST_COLUMNS}, {_PREFS_SELECT}, ({score_expr}) AS score, count(*) OVER() AS total_count
                FROM songs {_PREFS_JOIN}
                WHERE {where_sql} AND (
                    songs.titulo ILIKE %(qlike)s OR songs.autor ILIKE %(qlike)s OR songs.interprete ILIKE %(qlike)s
                    OR EXISTS (SELECT 1 FROM unnest(songs.tags) t WHERE t ILIKE %(qlike)s)
                    OR similarity(songs.titulo, %(q)s) > {_SIMILARITY_THRESHOLD}
                    OR similarity(songs.autor, %(q)s) > {_SIMILARITY_THRESHOLD}
                    OR similarity(songs.interprete, %(q)s) > {_SIMILARITY_THRESHOLD}
                )
                ORDER BY {order_sql or "score DESC, songs.titulo ASC"}
                LIMIT %(limit)s OFFSET %(offset)s
            """
        else:
            sql = f"""SELECT {_LIST_COLUMNS}, {_PREFS_SELECT}, count(*) OVER() AS total_count
                      FROM songs {_PREFS_JOIN}
                      WHERE {where_sql}
                      ORDER BY {order_sql or "songs.titulo ASC"} LIMIT %(limit)s OFFSET %(offset)s"""

        with db.get_pool().connection() as conn:
            rows = conn.execute(sql, params).fetchall()

        total = rows[0]["total_count"] if rows else 0

        return {
            "items": _rows_to_dicts(rows),
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": max(1, -(-total // page_size)),
        }

    def get_by_slugs(self, user_id: str, slugs: list[str], is_admin: bool = False) -> list[dict]:
        """Busca pontual por um punhado de slugs específicos (ex.: resolver
        `most_played`/`recent` do dashboard, que só precisa de ~16 músicas
        das plays, não de trazer o acervo inteiro pra achar essas poucas)."""
        if not slugs:
            return []
        with db.get_pool().connection() as conn:
            rows = conn.execute(
                f"""SELECT {_LIST_COLUMNS}, {_PREFS_SELECT} FROM songs {_PREFS_JOIN}
                    WHERE songs.slug = ANY(%(slugs)s) AND {_visible_sql(is_admin)}""",
                {"user_id": user_id, "slugs": slugs},
            ).fetchall()
        return _rows_to_dicts(rows)

    def facets(self, user_id: str, is_admin: bool = False) -> dict:
        """Valores distintos pra popular filtros no frontend — biblioteca
        inteira que o usuário pode ver (própria + compartilhada + órfã),
        não mais por música que ele criou, mas também não vazando valores
        de música privada alheia pros dropdowns de outra pessoa."""
        visible = _visible_sql(is_admin)
        with db.get_pool().connection() as conn:
            generos = conn.execute(
                f"select distinct genero from songs where genero != '' and {visible} order by 1",
                {"user_id": user_id},
            ).fetchall()
            interpretes = conn.execute(
                f"select distinct interprete from songs where interprete != '' and {visible} order by 1",
                {"user_id": user_id},
            ).fetchall()
            tons = conn.execute(
                f"select distinct tom from songs where tom != '' and {visible} order by 1",
                {"user_id": user_id},
            ).fetchall()
            ritmos = conn.execute(
                f"select distinct ritmo from songs where ritmo != '' and {visible} order by 1",
                {"user_id": user_id},
            ).fetchall()
            tags = conn.execute(
                f"select distinct unnest(tags) as tag from songs where {visible} order by 1",
                {"user_id": user_id},
            ).fetchall()
        return {
            "generos": [r["genero"] for r in generos],
            "interpretes": [r["interprete"] for r in interpretes],
            "tons": [r["tom"] for r in tons],
            "ritmos": [r["ritmo"] for r in ritmos],
            "tags": [r["tag"] for r in tags],
        }
