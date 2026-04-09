// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import { db } from '../db/knex';
import { hashPassword, comparePassword } from '../utils/hashPassword';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

export async function register(req: Request, res: Response, next: NextFunction) {
    const { email, password,} = req.body;

    const existing = await db('users').where({ email }).first();
    if (existing) {
        return res.status(409).json({ error: 'Email already exists' });
    }

    const hashed = await hashPassword(password);
    const [user] = await db('users')
        .insert({ email, password: hashed, role: 'user' })
        .returning(['id', 'email','password', 'role', 'created_at']);

    return res.status(201).json(user);
}

export async function login(req: Request, res: Response, next: NextFunction) {
    const { email, password } = req.body;

    const user = await db('users').where({ email }).first();
    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        {
            expiresIn: JWT_EXPIRES_IN,
        } as jwt.SignOptions
    );

    return res.status(200).json({
        token,
        user: { id: user.id, email: user.email, role: user.role },
    });
}