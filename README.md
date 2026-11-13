# AI Travel Inspector

![.NET 10](https://img.shields.io/badge/.NET-10.0-512BD4)
![Azure Document Intelligence](https://img.shields.io/badge/Azure-Document%20Intelligence-0078D4)
![Azure OpenAI](https://img.shields.io/badge/Azure-OpenAI-0078D4)
![HTML5](https://img.shields.io/badge/HTML5-E34F26)
![CSS3](https://img.shields.io/badge/CSS3-1572B6)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E)

AI Travel Inspector hjälper dig att samla resebokningar på ett ställe. Ladda upp
flyg, hotell och aktivitetsdokument så läser Azure AI av innehållet och Azure
OpenAI skapar en strukturerad resplan. Du kan sedan ställa frågor om resan i en
inbyggd chatt.

## Funktioner

- Läser PDF-, PNG-, JPG-, JPEG-, TIFF- och BMP-filer med OCR.
- Skapar en resplan med resenärer, datum, sammanfattning och bokningsdelar.
- Visar resan som en kronologisk tidslinje.
- Sparar, öppnar, redigerar och tar bort resor.
- Låter dig chatta om resan och rensa chatthistoriken.
- Fungerar på mobil och följer systemets ljusa eller mörka tema.

Varje uppladdad fil får vara högst **20 MB**. Filer där OCR inte hittar läsbar
text kan inte användas.

## Förutsättningar

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- En Azure AI Document Intelligence-resurs
- En Azure OpenAI-resurs med en deployad chattmodell

Du behöver resursens endpoint och nyckel samt namnet på modellens deployment.

## Kom igång

Öppna PowerShell i projektets rotmapp och gå till appmappen:

```powershell
cd AI_Travel_Inspector
Copy-Item .env.example .env
```

Öppna `AI_Travel_Inspector\.env` och fyll i värdena för dina Azure-resurser:

```dotenv
DOCUMENT_ENDPOINT=https://<din-document-intelligence-resurs>.cognitiveservices.azure.com/
DOCUMENT_KEY=<din-document-intelligence-nyckel>

OPENAI_ENDPOINT=https://<din-openai-resurs>.openai.azure.com/
OPENAI_KEY=<din-openai-nyckel>
OPENAI_DEPLOYMENT=<namnet-på-din-modell-deployment>
```

Starta appen från `AI_Travel_Inspector`:

```powershell
dotnet run
```

Öppna sedan **http://localhost:5136** i webbläsaren.

> `.env` är git-ignorerad. Lägg aldrig riktiga nycklar i källkod eller i Git.

## Använd appen

1. Välj eller dra in en eller flera bokningsfiler.
2. Tryck **Extract Travel Information** för att läsa dokumenten.
3. Granska dokumentlistan och välj **Generate Travel Summary**.
4. Öppna den skapade resan under **Saved Trips**. Där kan du redigera resans
   dokument, ta bort resan eller fråga chatten om resan.

Modellen skapar bland annat segment av typen Flight, Hotel, Activity och
Transport. Kontrollera alltid datum, tider, resenärsnamn och bokningsreferenser
mot originaldokumenten innan du förlitar dig på resplanen.

## Så fungerar det

1. `DocumentAnalysisService` skickar filen till Azure AI Document Intelligence
   och hämtar den extraherade texten.
2. `GenerativeAiService` skickar dokumenttexten till Azure OpenAI via Responses
   API och använder Structured Outputs för att få ett svar i resplanens JSON-
   format.
3. Backend-koden mappar svaret till modellerna `TravelPlan`, `TripSegment`,
   `TravelDocument` och `ChatTurn`.
4. `JsonTravelRepository` sparar resorna lokalt i
   `AI_Travel_Inspector\Data\travel.json`.
5. Den statiska frontendkoden i `wwwroot` visar resan och kommunicerar med
   backendens API.

Structured Outputs hjälper modellen att följa rätt format, men garanterar inte
att uppgifterna är korrekta. Långa dokumenttexter kan dessutom kortas innan de
skickas till modellen.

## Konfiguration och utveckling

Viktiga filer och mappar:

```text
AI_Travel_Inspector/
├── Models/        Resemodeller
├── Repositories/  JSON-baserad lagring
├── Services/      OCR- och AI-integration
├── wwwroot/       HTML, CSS och JavaScript
├── Data/          Lokalt sparade resor
├── .env.example   Mall för lokal Azure-konfiguration
└── Program.cs     API-endpoints och appstart
```

Bygg projektet från appmappen:

```powershell
dotnet build
```

API:t har bland annat följande endpoints:

| Metod | Endpoint | Beskrivning |
| --- | --- | --- |
| `POST` | `/api/analyze` | OCR på en uppladdad fil |
| `GET` | `/api/travel` | Lista sparade resor |
| `POST` | `/api/travel` | Skapa en resa från extraherade dokument |
| `GET` | `/api/travel/{id}` | Hämta en resa |
| `PUT` | `/api/travel/{id}` | Bygg om en resa från dokumenten |
| `POST` | `/api/travel/{id}/chat` | Skicka ett chattmeddelande |
| `DELETE` | `/api/travel/{id}` | Ta bort en resa |
| `DELETE` | `/api/travel/{id}/chat` | Rensa en resas chatthistorik |

## Data och säkerhet

- Dokument skickas till Azure AI Document Intelligence för textutläsning.
- Den extraherade texten skickas till Azure OpenAI för att skapa resplanen och
  besvara chattfrågor.
- Resor, dokumenttext och chatthistorik sparas lokalt i `Data\travel.json`.
- Chatthistoriken är begränsad till de senaste 40 meddelandena per resa.
- Appen har för närvarande ingen inloggning eller användarhantering. Kör den
  lokalt och exponera den inte offentligt utan att först lägga till autentisering
  och granska lagring och åtkomstskydd.

## Teknik

- ASP.NET Core Minimal APIs på .NET 10
- Azure AI Document Intelligence
- Azure OpenAI Responses API
- HTML, CSS och vanlig JavaScript

## Utvecklare
**Alaa Alsous**