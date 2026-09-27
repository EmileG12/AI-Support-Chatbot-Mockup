import type { NextFunction, Request, Response } from "express";

const SESSION_COOKIE = "session";
const SESSION_VALUE = "ok";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
    signed: true,
  };
}

export const PUBLIC_PATHS = ["/api/health", "/api/login", "/api/me"];

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.signedCookies[SESSION_COOKIE] === SESSION_VALUE) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

interface LoginRequestBody {
  username?: string;
  password?: string;
}

export function login(req: Request, res: Response) {
  const { username, password } = req.body as LoginRequestBody;

  if (username !== process.env.APP_USERNAME || password !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  res.cookie(SESSION_COOKIE, SESSION_VALUE, {
    ...cookieOptions(),
    maxAge: SESSION_MAX_AGE_MS,
  });
  res.json({ ok: true });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
  res.json({ ok: true });
}

export function me(req: Request, res: Response) {
  if (req.signedCookies[SESSION_COOKIE] === SESSION_VALUE) {
    return res.json({ authenticated: true });
  }
  res.status(401).json({ authenticated: false });
}
