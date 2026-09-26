# .NET25 laboration: Generativ AI

# AI Travel Inspector

Det är en webbapp som läser resedokument (flygbiljetter, hotellbokningar, taxi, aktiviteter)
med hjälp av Azure Document Intelligence. Användaren laddar upp en eller flera
filer (PDF, Bild), och appen bygger en komplett resplan med Azure OpenAI och visar
den. Sen kan man chatta med en AI-agent om resan.

---

## Så startar man projektet

### 1. Det man behöver

- .NET 10 SDK
- Ett Azure-konto med två tjänster:
  - Azure AI Document Intelligence (för att läsa dokumenten)
  - Azure OpenAI (med en deployad chatmodell, t.ex. `gpt-5.4-mini`)

### 2. Lägga till API-nycklarna

Nycklarna får inte hamna i Git. Därför läser appen dem från en `.env`-fil
som är git-ignorerad.

1. Gå in i mappen `AI_Travel_Inspector`.
2. Kopiera mallen:

   ```powershell
   copy .env.example .env
   ```

3. Öppna den nya filen `.env` och klistra in dina riktiga nycklar.

4. Låt `.env` vara kvar lokalt. Den är redan i `.gitignore`, så den pushas
   aldrig till Git.

### 3. Köra

```powershell
cd AI_Travel_Inspector
dotnet run
```

Öppna sen **http://localhost:5136** i webbläsaren.

---

## Så fungerar programmet

1. Användaren laddar upp en eller flera filer (PDF · PNG · JPG · JPEG · TIFF · BMP), drar in dem eller klickar.
   Filerna hamnar i en lista till vänster.
2. Document Intelligence läser texten ur varje dokument (OCR).
3. Användaren trycker **"Extract Travel Information"**. Då skickas all text till Azure OpenAI.
4. AI:n bygger en strukturerad resplan och svarar i ett bestämt JSON-format:
   titel, destination, start- och slutdatum, resenärer, en kort sammanfattning och
   en lista med delar (Flight, Hotel, Activity, Transport) med datum, plats,
   detaljer och bokningsreferens.
5. Min C#-kod läser JSON-svaret och gör om det till mina egna klasser `TravelPlan`,
   `TripSegment`, `TravelDocument` och `ChatTurn`.
6. Resan sparas i `Data/travel.json` och visas till höger: tidslinje, resenärer
   och sammanfattning.
7. Under planen finns en chatt. Där kan man fråga AI-agenten om resan, t.ex. be om
   aktivitetstips eller förbättringar. Agenten svarar bara på sådant som handlar om
   resan, annars säger den ifrån.
8. Man kan **redigera** en sparad resa: lägga till nya bokningar (om man bokat
   något nytt) eller ta bort filer, och sen trycka **Save & Update Trip**, då byggs
   planen om av AI:n.
9. Man kan **ta bort** en resa och **rensa** chatten. Båda frågar först i en egen
   bekräftelseruta.

Sidan är en enkel statisk HTML/CSS/JS-sida. Den fungerar på mobil, och temat följer datorns mörka/ljusa inställning automatiskt.

---

## Vilka AI-tjänster jag använder och varför

### 1. Azure Document Intelligence(OCR) - läser dokumenten

Den gör OCR på PDF filer och bilder och ger tillbaka texten.

**Varför:** resedokument är oftast PDF filer eller skärmklipp. Jag måste få ut
texten innan jag kan göra något annat med den. Document Intelligence klarar
både PDF och bilder, och jag kan skicka in flera filer.

### 2. Azure OpenAI - bygger planen och chattar (Generativ AI)

Det här är den generativa AI:n, och jag använder den till tre saker:

- bygga hela resplanen som strukturerad JSON,
- skriva sammanfattningen av resan,
- svara på frågor i chatten.

Jag skickar en **prompt** till AI:n. alltså instruktionen som berättar för
AI:n vad den ska göra. Min prompt har tre delar:

1. **System-prompten** (`PlanSystemPrompt`) - vilken roll AI:n har.
2. **Schemat** (`PlanJsonSchema`) - vilken form svaret ska ha: vilka fält som måste finnas och vilka värden som är tillåtna.
3. **Dokumenttexten** (`BuildPlanPrompt`) - all text som Document Intelligence
   läste ur filerna.

Prompten skickas med **Responses API** och **Structured Outputs**. Det betyder att modellen _måste_ följa schemat - den kan inte svara i något
annat format. Därför blir svaret alltid rätt, och jag slipper tolkningsfel.

I chatten använder jag en annan prompt, **`BuildChatSystemPrompt`**. Den berättar
vilken resa det gäller och att AI:n bara ska svara på frågor om just den resan.
Tillsammans med prompten skickar jag också hela chatthistoriken, så AI:n kommer
ihåg vad vi har sagt tidigare.

**Varför:** Den klarar både att bygga planen och att föra en konversation.
