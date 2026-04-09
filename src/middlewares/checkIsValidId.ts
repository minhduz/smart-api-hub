import { Request, Response, NextFunction } from "express";

export async function checkValidId(req: Request, res: Response, next: NextFunction) {
    const id = req.params.id as string;
    if (!/^\d+$/.test(id)) {
        return res.status(400).json({ error: 'ID phải là số nguyên hợp lệ' });
    }
    next()
}