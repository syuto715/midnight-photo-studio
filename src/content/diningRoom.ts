import type { FallbackShape, Room, SceneObject } from "../types";

const asset = (name: string): string => `/assets/${name}`;

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

const doorShape = (labelKey: FallbackShape["labelKey"]): FallbackShape => ({
  kind: "door",
  color: "transparent",
  accent: "#d7d0ad",
  labelKey
});

const coinShape = (labelKey: FallbackShape["labelKey"]): FallbackShape => ({
  kind: "coin",
  color: "#b9afa0",
  accent: "#f3e4c7",
  labelKey
});

const candleShape = (labelKey: FallbackShape["labelKey"]): FallbackShape => ({
  kind: "candle",
  color: "#8f743c",
  accent: "#ead086",
  labelKey
});

const plateShape: FallbackShape = {
  kind: "plate",
  color: "#b8afa0",
  accent: "#ede1cc",
  labelKey: "object.plate"
};

const seatShape = (labelKey: FallbackShape["labelKey"]): FallbackShape => ({
  kind: "seat",
  color: "rgba(122, 46, 46, 0.45)",
  accent: "#c9a227",
  labelKey
});

const object = (definition: SceneObject): SceneObject => definition;

const chair = (id: string, labelKey: FallbackShape["labelKey"], x: number, y: number, z: number, imageClass = ""): SceneObject =>
  object({
    id,
    spotId: id,
    rect: { x, y, w: 10, h: 22 },
    z,
    image: asset("chair.png"),
    imageClass,
    fallbackShape: chairShape(labelKey),
    inspectTextKey: "flavor.chair",
    interactive: true
  });

const sharedChairs: SceneObject[] = [
  chair("chair-a", "object.chairA", 27, 58, 34, "chair-left"),
  chair("chair-b", "object.chairB", 41, 72, 46, "chair-front"),
  chair("chair-c", "object.chairC", 59, 72, 46, "chair-front mirrored"),
  chair("chair-d", "object.chairD", 73, 58, 34, "chair-right mirrored")
];

const mirrorReflections: SceneObject[] = [
  object({
    id: "reflection-a",
    spotId: "reflection-a",
    rect: { x: 42, y: 29, w: 4.2, h: 8 },
    z: 15,
    image: asset("chair.png"),
    imageClass: "mirror-reflection",
    fallbackShape: reflectionShape("object.reflectionA"),
    inspectTextKey: "flavor.reflection",
    interactive: false
  }),
  object({
    id: "reflection-b",
    spotId: "reflection-b",
    rect: { x: 47, y: 30, w: 4.2, h: 8 },
    z: 15,
    image: asset("chair.png"),
    imageClass: "mirror-reflection",
    fallbackShape: reflectionShape("object.reflectionB"),
    inspectTextKey: "flavor.reflection",
    interactive: false
  }),
  object({
    id: "reflection-c",
    spotId: "reflection-c",
    rect: { x: 53, y: 30, w: 4.2, h: 8 },
    z: 15,
    image: asset("chair.png"),
    imageClass: "mirror-reflection mirrored",
    fallbackShape: reflectionShape("object.reflectionC"),
    inspectTextKey: "flavor.reflection",
    interactive: false
  }),
  object({
    id: "reflection-d",
    spotId: "reflection-d",
    rect: { x: 58, y: 29, w: 4.2, h: 8 },
    z: 15,
    image: asset("chair.png"),
    imageClass: "mirror-reflection mirrored",
    fallbackShape: reflectionShape("object.reflectionD"),
    inspectTextKey: "flavor.reflection",
    interactive: false
  })
];

const candle = (id: string, labelKey: FallbackShape["labelKey"], x: number, lit = false): SceneObject =>
  object({
    id,
    spotId: id,
    rect: { x, y: 48, w: 4.8, h: 13 },
    z: 51,
    image: asset("candelabra.png"),
    imageClass: "candle-sprite",
    fallbackShape: candleShape(labelKey),
    inspectTextKey: "flavor.candle",
    candleId: id,
    lit,
    visibleWhen: { repairedLie: true },
    interaction: { kind: "toggleCandle", candleId: id },
    interactive: true
  });

