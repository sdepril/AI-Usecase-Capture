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
   - `AA_MCP_TOKEN` — de `MCP_TOKEN` van die deployment
   - `CAPTURE_TOKEN` — eigen toegangstoken voor deze app (`openssl rand -hex 24`)
3. Deploy. Open `https://<domein>/?token=<CAPTURE_TOKEN>` → "Load models".

## Hand-off naar LLM Task-Fit en de Azure estimator
"Open in LLM Task-Fit →" opent de AA-app met profiel, maandworkload (in/out/cache), minimum-intelligentie en de Tokenomics-inputs (tasks, calls per task, agent depth, tokens per call, success rate) in de URL; de AA-app vult ze in en toont een banner. Zo kiest Task-Fit het model op de échte workload, en rekent de Tokenomics-tab de hefbomen door. URL van de AA-app: `links.taskfit_url` in `public/config.json`.

"Download architecture.md" of "Copy markdown" → dat is het architectuurdocument dat de azure-estimator-skill inleest (componenten, SKU-hints, volumes, aannames). `bom.json` is het machine-leesbare equivalent en landt later als estimate-regels in de use-case ledger.

## Status
v0.1 — alle vijf archetypes, drie scenario's, modelkeuze op AA-index en snelheid (contextvenster zit niet in de free-tier data: handmatig verifiëren), BOM-export. Open punten: zie spec §8 (tpw NL meten, cache/batch-korting per provider uit de MCP, geschiedenis-trimming default, harde stop bij agentic, labor buiten de tool, ontbrekende archetypes).

Bronvermelding: modelprijzen en indices van Artificial Analysis (https://artificialanalysis.ai). Formules: Costra.
