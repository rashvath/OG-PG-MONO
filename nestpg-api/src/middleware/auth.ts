import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

import { env } from '../config/env'
import type { JwtPayload, Role } from '../types/auth'

export interface AuthedRequest extends Request {
  user?: JwtPayload
}

export function auth(requiredRole?: Role) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      res.status(401).json({ message: 'Missing token' })
      return
    }

    try {
      const payload = jwt.verify(token, env.jwtSecret) as JwtPayload
      req.user = payload

      if (requiredRole && payload.role !== requiredRole) {
        res.status(403).json({ message: 'Forbidden' })
        return
      }

      next()
    } catch {
      res.status(401).json({ message: 'Invalid token' })
    }
  }
}
