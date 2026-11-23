'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const express = require('express');
const { analyzeTransfers } = require('./riskAnalysis');

const projectRoot = path.resolve(__dirname, '..');
const defaultStorePath = path.resolve(
  process.env.PROVENANCE_STORE_PATH || path.join(__dirname, 'data', 'store.json')
);
const defaultEnginePath = path.resolve(
  process.env.CPP_ENGINE_PATH || path.join(
    projectRoot,
    process.platform === 'win32' ? 'provenance_engine.exe' : 'provenance_engine'
  )
);
const maxBodyBytes = '1mb';
const performanceAlgorithmVersion = 'directed-cycle-path-v2';
const transferPurposes = [
  'Raw Material Supply',
  'Manufacturing / Processing',
  'Packaging',
  'Quality Testing / Inspection',
  'Labelling',
  'Storage / Warehousing',
  'Distribution',
  'Retail / Pharmacy Supply',
  'Return After Processing',
  'Product Recall',
  'Other'
];

function isInteger(value, minimum = 0, maximum = 2147483647) {
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function readStore(storePath) {
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  if (!fs.existsSync(storePath)) {
    const initial = { actors: [], transfers: [], synthetic: null, performance: [] };
    fs.writeFileSync(storePath, `${JSON.stringify(initial, null, 2)}\n`, 'utf8');
    return initial;
  }
  const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
  if (!store || !Array.isArray(store.actors) || !Array.isArray(store.transfers) ||
      !Array.isArray(store.performance)) {
    throw new Error('Persistent data file has an invalid format');
  }
  if (!Object.prototype.hasOwnProperty.call(store, 'synthetic')) store.synthetic = null;
  return store;
}

function writeStore(storePath, store) {
  const temporary = `${storePath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
    fs.renameSync(temporary, storePath);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function graphInput(store, operation, extra = {}) {
  return {
    operation,
    graph: {
      actors: store.actors.map(({ id, name, type }) => ({ id, name, type })),
      transfers: store.transfers.map((transfer) => ({
        source: transfer.source ?? transfer.sourceId,
        destination: transfer.destination ?? transfer.destinationId,
        product: transfer.product ?? transfer.productId
      }))
    },
    ...extra
  };
}

function transferResponse(transfer) {
  return {
    ...transfer,
    sourceId: transfer.source ?? transfer.sourceId,
    destinationId: transfer.destination ?? transfer.destinationId,
    productId: transfer.product ?? transfer.productId,
    purpose: transfer.purpose || 'Not specified (legacy transfer)',
    otherReason: transfer.otherReason || '',
    authorizationStatus: transfer.authorizationStatus || 'not-specified',
    authorizationReference: transfer.authorizationReference || ''
  };
}

function graphResponse(store) {
  return {
    actors: store.actors,
    transfers: store.transfers.map(transferResponse),
    vertices: store.actors.length,
    edges: store.transfers.length
  };
}

function runEngine(enginePath, request) {
  return new Promise((resolve, reject) => {
    const requestDir = fs.mkdtempSync(path.join(os.tmpdir(), `provenance-${crypto.randomBytes(8).toString('hex')}-`));
    const inputPath = path.join(requestDir, 'input.json');
    const outputPath = path.join(requestDir, 'output.json');
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      fs.rm(requestDir, { recursive: true, force: true }, () => {});
    };

    fs.writeFile(inputPath, JSON.stringify(request), 'utf8', (writeError) => {
      if (writeError) {
        cleanup();
        reject(writeError);
        return;
      }
      execFile(enginePath, ['--json', inputPath, outputPath], {
        windowsHide: true,
        timeout: 120000,
        maxBuffer: 1024 * 1024
      }, (processError, stdout, stderr) => {
        fs.readFile(outputPath, 'utf8', (readError, output) => {
          if (readError) {
            cleanup();
            reject(new Error(`C++ engine failed${stderr ? `: ${stderr.trim()}` : ''}`));
            return;
          }
          let result;
          try {
            result = JSON.parse(output);
          } catch (error) {
            cleanup();
            reject(new Error('C++ engine returned invalid JSON'));
            return;
          }
          cleanup();
          if (processError && (!result || result.success !== false)) {
            reject(new Error(`C++ engine process failed${stderr ? `: ${stderr.trim()}` : ''}`));
            return;
          }
          resolve(result);
        });
      });
    });
  });
}

function requireGraphCollections(store) {
  return graphResponse(store);
}

function validateActor(body, existingId) {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw httpError(400, 'Request body must be an object');
  const id = existingId === undefined ? body.id : existingId;
  if (!isInteger(id)) throw httpError(400, 'id must be a non-negative safe integer');
  if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 200)
    throw httpError(400, 'name must be a non-empty string of at most 200 characters');
  if (typeof body.type !== 'string' || !body.type.trim() || body.type.length > 100)
    throw httpError(400, 'type must be a non-empty string of at most 100 characters');
  return { id, name: body.name.trim(), type: body.type.trim() };
}

function validateTransfer(body, store, ignoreId) {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw httpError(400, 'Request body must be an object');
  const source = body.source ?? body.sourceId;
  const destination = body.destination ?? body.destinationId;
  const product = body.product ?? body.productId;
  if (!isInteger(source) || !isInteger(destination) || !isInteger(product))
    throw httpError(400, 'source, destination, and product must be non-negative safe integers');
  if (!store.actors.some((actor) => actor.id === source) ||
      !store.actors.some((actor) => actor.id === destination))
    throw httpError(400, 'Both transfer actors must exist');
  const purpose = body.purpose;
  if (!transferPurposes.includes(purpose))
    throw httpError(400, 'A valid transfer purpose is required');
  const otherReason = body.otherReason === undefined ? '' : body.otherReason;
  if (typeof otherReason !== 'string' || otherReason.length > 2000)
    throw httpError(400, 'Other purpose explanation must be text of at most 2000 characters');
  if (purpose === 'Other' && !otherReason.trim())
    throw httpError(400, 'Enter a non-empty explanation when transfer purpose is Other');
  const transferDate = body.transferDate === undefined ? '' : body.transferDate;
  if (typeof transferDate !== 'string' || transferDate.length > 40)
    throw httpError(400, 'transferDate must be text of at most 40 characters');
  const description = body.description === undefined ? '' : body.description;
  if (typeof description !== 'string' || description.length > 3000)
    throw httpError(400, 'description must be text of at most 3000 characters');
  const allowedAuthorizationStatuses = ['not-specified', 'documented', 'not-required', 'missing'];
  const authorizationStatus = body.authorizationStatus || 'not-specified';
  if (!allowedAuthorizationStatuses.includes(authorizationStatus))
    throw httpError(400, 'authorizationStatus must be not-specified, documented, not-required, or missing');
  const authorizationReference = body.authorizationReference === undefined ? '' : body.authorizationReference;
  if (typeof authorizationReference !== 'string' || authorizationReference.length > 200)
    throw httpError(400, 'authorizationReference must be text of at most 200 characters');
  if (authorizationStatus === 'documented' && !authorizationReference.trim())
    throw httpError(400, 'Enter the authorization reference when authorization is documented');
  if (store.transfers.some((transfer) => transfer.id !== ignoreId &&
      (transfer.source ?? transfer.sourceId) === source &&
      (transfer.destination ?? transfer.destinationId) === destination &&
      (transfer.product ?? transfer.productId) === product))
    throw httpError(409, 'This product transfer between these actors already exists');
  return {
    source,
    destination,
    product,
    purpose,
    ...(purpose === 'Other' ? { otherReason: otherReason.trim() } : {}),
    transferDate,
    description: description.trim(),
    authorizationStatus,
    authorizationReference: authorizationReference.trim()
  };
}

function cycleTransferDetails(store, cycles) {
  return cycles.map((cycle) => {
    const details = [];
    for (let index = 0; index + 1 < cycle.length; index += 1) {
      const source = cycle[index];
      const destination = cycle[index + 1];
      const transfers = store.transfers.filter((item) =>
        (item.source ?? item.sourceId) === source &&
        (item.destination ?? item.destinationId) === destination);
      details.push(...transfers.map(transferResponse));
    }
    return details;
  });
}

function validatePerformance(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw httpError(400, 'Request body must be an object');
  const hasConfig = ['vertices', 'edges', 'cycles', 'seed'].some((key) => body[key] !== undefined);
  if (!hasConfig) return {};
  if (!isInteger(body.vertices, 1, 10000) || !isInteger(body.edges, 0, 50000) ||
      !isInteger(body.cycles, 0, 10000) ||
      (body.seed !== undefined && !isInteger(body.seed, 0, 4294967295))) {
    throw httpError(400, 'Configuration requires vertices 1-10000, edges 0-50000, cycles 0-10000, and an optional unsigned 32-bit seed');
  }
  if (body.cycles > Math.floor(body.vertices / 3) ||
      body.edges < body.vertices - 1 + body.cycles ||
      (body.vertices === 1 && body.edges !== 0)) {
    throw httpError(400, 'Synthetic configuration is infeasible: require at most floor(vertices/3) cycles and at least vertices-1+cycles edges');
  }
  return {
    vertices: body.vertices,
    edges: body.edges,
    cycles: body.cycles,
    seed: body.seed === undefined ? 2026 : body.seed
  };
}

function createCorsMiddleware(allowedOrigins) {
  return (req, res, next) => {
    const origin = req.get('Origin');
    if (!origin) {
      if (req.method === 'OPTIONS') return res.sendStatus(204);
      return next();
    }
    if (!allowedOrigins.has(origin)) {
      if (req.method === 'OPTIONS')
        return res.status(403).json({ error: 'Origin not allowed' });
      return next();
    }

    res.set('Access-Control-Allow-Origin', origin);
    res.vary('Origin');
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      return res.sendStatus(204);
    }
    return next();
  };
}

function createApp(options = {}) {
  const storePath = path.resolve(
    options.storePath || process.env.PROVENANCE_STORE_PATH || defaultStorePath
  );
  const enginePath = path.resolve(
    options.enginePath || process.env.CPP_ENGINE_PATH || defaultEnginePath
  );
  const store = readStore(storePath);
  const app = express();
  const configuredOrigins = options.corsOrigins === undefined
    ? (process.env.CORS_ORIGINS || '').split(',')
    : Array.isArray(options.corsOrigins) ? options.corsOrigins : String(options.corsOrigins).split(',');
  const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...configuredOrigins.map((origin) => origin.trim()).filter(Boolean)
  ]);
  app.use(createCorsMiddleware(allowedOrigins));
  app.use(express.json({ limit: maxBodyBytes, strict: true }));

  app.get('/api/health', (req, res) => res.json({ success: true }));

  app.get('/api/actors', (req, res) => res.json(store.actors));
  app.post('/api/actors', (req, res, next) => {
    try {
      const actor = validateActor(req.body);
      if (store.actors.some((item) => item.id === actor.id))
        throw httpError(409, 'Actor ID already exists');
      store.actors.push(actor);
      writeStore(storePath, store);
      res.status(201).json(actor);
    } catch (error) { next(error); }
  });
  app.get('/api/actors/:id', (req, res, next) => {
    const id = Number(req.params.id);
    if (!isInteger(id)) return next(httpError(400, 'Actor ID must be a non-negative integer'));
    const actor = store.actors.find((item) => item.id === id);
    return actor ? res.json(actor) : next(httpError(404, 'Actor not found'));
  });
  app.put('/api/actors/:id', (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!isInteger(id)) throw httpError(400, 'Actor ID must be a non-negative integer');
      const index = store.actors.findIndex((item) => item.id === id);
      if (index < 0) throw httpError(404, 'Actor not found');
      if (req.body && req.body.id !== undefined && req.body.id !== id)
        throw httpError(400, 'Actor ID cannot be changed');
      const actor = validateActor(req.body, id);
      store.actors[index] = actor;
      writeStore(storePath, store);
      res.json(actor);
    } catch (error) { next(error); }
  });
  app.patch('/api/actors/:id', (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!isInteger(id)) throw httpError(400, 'Actor ID must be a non-negative integer');
      const actor = store.actors.find((item) => item.id === id);
      if (!actor) throw httpError(404, 'Actor not found');
      if (req.body.id !== undefined && req.body.id !== id) throw httpError(400, 'Actor ID cannot be changed');
      Object.assign(actor, validateActor({ ...actor, ...req.body }, id));
      writeStore(storePath, store);
      res.json(actor);
    } catch (error) { next(error); }
  });
  app.delete('/api/actors/:id', (req, res, next) => {
    const id = Number(req.params.id);
    if (!isInteger(id)) return next(httpError(400, 'Actor ID must be a non-negative integer'));
    const index = store.actors.findIndex((item) => item.id === id);
    if (index < 0) return next(httpError(404, 'Actor not found'));
    store.actors.splice(index, 1);
    store.transfers = store.transfers.filter((item) => item.source !== id && item.destination !== id);
    writeStore(storePath, store);
    return res.status(204).end();
  });

  app.get('/api/transfers', (req, res) => res.json(store.transfers.map(transferResponse)));
  app.post('/api/transfers', (req, res, next) => {
    try {
      const transfer = validateTransfer(req.body, store);
      transfer.id = store.transfers.reduce((nextId, item) => Math.max(nextId, item.id + 1), 1);
      store.transfers.push(transfer);
      writeStore(storePath, store);
      res.status(201).json(transferResponse(transfer));
    } catch (error) { next(error); }
  });
  app.get('/api/transfers/:id', (req, res, next) => {
    const id = Number(req.params.id);
    if (!isInteger(id, 1)) return next(httpError(400, 'Transfer ID must be a positive integer'));
    const transfer = store.transfers.find((item) => item.id === id);
    return transfer ? res.json(transferResponse(transfer)) : next(httpError(404, 'Transfer not found'));
  });
  app.put('/api/transfers/:id', (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!isInteger(id, 1)) throw httpError(400, 'Transfer ID must be a positive integer');
      const index = store.transfers.findIndex((item) => item.id === id);
      if (index < 0) throw httpError(404, 'Transfer not found');
      store.transfers[index] = { id, ...validateTransfer(req.body, store, id) };
      writeStore(storePath, store);
      res.json(transferResponse(store.transfers[index]));
    } catch (error) { next(error); }
  });
  app.delete('/api/transfers/:id', (req, res, next) => {
    const id = Number(req.params.id);
    if (!isInteger(id, 1)) return next(httpError(400, 'Transfer ID must be a positive integer'));
    const index = store.transfers.findIndex((item) => item.id === id);
    if (index < 0) return next(httpError(404, 'Transfer not found'));
    store.transfers.splice(index, 1);
    writeStore(storePath, store);
    return res.status(204).end();
  });

  app.get('/api/graph', (req, res) => res.json(requireGraphCollections(store)));
  app.post('/api/bfs', async (req, res, next) => {
    try {
      const actorId = req.body && req.body.actorId;
      if (!isInteger(actorId)) throw httpError(400, 'actorId must be a non-negative safe integer');
      if (!store.actors.some((actor) => actor.id === actorId)) throw httpError(404, 'Actor not found');
      const productId = req.body.productId;
      if (productId !== undefined && !isInteger(productId))
        throw httpError(400, 'productId must be a non-negative safe integer');
      if (productId !== undefined && !store.transfers.some((transfer) =>
        (transfer.product ?? transfer.productId) === productId))
        throw httpError(404, 'Product not found in transfer records');
      const result = await runEngine(enginePath, graphInput(store, 'bfs', {
        actorId,
        ...(productId === undefined ? {} : { productId })
      }));
      if (!result.success) throw httpError(422, result.error || 'BFS failed');
      res.json({
        ...result,
        selectedActor: actorId,
        upstreamCount: result.ancestors.length,
        traversalOrder: result.traversalOrder || result.ancestors,
        discoveryEdges: result.discoveryEdges || [],
        executionTimeMs: result.executionTimeMs || 0
      });
    } catch (error) { next(error); }
  });
  app.post('/api/dfs', async (req, res, next) => {
    try {
      const result = await runEngine(enginePath, graphInput(store, 'dfs'));
      if (!result.success) throw httpError(422, result.error || 'DFS failed');
      res.json({ ...result, cycleTransfers: cycleTransferDetails(store, result.cycles || []) });
    } catch (error) { next(error); }
  });

  app.post('/api/analysis/bfs', async (req, res, next) => {
    try {
      const actorId = req.body && req.body.actorId;
      if (!isInteger(actorId)) throw httpError(400, 'actorId must be a non-negative safe integer');
      if (!store.actors.some((actor) => actor.id === actorId)) throw httpError(404, 'Actor not found');
      const productId = req.body.productId;
      if (productId !== undefined && !isInteger(productId))
        throw httpError(400, 'productId must be a non-negative safe integer');
      if (productId !== undefined && !store.transfers.some((transfer) =>
        (transfer.product ?? transfer.productId) === productId))
        throw httpError(404, 'Product not found in transfer records');
      const result = await runEngine(enginePath, graphInput(store, 'bfs', {
        actorId,
        ...(productId === undefined ? {} : { productId })
      }));
      if (!result.success) throw httpError(422, result.error || 'BFS failed');
      res.json({
        ...result,
        selectedActor: actorId,
        upstreamCount: result.ancestors.length,
        traversalOrder: result.traversalOrder || result.ancestors,
        discoveryEdges: result.discoveryEdges || [],
        executionTimeMs: result.executionTimeMs || 0
      });
    } catch (error) { next(error); }
  });
  app.post('/api/analysis/dfs', async (req, res, next) => {
    try {
      const result = await runEngine(enginePath, graphInput(store, 'dfs'));
      if (!result.success) throw httpError(422, result.error || 'DFS failed');
      res.json({ ...result, cycleTransfers: cycleTransferDetails(store, result.cycles || []) });
    } catch (error) { next(error); }
  });
  app.post('/api/analysis/risk', async (req, res, next) => {
    try {
      const result = await runEngine(enginePath, graphInput(store, 'dfs'));
      if (!result.success) throw httpError(422, result.error || 'DFS failed');
      const cycles = result.cycles || [];
      const cycleTransfers = cycleTransferDetails(store, cycles);
      const assessments = analyzeTransfers(store.transfers, {
        actors: store.actors,
        cycleTransfers
      });
      const counts = assessments.reduce((summary, assessment) => {
        summary[assessment.riskClassification] += 1;
        return summary;
      }, {
        'LOW RISK': 0,
        'MEDIUM RISK': 0,
        'HIGH RISK': 0,
        'CRITICAL RISK': 0
      });
      res.json({
        success: true,
        cycles,
        cycleTransfers,
        executionTimeMs: result.executionTimeMs || 0,
        assessments,
        summary: counts,
        disclaimer: 'Automated risk flags are for review only and do not establish verified fraud.'
      });
    } catch (error) { next(error); }
  });

  const clearSynthetic = (req, res) => {
    store.actors = [];
    store.transfers = [];
    store.synthetic = null;
    writeStore(storePath, store);
    res.json({ success: true, cleared: true });
  };
  app.get('/api/synthetic', (req, res) => res.json({
    success: true,
    synthetic: store.synthetic,
    seed: store.synthetic ? store.synthetic.seed : null,
    truth: store.synthetic ? store.synthetic.truth : [],
    graph: requireGraphCollections(store)
  }));
  app.post('/api/synthetic/generate', async (req, res, next) => {
    try {
      const config = req.body || {};
      if (!isInteger(config.vertices, 1, 10000) || !isInteger(config.edges, 0, 50000) ||
          !isInteger(config.cycles, 0, 10000) ||
          (config.seed !== undefined && !isInteger(config.seed, 0, 4294967295)))
        throw httpError(400, 'vertices (1-10000), edges (0-50000), cycles, and optional unsigned 32-bit seed are required');
      if (config.cycles > Math.floor(config.vertices / 3) ||
          config.edges < config.vertices - 1 + config.cycles ||
          (config.vertices === 1 && config.edges !== 0))
        throw httpError(400, 'Synthetic configuration is infeasible: require at most floor(vertices/3) cycles and at least vertices-1+cycles edges');
      const result = await runEngine(enginePath, {
        operation: 'synthetic',
        vertices: config.vertices,
        edges: config.edges,
        cycles: config.cycles,
        seed: config.seed === undefined ? 2026 : config.seed
      });
      if (!result.success) throw httpError(422, result.error || 'Synthetic generation failed');
      const graph = result.graph;
      store.actors = graph.actors;
      store.transfers = graph.transfers.map((transfer, index) => ({ id: index + 1, ...transfer }));
      store.synthetic = { seed: config.seed === undefined ? 2026 : config.seed, truth: result.truth };
      writeStore(storePath, store);
      res.status(201).json({ ...result, seed: store.synthetic.seed, graph: requireGraphCollections(store) });
    } catch (error) { next(error); }
  });
  app.delete('/api/synthetic', clearSynthetic);
  app.post('/api/synthetic/clear', clearSynthetic);

  app.post('/api/performance', async (req, res, next) => {
    try {
      const config = validatePerformance(req.body || {});
      const request = Object.keys(config).length
        ? { operation: 'performance', ...config }
        : { operation: 'performance' };
      const result = await runEngine(enginePath, request);
      if (!result.success) throw httpError(422, result.error || 'Performance analysis failed');
      const run = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        algorithmVersion: performanceAlgorithmVersion,
        config,
        results: result.results
      };
      store.performance.unshift(run);
      writeStore(storePath, store);
      res.status(201).json(run);
    } catch (error) { next(error); }
  });
  app.post('/api/analysis/performance', async (req, res, next) => {
    try {
      const config = validatePerformance(req.body || {});
      const request = Object.keys(config).length
        ? { operation: 'performance', ...config }
        : { operation: 'performance' };
      const result = await runEngine(enginePath, request);
      if (!result.success) throw httpError(422, result.error || 'Performance analysis failed');
      const run = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        algorithmVersion: performanceAlgorithmVersion,
        config,
        results: result.results
      };
      store.performance.unshift(run);
      writeStore(storePath, store);
      res.status(201).json(run);
    } catch (error) { next(error); }
  });
  app.get('/api/performance', (req, res) => res.json(store.performance));
  app.get('/api/analysis/results', (req, res) => res.json(store.performance));
  app.get('/api/reports/summary', (req, res) => {
    res.json({
      actorCount: store.actors.length,
      transferCount: store.transfers.length,
      synthetic: store.synthetic,
      performanceRuns: store.performance.length,
      latestPerformance: store.performance[0] || null
    });
  });
  app.get('/api/reports/export', (req, res) => {
    res.set('Content-Disposition', 'attachment; filename="provenance-transfers.csv"');
    res.type('text/csv');
    const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Transfer ID', 'Product ID', 'Source Actor', 'Destination Actor', 'Transfer Purpose', 'Other Reason', 'Authorization Status', 'Authorization Reference', 'Transfer Date', 'Description'],
      ...store.transfers.map((transfer) => [
        transfer.id,
        transfer.product ?? transfer.productId,
        transfer.source ?? transfer.sourceId,
        transfer.destination ?? transfer.destinationId,
        transfer.purpose || 'Not specified (legacy transfer)',
        transfer.otherReason || '',
        transfer.authorizationStatus || 'not-specified',
        transfer.authorizationReference || '',
        transfer.transferDate || '',
        transfer.description || ''
      ])
    ];
    res.send(rows.map((row) => row.map(escapeCsv).join(',')).join('\n'));
  });

  const frontendDist = path.join(projectRoot, 'frontend', 'dist');
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof SyntaxError && error.status === 400)
      return res.status(400).json({ error: 'Request body contains invalid JSON' });
    const status = error.status || 500;
    if (status >= 500) console.error(error);
    return res.status(status).json({ error: status >= 500 ? 'Internal server error' : error.message });
  });

  app.locals.storePath = storePath;
  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';
  app.listen(port, host, () => {
    console.log(`Provenance application listening on http://localhost:${port}`);
  });
}

module.exports = { createApp, runEngine };
