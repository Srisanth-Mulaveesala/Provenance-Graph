'use strict';

const suspiciousRules = [
  {
    label: 'Possible concealment of original product identity',
    triggers: ['conceal', 'hide', 'mask', 'obscure'],
    patterns: [
      /\b(?:conceal(?:ed|ing)?|hide|hid|hidden|hiding|mask(?:ed|ing)?|obscure(?:d|ing)?)\b.{0,50}\b(?:original\s+)?(?:product\s+)?identity\b/i,
      /\b(?:original\s+)?(?:product\s+)?identity\b.{0,50}\b(?:conceal(?:ed|ing)?|hide|hid|hidden|hiding|mask(?:ed|ing)?|obscure(?:d|ing)?)\b/i
    ]
  },
  {
    label: 'Possible removal or alteration of original batch information',
    triggers: ['remove', 'erase', 'delete', 'strip', 'alter', 'cover', 'hide'],
    patterns: [
      /\b(?:remove[ds]?|removing|erase[ds]?|erasing|delete[ds]?|deleting|strip(?:ped|ping)?|alter(?:ed|ing)?|cover(?:ed|ing)?|hide|hid|hidden|hiding)\b.{0,55}\b(?:original\s+)?(?:batch|lot)\s+(?:number|code|information|details|record)\b/i,
      /\b(?:batch|lot)\s+(?:number|code|information|details|record)\b.{0,55}\b(?:remove[ds]?|removing|erase[ds]?|erasing|delete[ds]?|deleting|strip(?:ped|ping)?|alter(?:ed|ing)?|cover(?:ed|ing)?|hide|hid|hidden|hiding)\b/i
    ]
  },
  {
    label: 'Possible unauthorized relabelling',
    triggers: ['unauthorized', 'unauthorised', 'unapproved', 'relabel', 'relabelling', 'relabeling'],
    patterns: [
      /\b(?:unauthori[sz]ed|unapproved|without\s+approval)\b.{0,45}\brelabel(?:l?ing)?\b/i,
      /\brelabel(?:l?ing)?\b.{0,45}\b(?:without\s+approval|unauthori[sz]ed|unapproved)\b/i
    ]
  },
  {
    label: 'Possible fake or falsified product documentation',
    triggers: ['fake', 'forged', 'falsified', 'counterfeit', 'fabricated'],
    patterns: [
      /\b(?:fake|forged|falsified|counterfeit|fabricated)\b.{0,45}\b(?:product\s+)?(?:documents?|documentation|certificates?|records?|invoices?|paperwork)\b/i,
      /\b(?:documents?|documentation|certificates?|records?|invoices?|paperwork)\b.{0,45}\b(?:fake|forged|falsified|counterfeit|fabricated)\b/i
    ]
  },
  {
    label: 'Possible bypass of quality inspection or testing',
    triggers: ['bypass', 'skip', 'avoid', 'circumvent'],
    patterns: [
      /\b(?:bypass(?:ed|ing)?|skip(?:ped|ping)?|avoid(?:ed|ing)?|circumvent(?:ed|ing)?)\b.{0,50}\b(?:(?:quality|safety)\s+)?(?:inspection|testing|test|qc)\b/i,
      /\b(?:(?:quality|safety)\s+)?(?:inspection|testing|test|qc)\b.{0,50}\b(?:bypass(?:ed|ing)?|skip(?:ped|ping)?|avoid(?:ed|ing)?|circumvent(?:ed|ing)?)\b/i
    ]
  },
  {
    label: 'Possible concealment of actual product source',
    triggers: ['hide', 'conceal', 'mask', 'obscure', 'falsify'],
    patterns: [
      /\b(?:hide|hid|hidden|hiding|conceal(?:ed|ing)?|mask(?:ed|ing)?|obscure(?:d|ing)?|falsif(?:y|ied|ying))\b.{0,50}\b(?:actual\s+)?(?:source|origin|supplier)\b/i,
      /\b(?:actual\s+)?(?:source|origin|supplier)\b.{0,50}\b(?:hide|hid|hidden|hiding|conceal(?:ed|ing)?|mask(?:ed|ing)?|obscure(?:d|ing)?|falsif(?:y|ied|ying))\b/i
    ]
  },
  {
    label: 'Possible unauthorized product circulation',
    triggers: ['unauthorized', 'unauthorised', 'unlicensed', 'unapproved', 'circulate', 'distribute', 'sell', 'ship'],
    patterns: [
      /\b(?:unauthori[sz]ed|unlicensed|unapproved)\b.{0,50}\b(?:circulation|circulate|distribution|distribute|sale|sell|market(?:ing)?)\b/i,
      /\b(?:circulate|distribute|sell|ship|market(?:ing)?)\b.{0,50}\bwithout\s+(?:authorization|authorisation|approval|a\s+license|a\s+licence)\b/i,
      /\bwithout\s+(?:authorization|authorisation|approval|a\s+license|a\s+licence)\b.{0,50}\b(?:circulate|distribute|sell|ship|market(?:ing)?)\b/i
    ]
  }
];

