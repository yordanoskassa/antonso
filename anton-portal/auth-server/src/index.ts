import "dotenv/config";
import cors from "cors";
import express from "express";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";

const app = express();
const port = Number(process.env.PORT ?? 3005);
const frontend = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
const publicUrl = process.env.BETTER_AUTH_URL ?? frontend;
const extraOrigins =
  process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];
const corsOrigins = [...new Set([frontend, publicUrl, ...extraOrigins])];

app.set("trust proxy", 1);

app.use(
  cors({
    origin: corsOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

// Better Auth handler - must be before express.json()
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV });
});

app.get("/api/me", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  res.json(session);
});

app.get("/test", (_req, res) => {
  res.json({ message: "Auth server is running", timestamp: new Date().toISOString() });
});

// Debug - list all registered routes
app.get("/debug", (_req, res) => {
  res.json({
    betterAuth: true,
    baseURL: publicUrl,
    corsOrigins,
  });
});

app.listen(port, () => {
  console.log(`Better Auth listening on ${port} (CORS: ${corsOrigins.join(", ")})`);
  console.log(`Auth endpoints: /api/auth/*`);
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn(
      "[auth] Google sign-in disabled: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env",
    );
  }
});
