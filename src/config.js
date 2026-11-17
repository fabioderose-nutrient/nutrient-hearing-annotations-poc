// Demo data per UI language. English is the default; French is selected with VITE_DEFAULT_LANG=fr or ?lang=fr.
// Users can add, rename, recolor and delete personas and categories in the app.
import { lang } from "./i18n.js";

const DATA = {
  en: {
    personas: [
      { id: "p-presiding", name: "Presiding judge", color: "#F5C400" },
      { id: "p-associate1", name: "Associate judge 1", color: "#5CC98A" },
      { id: "p-associate2", name: "Associate judge 2", color: "#5B9BF0" },
      { id: "p-reporting", name: "Reporting judge", color: "#F07AB4" },
    ],
    categories: [
      { id: "c-facts", name: "Facts", color: "#3B5BDB" },
      { id: "c-testimony", name: "Testimony", color: "#0CA678" },
      { id: "c-contradiction", name: "Contradictions", color: "#E03131" },
      { id: "c-procedure", name: "Procedure", color: "#7048E8" },
      { id: "c-background", name: "Background", color: "#E8590C" },
    ],
    documents: {
      "criminal-case-sample": {
        url: "/samples/criminal-case-file-sample.pdf",
        title: "Case 26/04512 · Criminal division (fictional)",
      },
    },
    seeds: [
      { id: "seed-alarm-code", text: "knew", persona: "p-presiding", category: "c-facts",
        label: "Former employee knew the code", note: "Key point of the prosecution: check when the code was changed." },
      { id: "seed-camera", text: "two individuals", persona: "p-associate1", category: "c-facts",
        label: "Camera: two individuals at 02:40", note: "Ask whether the footage is in the file." },
      { id: "seed-van", text: "white van parked with its lights off", persona: "p-associate2", category: "c-testimony",
        label: "Witness: white van", note: "" },
      { id: "seed-alibi", text: "at his sister's until 01:00", persona: "p-presiding", category: "c-contradiction",
        label: "Alibi: at his sister's until 01:00", note: "Compare with the 02:37 cell tower record (exhibit 4)." },
      { id: "seed-no-vehicle", text: "does not own a vehicle", persona: "p-reporting", category: "c-contradiction",
        label: "No vehicle", note: "To be confronted with Mr GARNIER's statement." },
      { id: "seed-phone", text: "connected to a tower 400 metres from the workshop", persona: "p-associate1", category: "c-procedure",
        label: "Cell tower 400 m away at 02:37", note: "The tower also covers the sister's home." },
      { id: "seed-record", text: "simple theft, 3 months suspended", persona: "p-reporting", category: "c-background",
        label: "Prior conviction 2021", note: "" },
    ],
  },
  fr: {
    personas: [
      { id: "p-presidente", name: "Présidente", color: "#F5C400" },
      { id: "p-assesseur1", name: "Assesseur 1", color: "#5CC98A" },
      { id: "p-assesseur2", name: "Assesseur 2", color: "#5B9BF0" },
      { id: "p-rapporteur", name: "Rapporteur", color: "#F07AB4" },
    ],
    categories: [
      { id: "c-facts", name: "Faits", color: "#3B5BDB" },
      { id: "c-testimony", name: "Témoignages", color: "#0CA678" },
      { id: "c-contradiction", name: "Contradictions", color: "#E03131" },
      { id: "c-procedure", name: "Procédure", color: "#7048E8" },
      { id: "c-personality", name: "Personnalité", color: "#E8590C" },
    ],
    documents: {
      "dossier-penal-fictif": {
        url: "/samples/dossier-penal-fictif.pdf",
        title: "Dossier 26/04512 · Chambre correctionnelle (fictif)",
      },
    },
    seeds: [
      { id: "seed-alarm-code", text: "connaissait", persona: "p-presidente", category: "c-facts",
        label: "Ancien salarié connaissant le code", note: "Point central de l'accusation : vérifier la date de changement du code." },
      { id: "seed-camera", text: "deux individus", persona: "p-assesseur1", category: "c-facts",
        label: "Vidéo : deux individus à 02h40", note: "Demander si la vidéo a été versée au dossier." },
      { id: "seed-van", text: "camionnette blanche stationnée sans phares", persona: "p-assesseur2", category: "c-testimony",
        label: "Témoin : camionnette blanche", note: "" },
      { id: "seed-alibi", text: "chez sa soeur", persona: "p-presidente", category: "c-contradiction",
        label: "Alibi : chez sa soeur jusqu'à 01h00", note: "Rapprocher du bornage de 02h37 (cote 4)." },
      { id: "seed-no-vehicle", text: "ne pas posséder de véhicule", persona: "p-rapporteur", category: "c-contradiction",
        label: "Pas de véhicule", note: "À confronter au témoignage de M. GARNIER." },
      { id: "seed-phone", text: "a déclenché une borne située à 400 mètres", persona: "p-assesseur1", category: "c-procedure",
        label: "Bornage à 400 m à 02h37", note: "La borne couvre aussi le domicile de la soeur." },
      { id: "seed-record", text: "vol simple, 3 mois avec sursis", persona: "p-rapporteur", category: "c-personality",
        label: "Antécédent 2021", note: "" },
    ],
  },
};

const data = DATA[lang];
export const DEFAULT_PERSONAS = data.personas;
export const DEFAULT_CATEGORIES = data.categories;
export const DOCUMENTS = data.documents;
export const DEFAULT_DOC = Object.keys(data.documents)[0];
export const SEED_ANNOTATIONS = data.seeds;
