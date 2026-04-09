import { Request, Response, NextFunction } from "express";
import { hashPassword } from "../utils/hashPassword";
import {db } from '../db/knex';
import { parsePagination, parseSorting, applyFilters, applySearch, applyEmbed, applyExpand } from '../utils/queryBuilder';

export async function getAll(req: Request, res: Response, next: NextFunction) {
    const resource = req.params.resource as string;
    const { page, limit, offset } = parsePagination(req.query);
    const { sort, order } = parseSorting(req.query);

    // get text columns for search
    const columnInfo = await db(resource).columnInfo();
    const textColumns = Object.entries(columnInfo)
        .filter(([_, info]) => info.type === 'text')
        .map(([col]) => col);

    let query = db(resource);
    const { _fields } = req.query;
    if (_fields && typeof _fields === 'string') {
        const columnsToSelect = _fields.split(',').map(field => field.trim());
        query = query.select(columnsToSelect);
    } else {
        query = query.select('*');
    }

    query = applyFilters(query, req.query);
    query = applySearch(query, req.query, textColumns);

    // run data + count in parallel 
    const [data, [{ count }]] = await Promise.all([
        query.clone().orderBy(sort, order).limit(limit).offset(offset),
        db(resource).count('id as count'),
    ]);

    // apply expand and embed after fetching data
    let result = await applyExpand(db, data, req.query, resource);
    result = await applyEmbed(db, result, req.query, resource);

    res.setHeader('X-Total-Count', String(count));
    res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');

    return res.status(200).json(result);
}

export async function getById(req: Request, res: Response, next: NextFunction){
    const resource = req.params.resource as string;
    const id = req.params.id as string;

    const item = await db(resource).where({id: Number(id)}).first();

    if (!item) {
        return res.status(404).json({error:`${resource} with ID: ${id} do not exist`})
    }

    return res.status(200).json(item);
}

export async function createResource(req: Request, res: Response, next: NextFunction){
    const resource = req.params.resource as string;
    const payload = req.body

    if (resource === 'users' && payload.password) {
        payload.password = await hashPassword(payload.password);
    }

    const [row] = await db(resource).insert(payload).returning('*'); // ← return full row directly

    return res.status(201).json(row)
}

export async function updateResource(req: Request, res: Response, next: NextFunction) {
    const resource = req.params.resource as string;
    const { id } = req.params;
    const payload = req.body;

    if (resource === 'users' && payload.password) {
        payload.password = await hashPassword(payload.password);
    }

    const existing = await db(resource).where({ id }).first();
    if (!existing) return res.status(404).json({ error: `${resource} with id ${id} not found` });

    let updatedPayload: Record<string, any>;

    if (req.method === 'PUT') {
        const nulled = Object.keys(existing).reduce((acc, key) => {
            if (key === 'id' || key === 'created_at') return acc;
            acc[key] = null;
            return acc;
        }, {} as Record<string, any>);

        updatedPayload = { ...nulled, ...payload, updated_at: new Date() };
    } else {
        updatedPayload = { ...payload, updated_at: new Date() };
    }

    const [row] = await db(resource)
        .where({ id })
        .update(updatedPayload)
        .returning('*');

    return res.status(200).json(row);
}

export async function deleteResource(req: Request, res: Response, next: NextFunction) {
    const resource = req.params.resource as string;
    const { id } = req.params;

    const deleted = await db(resource).where({ id }).delete().returning('*');

    if (!deleted.length) return res.status(404).json({ error: `${resource} with id ${id} not found` });

    return res.status(200).json({ message: `${resource} with id ${id} deleted successfully` });
}

