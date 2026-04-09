import { Router } from 'express';
import { getAll, getById, createResource, updateResource, deleteResource } from '../controllers/resource.controller';
import { checkTable } from '../middlewares/checkTable';
import { catchAsync } from '../middlewares/catchAsync';
import { checkValidId } from '../middlewares/checkIsValidId';
import { authenticate, authorizeAdmin } from '../middlewares/authenticate';
import { cacheGet, invalidateCache } from '../middlewares/cache';

const router = Router();
const resourceRouter = Router({ mergeParams: true }); // ← inherits params from parent
// mergeParams: true tells the child router to inherit req.params from the parent, 
// so req.params.resource is available inside resourceRouter when checkTable runs.

// shared middleware for all /:resource routes
resourceRouter.use(catchAsync(checkTable));

// Public
resourceRouter.get('/', cacheGet, catchAsync(getAll));
resourceRouter.get('/:id', catchAsync(checkValidId), cacheGet, catchAsync(getById));

// Authenticate
resourceRouter.post('/' , invalidateCache,catchAsync(createResource));
resourceRouter.put('/:id', authenticate, invalidateCache, catchAsync(checkValidId), catchAsync(updateResource));
resourceRouter.patch('/:id', authenticate, invalidateCache, catchAsync(checkValidId), catchAsync(updateResource));

// Admin only
resourceRouter.delete('/:id', authenticate, authorizeAdmin, invalidateCache, catchAsync(checkValidId), catchAsync(deleteResource));

router.use('/:resource', resourceRouter);

export default router;