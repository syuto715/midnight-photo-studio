import type { DoorState, GameState, LayerId, PuzzleId, SeatActor } from "./types";
import type { TextKey } from "./i18n";

type Listener = (state: GameState) => void;
type GameEventName = "repairStarted";
type GameEventListener = () => void;

const schemaVersion = 2;
const saveKey = "midnight-photo-studio:chapter1";
const listeners = new Set<Listener>();
const eventListeners = new Map<GameEventName, Set<GameEventListener>>();

interface SavePayload {
  schemaVersion: number;
  state: Omit<GameState, "debug" | "toastKey" | "peekLayer" | "resetConfirmOpen">;
}

const initialState = (): GameState => ({
  phase: "introEnvelope",
  activeLayer: "now",
  peekLayer: null,
  activePuzzleId: null,
  cardPuzzleId: null,
  foundMemoIds: [],
  selectedSpotId: null,
  wrongAttempts: 0,
  repairedLie: false,
  doorState: "hidden",
  completedPuzzleIds: [],
  foundCoinIds: [],
  coinsSpent: 0,
  hintsUnlocked: {},
  candleStates: {},
  seatAssignments: {},
  selectedSeatId: null,
  plateRead: false,
  activeCloseupId: null,
  toastKey: null,
  flavorTextKey: null,
  resetConfirmOpen: false,
  debug: new URLSearchParams(window.location.search).get("debug") === "1"
});

let state = initialState();
let toastTimer = 0;
let saveSuppressed = false;

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

function shouldPersist(nextState: GameState): boolean {
  return !saveSuppressed && nextState.phase !== "introEnvelope" && nextState.phase !== "introTitle";
}

function persist(nextState: GameState): void {
  if (!shouldPersist(nextState)) {
    return;
  }

  const { debug: _debug, toastKey: _toastKey, peekLayer: _peekLayer, resetConfirmOpen: _resetConfirmOpen, ...savedState } = nextState;
  const payload: SavePayload = {
    schemaVersion,
    state: savedState
  };
  localStorage.setItem(saveKey, JSON.stringify(payload));
}

