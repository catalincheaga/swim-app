# LANE — jurnal de înot

Aplicație statică pentru telefon și desktop. Interfață în română, inspirată de iOS / Liquid Glass, cu culorile echipelor. Fără build, instalare sau servicii plătite.

## Pornire locală

Din acest dosar: `python3 -m http.server 8765 --bind 127.0.0.1`, apoi http://127.0.0.1:8765. Previzualizarea în ramă de telefon este la `/mobile-preview.html`.

Datele locale depind de browser, adresă și port. Folosește JSON pentru backup și migrare între dispozitive sau adrese. Datele demonstrative sunt fictive și marcate; elimină-le înainte să începi jurnalul real.

## Ce include

- Concursuri salvate independent de rezultate. Alegi concursul la următoarea introducere de timp; numele, localitatea și bazinul se completează automat.
- Curse cu dată, procedeu, distanță, bazin, timp, clasare, echipă, notițe și link YouTube opțional.
- Link separat „Vezi cursa pe YouTube” în rezultate, pe pagina de concurs și la ultimele curse, plus acces din detaliile cursei. Linkul poate include un moment de început.
- Recorduri și grafice pe distanță / procedeu / bazin, cu echipa reprezentată la fiecare cursă. Recordurile acoperă întregul parcurs sportiv.
- Profil cu nume, data nașterii, sex și legitimație opționale. Cluburi și culori configurabile, perioade și echipă explicită pe cursă.
- Salvare locală, export CSV, backup/import JSON și sincronizare manuală cu Google Sheets.

## Google Sheets

**Urmează `SETUP.md`.** Cele trei foi editabile sunt `configs`, `concursuri` și `date`. Sunt sursa aplicației, inclusiv pentru modificări introduse direct în Sheets. Funcția setupLane reține ID-ul documentului în Script Properties, separat de sursa publică. Cheia privată se configurează separat în Script Properties și în browser; nu apare în sursă.

`GoogleAppsScript.gs` este fișierul complet de copiat în editorul Google. Se generează prin concatenarea `data-model.js` și `sheets-api.gs`; nu copia toate cele trei fișiere separat în același proiect Apps Script. Pentru modificări la cod: `cat data-model.js sheets-api.gs > GoogleAppsScript.gs`.

Backupurile locale vechi se migrează automat. Jurnalul vechi `_LANE`, dacă există în Sheets, poate fi migrat prin `setupLane()`; foile vechi sunt păstrate.

## GitHub Pages

În rădăcina repository-ului publică **index.html, style.css, ios.css, app.js, data-model.js și .nojekyll**. Nu publica exporturi, cheia sau rezultate reale. Pentru a păstra și ghidul de configurare accesibil din Setări, publică și **setup.html, setup.js, GoogleAppsScript.gs și SETUP.md**; acestea nu conțin cheia sau rezultate. În Settings → Pages alege branch-ul și rădăcina `/`. Importă backupul JSON și configurează conexiunea în noua adresă; stocarea de la localhost nu se transferă singură.

Pe telefon poți adăuga pagina pe ecranul principal. Este o aplicație web cu salvare locală; nu include cache offline sau sincronizare în fundal. Fonturile sunt cele de sistem. Tratamentele vizuale respectă preferințele de mișcare redusă, contrast și transparență când sunt expuse de browser.

## Validare

`node --check app.js`, `node test.cjs`, `node test-data.cjs`. Sunt verificate timpii, cluburile, formularele, reutilizarea concursurilor, linkurile video, compatibilitatea datelor, conversia foilor, conflictele după editări manuale, migrarea și restaurarea după o eroare simulată. Google Sheets real trebuie verificat după autorizarea și publicarea Apps Script.

Paletele sunt inspirate de https://inot-sport.ro/ și https://euroswimmingclub.ro/. Tema este o interpretare web a principiilor Apple https://developer.apple.com/documentation/technologyoverviews/liquid-glass.

## Vizualizare și distribuire

Atingerea unui rezultat deschide o fișă doar pentru citire: timp, clasare, concurs, dată, localitate, bazin, echipă și notițe. Înregistrarea apare sub detalii și se încarcă în player YouTube numai după apăsarea butonului de redare; linkul către YouTube rămâne disponibil. Editarea se deschide exclusiv prin butonul explicit „Editează”.

„Distribuie rezultatul” deschide meniul nativ de distribuire unde este disponibil, iar în celelalte browsere copiază textul rezultatului și linkul video. Nu publică jurnalul și nu trimite o adresă localhost sau un link către datele private din Sheets. Data nașterii, legitimația și notițele nu sunt incluse în textul distribuit.
