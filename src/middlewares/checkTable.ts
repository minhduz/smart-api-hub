import { Request, Response, NextFunction } from "express";
import { tableExists } from "../utils/tableValidator";

export async function checkTable(req: Request, res: Response, next: NextFunction) {
    const resource = req.params.resource as string;
        if((! await tableExists(resource))){
        return res.status(404).json({error: `Resource ${resource} not found` })
    }
    next()
}