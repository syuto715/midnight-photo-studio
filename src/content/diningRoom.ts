import type { FallbackShape, Room, SceneObject } from "../types";

const roomShape: FallbackShape = {
  kind: "room",
  color: "#2b1810",
  accent: "#68412c",
  labelKey: "object.room"
};

const tableShape: FallbackShape = {
  kind: "table",
  color: "#6d4328",
  accent: "#b58a5b",
  labelKey: "object.table"
};

const chairShape = (labelKey: FallbackShape["labelKey"]): FallbackShape => ({
  kind: "chair",
  color: "#8b5935",
  accent: "#d0a06c",
  labelKey
});

const reflectionShape = (labelKey: FallbackShape["labelKey"]): FallbackShape => ({
  kind: "reflection",
  color: "#5a5c64",
  accent: "#d4d8df",
  labelKey
});

const mirrorShape: FallbackShape = {
  kind: "mirror",
  color: "#263039",
  accent: "#b7a16b",
  labelKey: "object.mirror"
};

const clockShape = (labelKey: FallbackShape["labelKey"]): FallbackShape => ({
  kind: "clock",
  color: "#d8c28a",
  accent: "#2a1f18",
  labelKey
});

const doorShape: FallbackShape = {
  kind: "door",
  color: "transparent",
  accent: "#d7d0ad",
  labelKey: "object.door"
};

const object = (definition: SceneObject): SceneObject => definition;

const sharedObjects: SceneObject[] = [
  object({
    id: "table",
    spotId: "table",
    rect: { x: 23, y: 48, w: 54, h: 16 },
    z: 30,
    fallbackShape: tableShape,
    inspectTextKey: "flavor.table",
    interactive: true
  }),
  object({
    id: "chair-a",
    spotId: "chair-a",
    rect: { x: 18, y: 43, w: 10, h: 16 },
    z: 35,
    fallbackShape: chairShape("object.chairA"),
    inspectTextKey: "flavor.chair",
    interactive: true
  }),
  object({
    id: "chair-b",
    spotId: "chair-b",
    rect: { x: 36, y: 64, w: 10, h: 17 },
    z: 45,
    fallbackShape: chairShape("object.chairB"),
    inspectTextKey: "flavor.chair",
    interactive: true
  }),
  object({
    id: "chair-c",
    spotId: "chair-c",
    rect: { x: 54, y: 64, w: 10, h: 17 },
    z: 45,
    fallbackShape: chairShape("object.chairC"),
    inspectTextKey: "flavor.chair",
    interactive: true
  }),
  object({
    id: "chair-d",
    spotId: "chair-d",
    rect: { x: 72, y: 43, w: 10, h: 16 },
    z: 35,
    fallbackShape: chairShape("object.chairD"),
    inspectTextKey: "flavor.chair",
    interactive: true
  })
];

const mirrorReflections: SceneObject[] = [
  object({
    id: "reflection-a",
    spotId: "reflection-a",
    rect: { x: 39, y: 27, w: 4.5, h: 6 },
    z: 15,
    fallbackShape: reflectionShape("object.reflectionA"),
    inspectTextKey: "flavor.reflection",
    interactive: false
  }),
  object({
    id: "reflection-b",
    spotId: "reflection-b",
    rect: { x: 45, y: 29, w: 4.5, h: 6 },
    z: 15,
    fallbackShape: reflectionShape("object.reflectionB"),
    inspectTextKey: "flavor.reflection",
    interactive: false
  }),
  object({
    id: "reflection-c",
    spotId: "reflection-c",
    rect: { x: 51, y: 29, w: 4.5, h: 6 },
    z: 15,
    fallbackShape: reflectionShape("object.reflectionC"),
    inspectTextKey: "flavor.reflection",
    interactive: false
  }),
  object({
    id: "reflection-d",
    spotId: "reflection-d",
    rect: { x: 57, y: 27, w: 4.5, h: 6 },
    z: 15,
    fallbackShape: reflectionShape("object.reflectionD"),
    inspectTextKey: "flavor.reflection",
    interactive: false
  })
];

export const diningRoom: Room = {
  id: "dining-room",
  background: {
    fallbackShape: roomShape
  },
  layers: {
    now: [
      object({
        id: "mirror",
        spotId: "mirror",
        rect: { x: 31, y: 12, w: 38, h: 28 },
        z: 10,
        fallbackShape: mirrorShape,
        inspectTextKey: "flavor.mirrorNow",
        interactive: true
      }),
      ...mirrorReflections,
      object({
        id: "clock-now",
        spotId: "clock",
        rect: { x: 47, y: 3.5, w: 6, h: 8 },
        z: 20,
        fallbackShape: clockShape("object.clockNow"),
        inspectTextKey: "flavor.clockNow",
        interactive: true
      }),
      ...sharedObjects,
      object({
        id: "mirror-door",
        spotId: "mirror-door",
        rect: { x: 46.5, y: 17, w: 7, h: 18 },
        z: 18,
        fallbackShape: doorShape,
        inspectTextKey: "flavor.door",
        interactive: true,
        appearsAfterRepair: true
      })
    ],
    photo: [
      object({
        id: "mirror-photo",
        spotId: "mirror",
        rect: { x: 31, y: 12, w: 38, h: 28 },
        z: 10,
        fallbackShape: mirrorShape,
        inspectTextKey: "flavor.mirrorPhoto",
        anomalyId: "mirror-four",
        interactive: true,
        selectableForLie: true
      }),
      ...mirrorReflections,
      object({
        id: "clock-photo",
        spotId: "clock",
        rect: { x: 47, y: 3.5, w: 6, h: 8 },
        z: 20,
        fallbackShape: clockShape("object.clockPhoto"),
        inspectTextKey: "flavor.clockPhoto",
        anomalyId: "clock-2351",
        interactive: true,
        selectableForLie: true
      }),
      ...sharedObjects,
      object({
        id: "chair-e",
        spotId: "chair-e",
        rect: { x: 64, y: 42, w: 10, h: 17 },
        z: 36,
        fallbackShape: chairShape("object.chairE"),
        inspectTextKey: "flavor.chairE",
        anomalyId: "chair-extra",
        interactive: true,
        selectableForLie: true,
        hiddenWhenRepaired: true
      })
    ]
  },
  anomalies: [
    {
      id: "chair-extra",
      layer: "photo",
      spotId: "chair-e",
      memoTextKey: "memo.chairExtra",
      toastTextKey: "toast.chairExtra"
    },
    {
      id: "mirror-four",
      layer: "photo",
      spotId: "mirror",
      memoTextKey: "memo.mirrorFour",
      toastTextKey: "toast.mirrorFour"
    },
    {
      id: "clock-2351",
      layer: "photo",
      spotId: "clock",
      memoTextKey: "memo.clock2351",
      toastTextKey: "toast.clock2351"
    }
  ],
  lie: {
    spotId: "chair-e",
    reasonId: "mirror-four"
  },
  hints: ["toast.wrongFirst", "toast.wrongSecond"]
};
