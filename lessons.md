# lessons.md

- 長押し比較は `pointerdown` から約300msで反対レイヤーを表示し、`pointerup` / `pointercancel` / `lostpointercapture` で必ず戻す。iOS Safari 対策としてステージには `touch-action: manipulation` と `user-select: none` を指定する。
