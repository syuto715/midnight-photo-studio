import type { TextKey } from "./i18n";

export type LayerId = "now" | "photo";

export type PuzzleId = "accuse" | "candles" | "seats";

export type DoorState = "hidden" | "outline" | "ajar" | "open";

export type SeatActor = "master" | "daughter" | "guest" | "empty";

export type GamePhase =
  | "introEnvelope"
  | "introTitle"
  | "explore"
  | "puzzleCard"
  | "stampCard"
  | "accuseSpot"
  | "accuseReason"
  | "repairing"
  | "repairMessage"
  | "chapterClear";

export interface PercentRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FallbackShape {
  kind:
    | "room"
    | "table"
    | "chair"
    | "mirror"
    | "clock"
    | "reflection"
    | "door"
    | "coin"
    | "candle"
    | "plate"
    | "envelope"
    | "seat";
  color: string;
  accent?: string;
  labelKey: TextKey;
}

export interface SceneBackground {
  image?: string;
  fallbackShape: FallbackShape;
}

export interface StateCondition {
  repairedLie?: boolean;
  minDoorState?: DoorState;
  completedPuzzles?: PuzzleId[];
  activePuzzleIds?: PuzzleId[];
  foundMemoIds?: string[];
}

export type SceneInteraction =
  | { kind: "inspect" }
  | { kind: "collectCoin"; coinId: string }
  | { kind: "openCloseup"; closeupId: string }
  | { kind: "toggleCandle"; candleId: string }
  | { kind: "addMemo"; memoIds: string[]; toastTextKey: TextKey }
  | { kind: "assignSeat"; seatId: string };

export interface SceneObject {
  id: string;
  spotId: string;
  rect: PercentRect;
  z: number;
  image?: string;
  imageClass?: string;
  fallbackShape: FallbackShape;
  inspectTextKey: TextKey;
  anomalyId?: string;
  interaction?: SceneInteraction;
  interactive?: boolean;
  selectableForLie?: boolean;
  hiddenWhenRepaired?: boolean;
  appearsAfterRepair?: boolean;
  visibleWhen?: StateCondition;
  hiddenWhen?: StateCondition;
  coinId?: string;
  candleId?: string;
  seatId?: string;
  lit?: boolean;
  hitboxOnlyWithArt?: boolean;
}

export interface MemoEntry {
  id: string;
  layer: LayerId;
  spotId: string;
  memoTextKey: TextKey;
  toastTextKey: TextKey;
}

export interface LieDefinition {
  spotId: string;
  reasonId: string;
}

export interface CoinDefinition {
  id: string;
  labelKey: TextKey;
}

export interface BasePuzzleDefinition {
  id: PuzzleId;
  type: PuzzleId;
  numberTextKey: TextKey;
  titleTextKey: TextKey;
  hints: TextKey[];
}

export interface AccusePuzzleDefinition extends BasePuzzleDefinition {
  type: "accuse";
  spotId: string;
  reasonId: string;
  requiredMemoCount: number;
}

export interface CandlesPuzzleDefinition extends BasePuzzleDefinition {
  type: "candles";
  candleIds: string[];
  targetPattern: Record<string, boolean>;
}

export interface SeatDefinition {
  id: string;
  labelKey: TextKey;
}

export interface ActorDefinition {
  id: SeatActor;
  labelKey: TextKey;
}

export interface SeatsPuzzleDefinition extends BasePuzzleDefinition {
  type: "seats";
  seatIds: string[];
  actors: ActorDefinition[];
  mirroredSeatIds: string[];
  correctAssignments: Record<string, SeatActor>;
  testimonyMemoIds: string[];
}

export type PuzzleDefinition = AccusePuzzleDefinition | CandlesPuzzleDefinition | SeatsPuzzleDefinition;

export interface CloseupDefinition {
  id: string;
  titleTextKey: TextKey;
  layers: Record<LayerId, SceneObject[]>;
}

export interface StoryDefinition {
  envelopeTextKey: TextKey;
  titleTextKey: TextKey;
  clearTitleKey: TextKey;
  clearBodyKeys: TextKey[];
}

export interface Room {
  id: string;
  background: SceneBackground;
  layers: Record<LayerId, SceneObject[]>;
  anomalies: MemoEntry[];
  lie: LieDefinition;
  hints: TextKey[];
  coins: CoinDefinition[];
  puzzles: Record<PuzzleId, PuzzleDefinition>;
  closeups: CloseupDefinition[];
  story: StoryDefinition;
}

export interface GameState {
  phase: GamePhase;
  activeLayer: LayerId;
  peekLayer: LayerId | null;
  activePuzzleId: PuzzleId | null;
  cardPuzzleId: PuzzleId | null;
  foundMemoIds: string[];
  selectedSpotId: string | null;
  wrongAttempts: number;
  repairedLie: boolean;
  doorState: DoorState;
  completedPuzzleIds: PuzzleId[];
  foundCoinIds: string[];
  coinsSpent: number;
  hintsUnlocked: Partial<Record<PuzzleId, number>>;
  candleStates: Record<string, boolean>;
  seatAssignments: Record<string, SeatActor>;
  selectedSeatId: string | null;
  plateRead: boolean;
  activeCloseupId: string | null;
  toastKey: TextKey | null;
  flavorTextKey: TextKey | null;
  resetConfirmOpen: boolean;
  debug: boolean;
}
