# Conectarea jurnalului la Google Sheets

Deschide documentul Google Sheets dedicat jurnalului.

Aplicația folosește propriul tău Google Sheet privat. Urmează pașii pentru autorizarea și conectarea lui.

## 1. Instalează scriptul

1. Deschide documentul în contul tău Google, cu drept de editare.
2. Alege **Extensii → Apps Script**.
3. Înlocuiește conținutul fișierului `Code.gs` cu întregul conținut al fișierului local `GoogleAppsScript.gs`. Acesta include schema și API-ul într-un singur fișier. Nu copia separat `data-model.js` sau `sheets-api.gs` în proiect, fiind deja incluse.
4. Salvează. În **Project Settings → Script properties**, adaugă cheia `LANE_TOKEN`, cu o valoare aleatoare privată de minimum 32 de caractere. Păstrează valoarea pentru setările aplicației. Nu o pune în cod sau în Sheet.
5. Selectează funcția **setupLane** în bara editorului și apasă **Run**. Autorizează accesul scriptului la document din propriul cont Google. Dacă Google afișează un avertisment de securitate, verifică proiectul și finalizează tu pașii necesari în contul tău.

`setupLane` creează trei foi, fără să șteargă foile existente:

| Foaie | Ce păstrează |
| --- | --- |
| **configs** | Înotătorul, cluburile, culorile și perioadele de apartenență |
| **concursuri** | Registrul concursurilor, inclusiv cele fără rezultate încă |
| **date** | Fiecare probă: dată, distanță, procedeu, bazin, timp, loc, club și YouTube |

Dacă există un jurnal vechi `_LANE`, scriptul îl migrează și păstrează foile vechi. După migrare, cele trei foi noi sunt sursa aplicației. O a doua rulare nu înlocuiește configurația deja existentă.

## 2. Publică API-ul

1. **Deploy → New deployment → Web app**.
2. **Execute as: Me**. **Who has access: Anyone**. API-ul verifică cheia `LANE_TOKEN` la fiecare cerere; foaia Google rămâne privată.
3. Apasă **Deploy** și copiază URL-ul care se termină în `/exec`.
4. Dacă actualizezi un deploy existent: **Deploy → Manage deployments → Edit → Version: New version → Deploy**, păstrând URL-ul existent.

Acest pas acordă acces prin API jurnalului oricui deține URL-ul și cheia. Nu publica cheia, documentul sau rezultatele copilului în repository. Un cont Google administrat poate interzice opțiunea „Anyone”; atunci este nevoie de alt model de autentificare.

## 3. Conectează aplicația

1. În LANE → **Setări → Google Sheets**, introdu URL-ul `/exec` și valoarea `LANE_TOKEN`.
2. Apasă **Salvează conexiunea**, apoi **Descarcă din Sheet**. Aceasta înlocuiește jurnalul local; dacă ai date reale nesincronizate, exportă JSON înainte.
3. Completează profilul. Adaugă concursurile și rezultatele în aplicație, apoi apasă **Trimite în Sheet**.
4. Pentru a prelua modificări făcute direct în Google Sheets, apasă **Descarcă din Sheet**. Sincronizarea este manuală și privește întregul jurnal.

Nu trimite datele demonstrative în documentul real. Dacă ai un jurnal local real și un Sheet nou creat de `setupLane`, descarcă configurația nouă pentru a primi versiunea de sincronizare, apoi importă backupul JSON local și trimite-l în Sheet.

## Cum editezi foile

Nu schimba numele foilor sau antetele. Sortează rânduri întregi; păstrează ID-urile stabile. Datele sunt text `AAAA-LL-ZZ`; timpii sunt text `MM:SS.ss`, de exemplu `00:38.42` sau `01:12.35`. `setupLane` formatează coloanele ca text ca să evite transformarea lor în ore Excel.

### configs

Coloane: `tip | id | nume | prescurtare | culoare | de_la | pana_la | valoare`.

Rândurile `inotator` folosesc `id` pentru câmp și `valoare` pentru conținut:

