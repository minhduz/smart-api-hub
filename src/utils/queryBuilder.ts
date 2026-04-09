import { Knex } from "knex";

export function parsePagination(query: qs.ParsedQs) {
    const page = Math.max(1, parseInt(query._page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query._limit as string) || 10));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
}

export function parseSorting(query: qs.ParsedQs) {
    const sort = (query._sort as string) || 'id';
    const order = (query._order as string)?.toLowerCase() === 'desc' ? 'desc' : 'asc';
    return { sort, order };
}

export function applyFilters(query: Knex.QueryBuilder, params: qs.ParsedQs): Knex.QueryBuilder {
    const reserved = new Set(['_page', '_limit', '_sort', '_order', '_fields', 'q', '_expand', '_embed']);
    for (const [key, val] of Object.entries(params)) {
        if (reserved.has(key) || val === undefined) continue;

        if (key.endsWith('_gte')) {
            query = query.where(key.replace('_gte', ''), '>=', val as string);
        } else if (key.endsWith('_lte')) {
            query = query.where(key.replace('_lte', ''), '<=', val as string);
        } else if (key.endsWith('_ne')) {
            query = query.whereNot(key.replace('_ne', ''), val as string);
        } else if (key.endsWith('_like')) {
            query = query.whereILike(key.replace('_like', ''), `%${val}%`);
        } else {
            query = query.where(key, val as string);
        }
    }

    return query;
}

export function applySearch(query: Knex.QueryBuilder, params: qs.ParsedQs, columns: string[]): Knex.QueryBuilder {
    const q = params.q as string;
    if (!q) return query;

    query = query.where((builder) => {
        columns.forEach((col) => {
            builder.orWhereILike(col, `%${q}%`);
        });
    });

    return query;
}

export async function applyExpand(
    db:Knex,
    data: any[],
    params: qs.ParsedQs,
    resource: string
): Promise<any[]>{
    const _expand = params._expand as string;
    if (!_expand) return data;

    const parentResource = _expand.trim();
    const foreignKey = `${parentResource.replace(/s$/, '')}_id`;

    const ids = [...new Set(data.map((row) => row[foreignKey]).filter(Boolean))];
    if (!ids.length) return data;

    const parents = await db(parentResource).whereIn('id', ids);
    const parentMap = new Map(parents.map((p) => [p.id, p]));

    return data.map((row) => ({
        ...row,
        // keep clean output (user instead of users)
        [parentResource.replace(/s$/, '')]: parentMap.get(row[foreignKey]) || null,
    }));
}

export async function applyEmbed(
    db: Knex,
    data: any[],
    params: qs.ParsedQs,
    resource: string
): Promise<any[]> {
    const _embed = params._embed as string;
    if (!_embed) return data;

    const childResource = _embed.trim();

    const foreignKey = `${resource.replace(/s$/, '')}_id`;

    const ids = data.map((row) => row.id).filter(Boolean);
    if (!ids.length) return data;

    const children = await db(childResource).whereIn(foreignKey, ids);

    return data.map((row) => ({
        ...row,
        [childResource]: children.filter((child) => child[foreignKey] === row.id),
    }));
}

