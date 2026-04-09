import { Request, Response, NextFunction } from 'express';

const TTL_MS = 30*1000;

interface CacheEntry {
    data: any;
    headers: Record<string,string>;
    expireAt: number;
}

const store = new Map<string,CacheEntry>();

setInterval(() => {
    const now = Date.now();
    store.forEach((entry,key) => {
        if (now > entry.expireAt) store.delete(key);
    })
},TTL_MS);

function buildKey(req: Request) {
    const resource = req.params.resource as string;
    const query = new URLSearchParams(req.query as Record<string,string>).toString();
    return query ? `${resource}?${query}` : resource;
}

export function cacheGet(req: Request, res: Response, next: NextFunction){
    const key = buildKey(req);
    const entry = store.get(key);

    if (entry && Date.now() < entry.expireAt){
        res.setHeader('X-Cache','HIT');
        Object.entries(entry.headers).forEach(([k, v])=>res.setHeader(k, v));
        return res.status(200).json(entry.data);
    }

    res.setHeader('X-Cache','MISS');
    const originalJson = res.json.bind(res);

    res.json = (data: any) => {
        if (res.statusCode === 200){
            store.set(key,{
                data,
                headers: {
                    'X-Total-Count': res.getHeader('X-Total-Count') as string || '',
                    'Access-Control-Expose-Headers': 'X-Total-Count, X-Cache',
                },
                expireAt: Date.now() + TTL_MS,
            })
        }
        return originalJson(data);
    }
    next();
}

export function invalidateCache(req: Request, res: Response, next: NextFunction) {
    const resource = req.params.resource;
    store.forEach((_, key) => {
        if (key === resource || key.startsWith(`${resource}?`)) {
            store.delete(key);
        }
    });
    next();
}

