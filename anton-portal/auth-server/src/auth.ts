import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { jwt } from "better-auth/plugins";
import { MongoClient } from "mongodb";

const mongoUrl =
  process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/anton_portal";
/** Public URL of the app (browser origin). Use http://localhost:5173 when Vite proxies /api/auth. */
const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:5173";
const secret =
  process.env.BETTER_AUTH_SECRET ??
  "development-only-secret-change-me-32chars!!";

const extraTrustedOrigins =
  process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

const trustedOrigins = [
  ...new Set([
    baseURL,
    process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
    ...extraTrustedOrigins,
  ]),
];

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

/** Multi-doc transactions require a replica set. Standalone MongoDB (typical local dev) should keep this false. */
const mongoUseTransactions = process.env.MONGODB_USE_TRANSACTIONS === "true";

const client = new MongoClient(mongoUrl);
const db = client.db();

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client,
    transaction: mongoUseTransactions,
  }),
  secret,
  baseURL,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
  },
  ...(googleClientId && googleClientSecret
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            mapProfileToUser: (profile) => {
              const email =
                typeof profile.email === "string" ? profile.email : "";
              const fromEmail = email.includes("@")
                ? email.slice(0, email.indexOf("@"))
                : "";
              const rawName = profile.name;
              const name =
                typeof rawName === "string" && rawName.trim()
                  ? rawName.trim()
                  : fromEmail || "User";
              return { name };
            },
          },
        },
      }
    : {}),
  plugins: [
    jwt({
      jwt: {
        issuer: baseURL,
        audience: baseURL,
        expirationTime: "1h",
      },
    }),
  ],
});
