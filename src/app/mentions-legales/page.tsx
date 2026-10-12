import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/layout/LegalDocument";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Informations légales relatives au site BooksBox.",
  alternates: { canonical: "/mentions-legales" }
};

function value(name: string) {
  return process.env[name]?.trim() || null;
}

export default function LegalNoticePage() {
  return (
    <LegalDocument
      eyebrow="Informations"
      title="Mentions légales"
      introduction="Les informations d’identification de l’éditeur et de l’hébergeur de BooksBox."
    >
      <section>
        <h2>Éditeur du site</h2>
        <p><strong className="text-paper">Éditeur :</strong> {value("LEGAL_NAME") ?? "Information disponible avant l’ouverture publique"}</p>
        <p><strong className="text-paper">Adresse :</strong> {value("LEGAL_ADDRESS") ?? "Information disponible avant l’ouverture publique"}</p>
        {value("LEGAL_REGISTRATION") ? <p><strong className="text-paper">Immatriculation :</strong> {value("LEGAL_REGISTRATION")}</p> : null}
        <p><strong className="text-paper">Directeur de la publication :</strong> {value("LEGAL_DIRECTOR") ?? "Information disponible avant l’ouverture publique"}</p>
        <p><strong className="text-paper">Contact :</strong> {value("CONTACT_EMAIL") ?? "Information disponible avant l’ouverture publique"}</p>
      </section>

      <section>
        <h2>Hébergement</h2>
        <p><strong className="text-paper">Hébergeur :</strong> {value("HOST_NAME") ?? "À choisir"}</p>
        {value("HOST_ADDRESS") ? <p><strong className="text-paper">Adresse :</strong> {value("HOST_ADDRESS")}</p> : null}
        {value("HOST_PHONE") ? <p><strong className="text-paper">Téléphone :</strong> {value("HOST_PHONE")}</p> : null}
      </section>

      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          La structure, l’interface, les textes propres à BooksBox et ses éléments graphiques sont protégés par les lois
          applicables. Les couvertures, résumés, biographies et autres contenus provenant de services tiers restent la
          propriété de leurs titulaires respectifs.
        </p>
      </section>

      <section>
        <h2>Données personnelles</h2>
        <p>
          Les modalités de traitement et d’exercice de tes droits sont détaillées dans notre{" "}
          <Link href="/confidentialite">politique de confidentialité</Link>.
        </p>
      </section>
    </LegalDocument>
  );
}