function setState(patch: Partial<GameState>): void {
  state = { ...state, ...patch };
  persist(state);
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

function parseSavedState(): GameState | null {
  const raw = localStorage.getItem(saveKey);
  if (!raw) {
    return null;
  }

  try {
    const payload = JSON.parse(raw) as SavePayload;
    if (payload.schemaVersion !== schemaVersion) {
      return null;
    }

    return {
      ...initialState(),
      ...payload.state,
      peekLayer: null,
      toastKey: null,
      resetConfirmOpen: false,
      debug: new URLSearchParams(window.location.search).get("debug") === "1"
    };
  } catch {
    return null;
  }
}

function doorRank(value: DoorState): number {
  return ["hidden", "outline", "ajar", "open"].indexOf(value);
}

export const compareDoorState = (current: DoorState, minimum: DoorState): boolean => doorRank(current) >= doorRank(minimum);

export const gameStore = {
  schemaVersion,
  saveKey,

  getState: (): GameState => state,

  hasSave(): boolean {
    return parseSavedState() !== null;
  },

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

  openTitle(): void {
    setState({ phase: "introTitle", resetConfirmOpen: false });
  },

  enterRoom(): void {
    setState({
      phase: "explore",
      activeLayer: "now",
      peekLayer: null,
      activePuzzleId: null,
      cardPuzzleId: null,
      flavorTextKey: null,
      resetConfirmOpen: false
    });
  },

  loadGame(): boolean {
    const savedState = parseSavedState();
    if (!savedState) {
      showToast("toast.noSave");
      return false;
    }

    state = savedState;
    notify();
    return true;
  },

  requestReset(): void {
    setState({ resetConfirmOpen: true });
  },

  cancelReset(): void {
    setState({ resetConfirmOpen: false });
  },

  clearSaveAndReset(): void {
    window.clearTimeout(toastTimer);
    localStorage.removeItem(saveKey);
    saveSuppressed = true;
    state = initialState();
    saveSuppressed = false;
    notify();
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

  addMemo(memoId: string, toastKey: TextKey): boolean {
    if (state.foundMemoIds.includes(memoId)) {
      showToast("toast.memoAlready");
      return false;
    }

    setState({
      foundMemoIds: [...state.foundMemoIds, memoId],
      flavorTextKey: null
    });
    showToast(toastKey);
    return true;
  },

  addMemos(memoIds: string[], toastKey: TextKey): boolean {
    const newIds = memoIds.filter((memoId) => !state.foundMemoIds.includes(memoId));
    if (newIds.length === 0) {
      showToast("toast.memoAlready");
      return false;
    }

    setState({
      foundMemoIds: [...state.foundMemoIds, ...newIds],
      plateRead: true,
      flavorTextKey: null
    });
    showToast(toastKey);
    return true;
  },

  unlockAll(memoIds: string[]): void {
    setState({ foundMemoIds: memoIds });
    showToast("toast.debugUnlocked");
  },

  collectCoin(coinId: string): boolean {
    if (state.foundCoinIds.includes(coinId)) {
      showToast("toast.coinAlready");
      return false;
    }

    setState({
      foundCoinIds: [...state.foundCoinIds, coinId],
      flavorTextKey: "flavor.coin"
    });
    showToast("toast.coinFound");
    return true;
  },

  unlockHint(puzzleId: PuzzleId): boolean {
    const unlocked = state.hintsUnlocked[puzzleId] ?? 0;
    const available = state.foundCoinIds.length - state.coinsSpent;
    if (available <= 0) {
      showToast("toast.coinShort");
      return false;
    }

    setState({
      coinsSpent: state.coinsSpent + 1,
      hintsUnlocked: {
        ...state.hintsUnlocked,
        [puzzleId]: Math.min(3, unlocked + 1)
      }
    });
    showToast("toast.hintUnlocked");
    return true;
  },

  showPuzzleCard(puzzleId: PuzzleId): void {
    setState({
      phase: "puzzleCard",
      cardPuzzleId: puzzleId,
      activePuzzleId: puzzleId,
      activeCloseupId: null,
      selectedSeatId: null,
      flavorTextKey: null
    });
  },

  startCardPuzzle(): void {
    const puzzleId = state.cardPuzzleId;
    if (puzzleId === "accuse") {
      setState({
        phase: "accuseSpot",
        activeLayer: "photo",
        peekLayer: null,
        selectedSpotId: null,
        flavorTextKey: null
      });
      return;
    }

    setState({
      phase: "explore",
      activeLayer: "now",
      peekLayer: null,
      activePuzzleId: puzzleId,
      cardPuzzleId: null,
      flavorTextKey: null
    });
  },

  beginAccusation(): void {
    this.showPuzzleCard("accuse");
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

  completePuzzle(puzzleId: PuzzleId): void {
    const completedPuzzleIds = state.completedPuzzleIds.includes(puzzleId)
      ? state.completedPuzzleIds
      : [...state.completedPuzzleIds, puzzleId];
    const nextDoorState: DoorState =
      puzzleId === "candles" ? "ajar" : puzzleId === "seats" ? "open" : state.doorState;
    setState({
      phase: "stampCard",
      completedPuzzleIds,
      cardPuzzleId: puzzleId,
      activePuzzleId: puzzleId,
      doorState: nextDoorState,
      selectedSeatId: null,
      flavorTextKey: null
    });
  },

  finishStamp(): void {
    const puzzleId = state.cardPuzzleId;
    if (puzzleId === "accuse") {
      this.startRepair();
      return;
    }
    if (puzzleId === "candles") {
      this.showPuzzleCard("seats");
      return;
    }
    if (puzzleId === "seats") {
      setState({
        phase: "chapterClear",
        activePuzzleId: null,
        cardPuzzleId: null,
        activeLayer: "now",
        activeCloseupId: null,
        flavorTextKey: null
      });
    }
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
      doorState: "outline"
    });
  },

  finishRepairMessage(): void {
    this.showPuzzleCard("candles");
  },

  toggleCandle(candleId: string): void {
    setState({
      candleStates: {
        ...state.candleStates,
        [candleId]: !state.candleStates[candleId]
      },
      flavorTextKey: "flavor.candleToggle"
    });
  },

  selectSeat(seatId: string): void {
    setState({ selectedSeatId: seatId, flavorTextKey: "flavor.seatSelect" });
  },

  assignSeat(seatId: string, actor: SeatActor): void {
    setState({
      seatAssignments: {
        ...state.seatAssignments,
        [seatId]: actor
      },
      selectedSeatId: null,
      flavorTextKey: null
    });
  },

  seatMismatch(): void {
    showToast("toast.seatWrong");
  },

  openCloseup(closeupId: string): void {
    setState({ activeCloseupId: closeupId, flavorTextKey: null });
  },

  closeCloseup(): void {
    setState({ activeCloseupId: null, flavorTextKey: null });
  },

  debugCompleteCandles(): void {
    setState({ completedPuzzleIds: [...new Set([...state.completedPuzzleIds, "accuse", "candles"])] as PuzzleId[], repairedLie: true, doorState: "ajar", activePuzzleId: "seats" });
  }
};
