// Demo data per UI language. English is the default; French is selected with VITE_DEFAULT_LANG=fr or ?lang=fr.
// Users can add, rename, recolor and delete themes and personas in the app.
import { lang } from "./i18n.js";

// Highlight colors come from the themes. Personas only identify the author (initials and avatar color).
const DATA = {
  en: {
    personas: [
      { id: "p-presiding", name: "Presiding judge", color: "#364FC7" },
      { id: "p-associate1", name: "Associate judge 1", color: "#0B7285" },
      { id: "p-associate2", name: "Associate judge 2", color: "#862E9C" },
      { id: "p-reporting", name: "Reporting judge", color: "#C2255C" },
    ],
    themes: [
      { id: "t-defendant", name: "Defendant", color: "#FFD43B" },
      { id: "t-victim", name: "Civil party", color: "#74C0FC" },
      { id: "t-witness", name: "Witnesses", color: "#8CE99A" },
      { id: "t-contradiction", name: "Contradictions", color: "#FF8787" },
      { id: "t-evidence", name: "Evidence", color: "#B197FC" },
      { id: "t-background", name: "Background", color: "#FFA94D" },
    ],
    documents: {
      "criminal-case-sample": {
        url: "/samples/criminal-case-file-sample.pdf",
        title: "Case 26/04512 · Criminal division (fictional)",
      },
    },
    seeds: [
      { id: "seed-loss", text: "Three laptops and a cash box holding", persona: "p-reporting", theme: "t-victim",
        label: "Loss: 3 laptops and about 1,200 euros", note: "Check whether the civil party has sent invoices." },
      { id: "seed-alarm-code", text: "knew", persona: "p-presiding", theme: "t-defendant",
        label: "Former employee knew the code", note: "Key point of the prosecution: check when the code was changed." },
      { id: "seed-code-denied", text: "no longer knows the alarm code", persona: "p-presiding", theme: "t-defendant",
        label: "Says the code was changed", note: "" },
      { id: "seed-camera", text: "two individuals", persona: "p-associate1", theme: "t-evidence",
        label: "Camera: two individuals at 02:40", note: "Ask whether the footage is in the file." },
      { id: "seed-van", text: "white van parked with its lights off", persona: "p-associate2", theme: "t-witness",
        label: "Witness: white van", note: "" },
      { id: "seed-alibi", text: "at his sister's until 01:00", persona: "p-presiding", theme: "t-contradiction",
        label: "Alibi: at his sister's until 01:00", note: "Compare with the 02:37 cell tower record (exhibit 4)." },
      { id: "seed-no-vehicle", text: "does not own a vehicle", persona: "p-reporting", theme: "t-contradiction",
        label: "No vehicle", note: "To be confronted with Mr GARNIER's statement." },
      { id: "seed-phone", text: "connected to a tower 400 metres from the workshop", persona: "p-associate1", theme: "t-evidence",
        label: "Cell tower 400 m away at 02:37", note: "The tower also covers the sister's home." },
      { id: "seed-record", text: "simple theft, 3 months suspended", persona: "p-reporting", theme: "t-background",
        label: "Prior conviction 2021", note: "" },
    ],
  },
  fr: {
    personas: [
      { id: "p-presidente", name: "Présidente", color: "#364FC7" },
      { id: "p-assesseur1", name: "Assesseur 1", color: "#0B7285" },
      { id: "p-assesseur2", name: "Assesseur 2", color: "#862E9C" },
      { id: "p-rapporteur", name: "Rapporteur", color: "#C2255C" },
    ],
    themes: [
      { id: "t-defendant", name: "Prévenu", color: "#FFD43B" },
      { id: "t-victim", name: "Partie civile", color: "#74C0FC" },
      { id: "t-witness", name: "Témoins", color: "#8CE99A" },
      { id: "t-contradiction", name: "Contradictions", color: "#FF8787" },
      { id: "t-evidence", name: "Éléments de preuve", color: "#B197FC" },
      { id: "t-background", name: "Personnalité", color: "#FFA94D" },
    ],
    documents: {
      "dossier-penal-fictif": {
        url: "/samples/dossier-penal-fictif.pdf",
        title: "Dossier 26/04512 · Chambre correctionnelle (fictif)",
      },
    },
    seeds: [
      { id: "seed-loss", text: "Trois ordinateurs portables et une caisse", persona: "p-rapporteur", theme: "t-victim",
        label: "Préjudice : 3 ordinateurs et 1 200 €", note: "Vérifier si la partie civile a produit les factures." },
      { id: "seed-alarm-code", text: "connaissait", persona: "p-presidente", theme: "t-defendant",
        label: "Ancien salarié connaissant le code", note: "Point central de l'accusation : vérifier la date de changement du code." },
      { id: "seed-code-denied", text: "ne plus connaître le code de l'alarme", persona: "p-presidente", theme: "t-defendant",
        label: "Affirme que le code a été changé", note: "" },
      { id: "seed-camera", text: "deux individus", persona: "p-assesseur1", theme: "t-evidence",
        label: "Vidéo : deux individus à 02h40", note: "Demander si la vidéo a été versée au dossier." },
      { id: "seed-van", text: "camionnette blanche stationnée sans phares", persona: "p-assesseur2", theme: "t-witness",
        label: "Témoin : camionnette blanche", note: "" },
      { id: "seed-alibi", text: "chez sa soeur", persona: "p-presidente", theme: "t-contradiction",
        label: "Alibi : chez sa soeur jusqu'à 01h00", note: "Rapprocher du bornage de 02h37 (cote 4)." },
      { id: "seed-no-vehicle", text: "ne pas posséder de véhicule", persona: "p-rapporteur", theme: "t-contradiction",
        label: "Pas de véhicule", note: "À confronter au témoignage de M. GARNIER." },
      { id: "seed-phone", text: "a déclenché une borne située à 400 mètres", persona: "p-assesseur1", theme: "t-evidence",
        label: "Bornage à 400 m à 02h37", note: "La borne couvre aussi le domicile de la soeur." },
      { id: "seed-record", text: "vol simple, 3 mois avec sursis", persona: "p-rapporteur", theme: "t-background",
        label: "Antécédent 2021", note: "" },
    ],
  },
};

const data = DATA[lang];
export const DEFAULT_PERSONAS = data.personas;
export const DEFAULT_CATEGORIES = data.themes;
export const DOCUMENTS = data.documents;
export const DEFAULT_DOC = Object.keys(data.documents)[0];
export const SEED_ANNOTATIONS = data.seeds;
