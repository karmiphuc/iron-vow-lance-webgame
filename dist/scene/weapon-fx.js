/* Explicit Phase 2 visual profiles. Damage/AP/save behavior stays in game.js.
 * Runtime integration and per-profile action validation are still pending.
 */
(function(root){
'use strict';
const profiles={
 "rifle": {
  "archetype": "rifle",
  "beats": [
   0,
   0.085,
   0.17
  ],
  "asset": "rifle",
  "source": "Workshop"
 },
 "shotgun": {
  "archetype": "shotgun",
  "beats": [
   0
  ],
  "asset": "shotgun",
  "source": "Workshop",
  "pellets": 9
 },
 "missile": {
  "archetype": "missile",
  "beats": [
   0,
   0.07,
   0.14
  ],
  "asset": "missile",
  "source": "Workshop"
 },
 "rail": {
  "archetype": "rail",
  "beats": [
   0
  ],
  "asset": "rail",
  "source": "Workshop",
  "charge": 0.06,
  "beams": [
   0.5,
   0.14
  ]
 },
 "hailstorm": {
  "archetype": "rifle",
  "beats": [
   0,
   0.082,
   0.164,
   0.246,
   0.328,
   0.41000000000000003,
   0.492,
   0.5740000000000001,
   0.656,
   0.738,
   0.8200000000000001,
   0.902
  ],
  "asset": "hailstorm",
  "source": "Workshop"
 },
 "rampart": {
  "archetype": "shotgun",
  "beats": [
   0
  ],
  "asset": "rampart",
  "source": "Workshop",
  "pellets": 1
 },
 "breaker": {
  "archetype": "blade",
  "beats": [
   0
  ],
  "asset": "breaker",
  "source": "Workshop",
  "timeline": {
   "wind": 0.38,
   "contact": 0.46,
   "strike": 0.5,
   "hold": 0.72,
   "end": 1.1,
   "hitstop": 0.085,
   "maxLunge": 2.6
  },
  "style": "maul"
 },
 "cleaver": {
  "archetype": "blade",
  "beats": [
   0
  ],
  "asset": "cleaver",
  "source": "Workshop",
  "timeline": {
   "wind": 0.38,
   "contact": 0.46,
   "strike": 0.5,
   "hold": 0.72,
   "end": 1.1,
   "hitstop": 0.085,
   "maxLunge": 2.6
  },
  "style": "sweep"
 },
 "piledriver": {
  "archetype": "blade",
  "beats": [
   0
  ],
  "asset": "piledriver",
  "source": "Workshop",
  "timeline": {
   "wind": 0.38,
   "contact": 0.46,
   "strike": 0.5,
   "hold": 0.72,
   "end": 1.1,
   "hitstop": 0.085,
   "maxLunge": 2.6
  },
  "style": "thrust"
 },
 "blade": {
  "archetype": "blade",
  "beats": [
   0
  ],
  "asset": "blade",
  "source": "Workshop",
  "timeline": {
   "wind": 0.38,
   "contact": 0.46,
   "strike": 0.5,
   "hold": 0.72,
   "end": 1.1,
   "hitstop": 0.085,
   "maxLunge": 2.6
  },
  "style": "thrust"
 },
 "sidewinder": {
  "archetype": "rifle",
  "beats": [
   0,
   0.082,
   0.164,
   0.246,
   0.328,
   0.41000000000000003,
   0.492,
   0.5740000000000001,
   0.656,
   0.738,
   0.8200000000000001,
   0.902
  ],
  "asset": "sidewinder",
  "source": "Workshop"
 },
 "trident": {
  "archetype": "rifle",
  "beats": [
   0,
   0.105,
   0.21,
   0.315,
   0.42,
   0.525,
   0.63,
   0.735
  ],
  "asset": "trident",
  "source": "Workshop"
 },
 "forge": {
  "archetype": "shotgun",
  "beats": [
   0
  ],
  "asset": "forge",
  "source": "Workshop",
  "pellets": 12
 },
 "ember": {
  "archetype": "rail",
  "beats": [
   0
  ],
  "asset": "ember",
  "source": "Workshop",
  "charge": 0.06,
  "beams": [
   0.5,
   0.14
  ]
 },
 "watchman": {
  "archetype": "shotgun",
  "beats": [
   0
  ],
  "asset": "watchman",
  "source": "Workshop",
  "pellets": 1
 },
 "falcon": {
  "archetype": "shotgun",
  "beats": [
   0
  ],
  "asset": "falcon",
  "source": "Workshop",
  "pellets": 1
 },
 "cerberus": {
  "archetype": "missile",
  "beats": [
   0,
   0.17
  ],
  "asset": "cerberus",
  "source": "Workshop"
 },
 "obelisk": {
  "archetype": "rail",
  "beats": [
   0
  ],
  "asset": "obelisk",
  "source": "Workshop",
  "charge": 0.06,
  "beams": [
   0.5,
   0.14
  ]
 },
 "rivet": {
  "archetype": "rifle",
  "beats": [
   0,
   0.072,
   0.144,
   0.21599999999999997,
   0.288,
   0.36,
   0.43199999999999994,
   0.504,
   0.576,
   0.6479999999999999,
   0.72,
   0.7919999999999999
  ],
  "asset": "rivet",
  "source": "Workshop"
 },
 "parallax": {
  "archetype": "rail",
  "beats": [
   0
  ],
  "asset": "parallax",
  "source": "Workshop",
  "charge": 0.06,
  "beams": [
   0.5,
   0.14
  ]
 },
 "hatchet": {
  "archetype": "blade",
  "beats": [
   0
  ],
  "asset": "hatchet",
  "source": "Workshop",
  "timeline": {
   "wind": 0.38,
   "contact": 0.46,
   "strike": 0.5,
   "hold": 0.72,
   "end": 1.1,
   "hitstop": 0.085,
   "maxLunge": 2.6
  },
  "style": "sweep"
 },
 "pike": {
  "archetype": "blade",
  "beats": [
   0
  ],
  "asset": "pike",
  "source": "Workshop",
  "timeline": {
   "wind": 0.38,
   "contact": 0.46,
   "strike": 0.5,
   "hold": 0.72,
   "end": 1.1,
   "hitstop": 0.085,
   "maxLunge": 2.6
  },
  "style": "thrust"
 },
 "tonfa": {
  "archetype": "blade",
  "beats": [
   0
  ],
  "asset": "tonfa",
  "source": "Workshop",
  "timeline": {
   "wind": 0.38,
   "contact": 0.46,
   "strike": 0.5,
   "hold": 0.72,
   "end": 1.1,
   "hitstop": 0.085,
   "maxLunge": 2.6
  },
  "style": "sweep"
 },
 "anchor-hammer": {
  "archetype": "blade",
  "beats": [
   0
  ],
  "asset": "anchor-hammer",
  "source": "Workshop",
  "timeline": {
   "wind": 0.38,
   "contact": 0.46,
   "strike": 0.5,
   "hold": 0.72,
   "end": 1.1,
   "hitstop": 0.085,
   "maxLunge": 2.6
  },
  "style": "maul"
 },
 "morrow": {
  "archetype": "shotgun",
  "beats": [
   0,
   0.298667
  ],
  "asset": "rampart",
  "source": "built-in",
  "pellets": 1,
  "barrels": 2
 },
 "locust": {
  "archetype": "missile",
  "beats": [
   0,
   0.298667
  ],
  "asset": "missile",
  "source": "built-in",
  "socket": "shoulderMuzzle",
  "launchers": 2
 },
 "breach-gauntlet": {
  "archetype": "blade",
  "beats": [
   0
  ],
  "asset": null,
  "source": "built-in",
  "timeline": {
   "wind": 0.38,
   "contact": 0.46,
   "strike": 0.5,
   "hold": 0.72,
   "end": 1.1,
   "hitstop": 0.085,
   "maxLunge": 2.6
  },
  "style": "bash",
  "socket": "left"
 },
 "pulse-bash": {
  "archetype": "blade",
  "beats": [
   0
  ],
  "asset": null,
  "source": "built-in",
  "timeline": {
   "wind": 0.38,
   "contact": 0.46,
   "strike": 0.5,
   "hold": 0.72,
   "end": 1.1,
   "hitstop": 0.085,
   "maxLunge": 2.6
  },
  "style": "bash",
  "socket": "left"
 },
 "aegis-cleave": {
  "archetype": "blade",
  "beats": [
   0
  ],
  "asset": "cleaver",
  "source": "built-in",
  "timeline": {
   "wind": 0.38,
   "contact": 0.46,
   "strike": 0.5,
   "hold": 0.72,
   "end": 1.1,
   "hitstop": 0.085,
   "maxLunge": 2.6
  },
  "style": "sweep",
  "socket": "bladeCore"
 },
 "aegis-bash": {
  "archetype": "blade",
  "beats": [
   0
  ],
  "asset": null,
  "source": "built-in",
  "timeline": {
   "wind": 0.38,
   "contact": 0.46,
   "strike": 0.5,
   "hold": 0.72,
   "end": 1.1,
   "hitstop": 0.085,
   "maxLunge": 2.6
  },
  "style": "bash",
  "socket": "shieldCore"
 },
 "needle-carbine": {
  "archetype": "rifle",
  "beats": [
   0,
   0.105,
   0.21,
   0.315,
   0.42,
   0.525,
   0.63,
   0.735
  ],
  "asset": "rifle",
  "source": "built-in"
 },
 "flechette-scattergun": {
  "archetype": "shotgun",
  "beats": [
   0
  ],
  "asset": "shotgun",
  "source": "built-in",
  "pellets": 12
 },
 "signal-knife": {
  "archetype": "blade",
  "beats": [
   0
  ],
  "asset": "cleaver",
  "source": "built-in",
  "timeline": {
   "wind": 0.38,
   "contact": 0.46,
   "strike": 0.5,
   "hold": 0.72,
   "end": 1.1,
   "hitstop": 0.085,
   "maxLunge": 2.6
  },
  "style": "knife"
 },
 "vesper-shoulder": {
  "archetype": "missile",
  "beats": [
   0
  ],
  "asset": "missile",
  "source": "shoulder",
  "socket": "shoulderMuzzle"
 },
 "free-hand": {
  "archetype": "blade",
  "beats": [
   0
  ],
  "asset": null,
  "socket": "left",
  "style": "bash",
  "timeline": {
   "wind": 0.38,
   "contact": 0.46,
   "strike": 0.5,
   "hold": 0.72,
   "end": 1.1,
   "hitstop": 0.085,
   "maxLunge": 2.6
  },
  "source": "counter"
 },
 "behemoth-mortar": {
  "archetype": "missile",
  "beats": [
   0
  ],
  "asset": null,
  "socket": "mortarMuzzle",
  "source": "body skill"
 }
};
root.IronVowWeaponFX={profiles,
 get(id){const profile=profiles[id];if(!profile)throw Error('Missing 3D weapon profile: '+id);return profile;},
 assertCatalog(weapons){for(const weapon of weapons)if(!profiles[weapon.id])throw Error('Unmapped weapon '+weapon.id);}
};
})(window);
