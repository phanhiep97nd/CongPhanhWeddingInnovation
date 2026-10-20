import { Scene, Vector3 } from "three";
import { disposeCharacterBatches } from "./batchCharacter";
import type { Character } from "./characters";
import type { GlbCharacter } from "./glbCharacter";

export function swapCharacters(
  scene: Scene,
  previous: { bride: Character; groom: Character },
  pair: { bride: GlbCharacter; groom: GlbCharacter },
) {
  const gift = previous.groom.rightHand.getObjectByName("gift");
  for (const role of ["bride", "groom"] as const) {
    const next = pair[role];
    Object.assign(next.state, previous[role].state);
    next.root.position.copy(previous[role].root.position);
    next.root.quaternion.copy(previous[role].root.quaternion);
    previous[role].root.removeFromParent();
    disposeCharacterBatches(previous[role].root);
    scene.add(next.root);
  }
  if (gift) {
    pair.groom.rightHand.add(gift);
    pair.groom.root.updateMatrixWorld(true);
    const scale = pair.groom.rightHand.getWorldScale(new Vector3());
    gift.scale.set(0.55 / scale.x, 0.55 / scale.y, 0.55 / scale.z);
  }
  return Math.max(pair.bride.root.userData.height, pair.groom.root.userData.height) / 1.1;
}
