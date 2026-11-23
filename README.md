<<<<<<< HEAD
# Provenance Graph: Tracing Origin and Detecting Fraudulent Loops

This is a menu-driven C++ application that represents supply-chain actors as
vertices and product transfers as directed edges. It uses an adjacency list and
reverse adjacency list, manual BFS for upstream provenance, and manual
three-colour DFS for directed cycle detection.

## Requirements

- C++11 or newer compiler
- GCC or MinGW g++
- Windows, Linux, or macOS command prompt

## Compile

Run from the project folder:

```powershell
g++ -std=c++11 -Wall -Wextra -pedantic main.cpp Actor.cpp Transfer.cpp ProvenanceGraph.cpp BFSAnalyzer.cpp CycleDetector.cpp SyntheticDataGenerator.cpp PerformanceAnalyzer.cpp MainSystem.cpp JsonValue.cpp JsonMode.cpp -o provenance_engine.exe
```

On Linux or macOS, omit `.exe`:

```bash
g++ -std=c++11 -Wall -Wextra -pedantic main.cpp Actor.cpp Transfer.cpp ProvenanceGraph.cpp BFSAnalyzer.cpp CycleDetector.cpp SyntheticDataGenerator.cpp PerformanceAnalyzer.cpp MainSystem.cpp JsonValue.cpp JsonMode.cpp -o provenance_engine
```

## Run

```powershell
.\provenance_engine.exe
```

The original interactive console menu remains the default. For machine-readable
requests, use:

```powershell
.\provenance_engine.exe --json input.json output.json
```

JSON input examples:

```json
{"operation":"bfs","actorId":3,"graph":{"actors":[{"id":1,"name":"Farm","type":"Supplier"},{"id":3,"name":"Shop","type":"Pharmacy"}],"transfers":[{"source":1,"destination":3,"product":100}]}}
{"operation":"dfs","graph":{"actors":[{"id":1,"name":"A","type":"Supplier"},{"id":2,"name":"B","type":"Customer"}],"transfers":[{"source":1,"destination":2,"product":10},{"source":2,"destination":1,"product":10}]}}
{"operation":"synthetic","vertices":100,"edges":150,"cycles":2,"seed":2026}
{"operation":"performance","vertices":100,"edges":150,"cycles":2,"seed":2026}
```

Operations are `graph`, `bfs`, `dfs`, `synthetic`, and `performance`. The JSON
response includes `success`, operation-specific graph/ancestor/cycle/truth or
performance fields, and an `error` message on failure. Graph actor entries use
`id`, `name`, and `type`; transfer entries use `source`, `destination`, and
`product`.

## Backend API

The Express API persists data in `backend/data/store.json`. It compiles the C++
engine to `provenance_engine.exe` before starting:

```powershell
cd backend
npm install
npm start
```

Available endpoints (prefix `/api`):

- `GET/POST /actors`, `GET/PUT/PATCH/DELETE /actors/:id`
- `GET/POST /transfers`, `GET/PUT/DELETE /transfers/:id`
- `GET /graph`, `POST /bfs` (`{"actorId":3,"productId":100}`), `POST /dfs`
- `POST /analysis/bfs` and `POST /analysis/dfs` expose traversal/cycle evidence
- `POST /analysis/risk` runs C++ DFS and contextual transfer-risk rules together
- `GET /synthetic` returns the saved generated graph, seed, and cycle ground truth
- `POST /synthetic/generate` (`{"vertices":100,"edges":150,"cycles":2,"seed":2026}`)
- `DELETE /synthetic` or `POST /synthetic/clear` to clear the graph and truth
- `POST/GET /performance`, `POST /analysis/performance`, `GET /analysis/results`
- Performance POST accepts a configuration or runs the 100/500/1000/5000 presets
- `GET /reports/summary`, `GET /reports/export`

Reverse BFS traverses incoming transfers in C++ and returns actor discovery order
plus the exact directed transfers used to discover each ancestor. An optional
`productId` limits the search to that product. Synthetic generation requires
`cycles <= floor(vertices/3)` and `edges >= vertices - 1 + cycles` (with zero
edges for a single-vertex graph); infeasible requests return an error rather
than silently generating fewer edges or cycles. The seed, graph, and injected
cycle sequences are saved and can be retrieved after a page reload.

Performance results contain measured BFS/DFS milliseconds, graph size,
injected/detected cycles, TP/FP/FN, precision, recall, and F1. Cycle accuracy
compares sets of normalized directed vertex sequences, not cycle counts. New
runs carry an algorithm version; unversioned historical runs are retained but
excluded from current comparison charts until the user reruns the tests.

New transfers require a `purpose` matching one of the purpose dropdown options.
For `"Other"`, include a non-empty `otherReason`. Transfer records can also
include a description, authorization status (`documented`, `not-required`, or
`missing`), and an authorization reference. Existing saved transfers without
these fields remain readable and are assessed as having incomplete
documentation.

The risk endpoint applies contextual phrase rules rather than flagging an
isolated keyword. It combines transfer indicators with actual C++ DFS cycle
results and returns LOW, MEDIUM, HIGH, or CRITICAL risk classifications plus
reasons and recommended review actions. A cycle or automated risk flag is not
proof of fraud. Transfer history, detail views, and CSV exports retain purpose,
explanation, description, and authorization information.

The backend invokes only the configured engine executable with fixed arguments;
each request gets isolated JSON files and those files are removed afterward.
Run `npm test` in `backend` for API integration checks (build the engine first
with `npm run build:engine`).

## Web Application

On Windows, the simplest way to start the complete application is:

```powershell
.\start-app.bat
```

This compiles the C++ engine, starts the Express server, waits for readiness,
and opens `http://127.0.0.1:3000`.

Install and build the React dashboard:

```powershell
cd frontend
npm.cmd install
npm.cmd run build
```

Start the Express API, which also serves the built dashboard:

```powershell
cd ..\backend
npm.cmd start
```

Open `http://localhost:3000` in a browser.

For frontend development with live reload, run the backend and frontend in
separate terminals:

```powershell
cd backend
npm.cmd start
```

```powershell
cd frontend
npm.cmd run dev
```

Open `http://localhost:5173`. The Vite development server proxies `/api`
requests to the backend on port `3000`.

## Menu

1. Add a supply-chain actor
2. Add a product transfer
3. Display the graph
4. Trace upstream origins from an actor using reverse BFS
5. Detect unique directed cycles using DFS back-edge reconstruction
6. Generate reproducible synthetic data
7. Run the 100, 500, 1000, and 5000-vertex performance configurations
8. Display complexity analysis
9. Exit

## Cycle definition

The three-colour DFS detector reports unique directed back-edge cycles; it does
not enumerate every possible simple cycle. Reported paths follow transfer
direction and are deduplicated by rotation only (never by reversing direction).
Performance compares those exact normalized sequences against injected ground
truth. A detected cycle is circular movement, not definitive proof of fraud.

## Suggested tests

- Normal chain: add actors 1-4 and edges `1 -> 2 -> 3 -> 4`; DFS should report
  no cycle and BFS from actor 4 should produce 3, 2, 1.
- Circular chain: add edge `4 -> 2` to produce
  `2 -> 3 -> 4 -> 2`.
- Disconnected network: add independent actor groups and run DFS.
- Multiple cycles: add several closing edges and run DFS.
- Synthetic: generate 100/150/2, 500/750/5, 1000/1500/10, or
  5000/7500/20 vertices/edges/cycles.
=======
# Provenance-Graph
>>>>>>> 2a2473d578148766d090f71cb763092bfaa805e1
