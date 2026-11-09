import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

// Hash d'un mot de passe aléatoire jeté : on le compare quand le compte n'existe pas ou n'a pas
// de mot de passe, pour que le temps de réponse ne révèle pas quelles adresses sont inscrites.
export const DUMMY_PASSWORD_HASH = "$2b$12$EiUpvEuj97LTF5JL5nHXguW6ZmOu5BcGt6NGxAzSirn8MsTRJDl5a";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
