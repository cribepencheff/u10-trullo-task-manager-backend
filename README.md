# u10 – Trullo - Task Manager, Backend

## Mål / Uppdrag

Målet är att skapa ett REST-API för en projekthanterings-applikation vid namn Trullo. API\:et ska möjliggöra att användare (User) kan skapa uppgifter (Task) och planera projekt. Databasen ska vara antingen SQL eller NoSQL.

***

## Teoretiska resonemang  
### Motivera ditt val av databas  
Jag har valt att använda MongoDB (NoSQL) med Mongoose. Huvudanledningen är att jag vill fördjupa mig i och lära mig MongoDB ordentligt, efter att ha arbetat med SQL och Prisma förra terminen. Jag vill se och känna på för- och nackdelar med NoSQL, till exempel att jag kan bygga vidare på modeller och schema utan invecklade migrationer.  

***

### Redogör vad de olika teknikerna (ex. verktyg, npm-paket, etc.) gör i applikationen**  
- **Express:**  
Serverramverk för routing och endpoints för Users och Tasks.  
- **TypeScript & diverse @types/:** 
Typning och säkerhet, `@types` låter TypeScript förstå externa paket.  
- **Mongoose:**  
Definierar modeller och scheman, validerar data och hanterar relationer i MongoDB.  
- **bcrypt:**  
Hashar lösenord innan de sparas i databasen.  
- **dotenv:**  
Hanterar miljövariabler som port och databas-URL.  
- **jsonwebtoken:**  
Skapar och verifierar JWT vid autentisering.  
- **Zod:**  
Validerar indata till API:et.  
- **@faker-js/faker:**  
Genererar testdata vid seedning av databasen.  
- **Jest & Supertest:**  
Testar API-endpoints och funktionalitet.  
- **ts-jest, ts-node / tsx:**  
Kör TypeScript direkt och testar med Jest utan förkompilering.  

***

### Redogör översiktligt hur applikationen fungerar  
Applikationen Trullo är en light-version av ett "task manager"-verktyg som Trello. Den bygger på Users och Tasks och hanterar olika roller: Admin kan göra allt, medan Regular User är begränsad till sina egna tasks.  

Extra funktionalitet för VG:  
Tasks sparar automatiskt vem som slutfört dem (`finishedBy`) och när (`finishedAt`) när status sätts till "done". Endast autentiserade användare kan ändra sina tasks och admin kan hantera alla tasks och users. Password reset med JWT är också implementerat.  
  

**Users:**  
-Skapa konto, logga in, läsa, uppdatera och ta bort eget konto.  
-Admin kan hantera alla users.  
-Lösenord hashas med bcrypt.

**Tasks:**  
-Skapa, läsa, uppdatera och ta bort egna tasks.  
-Admin kan hantera alla tasks.  
-Tilldelning via `assignedTo`.  
-Status "done" uppdaterar automatiskt `finishedAt` och `finishedBy`. Om status ändras från "done" till något annat rensas dessa fält.  

**Validering:**  
-Kontroll att `assignedTo` finns.  
-Kontroll av giltig status.  
-Endast rätt användare/roll får uppdatera eller ta bort task.  

**Seed-data:**  
-`npm run seed` skapar testusers och tasks med Faker.  

**Tester:**  
-Två tester per controller (Users och Tasks) med Jest & Supertest.

**Felhantering:**  
-Ogiltig indata → 400  
-Saknad resurs → 404  
-Unikhetskonflikt → 409  
-Interna fel → 500  


***


### Setup & Konfiguration  

**1. Installera beroenden**
```bash
npm install
```
  
**2. Miljövariabler**
Skapa en .env-fil i projektets rot baserat på .env.example:  
```bash
JWT_SECRET=<JWT_SECRET>
JWT_EXPIRES_IN=1h
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster_name>.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=<DB_NAME>
SALT_ROUNDS=10
PORT=3000
```
  
Generera JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```
Kopiera strängen och klistra in som JWT_SECRET.  

**Bygg och starta applikationen**  
För utveckling med live reload:
```bash
npm run dev
```
  
För produktion:  
```bash
npm run build
npm start
```

**Seedning av databasen**  
Seed testdata:
```bash
npm run seed
```
Skapar 2 users (admin@example.com
 / Passw0rd! är admin) och 10 tasks med blandade statusar.


**Starta server:**  
```bash
npm run dev
```

**Kör tester**
För att köra tester finns några färdiga npm-skript:
```bash
`npm run test` – kör alla tester med Jest  

`npm run test:tasks` – kör bara testerna för task-routes (`tests/task.routes.test.ts`)  

`npm run test:users` – kör bara testerna för user-routes (`tests/user.routes.test.ts`)  
```
  
Två tester per controller (Users och Tasks) med Jest & Supertest, inklusive admin- och user-behörigheter, validering och felhantering.  
  
  

