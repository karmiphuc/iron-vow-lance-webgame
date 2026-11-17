/* Small, source-bound checkpoint and summary helpers for the real-scene campaign. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DEFAULT_SEED = 4242;
const DEFAULT_BATTLES = 30;
const REGRESSION_INDEX = 22;
const REGRESSION_FRAMES = [6, 7, 8];
const REGRESSION_WEAPONS = ['rivet', 'parallax', 'hatchet'];
const SCHEMA = 1;

function sha256(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
}

function seedPath(directory, commit, seed) {
  if (!/^[0-9a-f]{40}$/i.test(commit)) throw new Error('Campaign commit must be a full Git SHA');
  if (!Number.isInteger(seed) || seed < 0) throw new Error('Campaign seed must be a non-negative integer');
  return path.join(path.resolve(directory), commit.toLowerCase(), `seed-${seed}.json`);
}

function inside(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function assertScratchOutsideRepository(repositoryRoot, scratchDirectory) {
  if (inside(repositoryRoot, scratchDirectory)) throw new Error('Campaign scratch storage must be outside the repository');
  return path.resolve(scratchDirectory);
}

function scenarioPlan({ liveFrames, workshopWeapons, shieldItems = [], startIndex = 0, count = DEFAULT_BATTLES, totalBattles = DEFAULT_BATTLES }) {
  if (!Array.isArray(liveFrames) || !liveFrames.length) throw new Error('The runtime reported no live chassis for campaign coverage');
  if (!Array.isArray(workshopWeapons)) throw new Error('The runtime weapon catalog is required');
  if (!Number.isInteger(startIndex) || startIndex < 0 || !Number.isInteger(count) || count < 1) throw new Error('Invalid campaign index or battle count');

  const frameById = new Map(liveFrames.map(frame => [frame.frame, frame]));
  const normalizeItem = item => typeof item === 'string' ? { id: item, slot: 'primary' } : { id: item.id, slot: item.slot || (item.melee ? 'melee' : 'primary') };
  const weaponItems = workshopWeapons.map(normalizeItem).filter(item => item.id);
  const allItems = [...new Map([...weaponItems, ...shieldItems.map(item => ({ ...normalizeItem(item), slot: 'shield' }))].map(item => [item.id, item])).values()];
  const weaponIds = [...new Set(weaponItems.filter(item => item.slot !== 'shield').map(item => item.id))];
  const shieldIds = [...new Set(allItems.filter(item => item.slot === 'shield').map(item => item.id))];
  const assignableFrames = liveFrames.filter(frame => frame.playerHull);
  if (!assignableFrames.length) throw new Error('The runtime has no live player-eligible frames for campaign assignments');
  const endIndex = Math.max(totalBattles, startIndex + count);
  if (startIndex === 0 && count === totalBattles && assignableFrames.length > count * 3) {
    throw new Error(`${count}-seed campaign has ${count * 3} ally slots and cannot cover ${assignableFrames.length} player-eligible live chassis`);
  }
  let workshopCursor = 0, specialCursor = 0;
  const plans = [];

  for (let index = 0; index < endIndex; index++) {
    const frames = index === REGRESSION_INDEX && REGRESSION_FRAMES.every(frame => frameById.get(frame)?.playerHull)
      ? [...REGRESSION_FRAMES]
      : Array.from({ length: 3 }, (_, slot) => assignableFrames[(index * 3 + slot) % assignableFrames.length].frame);
    const regressionWeaponsAvailable = index === REGRESSION_INDEX && REGRESSION_WEAPONS.every(id => weaponIds.includes(id)) && frames.every(frameId => frameById.get(frameId)?.generalConfigurable);
    const loadouts = frames.map((frameId, slot) => {
      const frame = frameById.get(frameId);
      const factory = () => ({ id: frame?.weapon || null, slot: 'factory', melee: frame?.factoryMelee || null });
      if (!frame?.playerHull || !allItems.length || !frame.configurableItems?.length) return factory();
      if (regressionWeaponsAvailable) {
        const item = weaponItems.find(candidate => candidate.id === REGRESSION_WEAPONS[slot]);
        workshopCursor++;
        return { ...item, id: REGRESSION_WEAPONS[slot] };
      }
      if (frame.generalConfigurable) {
        const selected = allItems[workshopCursor % allItems.length];
        if (!frame.configurableItems.includes(selected.id)) throw new Error(`Campaign selected illegal ${selected.slot} loadout ${selected.id} for ${frame.name}`);
        workshopCursor++;
        return selected;
      }
      const legal = allItems.filter(item => frame.configurableItems.includes(item.id));
      if (!legal.length) return factory();
      const selected = legal[specialCursor % legal.length];
      specialCursor++;
      return selected;
    });
    plans.push({
      index,
      seed: DEFAULT_SEED + index,
      frames,
      contract: index % 4,
      loadouts,
      weapons: loadouts.map(loadout => loadout.id),
      workshopAssignedWeapons: loadouts.filter(loadout => ['primary', 'melee'].includes(loadout.slot) && weaponIds.includes(loadout.id)).map(loadout => loadout.id),
      shieldAssigned: loadouts.filter(loadout => loadout.slot === 'shield').map(loadout => loadout.id),
    });
  }

  if (startIndex === 0 && count === totalBattles) {
    const assignedWeapons = [...new Set(plans.flatMap(plan => plan.workshopAssignedWeapons))];
    const assignedShields = [...new Set(plans.flatMap(plan => plan.shieldAssigned))];
    const assignableSlots = plans.reduce((total, plan) => total + plan.loadouts.filter(loadout => ['primary', 'melee'].includes(loadout.slot)).length, 0);
    const assignableShields = plans.reduce((total, plan) => total + plan.loadouts.filter(loadout => loadout.slot === 'shield').length, 0);
    if (weaponIds.length > assignableSlots || weaponIds.some(id => !assignedWeapons.includes(id))) throw new Error(`${count}-seed campaign cannot assign every one of its ${weaponIds.length} Workshop weapons across ${assignableSlots} legal slots`);
    if (shieldIds.length > assignableShields || shieldIds.some(id => !assignedShields.includes(id))) throw new Error(`${count}-seed campaign cannot assign every one of its ${shieldIds.length} shields across ${assignableShields} legal slots`);
  }
  return plans.slice(startIndex, startIndex + count);
}

function scenarioFingerprint({ source, scenario, liveFrames, workshopWeapons, combatGate, formal, phase3FinalReady, cpuRaster, skipProbes, tileOverride }) {
  return sha256({
    schema: SCHEMA,
    source: {
      commit: source.commit,
      distTree: source.distTree,
      url: source.url,
      checkerSha256: source.checkerSha256,
      campaignSha256: source.campaignSha256,
    },
    scenario,
    liveFrames,
    workshopWeapons,
    combatGate: Boolean(combatGate),
    formal: Boolean(formal),
    phase3FinalReady: Boolean(phase3FinalReady),
    cpuRaster: Boolean(cpuRaster),
    skipProbes: Boolean(skipProbes),
    tileOverride: tileOverride ?? null,
  });
}

function readCompleted(directory, { commit, seed, fingerprint }) {
  try {
    const record = JSON.parse(fs.readFileSync(seedPath(directory, commit, seed), 'utf8'));
    const battle = record.battle;
    if (record.schema !== SCHEMA || record.status !== 'passed' || record.commit !== commit || record.seed !== seed || record.fingerprint !== fingerprint ||
        battle?.seed !== seed || !(battle.ticks > 0) || battle.anomalies?.length || battle.commandErrors?.length) return null;
    return record;
  } catch {
    return null;
  }
}

function writeCompleted(directory, { commit, seed, fingerprint, battle }) {
  const file = seedPath(directory, commit, seed);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const record = { schema: SCHEMA, status: 'passed', commit, seed, fingerprint, battle };
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(record) + '\n');
  fs.renameSync(temporary, file);
  return file;
}

function compactBattle(battle) {
  const {
    seed, frames, assignedWeapons, workshopAssignedWeapons, shieldAssigned, weapons, observedWeaponIds, observedShields, actualModels,
    ticks, anomalies, commandErrors, circleCandidates, combatCounts, rasterOmitted, rasterContexts, maximumLaunchAimError, aimClearance,
    result, terrainSeed, wallMilliseconds,
  } = battle;
  return {
    seed, frames, assignedWeapons, workshopAssignedWeapons, shieldAssigned, weapons, observedWeaponIds, observedShields, actualModels,
    ticks, anomalies, commandErrors, circleCandidates, combatCounts, rasterOmitted, rasterContexts, maximumLaunchAimError, aimClearance,
    result, terrainSeed, wallMilliseconds,
    ...(aimClearance ? { aimClearance: { ...aimClearance, samples: aimClearance.samples ? [...aimClearance.samples] : undefined } } : {}),
  };
}

function coverage(battles, liveFrames, workshopWeapons, shields = []) {
  const frameIds = [...new Set(battles.flatMap(battle => battle.frames || []))].sort((a, b) => a - b);
  const modelFrameIds = [...new Set(battles.flatMap(battle => (battle.actualModels || []).filter(model => model.live && model.hasEntry && model.armed && model.object).map(model => model.frame)))].sort((a, b) => a - b);
  const expectedFrames = liveFrames.map(frame => frame.frame).sort((a, b) => a - b);
  const assigned = [...new Set(battles.flatMap(battle => battle.workshopAssignedWeapons || []))].sort();
  const commanded = [...new Set(battles.flatMap(battle => battle.weapons || []))].sort();
  const observed = [...new Set(battles.flatMap(battle => battle.observedWeaponIds || []))].sort();
  const assignedShields = [...new Set(battles.flatMap(battle => battle.shieldAssigned || []))].sort();
  const observedShields = [...new Set(battles.flatMap(battle => battle.observedShields || []))].sort();
  const expectedWeapons = [...new Set(workshopWeapons.map(item => typeof item === 'string' ? item : item.id))].filter(Boolean).sort();
  const expectedShields = [...new Set(shields.map(item => typeof item === 'string' ? item : item.id))].filter(Boolean).sort();
  return {
    chassis: {
      expected: liveFrames.map(({ frame, name }) => ({ frame, name })),
      seen: frameIds,
      modelSeen: modelFrameIds,
      missing: expectedFrames.filter(frame => !frameIds.includes(frame)),
      missingModels: expectedFrames.filter(frame => !modelFrameIds.includes(frame)),
    },
    weapons: {
      expected: expectedWeapons,
      assigned,
      commanded,
      observed,
      missingAssigned: expectedWeapons.filter(id => !assigned.includes(id)),
      missingObserved: expectedWeapons.filter(id => !observed.includes(id)),
      expectedShields,
      assignedShields,
      observedShields,
      missingShields: expectedShields.filter(id => !assignedShields.includes(id)),
      missingObservedShields: expectedShields.filter(id => !observedShields.includes(id)),
    },
  };
}

function summarize(report, { count, startIndex, liveFrames, workshopWeapons, command, status }) {
  const battles = report.battles || [];
  const campaignCoverage = coverage(battles, liveFrames, workshopWeapons, report.weaponCatalog?.shields || []);
  const failures = [];
  const requiresFullCoverage = count === DEFAULT_BATTLES && startIndex === 0 && Boolean(report.formal) && Boolean(report.combatGate);
  for (const battle of battles) {
    for (const issue of battle.anomalies || []) failures.push({ seed: battle.seed, type: issue.type, unit: issue.unit, frame: issue.frame });
    for (const error of battle.commandErrors || []) failures.push({ seed: battle.seed, type: 'commandError', message: String(error).slice(0, 300) });
  }
  for (const error of report.errors || []) failures.push({ type: 'browserError', message: String(error).slice(0, 300) });
  if (report.runError) failures.push({ type: 'runError', message: String(report.runError).slice(0, 300) });
  const completed = status === 'passed' || status === 'failed' || battles.length === count;
  if (completed && requiresFullCoverage && campaignCoverage.chassis.missing.length) failures.push({ type: 'missingChassis', frames: campaignCoverage.chassis.missing });
  if (completed && requiresFullCoverage && campaignCoverage.chassis.missingModels.length) failures.push({ type: 'missingSceneModels', frames: campaignCoverage.chassis.missingModels });
  const phase3MissingObserved = (report.phase3ExpectedFrames || []).filter(expected => !campaignCoverage.chassis.modelSeen.includes(expected.frame)).map(({ frame }) => frame);
  const phase3MissingSnapshots = (report.phase3ExpectedFrames || []).filter(expected => !campaignCoverage.chassis.seen.includes(expected.frame)).map(({ frame }) => frame);
  if (completed && requiresFullCoverage && phase3MissingObserved.length) failures.push({ type: 'missingPhase3Models', frames: phase3MissingObserved });
  if (completed && requiresFullCoverage && phase3MissingSnapshots.length) failures.push({ type: 'missingPhase3Snapshots', frames: phase3MissingSnapshots });
  if (completed && requiresFullCoverage && campaignCoverage.weapons.missingAssigned.length) failures.push({ type: 'missingWeapons', weapons: campaignCoverage.weapons.missingAssigned });
  if (completed && requiresFullCoverage && campaignCoverage.weapons.missingObserved.length) failures.push({ type: 'missingObservedWeapons', weapons: campaignCoverage.weapons.missingObserved });
  if (completed && requiresFullCoverage && campaignCoverage.weapons.missingShields.length) failures.push({ type: 'missingShields', shields: campaignCoverage.weapons.missingShields });
  if (completed && requiresFullCoverage && campaignCoverage.weapons.missingObservedShields.length) failures.push({ type: 'missingObservedShields', shields: campaignCoverage.weapons.missingObservedShields });
  if (report.incompleteBattle) failures.push({ type: 'incompleteBattle', seed: report.incompleteBattle.seed });

  const seeds = battles.map(battle => battle.seed).sort((a, b) => a - b);
  const expectedSeeds = Array.from({ length: count }, (_, index) => DEFAULT_SEED + startIndex + index);
  const complete = status === 'failed' ? 'failed' : status === 'passed' ? failures.length ? 'failed' : 'passed' : battles.length === count && failures.length === 0 && report.status === 'passed' ? 'passed' : 'running';
  const compact = {
    schema: 1,
    status: complete,
    source: report.source,
    command,
    commands: Array.isArray(command) ? command : [command],
    configuration: {
      startIndex,
      battleCount: count,
      combatGate: Boolean(report.combatGate),
      formal: Boolean(report.formal),
      cpuRaster: Boolean(report.cpuRaster),
      clockHz: report.clockHz,
    },
    counts: {
      expectedBattles: count,
      completedBattles: battles.length,
      actualTicks: battles.reduce((total, battle) => total + (battle.ticks || 0), 0),
      anomalies: battles.reduce((total, battle) => total + (battle.anomalies || []).length, 0),
      commandErrors: battles.reduce((total, battle) => total + (battle.commandErrors || []).length, 0),
      browserErrors: (report.errors || []).length,
      faultControls: (report.faultProbes || []).length,
      failures: failures.length,
    },
    seeds: { expected: expectedSeeds, completed: seeds, missing: expectedSeeds.filter(seed => !seeds.includes(seed)) },
    coverage: campaignCoverage,
    runtimeChassis: {
      catalog: (report.frameCatalog || []).map(({ frame, name, live }) => ({ frame, name, live })),
      phase3Expected: report.phase3ExpectedFrames || [],
      phase3MissingRuntime: (report.phase3ExpectedFrames || []).filter(expected => !report.liveFrames?.some(frame => frame.frame === expected.frame)),
      phase3MissingObserved,
      phase3MissingSnapshots,
      notLive: (report.frameCatalog || []).filter(frame => !frame.live).map(({ frame, name }) => ({ frame, name })),
    },
    lionTrial: report.lionTrial || {
      finalReady: Boolean(report.phase3FinalReady),
      requiredForPhase3: true,
      includedInSeededFrames: false,
      checker: ['qa/check-lion-trial.cjs', 'qa/browser/lion-trial.cjs'],
    },
    faultControls: (report.faultProbes || []).map(probe => probe.type),
    failures: failures.slice(0, 100),
    failureCount: failures.length,
    battles: battles.map(battle => {
      const item = compactBattle(battle);
      delete item.anomalies;
      delete item.commandErrors;
      delete item.aimClearance?.samples;
      return { ...item, anomalyCount: (battle.anomalies || []).length, commandErrorCount: (battle.commandErrors || []).length };
    }),
  };
  return compact;
}

function writeCompactSummary(output, summary) {
  const json = JSON.stringify(summary, null, 2) + '\n';
  if (Buffer.byteLength(json) > 200 * 1024) throw new Error('Campaign summary exceeds the 200 KB evidence limit');
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  const temporary = `${path.resolve(output)}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, json);
  fs.renameSync(temporary, path.resolve(output));
}

module.exports = {
  DEFAULT_SEED,
  DEFAULT_BATTLES,
  REGRESSION_INDEX,
  REGRESSION_FRAMES,
  REGRESSION_WEAPONS,
  assertScratchOutsideRepository,
  seedPath,
  scenarioPlan,
  scenarioFingerprint,
  readCompleted,
  writeCompleted,
  compactBattle,
  coverage,
  summarize,
  writeCompactSummary,
};
