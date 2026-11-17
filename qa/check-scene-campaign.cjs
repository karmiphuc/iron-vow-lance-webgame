/* Focused coverage, source-keying, resume and summary fixtures. */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  assertScratchOutsideRepository,
  seedPath,
  scenarioPlan,
  immobileLanceNeedsExtraction,
  scenarioFingerprint,
  readCompleted,
  writeCompleted,
  coverage,
  summarize,
  writeCompactSummary,
} = require('./scene-campaign.cjs');

// A crippled lance must use the normal withdrawal flow instead of ending turns forever.
const trapped = [
  { id: 'ally0', team: 'ally', alive: true, hp: { legs: 0 } },
  { id: 'enemy0', team: 'enemy', alive: true, hp: { legs: 100 } },
];
assert.equal(immobileLanceNeedsExtraction(trapped, { ally0: { attacks: [] } }), true);
assert.equal(immobileLanceNeedsExtraction(trapped, { ally0: { attacks: [{ target: 'enemy0' }] } }), false);
assert.equal(immobileLanceNeedsExtraction([{ ...trapped[0], hp: { legs: 1 } }, trapped[1]], { ally0: { attacks: [] } }), false);
assert.equal(immobileLanceNeedsExtraction([trapped[1]], {}), false);
assert.equal(immobileLanceNeedsExtraction([trapped[0]], { ally0: { attacks: [] } }), false);

const scratch = path.join(os.tmpdir(), `iron-vow-scene-campaign-test-${process.pid}`);
const liveFrames = [
  { frame: 0, name: 'WARDEN', playerHull: true, generalConfigurable: true },
  { frame: 5, name: 'VALKYRIE', playerHull: true, generalConfigurable: true },
  { frame: 6, name: 'ONI', playerHull: true, generalConfigurable: true },
  { frame: 7, name: 'BEHEMOTH', playerHull: true, generalConfigurable: true },
  { frame: 8, name: 'AEGIS', playerHull: true, generalConfigurable: true },
  { frame: 9, name: 'SHRIKE', playerHull: true, generalConfigurable: true },
  { frame: 10, name: 'BASTION', playerHull: true, generalConfigurable: true },
  { frame: 12, name: 'CITADEL', playerHull: true, fixedWeapons: true, weapon: 'missile' },
  { frame: 14, name: 'LINE INFANTRY', playerHull: false, enemyOnly: true, fixedWeapons: true, weapon: 'rifle' },
];
const workshopWeapons = [
  'rifle', 'shotgun', 'missile', 'rail', 'hailstorm', 'rampart', 'breaker', 'cleaver', 'piledriver', 'blade',
  'sidewinder', 'trident', 'forge', 'ember', 'watchman', 'falcon', 'cerberus', 'obelisk', 'rivet', 'parallax',
  'hatchet', 'pike', 'w22', 'w23',
].map(id => ({ id, slot: ['breaker', 'cleaver', 'piledriver', 'blade', 'hatchet', 'pike'].includes(id) ? 'melee' : 'primary' }));
const shields = [{ id: 'shield-entry', slot: 'shield' }];
for (const frame of liveFrames) if (frame.generalConfigurable) frame.configurableItems = [...workshopWeapons, ...shields].map(item => item.id);
const plans = scenarioPlan({ liveFrames, workshopWeapons, shieldItems: shields });
assert.equal(plans.length, 30);
assert.deepEqual(plans[22].frames, [6, 7, 8], 'Seed 4264 keeps its original chassis fixture');
assert.deepEqual(plans[22].weapons, ['rivet', 'parallax', 'hatchet'], 'Seed 4264 keeps its original weapon fixture');
assert.deepEqual(new Set(plans.flatMap(plan => plan.frames)), new Set(liveFrames.filter(frame => frame.playerHull).map(frame => frame.frame)), 'Only player-eligible live chassis are assigned');
assert.ok(plans.every(plan => !plan.frames.includes(14)), 'Enemy-only chassis are not assigned as ally loadouts');
assert.deepEqual(new Set(plans.flatMap(plan => plan.workshopAssignedWeapons)), new Set(workshopWeapons.map(item => item.id)), 'All catalogued Workshop weapons are assigned');
assert.ok(plans.some(plan => plan.loadouts.some(loadout => loadout.id === 'shield-entry' && loadout.slot === 'shield')), 'Shield entries use the shield slot');
assert.deepEqual(plans.slice(8, 16).map(plan => plan.seed), Array.from({ length: 8 }, (_, index) => 4250 + index), 'Disjoint shards use the same global plans');

