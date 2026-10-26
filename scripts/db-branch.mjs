// Crée une base locale dédiée à une branche, copiée depuis la base de développement,
// puis y applique les migrations de la branche. Développement uniquement (conteneur Docker).
//
//   npm run db:branch            -> nom tiré de la branche Git courante
//   npm run db:branch -- parcours
import { execFileSync, spawnSync } from "node:child_process";

const CONTAINER = "booksbox-postgres";
const SOURCE_DB = "booksbox";

function run(command, args, options = {}) {
  return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], ...options }).trim();
}

const branch = process.argv[2] ?? run("git", ["branch", "--show-current"]);
const suffix = branch.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^bdd_/, "");
if (!suffix || ["main", "master"].includes(suffix)) {
  console.error("Donne un nom de branche autre que master : npm run db:branch -- <nom>");
  process.exit(1);
}
const target = `${SOURCE_DB}_${suffix}`.slice(0, 63);

const current = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1"].includes(current.hostname)) {
  console.error("DATABASE_URL ne pointe pas sur une base locale : ce script ne s'utilise qu'en développement.");
  process.exit(1);
}

const psql = (database, sql) => run("docker", ["exec", CONTAINER, "psql", "-U", current.username, "-d", database, "-Atc", sql]);
const exists = psql("postgres", `select 1 from pg_database where datname = '${target}'`) === "1";

if (exists) {
  console.log(`La base ${target} existe déjà, elle est conservée.`);
} else {
  run("docker", ["exec", CONTAINER, "createdb", "-U", current.username, target]);
  const copy = spawnSync("docker", ["exec", CONTAINER, "sh", "-c", `pg_dump -U "$POSTGRES_USER" -d ${SOURCE_DB} --no-owner | psql -q -U "$POSTGRES_USER" -d ${target} -v ON_ERROR_STOP=1`], { stdio: ["ignore", "ignore", "inherit"] });
  if (copy.status !== 0) process.exit(copy.status ?? 1);
  console.log(`Base ${target} créée à partir de ${SOURCE_DB}.`);
}

const targetUrl = new URL(current);
targetUrl.pathname = `/${target}`;
const migrate = spawnSync("npx prisma migrate deploy", { stdio: "inherit", shell: true, env: { ...process.env, DATABASE_URL: targetUrl.toString() } });
if (migrate.status !== 0) process.exit(migrate.status ?? 1);

targetUrl.password = "****";
console.log(`\nDans .env, remplace DATABASE_URL par la base de la branche (mot de passe inchangé) :\nDATABASE_URL="${targetUrl.toString()}"`);
console.log("Garde l'ancienne ligne en commentaire pour revenir sur master.");