- `nume`: numele înotătorului.
- `data_nasterii`: opțional, `AAAA-LL-ZZ`.
- `sex`: opțional.
- `legitimatie`: opțional.
- `club_actual`: ID-ul clubului actual, inițial `atack`.

Rândurile `club` folosesc celelalte coloane. Exemplu:

| tip | id | nume | prescurtare | culoare | de_la | pana_la | valoare |
| --- | --- | --- | --- | --- | --- | --- | --- |
| club | euro | Euro Swimming Club București | EURO SWIMMING CLUB | #b29220 | | 2024-12-25 | |
| club | atack | Atack Team | ATACK TEAM | #db4432 | 2024-12-26 | | |

Poți adăuga mai multe cluburi, cu ID unic (litere mici, cifre, `_`, `-`, prima literă alfabetică), nume, prescurtare și culoare `#RRGGBB`. Perioadele sunt incluzive și nu se suprapun. O limită goală înseamnă fără limită în acea direcție. Culorile și numele se reflectă în interfață după descărcare. Dacă nicio perioadă nu acoperă data unei curse, se folosește clubul actual; poți indica o echipă explicită la rezultat.

### concursuri

Coloane: `id | concurs | data | localitate | bazin_m`.

Un rând per concurs, cu ID unic, nume, data de început, localitate și bazin `25` sau `50`. Aplicația generează ID-uri automat; dacă introduci manual poți folosi, de exemplu, `cupa-2026`. Poți avea același nume de concurs în ani diferiți. Combinația nume + dată + localitate nu se dublează.

### date

Coloane: `id | concurs_id | data | distanta_m | procedeu | bazin_m | timp | loc | club_id | youtube | notite`.

- `id`: unic pentru cursă; aplicația îl generează.
- `concurs_id`: ID existent în `concursuri` (referința care păstrează numele și localitatea consistente).
- `data`: ziua efectivă a cursei; poate fi alta decât începutul concursului.
- `distanta_m`: `50`, `100`, `200`, `400`, `800`, `1500`.
- `procedeu`: `Liber`, `Spate`, `Bras`, `Fluture`, `Mixt`.
- `bazin_m`: `25` sau `50`.
- `timp`: `00:38.42`, în minute, secunde și sutimi. Nu este număr de secunde și nu este durată Excel.
- `loc`: opțional, număr întreg pozitiv.
- `club_id`: `auto` pentru alegere după perioadă sau un ID din `configs` pentru o alegere explicită.
- `youtube`: opțional, URL HTTPS YouTube al cursei. Sunt acceptate `youtu.be/ID`, `youtube.com/watch?v=ID`, Shorts și Live. Se păstrează parametrii de timp, de exemplu `?t=37` sau `&t=37s`.
- `notite`: opțional.

În aplicație, înregistrarea se deschide prin „Vezi cursa pe YouTube”, fără să pornească automat. Pentru clipuri „unlisted”, păstrează linkul exact. Clipurile private necesită contul autorizat pe YouTube.

## Verificare și recuperare

Serverul verifică toate cele trei foi la citire. Un ID lipsă, o culoare invalidă sau un timp greșit produce o eroare, fără să înlocuiască jurnalul local. Versiunea este o amprentă a conținutului foilor; editările manuale invalidează o versiune descărcată anterior și împiedică suprascrierea ei la următoarea trimitere.

Cereri simultane ale aplicației sunt serializate. Google Sheets nu oferă aici tranzacții între foi și editarea manuală nu este blocată de script: evită să editezi direct în timpul unei trimiteri. În cazul unei erori de scriere scriptul încearcă să restaureze valorile anterioare; istoricul Google Sheets și backupurile JSON rămân mijloacele de recuperare.

Verificări locale: `node test.cjs` și `node test-data.cjs`. Acestea verifică logica și un API Sheets simulat. Conexiunea reală se verifică după autorizare și deployment, din browser, apoi din adresa finală GitHub Pages.

Referințe Google: [Web Apps](https://developers.google.com/apps-script/guides/web), [Content Service](https://developers.google.com/apps-script/guides/content), [Lock Service](https://developers.google.com/apps-script/reference/lock/).