const expandedWeapons = [...workshopWeapons, ...Array.from({ length: 10 }, (_, index) => ({ id: `future-${index}`, slot: 'primary' }))];
const expandedFrames = Array.from({ length: 20 }, (_, frame) => ({
  frame,
  name: `FRAME-${frame}`,
  playerHull: true,
  generalConfigurable: frame !== 12 && frame !== 18,
  configurableItems: frame === 12 || frame === 18 ? [] : [...expandedWeapons, ...shields].map(item => item.id),
  ...(frame === 12 || frame === 18 ? { fixedWeapons: true, weapon: 'missile' } : {}),
}));
expandedFrames.push({ frame: 20, name: 'FUTURE HOSTILE', playerHull: false, enemyOnly: true, fixedWeapons: true, weapon: 'future-rifle', configurableItems: [] });
const expandedPlans = scenarioPlan({ liveFrames: expandedFrames, workshopWeapons: expandedWeapons, shieldItems: shields });
assert.deepEqual(new Set(expandedPlans.flatMap(plan => plan.frames)), new Set(expandedFrames.filter(frame => frame.playerHull).map(frame => frame.frame)), 'Expanded player-eligible frame catalogs are fully rotated');
assert.ok(expandedPlans.every(plan => !plan.frames.includes(20)), 'Expanded enemy-only chassis remain outside ally assignments');
assert.deepEqual(new Set(expandedPlans.flatMap(plan => plan.workshopAssignedWeapons)), new Set(expandedWeapons.map(item => item.id)), 'Expanded runtime weapon catalogs are fully rotated');
assert.throws(() => scenarioPlan({ liveFrames: Array.from({ length: 91 }, (_, frame) => ({ frame, name: `FRAME-${frame}`, playerHull: true })), workshopWeapons }), /cannot cover 91 player-eligible live chassis/);

assert.equal(seedPath(scratch, 'a'.repeat(40), 4242), path.join(scratch, 'a'.repeat(40), 'seed-4242.json'));
assertScratchOutsideRepository('/repo', scratch);
assert.throws(() => assertScratchOutsideRepository('/repo', '/repo/tmp'), /outside the repository/);

const source = { commit: 'a'.repeat(40), distTree: 'b'.repeat(40), checkerSha256: 'c'.repeat(64), campaignSha256: 'd'.repeat(64) };
const fingerprint = scenarioFingerprint({ source, scenario: plans[0], liveFrames, workshopWeapons, combatGate: true, formal: true, cpuRaster: true, skipProbes: false, tileOverride: null });
const battle = {
  seed: 4242, frames: [0, 5, 6, 7, 8, 9, 10, 12, 14],
  workshopAssignedWeapons: [...workshopWeapons], weapons: ['rivet', 'parallax'],
  observedWeaponIds: workshopWeapons.map(item => item.id), observedShields: ['shield-entry'],
  actualModels: liveFrames.map(frame => ({ id: `unit-${frame.frame}`, frame: frame.frame, live: true, registered: true, hasEntry: true, armed: true, object: true })),
  anomalies: [], commandErrors: [], ticks: 1234, result: { win: true },
};
writeCompleted(scratch, { commit: source.commit, seed: battle.seed, fingerprint, battle });
assert.deepEqual(readCompleted(scratch, { commit: source.commit, seed: battle.seed, fingerprint }).battle, battle, 'Completed seed is reusable');
assert.equal(readCompleted(scratch, { commit: source.commit, seed: battle.seed, fingerprint: 'different' }), null, 'A changed source/configuration cannot reuse an old seed');

