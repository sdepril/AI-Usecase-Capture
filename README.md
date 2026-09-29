# AI Use-Case Capture → BOM

Costra-tool: een klant beschrijft een AI-use case, de tool vertaalt dat **deterministisch** naar een tokenprofiel, een modelklasse (via Artificial Analysis), een Big-T-klasse, een BOM voor de Azure estimator en een eerste **cost per valued outcome** (low / base / high). Dezelfde vragen vormen de intake gate.

Spec: [`docs/spec-v0.1.md`](docs/spec-v0.1.md). Geen dependencies, geen build; zelfde patroon als `sdepril/artificial-analysis-mcp`.

## Principes
- Rekenen is deterministisch en zichtbaar; elke aanname is een configwaarde met bron en status (`public/config.json`).
- Prijzen staan nooit in de code: modelprijzen komen uit de AA-MCP, infra-prijzen uit de Azure estimator.
- Altijd low / base / high, nooit één getal. `a` (pogingen) staat op de tokens, `q` (succes) op de noemer.
- Geen klantdata opslaan: state in de browser, export als JSON + markdown.

## Layout
```
public/engine.js        de engine (ES module) — één bron van waarheid, draait in browser én Node
public/config.json      defaults + bron + status per aanname; scenario-multipliers
public/index.html       de web-UI (Costra-brand, geen build)
api/models.js           server-side proxy naar de AA-MCP-deployment (token blijft server-side, 6u cache)
api/auth.js             login (e-mail + wachtwoord) → sessie; lib/auth.js is identiek in beide Costra-apps
public/setup.html       maakt in de browser een AUTH_USERS-regel (niets verlaat de browser)
scripts/cli.js          CLI: zelfde engine, schrijft bom.json + architecture.md
test/engine.test.js     node:test — formules (kwadratische geschiedenis, chunking, a vs q, modelkeuze, hard stop)
docs/spec-v0.1.md       de rekenlogica-spec
```

## Archetypes
document · assistant (optioneel RAG) · rag · agentic · classification — elk met eigen intake-velden, formules en BOM-regels (zie spec).

## Lokaal
```bash
npm test
node scripts/cli.js document --name "Contract summarisation" --set pages=40 --set docs_per_day=150 --models models.json
python3 -m http.server 8765 --directory public   # UI zonder modeldata: prijzen manueel invullen
```
`models.json` = de output van `GET /api/models` van de AA-MCP (of van deze app).

## Deployen (Vercel + GitHub)
1. Vercel → Add New → Project → Import `sdepril/AI-Usecase-Capture` (preset *Other*, geen build command).
2. Environment Variables (Production):
   - `AA_MCP_URL` — productie-URL van je artificial-analysis-mcp (bv. `https://artificial-analysis-mcp.vercel.app`)
   - `AA_MCP_TOKEN` — de `MCP_TOKEN` van die deployment (server-to-server; opent ook `/api/models` als machine-token)
   - `AUTH_USERS` — wie mag inloggen: `email:salt:hash:YYYY-MM-DD`, komma-gescheiden. Maak een regel via `https://<domein>/setup.html` (of `node scripts/hash-password.js <email>`).
   - `AUTH_SECRET` — lange random string (`openssl rand -hex 32`), **dezelfde waarde in beide Costra-apps** → één login werkt overal.
   - `AUTH_SESSION_DAYS` — optioneel, standaard 30.
3. Deploy. Inloggen met e-mail + wachtwoord; de app fetcht de modellen daarna automatisch.

### Wachtwoorden en rotatie
- Wachtwoorden staan nergens in code of env: enkel PBKDF2-hashes (600k iteraties, per gebruiker een salt).
- Elke regel heeft een vervaldatum (standaard +90 dagen). Daarna wordt het wachtwoord geweigerd → nieuwe regel maken via `setup.html`, oude vervangen, redeploy. Dat ís de rotatie.
- Iemand verwijderen = regel uit `AUTH_USERS` halen; ook een lopende sessie stopt dan.
- Iedereen tegelijk uitloggen = `AUTH_SECRET` wijzigen.
- Sessies zijn HS256-JWT's (30 dagen) en reizen mee in de deep links tussen de apps (`?s=`), zodat je niet twee keer inlogt.

## Hand-off naar LLM Task-Fit en de Azure estimator
"Open in LLM Task-Fit →" opent de AA-app met profiel, maandworkload (in/out/cache), minimum-intelligentie en de Tokenomics-inputs (tasks, calls per task, agent depth, tokens per call, success rate) in de URL; de AA-app vult ze in en toont een banner. Zo kiest Task-Fit het model op de échte workload, en rekent de Tokenomics-tab de hefbomen door. URL van de AA-app: `links.taskfit_url` in `public/config.json`.

Zonder de app te verlaten: de **Model**-dropdown onder "Model price" is de Task-Fit-ranking voor déze workload (zelfde score: profielgewichten en log-schaling, geport in `engine.js`; profiel uit het archetype, minimum-intelligentie uit de quality bar, maandkost op jouw tokens). Een model kiezen vult USD per 1M input / output / cached in; leeg laten = manueel invullen. De lijst herberekent bij elke wijziging aan de use case.

En terug: in de Tokenomics-tab van Task-Fit stuurt "Use this model in AI Use-Case Capture →" de lijstprijzen (USD per 1M input / output / cached) van het gekozen model terug naar de capture, die de beschreven use case in de browser bewaart (localStorage) en meteen herrekent met die prijs.

De drie scenario-kaarten (low / base / high) zijn klikbaar: de actieve kaart bepaalt de modelranking, de T-regel, de BOM/markdown (`scenario_used`) en de Task-Fit-hand-off. Standaard base.

"Download architecture.md" of "Copy markdown" → dat is het architectuurdocument dat de azure-estimator-skill inleest (componenten, SKU-hints, volumes, aannames). `bom.json` is het machine-leesbare equivalent en landt later als estimate-regels in de use-case ledger.

## Status
v0.1 — alle vijf archetypes, drie scenario's, modelkeuze op AA-index en snelheid (contextvenster zit niet in de free-tier data: handmatig verifiëren), BOM-export. Open punten: zie spec §8 (tpw NL meten, cache/batch-korting per provider uit de MCP, geschiedenis-trimming default, harde stop bij agentic, labor buiten de tool, ontbrekende archetypes).

Bronvermelding: modelprijzen en indices van Artificial Analysis (https://artificialanalysis.ai). Formules: Costra.