function splitSentences(text) {
  return text.split(/(?<=[.!?;\n])\s*/).filter(Boolean);
}

function isNegated(sentence, triggers) {
  const triggerPattern = triggers.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const negation = new RegExp(
    `\\b(?:do\\s+not|does\\s+not|did\\s+not|don't|doesn't|didn't|not|never|no\\s+evidence\\s+of)\\b.{0,55}\\b(?:${triggerPattern})\\b`,
    'i'
  );
  return negation.test(sentence);
}

function findSuspiciousIndicators(description) {
  const sentences = splitSentences(String(description || ''));
  const indicators = [];

  for (const rule of suspiciousRules) {
    const matched = sentences.some((sentence) =>
      !isNegated(sentence, rule.triggers) &&
      rule.patterns.some((pattern) => pattern.test(sentence))
    );
    if (matched) indicators.push(rule.label);
  }
  return indicators;
}

function statesAuthorizationMissing(text) {
  const notRequired = /\b(?:no\s+)?(?:authorization|authorisation|approval|permit|license|licence)\s+(?:is\s+)?(?:not\s+required|not\s+needed|not\s+applicable|required)\b|\b(?:authorization|authorisation|approval|permit|license|licence)\s+(?:is\s+)?not\s+(?:required|needed|applicable)\b/i;
  const missing = /\b(?:without|lacking|missing|no)\s+(?:valid\s+)?(?:authorization|authorisation|approval|permit|license|licence)\b|\b(?:authorization|authorisation|approval|permit|license|licence)\s+(?:is\s+)?(?:missing|unverified|unauthorized|unauthorised)\b/i;
  return missing.test(text) && !notRequired.test(text);
}

function isVagueDescription(text) {
  return /^(?:n\/?a|unknown|unspecified|tbd|pending|routine|normal|transfer|other|none|no details provided|not sure|misc(?:ellaneous)?)[.! ]*$/i.test(text.trim());
}