const report = {
  source, combatGate: true, formal: true, phase3FinalReady: true, phase3ExpectedFrames: liveFrames.filter(frame => frame.frame !== 12).map(({ frame, name }) => ({ frame, name })), cpuRaster: true, clockHz: 30, status: 'passed', errors: [], faultProbes: [{ type: 'nan' }], weaponCatalog: { shields },
  battles: plans.map(plan => ({ ...battle, seed: plan.seed, frames: [...plan.frames, 14], workshopAssignedWeapons: plan.workshopAssignedWeapons, shieldAssigned: plan.shieldAssigned, assignedWeapons: plan.weapons })),
};
const measured = coverage(report.battles, liveFrames, workshopWeapons, shields);
assert.deepEqual(measured.chassis.missing, []);
assert.deepEqual(measured.weapons.missingAssigned, []);
assert.deepEqual(measured.weapons.missingShields, []);
const summary = summarize(report, { count: 30, startIndex: 0, liveFrames, workshopWeapons, command: 'node qa/check-scene.cjs', status: 'passed' });
assert.equal(summary.status, 'passed');
assert.equal(summary.counts.completedBattles, 30);
assert.equal(summary.seeds.completed.length, 30);
writeCompactSummary(path.join(scratch, 'summary.json'), summary);
assert.ok(fs.statSync(path.join(scratch, 'summary.json')).size < 200 * 1024);
const missingSnapshotSummary = summarize({ ...report, battles: report.battles.map(item => ({ ...item, frames: item.frames.filter(frame => frame !== 14) })) }, { count: 30, startIndex: 0, liveFrames, workshopWeapons, command: 'node qa/check-scene.cjs', status: 'passed' });
assert.equal(missingSnapshotSummary.status, 'failed', 'A missing enemy-only snapshot frame fails full coverage');
assert.ok(missingSnapshotSummary.failures.some(failure => failure.type === 'missingPhase3Snapshots'));
const missingModelSummary = summarize({ ...report, battles: report.battles.map(item => ({ ...item, actualModels: item.actualModels.filter(model => model.frame !== 14) })) }, { count: 30, startIndex: 0, liveFrames, workshopWeapons, command: 'node qa/check-scene.cjs', status: 'passed' });
assert.equal(missingModelSummary.status, 'failed', 'A missing live scene model fails full coverage');
assert.ok(missingModelSummary.failures.some(failure => failure.type === 'missingPhase3Models'));
const quickSummary = summarize({ ...report, battles: [report.battles[0]] }, { count: 1, startIndex: 0, liveFrames, workshopWeapons, command: 'node qa/check-scene.cjs', status: 'passed' });
assert.equal(quickSummary.status, 'passed', 'A passed quick smoke is not failed for intentionally unassigned campaign coverage');
assert.equal(quickSummary.counts.failures, 0);

// Citadel can appear as an additional live frame while every required Phase 3 frame remains mandatory.
const { spawnSync } = require('node:child_process');
const faultTypes = ['nan', 'footGround', 'footSlide', 'bounds', 'overlap', 'stuck', 'ikReach', 'aimOff', 'weaponMount', 'muzzleFar', 'noDamage', 'deadPartDamage', 'hpRange', 'wreckActs', 'partVisual', 'popSwap'];
const shardFiles = [0, 15].map(start => {
  const file = path.join(scratch, `shard-${start}.json`);
  fs.writeFileSync(file, JSON.stringify({
    ...report, source: { ...source, distDirty: false }, liveFrames,
    skipProbes: false, rasterPair: false, tileOverride: null,
    weaponCatalog: { workshop: workshopWeapons.map(item => item.id), shields },
    faultProbes: faultTypes.map(type => ({ type })),
    battles: report.battles.slice(start, start + 15).map(item => ({
      ...item, maximumLaunchAimError: 0, combatCounts: {}, rasterOmitted: 0,
      aimClearance: { calls: 1, infeasibleCount: 0, minimumTravel: 1, minimumDiscriminant: 1 },
    })),
  }));
  return file;
});
const combine = () => spawnSync(process.execPath, [path.join(__dirname, 'combine-scene.cjs'), path.join(scratch, 'combined.json'), ...shardFiles], { encoding: 'utf8' });
const optionalFrame = combine();
assert.equal(optionalFrame.status, 0, optionalFrame.stderr);
for (const file of shardFiles) {
  const shard = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const item of shard.battles) item.frames = item.frames.filter(frame => frame !== 14);
  fs.writeFileSync(file, JSON.stringify(shard));
}
const missingRequired = combine();
assert.notEqual(missingRequired.status, 0, 'An optional frame cannot replace a required Phase 3 frame');
assert.match(missingRequired.stderr, /Every Phase 3 chassis/);

console.log('PASS scene campaign planning, all-catalog coverage, resume keying and compact summary fixtures');
