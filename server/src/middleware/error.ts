import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err.message);
  
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors,
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Resource already exists',
      field: err.meta?.target,
    });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
}
