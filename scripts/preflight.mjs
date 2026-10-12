const required = [
  "DATABASE_URL", "NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL", "NEXTAUTH_SECRET",
  "MOBILE_JWT_SECRET", "RATE_LIMIT_SECRET", "CONTACT_EMAIL", "LEGAL_NAME",
  "LEGAL_ADDRESS", "LEGAL_DIRECTOR", "HOST_NAME", "HOST_ADDRESS", "HOST_PHONE",
  "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM",
  "TRUST_PROXY_HEADERS", "INACTIVE_ACCOUNT_POLICY_CONFIRMED"
];
const missing = required.filter((name) => !process.env[name]?.trim());
const invalidUrls = ["NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL"].filter((name) => {
  try { return new URL(process.env[name] ?? "").protocol !== "https:"; } catch { return true; }
});
const inactivePolicyMissing = process.env.INACTIVE_ACCOUNT_POLICY_CONFIRMED !== "confirmed";
if (missing.length || invalidUrls.length || inactivePolicyMissing) {
  if (missing.length) console.error(`Variables manquantes : ${missing.join(", ")}`);
  if (invalidUrls.length) console.error(`URL HTTPS obligatoire : ${invalidUrls.join(", ")}`);
  if (inactivePolicyMissing) console.error("Politique des comptes inactifs non confirmée : définir INACTIVE_ACCOUNT_POLICY_CONFIRMED=confirmed après validation.");
  process.exit(1);
}
console.log("Configuration complète. Vérifier aussi les sauvegardes et les contrats des prestataires.");