function assessTransfer(transfer, options = {}) {
  const description = String(transfer.description || '').trim();
  const otherReason = String(transfer.otherReason || '').trim();
  const userDescription = [description, otherReason].filter(Boolean).join('\n');
  const purpose = transfer.purpose || 'Not specified (legacy transfer)';
  const strongIndicators = findSuspiciousIndicators(userDescription);
  const riskIndicators = [...strongIndicators];
  const documentationGaps = [];
  const authorizationStatus = transfer.authorizationStatus || 'not-specified';
  const authorizationMissing = authorizationStatus === 'missing' || statesAuthorizationMissing(userDescription);
  const cycleStrongIndicatorCount = options.cycleStrongIndicatorCount === undefined
    ? (options.cycleAssociated ? strongIndicators.length : 0)
    : options.cycleStrongIndicatorCount;

  if (!purpose || purpose === 'Not specified (legacy transfer)') {
    documentationGaps.push('Transfer purpose is not recorded');
  }
  if (!userDescription) {
    documentationGaps.push('Transfer description is missing');
  } else if (isVagueDescription(userDescription)) {
    documentationGaps.push('Transfer description does not explain the activity');
  }
  if (!transfer.transferDate) {
    documentationGaps.push('Transfer date is not recorded');
  }
  if (authorizationStatus === 'not-specified') {
    documentationGaps.push('Authorization status is not specified');
  }
  if (authorizationMissing) {
    riskIndicators.push('Authorization is marked missing or unverified');
  }
  if (purpose === 'Other' && /^(?:other|misc(?:ellaneous)?|unknown|n\/?a|none|not sure|unspecified|various)[.! ]*$/i.test(otherReason)) {
    documentationGaps.push('The explanation for Other is too unclear to establish the transfer purpose');
  }
  riskIndicators.push(...documentationGaps);

  const cycleAssociated = options.cycleAssociated === true;
  const critical = cycleAssociated && cycleStrongIndicatorCount >= 2;
  let riskClassification;
  let classificationReason;
  let recommendedAction;

  if (critical) {
    riskClassification = 'CRITICAL RISK';
    classificationReason = `This transfer is part of a detected cycle where descriptions across the cycle match ${cycleStrongIndicatorCount} distinct strong suspicious-activity rules. This is an automated alert, not verified fraud.`;
    recommendedAction = 'Escalate for human investigation; verify product identity, batch history, authorization, and chain-of-custody records.';
  } else if (strongIndicators.length > 0 || authorizationMissing) {
    riskClassification = 'HIGH RISK';
    classificationReason = strongIndicators.length > 0
      ? 'The description matches one or more contextual suspicious-activity rules. A rule match is a risk flag, not proof of fraud.'
      : 'The record marks authorization as missing or the description states that approval is absent. Confirm the applicable approval before proceeding.';
    recommendedAction = 'Review the flagged details and verify supporting documentation and authorization before taking action.';
  } else if (documentationGaps.length > 0 || authorizationStatus === 'not-specified') {
    riskClassification = 'MEDIUM RISK';
    classificationReason = documentationGaps.join('; ') + '.';
    recommendedAction = 'Request clear transfer details and complete the applicable purpose, date, and authorization documentation.';
  } else {
    riskClassification = 'LOW RISK';
    classificationReason = cycleAssociated
      ? 'The transfer is part of a detected circular path, but its purpose and documentation are clear and no strong suspicious indicators matched. A cycle alone is not evidence of wrongdoing.'
      : 'The transfer has a clear purpose and description, and no strong suspicious indicators or documentation gaps were found.';
    recommendedAction = 'Continue routine monitoring and retain the supporting transfer records.';
  }

  return {
    transferId: transfer.id,
    sourceOrganization: options.actorNames?.get(transfer.source ?? transfer.sourceId) || `Actor ${transfer.source ?? transfer.sourceId}`,
    destinationOrganization: options.actorNames?.get(transfer.destination ?? transfer.destinationId) || `Actor ${transfer.destination ?? transfer.destinationId}`,
    purpose,
    userDescription,
    otherReason,
    authorizationStatus,
    authorizationReference: transfer.authorizationReference || '',
    cycleAssociated,
    riskIndicators,
    strongIndicatorCount: strongIndicators.length,
    cycleStrongIndicatorCount,
    riskClassification,
    classificationReason,
    recommendedAction,
    automatedFlag: true,
    fraudVerified: false
  };
}

function analyzeTransfers(transfers, options = {}) {
  const cycleIndicatorSets = new Map();
  for (const cycle of options.cycleTransfers || []) {
    const cycleIndicators = new Set();
    for (const transfer of cycle) {
      const description = [transfer.description, transfer.otherReason].filter(Boolean).join('\n');
      for (const indicator of findSuspiciousIndicators(description)) cycleIndicators.add(indicator);
    }
    for (const transfer of cycle) {
      if (!cycleIndicatorSets.has(transfer.id)) cycleIndicatorSets.set(transfer.id, new Set());
      for (const indicator of cycleIndicators) cycleIndicatorSets.get(transfer.id).add(indicator);
    }
  }
  const actorNames = new Map((options.actors || []).map((actor) => [actor.id, actor.name]));
  return transfers.map((transfer) => assessTransfer(transfer, {
    actorNames,
    cycleAssociated: cycleIndicatorSets.has(transfer.id),
    cycleStrongIndicatorCount: cycleIndicatorSets.get(transfer.id)?.size || 0
  }));
}

module.exports = { analyzeTransfers, assessTransfer, findSuspiciousIndicators };
