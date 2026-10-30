// Codes que NextAuth transmet au client (paramètre `error`). Ils ne doivent jamais contenir
// de détail interne : toute erreur inattendue est ramenée à SIGNIN_UNAVAILABLE côté serveur.
export const AUTH_ERRORS = {
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  RATE_LIMITED: "RATE_LIMITED",
  SIGNIN_UNAVAILABLE: "SIGNIN_UNAVAILABLE",
  GOOGLE_EMAIL_NOT_VERIFIED: "GOOGLE_EMAIL_NOT_VERIFIED",
  GOOGLE_SIGNUP_CONSENT_REQUIRED: "GOOGLE_SIGNUP_CONSENT_REQUIRED"
} as const;

const messages: Record<string, string> = {
  CredentialsSignin: "E-mail ou mot de passe incorrect.",
  [AUTH_ERRORS.EMAIL_NOT_VERIFIED]: "Ton adresse e-mail n’est pas encore vérifiée. Clique sur le lien reçu par e-mail pour activer ton compte.",
  [AUTH_ERRORS.RATE_LIMITED]: "Trop de tentatives. Réessaie dans quelques minutes.",
  [AUTH_ERRORS.GOOGLE_EMAIL_NOT_VERIFIED]: "Ton adresse Google n’est pas vérifiée : la connexion avec Google est impossible.",
  [AUTH_ERRORS.GOOGLE_SIGNUP_CONSENT_REQUIRED]: "Aucun compte BooksBox n’utilise encore cette adresse Google. Coche les deux cases ci-dessus, puis continue avec Google.",
  AccessDenied: "Connexion refusée.",
  OAuthCreateAccount: "Le compte n’a pas pu être créé avec Google. Réessaie depuis la page d’inscription.",
  OAuthAccountNotLinked: "Cette adresse est déjà liée à un autre mode de connexion."
};

export function authErrorMessage(code: string) {
  return messages[code] ?? "La connexion n’a pas abouti. Réessaie dans quelques instants.";
}
