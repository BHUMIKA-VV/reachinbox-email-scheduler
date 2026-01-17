import { fetch } from "undici";
import crypto from "crypto";
import { Request, Response } from "express";
import { pool } from "./db";

export const authGoogle = (req: Request, res: Response) => {
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie("oauth_state", state, {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production"
  });
  const params = new URLSearchParams({
    client_id: String(process.env.GOOGLE_CLIENT_ID),
    redirect_uri: String(process.env.GOOGLE_REDIRECT_URI),
    response_type: "code",
    scope: "openid email profile",
    state
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};

export const authGoogleCallback = async (req: Request, res: Response) => {
  const code = String(req.query.code || "");
  const state = String(req.query.state || "");
  const cookieState = req.cookies["oauth_state"];
  if (!code || state !== cookieState) return res.status(400).send("invalid_state");

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: String(process.env.GOOGLE_CLIENT_ID),
      client_secret: String(process.env.GOOGLE_CLIENT_SECRET),
      redirect_uri: String(process.env.GOOGLE_REDIRECT_URI),
      grant_type: "authorization_code"
    })
  });
  const tokens = await tokenResp.json();
  const userInfoResp = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${(tokens as any).access_token}` }
  });
  const profile = (await userInfoResp.json()) as {
    sub: string;
    name: string;
    email: string;
    picture?: string;
  };

  const client = await pool.connect();
  try {
    const upsert = await client.query(
      `insert into users (google_id, name, email, avatar_url)
       values ($1,$2,$3,$4)
       on conflict (google_id) do update set name=excluded.name, email=excluded.email, avatar_url=excluded.avatar_url
       returning id`,
      [profile.sub, profile.name, profile.email, profile.picture]
    );
    const userId = upsert.rows[0].id;
    res.cookie("session_user", String(userId), {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production"
    });
    res.redirect("/dashboard");
  } finally {
    client.release();
  }
};
