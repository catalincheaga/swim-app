# LANE — jurnale JSON cu UUID

Aplicația publică rulează pe GitHub Pages. Apps Script este API-ul HTTPS; Google Drive păstrează câte un JSON privat pentru fiecare jurnal. Google Sheets nu este folosit de API-ul nou.

## Activare de către proprietar

1. Instalează `JournalAppsScript.gs` în proiectul Apps Script existent.
2. Rulează `setupJournals`. Proprietarul trebuie să aprobe permisiunea Google Drive. Se creează un dosar privat; fișierele nu se partajează.
3. Actualizează deployment-ul existent la o versiune nouă, păstrând URL-ul. Codul frontend `cloud.js` conține doar URL-ul public al API-ului, fără chei de administrator.
4. Verifică înregistrarea și autentificarea înainte de publicarea frontend-ului. Browserul care deține jurnalul vechi afișează migrarea; autorizarea migrării folosește cheia veche, numai în corpul cererii. Migrarea nu citește și nu șterge Sheet-ul. Este permisă o singură migrare de proprietar, cu reîncercare idempotentă.
5. Păstrează UUID-ul și codul de recuperare, apoi verifică din alt dispozitiv că același UUID încarcă jurnalul. Codurile nu se publică în repository.

## Contract

POST JSON cu Content-Type text/plain. Acțiuni `create`, `read`, `write`, `recover`, `migrate`. GET expune numai starea serviciului. Datele nu se pun în query string. UUID-ul este o credențială de acces, stocată local pe dispozitiv; serverul îl indexează prin SHA-256. Nu există căutare de persoane sau listare de jurnale. Recuperarea cere numele și codul separat; emite un UUID nou și revocă UUID-ul anterior. Numele nu este suficient pentru recuperare.

Scrierile folosesc revizii și ScriptLock. API-ul respinge o revizie veche; clientul combină schimbările independente, normalizează concursurile create simultan și cere o alegere pentru câmpuri modificate divergent. Modificările locale rămân marcate nesalvate până la confirmarea serverului. Reîncercările de înregistrare reutilizează UUID-ul și codul generate înaintea primei cereri.

La pornire, revenire online și revenire în pagină se încearcă actualizarea. Dispozitivele active verifică actualizări la 30 de secunde. Refresh-ul nu înlocuiește formulare în curs de completare. Rutele de tip `/swim-app/inotatori/nume_1` folosesc pagina 404 GitHub Pages pentru încărcarea aplicației; slugul este stabil și nu oferă acces fără UUID. La înregistrare folosim prenume_nume, cu sufix pentru nume identice. Adresele inițiale sunt păstrate ca aliasuri. Serverul validează apartenența URL-ului la UUID înainte să returneze datele.

## Limite

UUID-ul este un secret de tip bearer, nu un cont cu identitate verificată. Oricine îl deține poate citi și edita acel jurnal. Nu există recuperare prin nume sau e-mail. Proprietarul găzduiește toate fișierele și rămâne administratorul infrastructurii. Serviciul folosește cotele Apps Script/Drive și un lock global: potrivit pentru un grup mic de familii, nu pentru o platformă cu trafic mare. Înregistrările sunt limitate global la zece pe minut. Nu sunt promise salvări online când serviciul sau internetul sunt indisponibile.

Teste: `node test.cjs`, `node test-data.cjs`, `node test-journals.cjs`, `node test-cloud.cjs`. Ultimele două teste verifică API-ul și clientul cu un Drive simulat; nu reprezintă confirmarea unei migrări reale.
