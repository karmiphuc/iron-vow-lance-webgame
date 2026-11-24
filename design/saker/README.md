# Saker SK–38

Parapet at Ridge Station fields an enemy-only mobile marksman. Saker carries a Merlin 38 receiver in its right wrist. It fires from a three-point stance. The right foot leads, the left knee pad comes down, and the left shin and instep extend behind the mech. The open left hand takes the third contact. The waist straightens and the visor stays downrange while the rifle and shoulder carriage recoil.

The rooftop study follows the running arrest and deployment around 13–19 seconds, then the low firing silhouette and recovery around 32–47 seconds in JHS’s [Biped Mech Cinematic](https://www.youtube.com/watch?v=19-Pp7e4jjs). The Blender performance uses poses recorded from the terrain-aware Three.js rig. The campaign uses its existing relay battlefield. [Campaign firing frame](field.webp)

In the local Rig Bench, open `?bench=rig&frame=28` to inspect Saker. In a career, select **Parapet** at **Ridge Station**.

## Combat checks

- The contract deploys and reloads with Saker on the opposing side. Its hull and gun stay out of shops, player equipment, salvage and capture.
- Starting three tiles from a target on an open lane, the AI moved five tiles to reach its preferred distance of eight and landed one shot. The Merlin has nine-tile reach and costs 5 AP. In Parapet, the level-two shot dealt 36 HP through five armor.
- Breaking the left arm leaves the rifle functional. Breaking the right arm disables it. The live cinematic emitted its muzzle effect at the right-wrist socket.
- The production rig gate checks knee contact, rear shin and toe direction, world-space contacts throughout recoil, torso and visor direction, gun height, toe roll and sight recovery. In the rooftop take, the receiver sits 0.14 m above the forward knee. The barrel climbs 36.7° while the left pad holds its ground position.
- Kneeling places the lead foot once, transfers weight over it, and extends the rear leg. Standing reverses those contacts. The gate runs both directions at 30 and 60 fps, reverses a partial kneel, and interrupts the brace with a move order.
- On the flat Parapet firing lane, the left shank extends rearward at about 8° to the ground. In the sustained travel test, the feet alternate with double support and the chassis has 0.045 m of vertical excursion.
