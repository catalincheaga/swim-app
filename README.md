# LANE — jurnal de înot

Aplicație pentru telefon și desktop, cu profil separat pentru fiecare înotător, concursuri, rezultate, grafice, culori de club și înregistrări YouTube. Interfața păstrează designul iOS existent.

## Versiunea cu UUID

Această versiune este în pregătire pentru activare. Frontend-ul rămâne pe GitHub Pages; stocarea centrală este în fișiere JSON private în Drive, prin API-ul Apps Script. Nu există configurare Google Sheets în interfață. Instalarea backend-ului și verificarea migrării sunt descrise în [backend/README.md](backend/README.md).

La înregistrare primești un UUID pentru acces și un cod separat pentru recuperare. Salvează codurile: UUID-ul permite citirea și modificarea jurnalului. Pe un dispozitiv nou introduci UUID-ul o singură dată. Recuperarea cere numele și codul de recuperare, emite un UUID nou și îl revocă pe cel anterior.

Datele sunt încărcate de la serviciul central și salvate automat. Dispozitivele active verifică actualizări la 30 de secunde. Fără internet rămâne o copie locală; starea din antet arată dacă modificările sunt confirmate online. Schimbările independente se combină; un conflict de editare cere o alegere explicită și păstrează backup local.

Setările conțin profilul înotătorului, cluburile, perioadele, culorile și butonul Înotător nou. UUID-ul poate fi afișat din antet. Codurile nu apar în URL-ul jurnalului. Slugul adresei rămâne stabil după schimbarea numelui.

## Dezvoltare

`python3 -m http.server 8765 --bind 127.0.0.1` din acest director. Deschide `http://127.0.0.1:8765/index.html`. API-ul trebuie activat de proprietar înainte ca înregistrarea și migrarea să funcționeze real. Nu publica exporturi, date personale, credențiale, capturi sau PUBLISHING.md.

## Verificări

- `node test.cjs` — model, formulare, echipe, rezultate, video și distribuire.
- `node test-data.cjs` — compatibilitatea datelor și backend-ul vechi, păstrat pentru revenire.
- `node test-journals.cjs` — API JSON: autorizare, izolare, recuperare și conflicte.
- `node test-cloud.cjs` — client: înregistrare, al doilea dispozitiv, salvare și combinarea adăugărilor simultane.

Testele API folosesc stocare simulată; verificarea reală trebuie făcută după autorizarea Drive și publicarea backend-ului. Serviciul este destinat unui grup mic de familii și rămâne supus [cotelor Apps Script](https://developers.google.com/apps-script/guides/services/quotas).
