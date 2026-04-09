// src/routes/auth.route.ts
import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';
import { catchAsync } from '../middlewares/catchAsync';

const router = Router();


router.post('/register', catchAsync(register));
router.post('/login', catchAsync(login));

export default router;