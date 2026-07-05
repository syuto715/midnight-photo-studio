import type { TextKey } from "./i18n";

export type LayerId = "now" | "photo";

export type GamePhase =
  | "intro"
  | "explore"
  | "accuseSpot"
  | "accuseReason"
  | "repairing"
  | "repairMessage"
  | "continued";

export interface PercentRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FallbackShape {
  kind: "room" | "table" | "chair" | "mirror" | "clock" | "reflection" | "door";
  color: string;
  accent?: string;
  labelKey: TextKey;
}

export interface SceneBackground {
  image?: string;
  fallbackShape: FallbackShape;
}

export interface SceneObject {
  id: string;
  spotId: string;
  rect: PercentRect;
  z: number;
  image?: string;
  fallbackShape: FallbackShape;
  inspectTextKey: TextKey;
  anomalyId?: string;
  interactive?: boolean;
  selectableForLie?: boolean;
  hiddenWhenRepaired?: boolean;
  appearsAfterRepair?: boolean;
}

export interface Anomaly {
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

export interface Room {
  id: string;
  background: SceneBackground;
  layers: Record<LayerId, SceneObject[]>;
  anomalies: Anomaly[];
  lie: LieDefinition;
  hints: TextKey[];
}

export interface GameState {
  phase: GamePhase;
  activeLayer: LayerId;
  peekLayer: LayerId | null;
  foundAnomalyIds: string[];
  selectedSpotId: string | null;
  wrongAttempts: number;
  repairedLie: boolean;
  doorRevealed: boolean;
  toastKey: TextKey | null;
  flavorTextKey: TextKey | null;
  debug: boolean;
}
