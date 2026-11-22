# Combat camera and hit reactions

A long-range shot holds on the launcher through release, then cuts wide when the projectile has enough flight time to read. Close exchanges cut directly to a shared firing lane. The defender gets a separate result shot, and return fire keeps the established screen direction.

- [Touch sequence](missile-sequence-touch.webp) shows launch, flight, and the defender after impact.
- [Desktop launch](missile-launch-desktop.webp) shows the Warden and missile at release.

On live v114, the touch test caught the shooter occupying only 10% of the viewport by proxy height on the first launch frame while the defender was out of frame. The same fixture now checks the launcher framing on that frame, missile direction through the cut, both hulls during flight, and the defender close-up. A short rail-to-rifle exchange checks screen position through the counter and verifies that skipping restores the tactical board.

The simulation gate compares the combined shotgun impulse with a single-shell impulse while retaining all pellet contacts, and checks that left and right hits roll in opposite directions.
