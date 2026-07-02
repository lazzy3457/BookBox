import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/layout/LegalDocument";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Comment BooksBox collecte, utilise et protège tes données.",
  alternates: { canonical: "/confidentialite" }
};

export default function PrivacyPage() {
  const contactEmail = process.env.CONTACT_EMAIL?.trim();
  return (
    <LegalDocument eyebrow="Tes données" title="Politique de confidentialité" introduction="Cette page explique quelles données BooksBox traite, pourquoi elles sont nécessaires et comment garder leur maîtrise.">
      <section><h2>Responsable du traitement</h2><p>Le responsable est l’éditeur identifié dans les <Link href="/mentions-legales">mentions légales</Link>.{contactEmail ? <> Contact : <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</> : null}</p></section>
      <section><h2>Données traitées</h2><ul>
        <li>Compte : e-mail, nom, pseudonyme, biographie, avatar, rôle, état du compte et mot de passe protégé par hachage.</li>
        <li>Lecture : bibliothèque, favoris, statuts, notes, périodes et entrées de journal.</li>
        <li>Vie sociale : reviews, commentaires, réactions, abonnements, listes, blocages et signalements.</li>
        <li>Sécurité : session, jetons temporaires hachés, limitations de requêtes et jetons de notification mobile.</li>
        <li>Conformité : acceptation versionnée des textes, décisions de modération et contestations.</li>
        <li>Stockage local : recherches et livres récemment consultés, conservés uniquement dans le navigateur.</li>
      </ul></section>
      <section><h2>Finalités et bases légales</h2><p>La création du compte, la bibliothèque, le journal, les recommandations et les interactions reposent sur l’exécution des conditions d’utilisation. La sécurité, la prévention des abus et la modération reposent sur l’intérêt légitime de BooksBox et, lorsque nécessaire, sur ses obligations légales.</p></section>
      <section><h2>Données obligatoires et origine</h2><p>L’e-mail, le pseudo, le mot de passe, l’attestation d’âge et l’acceptation des conditions sont indispensables pour créer un compte. Les autres données viennent de tes actions ou des catalogues bibliographiques externes.</p></section>
      <section><h2>Visibilité et destinataires</h2><p>Le profil et les contenus publiés peuvent être visibles par la communauté. Les entrées du journal sont privées par défaut. L’hébergeur, le prestataire SMTP et Expo Push traitent les seules données nécessaires à leur mission. Les recherches peuvent consulter Google Books et Open Library ; les pages auteurs peuvent consulter Wikimedia.</p></section>
      <section><h2>Recommandations personnalisées</h2><p>Le classement utilise les notes, favoris, statuts, auteurs appréciés et proximités de goûts. Il ne produit aucun effet juridique ou significatif. Les commandes « Pas intéressé » et « Déjà lu » permettent de l’ajuster.</p></section>
      <section><h2>Transferts hors de l’Union européenne</h2><p>Certains prestataires peuvent traiter des données hors de l’Union européenne. Leur identité, leur localisation et les garanties contractuelles devront être documentées avant leur activation en production.</p></section>
      <section><h2>Conservation</h2><p>Les données restent actives pendant l’utilisation du compte et sont supprimées lors de sa suppression, sous réserve des sauvegardes techniques temporaires et obligations légales. Les jetons expirent après 24 heures pour la vérification et 30 minutes pour la réinitialisation. La durée des comptes inactifs doit être arrêtée avant l’ouverture publique : tant qu’elle ne l’est pas, le préflight de lancement reste incomplet.</p></section>
      <section><h2>Tes droits</h2><p>Tu peux demander accès, rectification, effacement, limitation, portabilité ou opposition lorsque ce droit s’applique. Les paramètres permettent déjà l’export et la suppression du compte. Après contact avec l’éditeur, une réclamation peut être adressée à la <a href="https://www.cnil.fr/" rel="noreferrer">CNIL</a>.</p></section>
      <section><h2>Cookies et stockage local</h2><p>BooksBox utilise uniquement les cookies nécessaires à l’authentification et à la sécurité. Aucun cookie publicitaire ou outil d’audience n’est actif. Le détail figure sur la page <Link href="/cookies">Cookies et stockage local</Link>.</p></section>
    </LegalDocument>
  );
}
