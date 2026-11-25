# Saker SK–38

Parapet at Ridge Station fields a mobile marksman recoverable intact after surrender. Saker wears dark brown and olive block camouflage. Its right-wrist Merlin 38 has a 3.492 m mount-to-muzzle reach and an 18% wider and taller cross-section. It fires from a three-point stance. The right foot leads, the left knee pad comes down, and the left shin and instep extend behind the mech. The open left hand takes the third contact. The waist straightens and the visor stays downrange while the rifle and shoulder carriage recoil.

The rooftop study follows the running arrest and deployment around 13–19 seconds, then the low firing silhouette and recovery around 32–47 seconds in JHS’s [Biped Mech Cinematic](https://www.youtube.com/watch?v=19-Pp7e4jjs). The Blender performance uses poses recorded from the terrain-aware Three.js rig. The campaign uses its existing relay battlefield. [Campaign firing frame](field.webp)

In the local Rig Bench, open `?bench=rig&frame=28` to inspect Saker. In a career, select **Parapet** at **Ridge Station**.

Saker is a medium chassis with five tiles of standard free movement. Its Jumpjet costs 2 AP and refreshes each turn. It can cross units and cover to land on a clear tile within three tiles, including at a different elevation.

Hover costs 2 AP and lasts until the unit’s next turn. Once per battle, Saker can gain two elevation levels for combat and immunity to melee while locked in place.

## Combat checks

- The contract deploys and reloads with Saker on the opposing side. The hull is capture-only. The integral Merlin comes with it. Neither is sold separately or recovered from wreckage.
- On flat ground, Saker can fire from seven tiles away. High Perch grants +1 range on non-melee attacks against targets at lower elevation, including counters. Pilots can learn High Perch and equip it on another chassis through the Mech Computer. The Merlin has seven-tile base reach and costs 5 AP. In Parapet, the level-two shot dealt 36 HP through five armor.
- Breaking the left arm leaves the rifle functional. Breaking the right arm disables it. The live cinematic emitted its muzzle effect at the right-wrist socket.
- The production rig gate checks knee contact, rear shin and toe direction, world-space contacts throughout recoil, torso and visor direction, gun height, toe roll and sight recovery. In the rooftop take, the receiver sits 0.14 m above the forward knee. The barrel climbs 36.7° while the left pad holds its ground position.
- Kneeling places the lead foot once, lowers the left kneepad with the rifle raised, then holds that contact while the rear foot extends and the rifle levels. Standing reverses those contacts. The gate runs both directions at 30 and 60 fps, reverses a partial kneel, and interrupts the brace with a move order.
- On the flat Parapet firing lane, the left shank extends rearward at about 8° to the ground. In the sustained travel test, the feet alternate with double support and the chassis has 0.045 m of vertical excursion.
