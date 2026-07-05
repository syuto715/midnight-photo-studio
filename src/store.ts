import type { GameState, LayerId } from "./types";
import type { TextKey } from "./i18n";

type Listener = (state: GameState) => void;
type GameEventName = "repairStarted";
type GameEventListener = () => void;

const listeners = new Set<Listener>();
const eventListeners = new Map<GameEventName, Set<GameEventListener>>();

const initialState = (): GameState => ({
  phase: "intro",
  activeLayer: "now",
  peekLayer: null,
  foundAnomalyIds: [],
  selectedSpotId: null,
  wrongAttempts: 0,
  repairedLie: false,
  doorRevealed: false,
  toastKey: null,
  flavorTextKey: null,
  debug: new URLSearchParams(window.location.search).get("debug") === "1"
});

let state = initialState();
let toastTimer = 0;

function notify(): void {
  for (const listener of listeners) {
    listener(state);
  }
}

function emit(eventName: GameEventName): void {
  const eventSet = eventListeners.get(eventName);
  if (!eventSet) {
    return;
  }

  for (const listener of eventSet) {
    listener();
  }
}

function setState(patch: Partial<GameState>): void {
  state = { ...state, ...patch };
  notify();
}

function showToast(key: TextKey): void {
  window.clearTimeout(toastTimer);
  setState({ toastKey: key });
  toastTimer = window.setTimeout(() => {
    if (state.toastKey === key) {
      setState({ toastKey: null });
    }
  }, 1800);
}

export const gameStore = {
  getState: (): GameState => state,

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  on(eventName: GameEventName, listener: GameEventListener): () => void {
    const eventSet = eventListeners.get(eventName) ?? new Set<GameEventListener>();
    eventSet.add(listener);
    eventListeners.set(eventName, eventSet);
    return () => eventSet.delete(listener);
  },

  enterRoom(): void {
    setState({
      phase: "explore",
      activeLayer: "now",
      peekLayer: null,
      flavorTextKey: null
    });
  },

  setLayer(layer: LayerId): void {
    setState({
      activeLayer: layer,
      peekLayer: null,
      flavorTextKey: null
    });
  },

  setPeekLayer(layer: LayerId | null): void {
    setState({ peekLayer: layer });
  },

  inspect(key: TextKey): void {
    setState({ flavorTextKey: key });
  },

  addAnomaly(anomalyId: string, toastKey: TextKey): boolean {
    if (state.foundAnomalyIds.includes(anomalyId)) {
      showToast("toast.memoAlready");
      return false;
    }

    setState({
      foundAnomalyIds: [...state.foundAnomalyIds, anomalyId],
      flavorTextKey: null
    });
    showToast(toastKey);
    return true;
  },

  unlockAll(anomalyIds: string[]): void {
    setState({ foundAnomalyIds: anomalyIds });
    showToast("toast.debugUnlocked");
  },

  beginAccusation(): void {
    setState({
      phase: "accuseSpot",
      activeLayer: "photo",
      peekLayer: null,
      selectedSpotId: null,
      flavorTextKey: null
    });
  },

  cancelAccusation(): void {
    setState({
      phase: "explore",
      activeLayer: "photo",
      selectedSpotId: null,
      flavorTextKey: null
    });
  },

  selectSpot(spotId: string): void {
    setState({
      phase: "accuseReason",
      selectedSpotId: spotId
    });
    showToast("toast.spotSelected");
  },

  wrongAnswer(): void {
    const nextAttempts = state.wrongAttempts + 1;
    setState({
      phase: "accuseSpot",
      selectedSpotId: null,
      wrongAttempts: nextAttempts
    });
    showToast(nextAttempts === 1 ? "toast.wrongFirst" : "toast.wrongSecond");
  },

  startRepair(): void {
    setState({
      phase: "repairing",
      activeLayer: "photo",
      peekLayer: null,
      repairedLie: true,
      selectedSpotId: null,
      flavorTextKey: null
    });
    emit("repairStarted");
  },

  revealDoor(): void {
    setState({
      phase: "repairMessage",
      activeLayer: "now",
      doorRevealed: true
    });
  },

  finishRepair(): void {
    setState({
      phase: "continued",
      activeLayer: "now",
      peekLayer: null,
      doorRevealed: true,
      toastKey: null,
      flavorTextKey: null
    });
  },

  reset(): void {
    window.clearTimeout(toastTimer);
    state = initialState();
    notify();
  }
};
