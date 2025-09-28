# u10 – Trullo - Task Manager, Backend

## Mål / Uppdrag

Målet är att skapa ett REST-API för en projekthanterings-applikation vid namn Trullo. API\:et ska möjliggöra att användare (User) kan skapa uppgifter (Task) och planera projekt. Databasen ska vara antingen SQL eller NoSQL.

***

## Teoretiska resonemang  
### Motivera ditt val av databas  
Jag har valt att använda MongoDB (NoSQL) med Mongoose. Huvudanledningen är att jag vill fördjupa mig i och lära mig MongoDB ordentligt, efter att ha arbetat med SQL och Prisma förra terminen. Jag vill se och känna på för- och nackdelar med NoSQL, till exempel att jag kan bygga vidare på modeller och schema utan invecklade migrationer.  

***

### Redogör vad de olika teknikerna (ex. verktyg, npm-paket, etc.) gör i applikationen  
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
Validerar indata till API:et (används för användarvalidering).  
- **@faker-js/faker:**  
Genererar testdata vid seedning av databasen.  
- **Jest & Supertest:**  
Testar API-endpoints och funktionalitet.  
- **tsx:**  
Kör TypeScript direkt utan förkompilering för utveckling och tester.  

***

### Redogör översiktligt hur applikationen fungerar  
Applikationen Trullo är en light-version av ett "task manager"-verktyg som Trello.  
Den bygger på Users och Tasks och hanterar olika roller:  
Admin kan göra allt, medan Regular User är begränsad till sina egna tasks.  

**Extra funktionalitet för VG:**  
Tasks sparar automatiskt vem som slutfört dem (`finishedBy`) och när (`finishedAt`) när status sätts till "done".  
Endast autentiserade användare kan ändra sina tasks och admin kan hantera alla tasks och users.  
Lösenordsåterställning med JWT-token.  
Strukturerad projektarkitektur med middleware, validering och felhantering.  
Automatiska tester med Jest & Supertest för båda controllers.  
  

**Users:**  
-Skapa konto, logga in, läsa, uppdatera och ta bort eget konto.  
-Admin kan hantera alla users.  
-Lösenord hashas med bcrypt.  
-Lösenordsåterställning med JWT-token (VG).

**Tasks:**  
-Skapa, läsa, uppdatera och ta bort egna tasks.  
-Admin kan hantera alla tasks.  
-Tilldelning via `assignedTo`.  
-Status "done" uppdaterar automatiskt `finishedAt` och `finishedBy`. Om status ändras från "done" till något annat rensas dessa fält.  

**Validering:**  
-Zod-scheman för användarinput (signup, login, update).  
-Kontroll att `assignedTo` finns.  
-Kontroll av giltig status (to-do, in progress, blocked, done).  
-Endast rätt användare/roll får uppdatera eller ta bort task.  

**Seed-data:**  
-`npm run seed` skapar 4 användare (1 admin + 3 vanliga användare) och 10 tasks med Faker.  

**Tester (VG-extra):**  
-Automatiska tester med Jest & Supertest för båda controllers.  
-Testar autentisering, auktorisering, validering och felhantering.  
-Separata test-kommandon för utveckling och debugging.

**Felhantering:**  
-Ogiltig indata → 400  
-Saknad resurs → 404  
-Unikhetskonflikt → 409  
-Interna fel → 500  

***

## Projektstruktur

```
src/
├── config/          # Databaskonfiguration
├── controllers/     # Affärslogik för endpoints
├── middleware/      # Autentisering och validering
├── models/          # Mongoose-modeller och scheman
├── routes/          # Express-router definitioner
├── schemas/         # Zod-valideringsscheman
├── utils/           # Hjälpfunktioner (JWT, färger)
└── server.ts        # Huvudapplikationsfil

scripts/
└── seed.ts          # Databasseeding

tests/
├── task.routes.test.ts    # Tester för task-endpoints
└── user.routes.test.ts    # Tester för user-endpoints
```

### API Endpoints

**Användare:**
- `POST /api/users/signup` - Registrera ny användare
- `POST /api/users/login` - Logga in användare
- `POST /api/users/reset-password` - Begär lösenordsåterställning
- `PUT /api/users/reset-password/:token` - Återställ lösenord med token
- `GET /api/users/me` - Hämta egen profil (autentiserad)
- `PUT /api/users/me` - Uppdatera egen profil (autentiserad)
- `DELETE /api/users/me` - Ta bort eget konto (autentiserad)
- `GET /api/users` - Hämta alla användare (endast admin)
- `DELETE /api/users/:id` - Ta bort användare (endast admin)

**Tasks:**
- `POST /api/tasks` - Skapa ny task (autentiserad)
- `GET /api/tasks` - Hämta egna tasks (autentiserad)
- `GET /api/tasks/all` - Hämta alla tasks (endast admin)
- `GET /api/tasks/:id` - Hämta specifik task (autentiserad)
- `PUT /api/tasks/:id` - Uppdatera task (autentiserad)
- `DELETE /api/tasks/:id` - Ta bort task (autentiserad)

***

### Setup & Konfiguration  

**1. Installera beroenden**
```bash
npm install
```
  
**2. Miljövariabler**  
Skapa en .env-fil i projektets rot baserat på `.env.example`:  
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

**3. Bygg och starta applikationen**  
För utveckling med live reload:
```bash
npm run dev
```
  
För produktion:  
```bash
npm run build
npm start
```

**4. Seedning av databasen**  
Seed testdata:
```bash
npm run seed
```
Skapar 4 användare (admin@example.com / Passw0rd! är admin, plus 3 vanliga användare) och 10 tasks med blandade statusar.

**5. Kör tester**  
För att köra tester finns några färdiga npm-skript:
```bash
npm run test          # kör alla tester (översiktlig output)
npm run test:tasks    # kör bara task-tester (detaljerad output)
npm run test:users    # kör bara user-tester (detaljerad output)
```
  
Två tester per controller (Users och Tasks) med Jest & Supertest, inklusive admin- och user-behörigheter, validering och felhantering.  
  
  

