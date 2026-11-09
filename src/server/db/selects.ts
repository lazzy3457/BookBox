// Seuls champs d'un compte qui peuvent sortir du serveur : jamais l'e-mail ni le hash du mot de passe.
export const publicUserSelect = { id: true, name: true, username: true, image: true } as const;