const photoCandle = (id: string, labelKey: FallbackShape["labelKey"], x: number, lit = false): SceneObject =>
  object({
    ...candle(id, labelKey, x, lit),
    interaction: { kind: "inspect" },
    inspectTextKey: lit ? "flavor.candlePhotoLit" : "flavor.candlePhotoUnlit"
  });

const coin = (id: string, x: number, y: number, layer: "now" | "photo"): SceneObject =>
  object({
    id: `coin-${id}`,
    spotId: `coin-${id}`,
    rect: { x, y, w: 4.5, h: 4.5 },
    z: layer === "photo" ? 62 : 56,
    image: asset("coin.png"),
    imageClass: "coin-sprite",
    fallbackShape: coinShape("object.coin"),
    inspectTextKey: "flavor.coin",
    coinId: id,
    interaction: { kind: "collectCoin", coinId: id },
    interactive: true
  });

const commonTable: SceneObject = object({
  id: "table",
  spotId: "table",
  rect: { x: 21, y: 52, w: 58, h: 22 },
  z: 30,
  fallbackShape: tableShape,
  inspectTextKey: "flavor.table",
  hitboxOnlyWithArt: true,
  interactive: true
});

const clockNow: SceneObject = object({
  id: "clock-now",
  spotId: "clock",
  rect: { x: 50, y: 15, w: 7, h: 10 },
  z: 20,
  image: asset("clock-face.png"),
  imageClass: "clock-sprite clock-now",
  fallbackShape: clockShape("object.clockNow"),
  inspectTextKey: "flavor.clockNow",
  interactive: true
});

const clockPhoto: SceneObject = object({
  ...clockNow,
  id: "clock-photo",
  imageClass: "clock-sprite clock-photo",
  fallbackShape: clockShape("object.clockPhoto"),
  inspectTextKey: "flavor.clockPhoto",
  anomalyId: "clock-2351",
  selectableForLie: true
});

