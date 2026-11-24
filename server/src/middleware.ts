import type { NextFunction, Request, Response } from 'express';
import { userClient } from './supabase.js';
import { supabaseConfigured } from './config.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      accessToken?: string;
    }
  }
}

export function requireConfiguration(_req: Request, res: Response, next: NextFunction) {
  if (!supabaseConfigured) {
    res.status(503).json({ error: 'Supabase is not configured. Copy .env.example to .env and add the project URL and publishable key.' });
    return;
  }
  next();
}

export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    res.status(401).json({ error: 'Sign in is required.' });
    return;
  }
  try {
    const client = userClient(token);
    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) {
      res.status(401).json({ error: 'Your session is invalid or expired.' });
      return;
    }
    req.userId = user.id;
    req.accessToken = token;
    next();
  } catch {
    res.status(401).json({ error: 'Your session could not be verified.' });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const { data, error } = await userClient(req.accessToken!).from('profiles')
      .select('role').eq('id', req.userId!).maybeSingle();
    if (error) {
      console.error('Administrator profile lookup failed:', error.message);
      res.status(500).json({ error: 'Administrator access could not be verified.' });
      return;
    }
    if (data?.role !== 'admin') {
      res.status(403).json({ error: 'Administrator access is required.' });
      return;
    }
    next();
  } catch (error) {
    console.error(
      'Administrator profile lookup failed:',
      error instanceof Error ? error.message : error,
    );
    res.status(500).json({ error: 'Administrator access could not be verified.' });
  }
}

export const asyncRoute = (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => { void fn(req, res).catch(next); };

export function sendSupabaseError(res: Response, error: { message: string; code?: string }) {
  const status = error.code === '23505' ? 409 : error.code === '23503' ? 400 : 400;
  res.status(status).json({ error: error.code === '23505' ? 'A record with these details already exists.' : error.message });
}
