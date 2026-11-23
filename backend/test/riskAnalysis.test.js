'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { analyzeTransfers, assessTransfer, findSuspiciousIndicators } = require('../riskAnalysis');

function documentedTransfer(overrides = {}) {
  return {
    id: 1,
    source: 10,
    destination: 20,
    purpose: 'Distribution',
    description: 'Routine documented shipment with standard quality records.',
    transferDate: '2026-11-23',
    authorizationStatus: 'documented',
    authorizationReference: 'AUTH-123',
    ...overrides
  };
}

test('ordinary documented transfer is low risk and a legitimate cycle alone stays low', () => {
  const normal = assessTransfer(documentedTransfer());
  assert.equal(normal.riskClassification, 'LOW RISK');
  assert.equal(normal.fraudVerified, false);

  const circular = assessTransfer(documentedTransfer(), { cycleAssociated: true });
  assert.equal(circular.riskClassification, 'LOW RISK');
  assert.match(circular.classificationReason, /cycle alone is not evidence/i);
});

test('a lone keyword is not flagged, while contextual suspicious phrases are high risk', () => {
  const loneKeyword = findSuspiciousIndicators(
    'The word forged appears in a note; routine documented transfer.'
  );
  assert.deepEqual(loneKeyword, []);

  const suspicious = assessTransfer(documentedTransfer({
    description: 'We concealed the original product identity during transfer.'
  }));
  assert.equal(suspicious.riskClassification, 'HIGH RISK');
  assert.equal(suspicious.strongIndicatorCount, 1);
  assert.equal(suspicious.fraudVerified, false);
});

test('contextual rules recognize the requested suspicious-activity categories', () => {
  const examples = [
    'Concealed the original product identity.',
    'Removed the original batch information.',
    'Unauthorized relabelling of the shipment.',
    'Provided fake product documentation.',
    'Bypassed quality inspection.',
    'Hid the actual source of the product.',
    'Unauthorized product circulation.'
  ];
  for (const example of examples) {
    assert.equal(findSuspiciousIndicators(example).length, 1, example);
  }
});

test('multiple contextual indicators in a cycle produce critical risk, not a fraud finding', () => {
  const critical = assessTransfer(documentedTransfer({
    description: 'We concealed the original product identity and removed the original batch information.'
  }), { cycleAssociated: true });

  assert.equal(critical.riskClassification, 'CRITICAL RISK');
  assert.equal(critical.strongIndicatorCount, 2);
  assert.equal(critical.fraudVerified, false);
});

test('strong indicators distributed across a legitimate graph cycle escalate each involved transfer', () => {
  const transfers = [
    documentedTransfer({ id: 1, source: 10, destination: 20,
      description: 'We concealed the original product identity.' }),
    documentedTransfer({ id: 2, source: 20, destination: 30,
      description: 'The original batch information was removed.' }),
    documentedTransfer({ id: 3, source: 30, destination: 10 })
  ];
  const assessments = analyzeTransfers(transfers, {
    cycleTransfers: [[transfers[0], transfers[1], transfers[2]]]
  });

  assert.ok(assessments.every((assessment) =>
    assessment.riskClassification === 'CRITICAL RISK' &&
    assessment.cycleAssociated &&
    assessment.cycleStrongIndicatorCount === 2
  ));
});

test('missing documentation is medium risk and an unclear Other reason is not automatically suspicious', () => {
  const incomplete = assessTransfer(documentedTransfer({
    description: '',
    authorizationStatus: 'not-specified',
    authorizationReference: ''
  }));
  assert.equal(incomplete.riskClassification, 'MEDIUM RISK');

  const legitimateOther = assessTransfer(documentedTransfer({
    purpose: 'Other',
    otherReason: 'Temporary transfer for scheduled equipment calibration.',
    authorizationStatus: 'not-required',
    authorizationReference: ''
  }));
  assert.equal(legitimateOther.riskClassification, 'LOW RISK');
  assert.deepEqual(legitimateOther.riskIndicators, []);
});

test('explicitly missing authorization is high risk, while not-required authorization is not', () => {
  const missing = assessTransfer(documentedTransfer({
    authorizationStatus: 'missing',
    authorizationReference: ''
  }));
  assert.equal(missing.riskClassification, 'HIGH RISK');
  assert.ok(missing.riskIndicators.includes('Authorization is marked missing or unverified'));

  const notRequired = assessTransfer(documentedTransfer({
    description: 'No authorization is required for this documented shipment.',
    authorizationStatus: 'not-required',
    authorizationReference: ''
  }));
  assert.equal(notRequired.riskClassification, 'LOW RISK');
});