export const diningRoom: Room = {
  id: "dining-room",
  background: {
    image: asset("bg-dining.png"),
    fallbackShape: roomShape
  },
  layers: {
    now: [
      object({
        id: "mirror",
        spotId: "mirror",
        rect: { x: 36, y: 12, w: 28, h: 33 },
        z: 10,
        fallbackShape: mirrorShape,
        inspectTextKey: "flavor.mirrorNow",
        interaction: { kind: "openCloseup", closeupId: "mirror" },
        hitboxOnlyWithArt: true,
        interactive: true
      }),
      ...mirrorReflections,
      clockNow,
      commonTable,
      ...sharedChairs,
      coin("table-shadow", 36, 76, "now"),
      coin("mirror-frame", 61, 24, "now"),
      candle("candle-a", "object.candleA", 39),
      candle("candle-b", "object.candleB", 47),
      candle("candle-c", "object.candleC", 53),
      candle("candle-d", "object.candleD", 61),
      object({
        id: "silver-plate",
        spotId: "plate",
        rect: { x: 50, y: 55, w: 10, h: 8 },
        z: 54,
        image: asset("plate.png"),
        imageClass: "plate-sprite",
        fallbackShape: plateShape,
        inspectTextKey: "flavor.plate",
        interaction: {
          kind: "addMemo",
          memoIds: ["testimony-master", "testimony-daughter", "testimony-butler", "testimony-guest"],
          toastTextKey: "toast.testimonyAdded"
        },
        visibleWhen: { activePuzzleIds: ["seats"] },
        interactive: true
      }),
      object({
        id: "seat-a",
        spotId: "seat-a",
        rect: { x: 50, y: 44, w: 13, h: 8 },
        z: 60,
        fallbackShape: seatShape("seat.a"),
        inspectTextKey: "flavor.seatA",
        seatId: "seat-a",
        interaction: { kind: "assignSeat", seatId: "seat-a" },
        visibleWhen: { activePuzzleIds: ["seats"], foundMemoIds: ["testimony-master"] },
        interactive: true
      }),
      object({
        id: "seat-b",
        spotId: "seat-b",
        rect: { x: 39, y: 68, w: 12, h: 9 },
        z: 60,
        fallbackShape: seatShape("seat.b"),
        inspectTextKey: "flavor.seatB",
        seatId: "seat-b",
        interaction: { kind: "assignSeat", seatId: "seat-b" },
        visibleWhen: { activePuzzleIds: ["seats"], foundMemoIds: ["testimony-master"] },
        interactive: true
      }),
      object({
        id: "seat-c",
        spotId: "seat-c",
        rect: { x: 61, y: 68, w: 12, h: 9 },
        z: 60,
        fallbackShape: seatShape("seat.c"),
        inspectTextKey: "flavor.seatC",
        seatId: "seat-c",
        interaction: { kind: "assignSeat", seatId: "seat-c" },
        visibleWhen: { activePuzzleIds: ["seats"], foundMemoIds: ["testimony-master"] },
        interactive: true
      }),
      object({
        id: "seat-d",
        spotId: "seat-d",
        rect: { x: 50, y: 61, w: 13, h: 8 },
        z: 60,
        fallbackShape: seatShape("seat.d"),
        inspectTextKey: "flavor.seatD",
        seatId: "seat-d",
        interaction: { kind: "assignSeat", seatId: "seat-d" },
        visibleWhen: { activePuzzleIds: ["seats"], foundMemoIds: ["testimony-master"] },
        interactive: true
      }),
      object({
        id: "mirror-door",
        spotId: "mirror-door",
        rect: { x: 50, y: 24, w: 7, h: 20 },
        z: 18,
        fallbackShape: doorShape("object.door"),
        inspectTextKey: "flavor.door",
        visibleWhen: { minDoorState: "outline" },
        interactive: true
      }),
      object({
        id: "real-door",
        spotId: "real-door",
        rect: { x: 83, y: 35, w: 8, h: 32 },
        z: 18,
        fallbackShape: doorShape("object.realDoor"),
        inspectTextKey: "flavor.realDoor",
        visibleWhen: { minDoorState: "open" },
        interactive: true
      })
    ],
    photo: [
      object({
        id: "mirror-photo",
        spotId: "mirror",
        rect: { x: 36, y: 12, w: 28, h: 33 },
        z: 10,
        fallbackShape: mirrorShape,
        inspectTextKey: "flavor.mirrorPhoto",
        anomalyId: "mirror-four",
        interaction: { kind: "openCloseup", closeupId: "mirror" },
        selectableForLie: true,
        hitboxOnlyWithArt: true,
        interactive: true
      }),
      ...mirrorReflections,
      clockPhoto,
      commonTable,
      ...sharedChairs,
      object({
        ...chair("chair-e", "object.chairE", 68, 58, 36, "chair-extra mirrored"),
        inspectTextKey: "flavor.chairE",
        anomalyId: "chair-extra",
        selectableForLie: true,
        hiddenWhenRepaired: true
      }),
      coin("photo-corner", 84, 79, "photo"),
      photoCandle("candle-a", "object.candleA", 39, false),
      photoCandle("candle-b", "object.candleB", 47, true),
      photoCandle("candle-c", "object.candleC", 53, true),
      photoCandle("candle-d", "object.candleD", 61, false)
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
    },
    {
      id: "testimony-master",
      layer: "now",
      spotId: "plate",
      memoTextKey: "memo.testimonyMaster",
      toastTextKey: "toast.testimonyAdded"
    },
    {
      id: "testimony-daughter",
      layer: "now",
      spotId: "plate",
      memoTextKey: "memo.testimonyDaughter",
      toastTextKey: "toast.testimonyAdded"
    },
    {
      id: "testimony-butler",
      layer: "now",
      spotId: "plate",
      memoTextKey: "memo.testimonyButler",
      toastTextKey: "toast.testimonyAdded"
    },
    {
      id: "testimony-guest",
      layer: "now",
      spotId: "plate",
      memoTextKey: "memo.testimonyGuest",
      toastTextKey: "toast.testimonyAdded"
    }
  ],
  lie: {
    spotId: "chair-e",
    reasonId: "mirror-four"
  },
  hints: ["hint.accuse.1", "hint.accuse.2", "hint.accuse.3"],
  coins: [
    { id: "table-shadow", labelKey: "object.coin" },
    { id: "mirror-frame", labelKey: "object.coin" },
    { id: "photo-corner", labelKey: "object.coin" }
  ],
  puzzles: {
    accuse: {
      id: "accuse",
      type: "accuse",
      numberTextKey: "puzzle.accuse.number",
      titleTextKey: "puzzle.accuse.title",
      hints: ["hint.accuse.1", "hint.accuse.2", "hint.accuse.3"],
      spotId: "chair-e",
      reasonId: "mirror-four",
      requiredMemoCount: 2
    },
    candles: {
      id: "candles",
      type: "candles",
      numberTextKey: "puzzle.candles.number",
      titleTextKey: "puzzle.candles.title",
      hints: ["hint.candles.1", "hint.candles.2", "hint.candles.3"],
      candleIds: ["candle-a", "candle-b", "candle-c", "candle-d"],
      targetPattern: {
        "candle-a": false,
        "candle-b": true,
        "candle-c": true,
        "candle-d": false
      }
    },
    seats: {
      id: "seats",
      type: "seats",
      numberTextKey: "puzzle.seats.number",
      titleTextKey: "puzzle.seats.title",
      hints: ["hint.seats.1", "hint.seats.2", "hint.seats.3"],
      seatIds: ["seat-a", "seat-b", "seat-c", "seat-d"],
      actors: [
        { id: "master", labelKey: "actor.master" },
        { id: "daughter", labelKey: "actor.daughter" },
        { id: "guest", labelKey: "actor.guest" },
        { id: "empty", labelKey: "actor.empty" }
      ],
      mirroredSeatIds: ["seat-b", "seat-c"],
      correctAssignments: {
        "seat-a": "master",
        "seat-b": "daughter",
        "seat-c": "empty",
        "seat-d": "guest"
      },
      testimonyMemoIds: ["testimony-master", "testimony-daughter", "testimony-butler", "testimony-guest"]
    }
  },
  closeups: [
    {
      id: "mirror",
      titleTextKey: "closeup.mirror.title",
      layers: {
        now: [
          object({
            id: "closeup-seat-b",
            spotId: "seat-b",
            rect: { x: 31, y: 50, w: 16, h: 20 },
            z: 12,
            fallbackShape: reflectionShape("seat.b"),
            inspectTextKey: "flavor.closeupSeatMirrored",
            visibleWhen: { activePuzzleIds: ["seats"] },
            interactive: true
          }),
          object({
            id: "closeup-seat-c",
            spotId: "seat-c",
            rect: { x: 53, y: 50, w: 16, h: 20 },
            z: 12,
            fallbackShape: reflectionShape("seat.c"),
            inspectTextKey: "flavor.closeupSeatMirrored",
            visibleWhen: { activePuzzleIds: ["seats"] },
            interactive: true
          })
        ],
        photo: [
          object({
            id: "closeup-reflection-a",
            spotId: "reflection-a",
            rect: { x: 19, y: 46, w: 13, h: 26 },
            z: 12,
            image: asset("chair.png"),
            imageClass: "mirror-reflection",
            fallbackShape: reflectionShape("object.reflectionA"),
            inspectTextKey: "flavor.reflection",
            interactive: true
          }),
          object({
            id: "closeup-reflection-b",
            spotId: "reflection-b",
            rect: { x: 39, y: 50, w: 13, h: 26 },
            z: 12,
            image: asset("chair.png"),
            imageClass: "mirror-reflection",
            fallbackShape: reflectionShape("object.reflectionB"),
            inspectTextKey: "flavor.reflection",
            interactive: true
          }),
          object({
            id: "closeup-reflection-c",
            spotId: "reflection-c",
            rect: { x: 59, y: 50, w: 13, h: 26 },
            z: 12,
            image: asset("chair.png"),
            imageClass: "mirror-reflection mirrored",
            fallbackShape: reflectionShape("object.reflectionC"),
            inspectTextKey: "flavor.reflection",
            interactive: true
          }),
          object({
            id: "closeup-reflection-d",
            spotId: "reflection-d",
            rect: { x: 79, y: 46, w: 13, h: 26 },
            z: 12,
            image: asset("chair.png"),
            imageClass: "mirror-reflection mirrored",
            fallbackShape: reflectionShape("object.reflectionD"),
            inspectTextKey: "flavor.reflection",
            interactive: true
          })
        ]
      }
    }
  ],
  story: {
    envelopeTextKey: "intro.envelope",
    titleTextKey: "intro.text",
    clearTitleKey: "clear.title",
    clearBodyKeys: ["clear.line1", "clear.line2"]
  }
};
