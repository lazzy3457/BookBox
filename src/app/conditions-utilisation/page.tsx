import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/layout/LegalDocument";
import { legalConfig } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Conditions d’utilisation",
  description: "Règles d’utilisation du service BooksBox.",
  alternates: { canonical: "/conditions-utilisation" }
};

export default function TermsPage() {
  return (
    <LegalDocument
      eyebrow="Règles du service"
      title="Conditions d’utilisation"
      introduction="En utilisant BooksBox, tu acceptes ces règles destinées à garder le service utile, sûr et agréable."
    >
      <section>
        <h2>Objet du service</h2>
        <p>
          BooksBox permet de gérer ses lectures, publier des avis, créer des listes, recevoir des recommandations et échanger
          avec d’autres lecteurs. Le service peut évoluer, être interrompu temporairement ou voir certaines fonctions modifiées.
        </p>
      </section>

      <section>
        <h2>Compte</h2>
        <p>
          Tu dois fournir des informations exactes, protéger tes identifiants et signaler tout accès non autorisé. Un seul compte
          doit être utilisé par personne. Si tu n’as pas la capacité légale d’accepter ces conditions, l’autorisation de ton
          représentant légal est nécessaire. La création d’un compte est réservée aux personnes âgées d’au moins {legalConfig.minimumAge} ans.
        </p>
      </section>

      <section>
        <h2>Contenus et comportement</h2>
        <p>Tu restes responsable des contenus publiés. Il est notamment interdit de :</p>
        <ul>
          <li>publier un contenu illégal, haineux, harcelant, menaçant ou portant atteinte à la vie privée ;</li>
          <li>usurper une identité, automatiser abusivement le service ou tenter d’en contourner la sécurité ;</li>
          <li>publier des œuvres protégées sans autorisation ou masquer volontairement un spoiler important ;</li>
          <li>manipuler les notes, recommandations, signalements ou interactions de la communauté.</li>
        </ul>
      </section>

      <section>
        <h2>Modération</h2>
        <p>
          BooksBox peut masquer ou supprimer un contenu, limiter une fonctionnalité ou suspendre un compte en cas de violation
          de ces règles, de risque pour la communauté ou d’obligation légale. Les outils de signalement et de blocage permettent
          aussi aux utilisateurs de se protéger.
        </p>
        <p>Chaque décision défavorable est motivée. Une contestation peut être déposée depuis la page <Link href="/signalement">Signalement légal</Link>.</p>
      </section>

      <section>
        <h2>Recommandations</h2>
        <p>Les recommandations sont calculées à partir de tes notes, favoris, statuts, auteurs appréciés et des goûts de lecteurs similaires. Elles n’ont aucun effet juridique ou significatif et peuvent être corrigées avec « Pas intéressé » ou « Déjà lu ».</p>
      </section>

      <section>
        <h2>Disponibilité et responsabilité</h2>
        <p>
          BooksBox s’efforce de fournir des informations fiables, mais les métadonnées bibliographiques et recommandations
          peuvent contenir des erreurs. Le service ne garantit pas une disponibilité permanente et ne remplace aucun conseil
          professionnel. Les liens et services tiers restent sous la responsabilité de leurs éditeurs.
        </p>
      </section>

      <section>
        <h2>Résiliation</h2>
        <p>
          Tu peux cesser d’utiliser BooksBox et supprimer ton compte depuis les paramètres. Les conséquences sur les données
          sont expliquées dans la <Link href="/confidentialite">politique de confidentialité</Link>.
        </p>
      </section>
    </LegalDocument>
  );
}
