import type { Metadata } from "next";
import { LegalDocument } from "@/components/layout/LegalDocument";

export const metadata: Metadata = {
  title: "Cookies et stockage local",
  description: "Cookies et données conservées dans le navigateur par BooksBox.",
  alternates: { canonical: "/cookies" }
};

export default function CookiesPage() {
  return (
    <LegalDocument eyebrow="Confidentialité" title="Cookies et stockage local" introduction="BooksBox n’utilise actuellement aucun traceur publicitaire ni outil de mesure d’audience.">
      <section><h2>Cookies nécessaires</h2><p>Les cookies de session NextAuth maintiennent la connexion et protègent le parcours d’authentification. Ils sont strictement nécessaires et ne servent pas au suivi publicitaire.</p></section>
      <section><h2>Stockage local</h2><p>Le navigateur conserve l’historique de recherche et les livres récemment consultés pour améliorer la navigation. Ces informations ne sont pas envoyées au serveur et peuvent être supprimées depuis les réglages du navigateur.</p></section>
      <section><h2>Évolution</h2><p>Si BooksBox ajoute une mesure d’audience, de la publicité ou un traceur non nécessaire, aucun dépôt ne sera réalisé avant information et recueil du consentement lorsque celui-ci est requis.</p></section>
    </LegalDocument>
  );
}
