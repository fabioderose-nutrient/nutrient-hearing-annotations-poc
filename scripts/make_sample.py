"""Generate a fictional criminal case file for the demo. All names and facts are invented.

Usage: python3 scripts/make_sample.py <lang: en|fr> <output.pdf>
"""
import sys
import fitz

LANG, OUT = sys.argv[1], sys.argv[2]

PAGES = {
    "en": [
        ("VILLENEUVE CRIMINAL COURT\nCriminal case file",
         ["Case number: 26/04512",
          "Defendant: Mark DUVAL, born 3 March 1988",
          "Civil party: Bellerive Workshop Ltd",
          "Offence: aggravated theft committed jointly",
          "Date of the facts: night of 12 to 13 June 2026",
          "Hearing: criminal division, 18 January 2027",
          "",
          "This case file is a fictional example created for the demo.",
          "Any resemblance to real persons is coincidental."]),
        ("Exhibit 1 - Complaint report",
         ["On 13 June 2026 at 08:15, Ms Claire FONTAINE, manager of",
          "Bellerive Workshop Ltd, came to the police station to file a complaint.",
          "She states that when she arrived the back door of the workshop",
          "had been forced. Three laptops and a cash box holding",
          "about 1,200 euros are missing.",
          "The car park camera recorded two individuals",
          "at around 02:40 in the morning.",
          "Ms FONTAINE says that a former employee, dismissed in April, knew",
          "the alarm code."]),
        ("Exhibit 2 - Witness statement",
         ["Statement of Mr Paul GARNIER, neighbour of the workshop.",
          "The witness says he heard glass breaking at around 02:30.",
          "He saw a white van parked with its lights off in front of the workshop.",
          "He could not read the number plate.",
          "The witness states that he does not know Mark DUVAL.",
          "He maintains that two people were loading boxes into the vehicle."]),
        ("Exhibit 3 - Defendant interview",
         ["Interview of Mr Mark DUVAL, held in custody on 20 June 2026.",
          "The defendant denies the facts.",
          "He says he spent the evening at his sister's until 01:00,",
          "then went straight home.",
          "He admits he worked at the workshop until April 2026.",
          "He says he no longer knows the alarm code, which was changed.",
          "Asked about the white van, he says he does not own a vehicle."]),
        ("Exhibit 4 - Phone location report",
         ["The cell tower data shows that the defendant's phone",
          "connected to a tower 400 metres from the workshop at 02:37.",
          "The phone was switched off between 02:50 and 05:10.",
          "The expert notes that the area covered by this tower",
          "also includes the home of the defendant's sister.",
          "Conclusion: the presence nearby is consistent with both versions."]),
        ("Exhibit 5 - Criminal record",
         ["Conviction of 9 October 2021: simple theft, 3 months suspended.",
          "No other entry.",
          "",
          "Background report:",
          "The defendant lives alone and has been unemployed since April 2026.",
          "He has been training as a maintenance technician since September 2026."]),
    ],
    "fr": [
        ("TRIBUNAL JUDICIAIRE DE VILLENEUVE\nDossier de procédure pénale",
         ["Numéro de parquet : 26/04512",
          "Prévenu : Marc DUVAL, né le 3 mars 1988",
          "Partie civile : Société Atelier Bellerive",
          "Infraction : vol aggravé commis en réunion",
          "Date des faits : nuit du 12 au 13 juin 2026",
          "Audience : chambre correctionnelle, 18 janvier 2027",
          "",
          "Ce dossier est un exemple fictif créé pour la démonstration.",
          "Toute ressemblance avec des personnes réelles serait fortuite."]),
        ("Cote 1 - Procès-verbal de plainte",
         ["Le 13 juin 2026 à 08h15, Mme Claire FONTAINE, gérante de la société",
          "Atelier Bellerive, se présente au commissariat pour déposer plainte.",
          "Elle déclare avoir constaté à son arrivée que la porte arrière de l'atelier",
          "avait été forcée. Trois ordinateurs portables et une caisse contenant",
          "environ 1 200 euros ont disparu.",
          "La caméra de surveillance du parking a enregistré deux individus",
          "vers 02h40 du matin.",
          "Mme FONTAINE indique qu'un ancien salarié, licencié en avril, connaissait",
          "le code de l'alarme."]),
        ("Cote 2 - Procès-verbal d'audition du témoin",
         ["Audition de M. Paul GARNIER, voisin de l'atelier.",
          "Le témoin déclare avoir entendu un bruit de verre brisé vers 02h30.",
          "Il a vu une camionnette blanche stationnée sans phares devant l'atelier.",
          "Il n'a pas pu relever la plaque d'immatriculation.",
          "Le témoin précise qu'il ne connaît pas Marc DUVAL.",
          "Il maintient que deux personnes chargeaient des cartons dans le véhicule."]),
        ("Cote 3 - Procès-verbal d'audition du prévenu",
         ["Audition de M. Marc DUVAL, placé en garde à vue le 20 juin 2026.",
          "Le prévenu conteste les faits.",
          "Il déclare avoir passé la soirée chez sa soeur jusqu'à 01h00 du matin,",
          "puis être rentré directement à son domicile.",
          "Il reconnaît avoir travaillé à l'atelier jusqu'en avril 2026.",
          "Il affirme ne plus connaître le code de l'alarme, qui aurait été changé.",
          "Interrogé sur la camionnette blanche, il déclare ne pas posséder de véhicule."]),
        ("Cote 4 - Rapport d'expertise téléphonique",
         ["L'analyse des données de bornage montre que le téléphone du prévenu",
          "a déclenché une borne située à 400 mètres de l'atelier à 02h37.",
          "Le téléphone était éteint entre 02h50 et 05h10.",
          "L'expert précise que la zone couverte par cette borne inclut",
          "également le domicile de la soeur du prévenu.",
          "Conclusion : la présence à proximité est compatible avec les deux versions."]),
        ("Cote 5 - Bulletin n°1 du casier judiciaire",
         ["Condamnation du 9 octobre 2021 : vol simple, 3 mois avec sursis.",
          "Aucune autre mention.",
          "",
          "Enquête de personnalité :",
          "Le prévenu vit seul, il est sans emploi depuis avril 2026.",
          "Il suit une formation de technicien de maintenance depuis septembre 2026."]),
    ],
}
FOOTER = {"en": "Page {n} / {total} - Fictional demo case file", "fr": "Page {n} / {total} - Dossier fictif de démonstration"}
TITLE = {"en": "Criminal case file (fictional)", "fr": "Dossier de procédure pénale (fictif)"}

pages = PAGES[LANG]
doc = fitz.open()
for title, lines in pages:
    page = doc.new_page(width=595, height=842)
    y = 90
    for t in title.split("\n"):
        page.insert_text((60, y), t, fontsize=16, fontname="hebo")
        y += 24
    y += 20
    for line in lines:
        page.insert_text((60, y), line, fontsize=12, fontname="helv")
        y += 22
    footer = FOOTER[LANG].format(n=page.number + 1, total=len(pages))
    page.insert_text((60, 800), footer, fontsize=9, fontname="helv", color=(0.4, 0.4, 0.4))
doc.set_metadata({"title": TITLE[LANG], "author": "Demo"})
doc.save(OUT)
print("saved", OUT, len(pages), "pages")
