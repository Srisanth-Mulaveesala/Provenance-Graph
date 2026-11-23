'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createApp, runEngine } = require('../server');

test('actor/transfer CRUD, cycle tracing, persistence, and configured performance', async () => {
  const graphMode = await runEngine(path.join(__dirname, '..', '..', 'provenance_engine.exe'), {
    operation: 'graph',
    graph: {
      actors: [{ id: 9, name: 'Graph mode', type: 'Supplier' }],
      transfers: []
    }
  });
  assert.equal(graphMode.success, true);
  assert.equal(graphMode.graph.vertices, 1);
  assert.equal(graphMode.graph.actors[0].name, 'Graph mode');

  const dfsCases = await runEngine(path.join(__dirname, '..', '..', 'provenance_engine.exe'), {
    operation: 'dfs',
    graph: {
      actors: [1, 2, 3, 4, 5].map((id) => ({ id, name: `Actor ${id}`, type: 'Supplier' })),
      transfers: [
        { source: 1, destination: 2, product: 10 },
        { source: 1, destination: 2, product: 11 },
        { source: 2, destination: 1, product: 10 },
        { source: 3, destination: 3, product: 10 },
        { source: 4, destination: 5, product: 10 }
      ]
    }
  });
  assert.deepEqual(dfsCases.cycles, [[1, 2, 1], [3, 3]]);

  const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'provenance-api-test-'));
  const storePath = path.join(testDirectory, 'store.json');
  const server = createApp({ storePath }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const request = async (endpoint, method, body) => {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const data = response.status === 204 ? null : await response.json();
    return { status: response.status, data };
  };

  try {
    for (const actor of [
      { id: 1, name: 'Origin', type: 'Supplier' },
      { id: 2, name: 'Processor', type: 'Manufacturer' },
      { id: 3, name: 'Store', type: 'Pharmacy' }
    ]) {
      assert.equal((await request('/actors', 'POST', actor)).status, 201);
    }
    assert.equal((await request('/actors', 'POST', {
      id: 1, name: 'Duplicate', type: 'Supplier'
    })).status, 409);

    for (const transfer of [
      { source: 1, destination: 2, product: 10, purpose: 'Raw Material Supply' },
      { source: 2, destination: 3, product: 10, purpose: 'Manufacturing / Processing' },
      { source: 3, destination: 1, product: 10, purpose: 'Distribution' }
    ]) {
      assert.equal((await request('/transfers', 'POST', {
        ...transfer,
        description: 'Routine documented shipment with standard quality records.',
        transferDate: '2026-11-23',
        authorizationStatus: 'not-required'
      })).status, 201);
    }
    const parallelTransfer = await request('/transfers', 'POST', {
      sourceId: 1, destinationId: 2, productId: 11,
      purpose: 'Packaging', transferDate: '2026-11-23',
      description: 'Routine documented packaging shipment with standard quality records.',
      authorizationStatus: 'not-required'
    });
    assert.equal(parallelTransfer.status, 201);
    assert.equal((await request('/transfers', 'POST', {
      sourceId: 1, destinationId: 2, productId: 10,
      purpose: 'Packaging'
    })).status, 409);

    const bfs = await request('/bfs', 'POST', { actorId: 3 });
    assert.equal(bfs.status, 200);
    assert.deepEqual(bfs.data.ancestors, [2, 1]);
    assert.deepEqual(bfs.data.traversalOrder, [2, 1]);
    assert.deepEqual(bfs.data.discoveryEdges, [
      { source: 2, destination: 3, product: 10 },
      { source: 1, destination: 2, product: 10 }
    ]);
    const productBfs = await request('/analysis/bfs', 'POST', { actorId: 2, productId: 11 });
    assert.equal(productBfs.status, 200);
    assert.deepEqual(productBfs.data.traversalOrder, [1]);
    assert.deepEqual(productBfs.data.discoveryEdges, [
      { source: 1, destination: 2, product: 11 }
    ]);
    const dfs = await request('/dfs', 'POST', {});
    assert.equal(dfs.status, 200);
    assert.equal(dfs.data.cycles.length, 1);
    assert.deepEqual(dfs.data.cycles[0], [1, 2, 3, 1]);
    assert.equal(dfs.data.cycleTransfers.length, 1);
    assert.equal(dfs.data.cycleTransfers[0].length, 4);
    assert.deepEqual(
      new Set(dfs.data.cycleTransfers[0].map((transfer) => transfer.purpose)),
      new Set(['Raw Material Supply', 'Manufacturing / Processing', 'Distribution', 'Packaging'])
    );

    const analysisDfs = await request('/analysis/dfs', 'POST', {});
    assert.equal(analysisDfs.status, 200);
    assert.equal(analysisDfs.data.cycleTransfers[0].length, 4);

    const risk = await request('/analysis/risk', 'POST', {});
    assert.equal(risk.status, 200);
    assert.equal(risk.data.assessments.length, 4);
    assert.ok(risk.data.assessments.every((assessment) =>
      assessment.riskClassification === 'LOW RISK' &&
      assessment.cycleAssociated &&
      assessment.fraudVerified === false
    ));

    assert.equal((await request('/transfers', 'POST', {
      sourceId: 1, destinationId: 3, productId: 10
    })).status, 400);
    assert.equal((await request('/transfers', 'POST', {
      sourceId: 1, destinationId: 3, productId: 10, purpose: 'Other'
    })).status, 400);
    const otherTransfer = await request('/transfers', 'POST', {
      sourceId: 1, destinationId: 3, productId: 10,
      purpose: 'Other', otherReason: 'Laboratory sampling'
    });
    assert.equal(otherTransfer.status, 201);
    assert.equal(otherTransfer.data.otherReason, 'Laboratory sampling');
    const transferDetail = await request(`/transfers/${otherTransfer.data.id}`, 'GET');
    assert.equal(transferDetail.data.purpose, 'Other');
    assert.equal(transferDetail.data.otherReason, 'Laboratory sampling');
    const updatedTransfer = await request(`/transfers/${otherTransfer.data.id}`, 'PUT', {
      sourceId: 2, destinationId: 1, productId: 20,
      purpose: 'Return After Processing', transferDate: '2026-11-24'
    });
    assert.equal(updatedTransfer.status, 200);
    let graph = await request('/graph', 'GET');
    assert.ok(graph.data.transfers.some((transfer) =>
      transfer.id === otherTransfer.data.id &&
      transfer.sourceId === 2 && transfer.destinationId === 1 && transfer.productId === 20
    ));
    assert.equal((await request(`/transfers/${otherTransfer.data.id}`, 'DELETE')).status, 204);
    graph = await request('/graph', 'GET');
    assert.equal(graph.data.transfers.length, 4);

    const performance = await request('/performance', 'POST', {
      vertices: 20, edges: 30, cycles: 2, seed: 42
    });
    assert.equal(performance.status, 201);
    assert.equal(performance.data.results.length, 1);
    assert.equal(performance.data.algorithmVersion, 'directed-cycle-path-v2');
    const measured = performance.data.results[0];
    assert.equal(measured.vertices, 20);
    assert.ok(performance.data.results[0].bfsMilliseconds >= 0);
    assert.equal(measured.edges, 30);
    assert.equal(measured.injectedCycles, 2);
    assert.equal(measured.truePositives, 2);
    assert.equal(measured.falsePositives, 0);
    assert.equal(measured.falseNegatives, 0);
    assert.equal(measured.precision, 1);
    assert.equal(measured.recall, 1);
    assert.equal(measured.f1, 1);

    const restartedServer = createApp({ storePath }).listen(0);
    await new Promise((resolve) => restartedServer.once('listening', resolve));
    try {
      const summaryResponse = await fetch(`http://127.0.0.1:${restartedServer.address().port}/api/reports/summary`);
      const summary = await summaryResponse.json();
      assert.equal(summary.actorCount, 3);
      assert.equal(summary.transferCount, 4);
      assert.equal(summary.performanceRuns, 1);
    } finally {
      await new Promise((resolve, reject) => restartedServer.close((error) => error ? reject(error) : resolve()));
    }

    const presetPerformance = await request('/analysis/performance', 'POST', {});
    assert.equal(presetPerformance.status, 201);
    assert.deepEqual(presetPerformance.data.results.map((item) => item.vertices), [100, 500, 1000, 5000]);
    assert.ok(presetPerformance.data.results.every((item) =>
      item.bfsMilliseconds >= 0 && item.dfsMilliseconds >= 0 &&
      item.edges > 0 && item.truePositives === item.injectedCycles &&
      item.falsePositives === 0 && item.falseNegatives === 0
    ));
    const savedRuns = await request('/analysis/results', 'GET');
    assert.equal(savedRuns.data.length, 2);
    assert.equal(savedRuns.data[0].results.length, 4);
    assert.equal(savedRuns.data[0].algorithmVersion, 'directed-cycle-path-v2');

    const synthetic = await request('/synthetic/generate', 'POST', {
      vertices: 8, edges: 10, cycles: 1, seed: 4294967295
    });
    assert.equal(synthetic.status, 201);
    assert.equal(synthetic.data.graph.actors.length, 8);
    assert.equal(synthetic.data.truth.length, 1);
    assert.equal(synthetic.data.graph.transfers.length, 10);
    assert.equal(synthetic.data.seed, 4294967295);
    const storedSynthetic = await request('/synthetic', 'GET');
    assert.equal(storedSynthetic.data.seed, 4294967295);
    assert.deepEqual(storedSynthetic.data.truth, synthetic.data.truth);
    assert.deepEqual(storedSynthetic.data.graph, synthetic.data.graph);
    const repeatedSynthetic = await request('/synthetic/generate', 'POST', {
      vertices: 8, edges: 10, cycles: 1, seed: 4294967295
    });
    assert.deepEqual(repeatedSynthetic.data.graph, synthetic.data.graph);
    assert.deepEqual(repeatedSynthetic.data.truth, synthetic.data.truth);
    assert.equal((await request('/synthetic/generate', 'POST', {
      vertices: 4, edges: 3, cycles: 1, seed: 1
    })).status, 400);
    assert.equal((await request('/synthetic/generate', 'POST', {
      vertices: 5, edges: 6, cycles: 2, seed: 1
    })).status, 400);
    assert.equal((await request('/synthetic', 'DELETE')).data.cleared, true);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    fs.rmSync(testDirectory, { recursive: true, force: true });
  }
});
