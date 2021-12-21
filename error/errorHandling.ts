// With inspiration from:
// https://medium.com/@SigniorGratiano/express-error-handling-674bfdd86139

import { NextFunction, Request, Response } from "express";

type middlewareFunc = (req: Request, res: Response, next: NextFunction) => any;

export const catchAsync = (fn: middlewareFunc) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};
