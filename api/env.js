// api/env.js
// ============================================================
//  Endpoint serverless de Vercel
//  Inyecta las variables de entorno de Firebase al cliente
//  de forma segura (sin exponerlas en el HTML estático).
//
//  Llamado desde: public/index.html → <script src="/api/env">
// ============================================================

export default function handler(req, res) {
  // Solo las claves públicas de Firebase (NO service account keys)
  const config = {
    FIREBASE_API_KEY:             process.env.FIREBASE_API_KEY             || "",
    FIREBASE_AUTH_DOMAIN:         process.env.FIREBASE_AUTH_DOMAIN         || "",
    FIREBASE_PROJECT_ID:          process.env.FIREBASE_PROJECT_ID          || "",
    FIREBASE_STORAGE_BUCKET:      process.env.FIREBASE_STORAGE_BUCKET      || "",
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
    FIREBASE_APP_ID:              process.env.FIREBASE_APP_ID              || "",
  };

  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(`window.__ENV__ = ${JSON.stringify(config)};`);
}
