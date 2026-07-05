import "./styles.css";
import { audio } from "./audio";
import { firstRoom } from "./content/rooms";
import { t, type TextKey } from "./i18n";
import { compareDoorState, gameStore } from "./store";
import type {
  CandlesPuzzleDefinition,
  GameState,
  LayerId,
  MemoEntry,
  PuzzleDefinition,
  PuzzleId,
  Room,
  SceneObject,
  SeatActor,
  SeatsPuzzleDefinition
} from "./types";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root was not found.");
}

const appRoot = app;
const room = firstRoom;
let pressTimer = 0;
let longPressActive = false;
let suppressClicksUntil = 0;
let repairDoorTimer = 0;
let lastRenderedLayer: LayerId | null = null;
let typewriterRunId = 0;
let lastStampedPuzzleId: PuzzleId | null = null;

document.title = t("app.title");
window.addEventListener(
  "pointerdown",
  () => {
    audio.ensureStarted();
  },
  { once: true }
);
gameStore.subscribe(render);
gameStore.on("repairStarted", scheduleRepair);

render();

function render(): void {
  const state = gameStore.getState();
  appRoot.replaceChildren();
  appRoot.className = `app-root phase-${state.phase}`;

  if (state.phase === "introEnvelope") {
    appRoot.append(renderEnvelopeIntro());
    startTypewriters();
    return;
  }

  if (state.phase === "introTitle") {
    appRoot.append(renderIntroTitle());
    startTypewriters();
    return;
  }

  if (state.phase === "puzzleCard" || state.phase === "stampCard") {
    appRoot.append(renderPuzzleCard(state.phase === "stampCard"));
    startTypewriters();
    return;
  }

  if (state.phase === "chapterClear") {
    appRoot.append(renderChapterClear());
    startTypewriters();
    return;
  }

  appRoot.append(renderGame(room));
  startTypewriters();
}

function renderEnvelopeIntro(): HTMLElement {
  const screen = element("main", "intro-screen envelope-screen");
  screen.classList.add("screen-in");
  screen.append(renderSoundToggle());
  const envelope = element("img", "intro-envelope");
  envelope.src = "/assets/envelope.png";
  envelope.alt = "";
  const text = element("p", "intro-text");
  text.dataset.typewriter = "true";
  text.textContent = t(room.story.envelopeTextKey);
  const enterButton = textButton("action.continue", "primary-button", () => {
    gameStore.openTitle();
  });
  screen.append(envelope, text, enterButton);
  return screen;
}

function renderIntroTitle(): HTMLElement {
  const screen = element("main", "intro-screen");
  screen.classList.add("screen-in");
  const title = element("h1", "intro-title");
  title.textContent = t("app.title");
  const clock = renderClockMark("title-clock");
  const text = element("p", "intro-text");
  text.dataset.typewriter = "true";
  text.textContent = t(room.story.titleTextKey);
  const actions = element("div", "intro-actions");
  if (gameStore.hasSave()) {
    actions.append(textButton("intro.resume", "primary-button", () => gameStore.loadGame()));
  }
  actions.append(textButton("intro.enter", gameStore.hasSave() ? "secondary-button" : "primary-button", () => gameStore.enterRoom()));
  if (gameStore.hasSave()) {
    actions.append(textButton("intro.restart", "ghost-button", () => gameStore.requestReset()));
  }
  screen.append(renderSoundToggle(), title, clock, text, actions);
  if (gameStore.getState().resetConfirmOpen) {
    screen.append(renderResetDialog());
  }
  return screen;
}

function renderResetDialog(): HTMLElement {
  const dialog = element("div", "modal-backdrop");
  const panel = element("section", "modal-panel");
  const text = element("p", "modal-text");
  text.textContent = t("intro.resetPrompt");
  const controls = element("div", "modal-actions");
  controls.append(
    textButton("action.confirmReset", "accent-button", () => gameStore.clearSaveAndReset()),
    textButton("action.cancelReset", "secondary-button", () => gameStore.cancelReset())
  );
  panel.append(text, controls);
  dialog.append(panel);
  return dialog;
}

function renderChapterClear(): HTMLElement {
  const screen = element("main", "continued-screen clear-screen");
  screen.classList.add("screen-in");
  const title = element("h1", "continued-title");
  title.textContent = t(room.story.clearTitleKey);
  screen.append(renderSoundToggle(), renderClockMark("title-clock"), title);
  for (const key of room.story.clearBodyKeys) {
    const line = element("p", "continued-body");
    line.dataset.typewriter = "true";
    line.textContent = t(key);
    screen.append(line);
  }
  screen.append(textButton("action.restart", "secondary-button", () => gameStore.requestReset()));
  if (gameStore.getState().resetConfirmOpen) {
    screen.append(renderResetDialog());
  }
  return screen;
}

function renderPuzzleCard(stamped: boolean): HTMLElement {
  const state = gameStore.getState();
  const puzzle = getPuzzle(state.cardPuzzleId ?? state.activePuzzleId ?? "accuse");
  if (stamped && lastStampedPuzzleId !== puzzle.id) {
    lastStampedPuzzleId = puzzle.id;
    audio.play("stamp");
  }

  const screen = element("main", `puzzle-card-screen ${stamped ? "is-stamped" : ""}`);
  const card = element("section", "puzzle-card");
  const number = element("p", "puzzle-number");
  number.textContent = t(puzzle.numberTextKey);
  const title = element("h1", "puzzle-title");
  title.textContent = t(puzzle.titleTextKey);
  title.dataset.typewriter = "true";
  card.append(number, title);
  if (stamped) {
    const stamp = element("div", "stamp-mark");
    stamp.textContent = t("stamp.restored");
    card.append(stamp);
    card.append(textButton("action.continue", "primary-button", () => gameStore.finishStamp()));
  } else {
    card.append(textButton("action.start", "primary-button", () => gameStore.startCardPuzzle()));
  }
  screen.append(renderSoundToggle(), card);
  return screen;
}

function renderGame(activeRoom: Room): HTMLElement {
  const state = gameStore.getState();
  const shell = element("main", "game-shell");
  shell.classList.add(`phase-${state.phase}`);
  const visibleLayer = state.peekLayer ?? state.activeLayer;
  const layerChanged = lastRenderedLayer !== null && lastRenderedLayer !== visibleLayer;
  lastRenderedLayer = visibleLayer;

  if (state.debug) {
    shell.classList.add("is-debug");
  }
  if (state.doorState !== "hidden") {
    shell.classList.add("has-clock-tick");
  }
  if (layerChanged) {
    shell.classList.add("is-layer-flash");
  }

  const topBar = element("header", "top-bar");
  const location = element("div", "location-label");
  location.textContent = t("object.room");
  const clockMark = renderClockMark("top-clock");
  const coinCounter = element("div", "coin-counter");
  coinCounter.textContent = `${t("drawer.coinCount")} ${getAvailableCoins(state)}/${activeRoom.coins.length}`;
  const layerChip = element("div", "layer-chip");
  layerChip.textContent = t(visibleLayer === "photo" ? "layer.photo" : "layer.now");
  topBar.append(location, clockMark, coinCounter, layerChip);

  const stageShell = element("section", "stage-shell");
  const stage = state.activeCloseupId ? renderCloseup(activeRoom, visibleLayer) : renderStage(activeRoom, visibleLayer);
  stageShell.append(stage);

  const drawer = renderDrawer(activeRoom);
  shell.append(topBar, stageShell, drawer, renderSoundToggle());

  if (state.toastKey) {
    const toast = element("div", "toast");
    toast.setAttribute("role", "status");
    toast.textContent = t(state.toastKey);
    shell.append(toast);
  }

  if (state.debug) {
    shell.append(renderDebugPanel(activeRoom));
  }

  return shell;
}

function renderStage(activeRoom: Room, visibleLayer: LayerId): HTMLElement {
  const state = gameStore.getState();
  const stage = element("div", "stage");
  stage.classList.add(visibleLayer === "photo" ? "is-photo" : "is-now");
  if (activeRoom.background.image) {
    stage.classList.add("has-art");
  }
  stage.dataset.layer = visibleLayer;
  stage.addEventListener("pointerdown", handleStagePointerDown);
  stage.addEventListener("contextmenu", (event) => event.preventDefault());

  if (state.phase === "accuseSpot") {
    stage.classList.add("is-accusing");
  }

  if (state.phase === "repairing") {
    stage.classList.add("is-repairing");
  }
  if (state.doorState !== "hidden") {
    stage.classList.add("has-clock-tick");
  }
  stage.classList.add(`door-${state.doorState}`);

  const background = element("div", "scene-background");
  background.classList.add(`shape-${activeRoom.background.fallbackShape.kind}`);
  setShapeStyle(background, activeRoom.background.fallbackShape.color, activeRoom.background.fallbackShape.accent);
  if (activeRoom.background.image) {
    const backgroundImage = element("img", "scene-bg-image");
    backgroundImage.src = activeRoom.background.image;
    backgroundImage.alt = "";
    backgroundImage.addEventListener("error", () => {
      stage.classList.remove("has-art");
      backgroundImage.remove();
    });
    background.append(backgroundImage);
  }

  const layer = element("div", "scene-layer");
  const objects = activeRoom.layers[visibleLayer].filter((sceneObject) => shouldRenderObject(sceneObject, state));
  for (const sceneObject of objects) {
    layer.append(renderSceneObject(sceneObject, visibleLayer));
  }

  stage.append(background, layer);

  if (visibleLayer === "photo") {
    stage.append(element("div", "photo-paper-edge"), element("div", "photo-grain"), element("div", "photo-vignette"));
  }

  const stageBanner = renderStageBanner();
  if (stageBanner) {
    stage.append(stageBanner);
  }

  return stage;
}

function renderCloseup(activeRoom: Room, visibleLayer: LayerId): HTMLElement {
  const state = gameStore.getState();
  const closeup = activeRoom.closeups.find((candidate) => candidate.id === state.activeCloseupId);
  const stage = element("div", "stage closeup-stage");
  stage.classList.add(visibleLayer === "photo" ? "is-photo" : "is-now");
  if (!closeup) {
    return stage;
  }
  const title = element("h2", "closeup-title");
  title.textContent = t(closeup.titleTextKey);
  const back = textButton("action.backRoom", "ghost-button closeup-back", () => gameStore.closeCloseup());
  const layer = element("div", "scene-layer closeup-layer");
  for (const sceneObject of closeup.layers[visibleLayer].filter((candidate) => shouldRenderObject(candidate, state))) {
    layer.append(renderSceneObject(sceneObject, visibleLayer));
  }
  stage.append(title, back, layer);
  if (visibleLayer === "photo") {
    stage.append(element("div", "photo-paper-edge"), element("div", "photo-grain"), element("div", "photo-vignette"));
  }
  return stage;
}

function shouldRenderObject(sceneObject: SceneObject, state: GameState): boolean {
  if (sceneObject.coinId && state.foundCoinIds.includes(sceneObject.coinId)) {
    return false;
  }
  if (sceneObject.appearsAfterRepair && !state.repairedLie) {
    return false;
  }
  if (sceneObject.hiddenWhenRepaired && state.repairedLie && state.phase !== "repairing") {
    return false;
  }
  if (sceneObject.visibleWhen && !matchesCondition(sceneObject.visibleWhen, state)) {
    return false;
  }
  if (sceneObject.hiddenWhen && matchesCondition(sceneObject.hiddenWhen, state)) {
    return false;
  }
  return true;
}

function matchesCondition(condition: NonNullable<SceneObject["visibleWhen"]>, state: GameState): boolean {
  if (condition.repairedLie !== undefined && state.repairedLie !== condition.repairedLie) {
    return false;
  }
  if (condition.minDoorState && !compareDoorState(state.doorState, condition.minDoorState)) {
    return false;
  }
  if (condition.completedPuzzles?.some((puzzleId) => !state.completedPuzzleIds.includes(puzzleId))) {
    return false;
  }
  if (condition.activePuzzleIds && (!state.activePuzzleId || !condition.activePuzzleIds.includes(state.activePuzzleId))) {
    return false;
  }
  if (condition.foundMemoIds?.some((memoId) => !state.foundMemoIds.includes(memoId))) {
    return false;
  }
  return true;
}

function renderSceneObject(sceneObject: SceneObject, visibleLayer: LayerId): HTMLElement {
  const state = gameStore.getState();
  const tagName = sceneObject.interactive === false ? "div" : "button";
  const node = element(tagName, "scene-object");
  node.classList.add(`shape-${sceneObject.fallbackShape.kind}`);
  if (sceneObject.imageClass) {
    node.classList.add(...sceneObject.imageClass.split(" ").filter(Boolean));
  }
  if (sceneObject.hitboxOnlyWithArt) {
    node.classList.add("hitbox-with-art");
  }
  node.style.setProperty("--x", `${sceneObject.rect.x}%`);
  node.style.setProperty("--y", `${sceneObject.rect.y}%`);
  node.style.setProperty("--w", `${sceneObject.rect.w}%`);
  node.style.setProperty("--h", `${sceneObject.rect.h}%`);
  node.style.setProperty("--z", String(sceneObject.z));
  setShapeStyle(node, sceneObject.fallbackShape.color, sceneObject.fallbackShape.accent);

  if (sceneObject.image) {
    node.classList.add("has-image");
    const image = element("img", "object-image");
    image.src = sceneObject.image;
    image.alt = "";
    image.addEventListener("error", () => {
      node.classList.remove("has-image");
      image.remove();
    });
    node.append(image);
  }

  if (sceneObject.coinId) {
    node.classList.add("is-coin");
  }

  if (sceneObject.candleId) {
    const lit = visibleLayer === "photo" ? sceneObject.lit : Boolean(state.candleStates[sceneObject.candleId]);
    node.classList.toggle("is-lit", lit);
  }

  if (sceneObject.seatId) {
    node.classList.add("seat-hotspot");
    if (state.selectedSeatId === sceneObject.seatId) {
      node.classList.add("is-selected-seat");
    }
  }

  if (state.phase === "accuseSpot" && sceneObject.selectableForLie) {
    node.classList.add("is-candidate");
  }

  if (state.phase === "repairing" && sceneObject.hiddenWhenRepaired) {
    node.classList.add("is-dissolving");
  }

  const label = element("span", "object-label");
  label.textContent = getObjectLabel(sceneObject, state);
  node.append(label);

  if (sceneObject.interactive !== false) {
    const button = node as HTMLButtonElement;
    button.type = "button";
    button.setAttribute("aria-label", getObjectLabel(sceneObject, state));
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      handleObjectClick(sceneObject, visibleLayer);
    });
  } else {
    node.setAttribute("aria-hidden", "true");
  }

  return node;
}

function getObjectLabel(sceneObject: SceneObject, state: GameState): string {
  const base = t(sceneObject.fallbackShape.labelKey);
  if (sceneObject.seatId && state.seatAssignments[sceneObject.seatId]) {
    return `${base}: ${t(getActorLabelKey(state.seatAssignments[sceneObject.seatId]))}`;
  }
  return base;
}

function renderStageBanner(): HTMLElement | null {
  const state = gameStore.getState();

  if (state.phase === "accuseSpot") {
    return renderBanner("stage.accuseSpot", null);
  }

  if (state.phase === "repairing") {
    return renderBanner("stage.repairing", textButton("action.skip", "ghost-button", finishRepairNow));
  }

  if (state.phase === "repairMessage") {
    return renderBanner("repair.message", textButton("action.continue", "ghost-button", finishRepairNow));
  }

  return null;
}

function renderBanner(key: TextKey, action: HTMLButtonElement | null): HTMLElement {
  const banner = element("div", "stage-banner");
  const text = element("p", "stage-banner-text");
  text.dataset.typewriter = "true";
  text.textContent = t(key);
  banner.append(text);
  if (action) {
    banner.append(action);
  }
  return banner;
}

function renderDrawer(activeRoom: Room): HTMLElement {
  const state = gameStore.getState();
  const drawer = element("section", "bottom-drawer");
  const controls = element("div", "control-row");

  if (state.phase === "explore" && !state.activeCloseupId) {
    const nextLayer = state.activeLayer === "now" ? "photo" : "now";
    controls.append(
      textButton(state.activeLayer === "now" ? "action.viewPhoto" : "action.returnNow", "primary-button", () => {
        gameStore.setLayer(nextLayer);
      })
    );
  }

  if (state.phase === "accuseSpot" || state.phase === "accuseReason") {
    controls.append(textButton("action.cancel", "secondary-button", () => gameStore.cancelAccusation()));
  }

  const foundMemos = getFoundMemos(activeRoom);
  const accusePuzzle = getPuzzle("accuse");
  if (
    state.phase === "explore" &&
    foundMemos.length >= accusePuzzle.requiredMemoCount &&
    !state.completedPuzzleIds.includes("accuse")
  ) {
    controls.append(textButton("action.accuse", "accent-button", () => gameStore.beginAccusation()));
  }

  drawer.append(controls);

  if (state.activePuzzleId && state.phase === "explore") {
    drawer.append(renderHintPanel(getPuzzle(state.activePuzzleId)));
  }

  if (state.phase === "accuseReason") {
    drawer.append(renderReasonChoices(foundMemos));
    return drawer;
  }

  if (state.selectedSeatId) {
    drawer.append(renderSeatChoices(state.selectedSeatId));
  }

  if (state.flavorTextKey) {
    const flavor = element("div", "flavor-line");
    const flavorTitle = element("span", "flavor-title");
    flavorTitle.textContent = t("drawer.flavorTitle");
    const flavorText = element("span", "flavor-text");
    flavorText.dataset.typewriter = "true";
    flavorText.textContent = t(state.flavorTextKey);
    flavor.append(flavorTitle, flavorText);
    drawer.append(flavor);
  }

  const memo = element("div", "memo-panel");
  const memoTitle = element("h2", "memo-title");
  memoTitle.textContent = t("drawer.memoTitle");
  memo.append(memoTitle);

  if (foundMemos.length === 0) {
    const empty = element("p", "memo-empty");
    empty.textContent = t("drawer.memoEmpty");
    memo.append(empty);
  } else {
    const list = element("ol", "memo-list");
    for (const memoEntry of foundMemos) {
      const item = element("li", "memo-item");
      item.textContent = t(memoEntry.memoTextKey);
      list.append(item);
    }
    memo.append(list);
  }

  drawer.append(memo);

  return drawer;
}

function renderHintPanel(puzzle: PuzzleDefinition): HTMLElement {
  const state = gameStore.getState();
  const panel = element("div", "hint-panel");
  const title = element("h2", "hint-title");
  title.textContent = t("drawer.hintTitle");
  panel.append(title);
  const unlocked = state.hintsUnlocked[puzzle.id] ?? 0;
  if (unlocked === 0) {
    const empty = element("p", "memo-empty");
    empty.textContent = t(puzzle.hints[0]);
    empty.classList.add("hint-locked");
    panel.append(empty);
  } else {
    const list = element("ol", "hint-list");
    for (const key of puzzle.hints.slice(0, unlocked)) {
      const item = element("li", "hint-item");
      item.textContent = t(key);
      list.append(item);
    }
    panel.append(list);
  }
  if (unlocked < puzzle.hints.length) {
    panel.append(textButton("action.useCoin", "secondary-button", () => {
      if (gameStore.unlockHint(puzzle.id)) {
        audio.play("coin");
      }
    }));
  }
  return panel;
}

function renderReasonChoices(foundMemos: MemoEntry[]): HTMLElement {
  const choices = element("div", "reason-panel");
  const prompt = element("p", "reason-prompt");
  prompt.textContent = t("stage.accuseReason");
  choices.append(prompt);

  for (const memoEntry of foundMemos) {
    const choice = textButton(memoEntry.memoTextKey, "reason-button", () => {
      submitReason(memoEntry.id);
    });
    choices.append(choice);
  }

  return choices;
}

function renderSeatChoices(seatId: string): HTMLElement {
  const puzzle = getPuzzle("seats");
  const panel = element("div", "seat-panel");
  const title = element("h2", "seat-title");
  title.textContent = `${t("drawer.seatTitle")} - ${t(getSeatLabelKey(seatId))}`;
  panel.append(title);
  for (const actor of puzzle.actors) {
    panel.append(commandButton(t(actor.labelKey), "reason-button seat-choice", () => {
      gameStore.assignSeat(seatId, actor.id);
      audio.play("tap");
      maybeCompleteSeats();
    }));
  }
  return panel;
}

function renderDebugPanel(activeRoom: Room): HTMLElement {
  const panel = element("aside", "debug-panel");
  const title = element("strong", "debug-title");
  title.textContent = t("debug.title");
  const answer = element("span", "debug-answer");
  answer.textContent = t("debug.answer");
  const unlock = textButton("debug.unlock", "debug-button", () => {
    gameStore.unlockAll(activeRoom.anomalies.map((memoEntry) => memoEntry.id));
  });
  const now = textButton("debug.now", "debug-button", () => {
    gameStore.enterRoom();
    gameStore.setLayer("now");
  });
  const photo = textButton("debug.photo", "debug-button", () => {
    gameStore.enterRoom();
    gameStore.setLayer("photo");
  });
  const accuse = textButton("debug.accuse", "debug-button", () => {
    gameStore.unlockAll(activeRoom.anomalies.slice(0, 3).map((memoEntry) => memoEntry.id));
    gameStore.beginAccusation();
  });
  const repair = textButton("debug.repair", "debug-button", () => {
    gameStore.completePuzzle("accuse");
  });
  const candles = textButton("debug.candles", "debug-button", () => {
    gameStore.debugCompleteCandles();
  });
  const clear = textButton("debug.continued", "debug-button", () => {
    gameStore.completePuzzle("seats");
  });

  panel.append(title, answer, unlock, now, photo, accuse, repair, candles, clear);
  return panel;
}

function handleObjectClick(sceneObject: SceneObject, visibleLayer: LayerId): void {
  if (Date.now() < suppressClicksUntil) {
    return;
  }

  audio.play("tap");
  const state = gameStore.getState();
  if (state.phase === "repairing") {
    return;
  }

  if (state.phase === "accuseSpot") {
    if (visibleLayer === "photo" && sceneObject.selectableForLie) {
      gameStore.selectSpot(sceneObject.spotId);
    } else {
      gameStore.inspect(sceneObject.inspectTextKey);
    }
    return;
  }

  if (visibleLayer === "photo" && sceneObject.anomalyId && !state.foundMemoIds.includes(sceneObject.anomalyId)) {
    const memoEntry = room.anomalies.find((candidate) => candidate.id === sceneObject.anomalyId);
    if (memoEntry && gameStore.addMemo(memoEntry.id, memoEntry.toastTextKey)) {
      audio.play("memo");
    }
    return;
  }

  const interaction = sceneObject.interaction;
  if (!interaction || interaction.kind === "inspect") {
    gameStore.inspect(sceneObject.inspectTextKey);
    return;
  }

  if (interaction.kind === "collectCoin") {
    if (gameStore.collectCoin(interaction.coinId)) {
      audio.play("coin");
    }
  } else if (interaction.kind === "openCloseup") {
    gameStore.openCloseup(interaction.closeupId);
  } else if (interaction.kind === "toggleCandle") {
    gameStore.toggleCandle(interaction.candleId);
    audio.play("ignite");
    maybeCompleteCandles();
  } else if (interaction.kind === "addMemo") {
    if (gameStore.addMemos(interaction.memoIds, interaction.toastTextKey)) {
      audio.play("memo");
    }
  } else if (interaction.kind === "assignSeat") {
    gameStore.selectSeat(interaction.seatId);
  }
}

function submitReason(reasonId: string): void {
  const state = gameStore.getState();
  const accusePuzzle = getPuzzle("accuse");
  if (state.selectedSpotId === accusePuzzle.spotId && reasonId === accusePuzzle.reasonId) {
    audio.play("success");
    gameStore.completePuzzle("accuse");
    return;
  }

  audio.play("wrong");
  gameStore.wrongAnswer();
}

function maybeCompleteCandles(): void {
  const state = gameStore.getState();
  if (state.activePuzzleId !== "candles" || state.completedPuzzleIds.includes("candles")) {
    return;
  }
  const puzzle = getPuzzle("candles");
  const solved = puzzle.candleIds.every((candleId) => Boolean(state.candleStates[candleId]) === puzzle.targetPattern[candleId]);
  if (solved) {
    audio.play("success");
    gameStore.completePuzzle("candles");
  }
}

function maybeCompleteSeats(): void {
  const state = gameStore.getState();
  if (state.activePuzzleId !== "seats" || state.completedPuzzleIds.includes("seats")) {
    return;
  }
  const puzzle = getPuzzle("seats");
  const filled = puzzle.seatIds.every((seatId) => state.seatAssignments[seatId]);
  if (!filled) {
    return;
  }
  const solved = puzzle.seatIds.every((seatId) => state.seatAssignments[seatId] === puzzle.correctAssignments[seatId]);
  if (solved) {
    audio.play("success");
    gameStore.completePuzzle("seats");
  } else {
    audio.play("wrong");
    gameStore.seatMismatch();
  }
}

function getFoundMemos(activeRoom: Room): MemoEntry[] {
  const state = gameStore.getState();
  return activeRoom.anomalies.filter((memoEntry) => state.foundMemoIds.includes(memoEntry.id));
}

function getPuzzle(id: "accuse"): Extract<PuzzleDefinition, { type: "accuse" }>;
function getPuzzle(id: "candles"): CandlesPuzzleDefinition;
function getPuzzle(id: "seats"): SeatsPuzzleDefinition;
function getPuzzle(id: PuzzleId): PuzzleDefinition;
function getPuzzle(id: PuzzleId): PuzzleDefinition {
  return room.puzzles[id];
}

function getAvailableCoins(state: GameState): number {
  return Math.max(0, state.foundCoinIds.length - state.coinsSpent);
}

function handleStagePointerDown(event: PointerEvent): void {
  const state = gameStore.getState();
  if (state.phase !== "explore") {
    return;
  }

  if (event.pointerType === "mouse" && event.button > 1) {
    return;
  }

  window.clearTimeout(pressTimer);
  longPressActive = false;
  pressTimer = window.setTimeout(() => {
    longPressActive = true;
    suppressClicksUntil = Date.now() + 500;
    audio.play("tap");
    gameStore.setPeekLayer(oppositeLayer(gameStore.getState().activeLayer));
  }, 300);

  window.addEventListener("pointerup", finishPointerPress);
  window.addEventListener("pointercancel", finishPointerPress);
  window.addEventListener("blur", finishPointerPress);
}

function finishPointerPress(): void {
  window.removeEventListener("pointerup", finishPointerPress);
  window.removeEventListener("pointercancel", finishPointerPress);
  window.removeEventListener("blur", finishPointerPress);
  window.clearTimeout(pressTimer);

  if (longPressActive) {
    suppressClicksUntil = Date.now() + 500;
    gameStore.setPeekLayer(null);
  }

  longPressActive = false;
}

function oppositeLayer(layer: LayerId): LayerId {
  return layer === "now" ? "photo" : "now";
}

function scheduleRepair(): void {
  clearRepairTimers();
  repairDoorTimer = window.setTimeout(() => {
    gameStore.revealDoor();
    audio.play("clock");
  }, 3800);
}

function finishRepairNow(): void {
  const state = gameStore.getState();
  clearRepairTimers();
  if (state.phase === "repairing") {
    gameStore.revealDoor();
    audio.play("clock");
    return;
  }
  gameStore.finishRepairMessage();
}

function clearRepairTimers(): void {
  window.clearTimeout(repairDoorTimer);
}

function textButton(key: TextKey, className: string, onClick: () => void): HTMLButtonElement {
  return commandButton(t(key), className, onClick);
}

function commandButton(text: string, className: string, onClick: () => void): HTMLButtonElement {
  const button = element("button", className);
  button.type = "button";
  button.textContent = text;
  button.addEventListener("click", () => {
    audio.play("tap");
    onClick();
  });
  return button;
}

function renderSoundToggle(): HTMLButtonElement {
  const button = textButton(audio.isMuted() ? "sound.off" : "sound.on", "sound-toggle", () => {
    audio.toggleMuted();
    render();
  });
  button.setAttribute("aria-pressed", String(!audio.isMuted()));
  return button;
}

function renderClockMark(className: string): HTMLElement {
  const state = gameStore.getState();
  const clock = element("div", `clock-mark ${className}`);
  if (state.doorState !== "hidden") {
    clock.classList.add("is-ticked");
  }
  const face = element("span", "clock-face");
  const hand = element("span", "clock-hand");
  const label = element("span", "clock-label");
  label.textContent = t("clock.zero");
  clock.append(face, hand, label);
  return clock;
}

function getActorLabelKey(actor: SeatActor): TextKey {
  return `actor.${actor}` as TextKey;
}

function getSeatLabelKey(seatId: string): TextKey {
  return `seat.${seatId.slice(-1)}` as TextKey;
}

function startTypewriters(): void {
  const currentRunId = (typewriterRunId += 1);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const targets = [...appRoot.querySelectorAll<HTMLElement>("[data-typewriter='true']")];
  for (const target of targets) {
    const fullText = target.textContent ?? "";
    if (fullText.length === 0) {
      continue;
    }
    target.textContent = "";
    target.classList.add("is-typing");
    let index = 0;
    let finished = false;
    const finish = (): void => {
      finished = true;
      target.textContent = fullText;
      target.classList.remove("is-typing");
    };
    const interval = window.setInterval(() => {
      if (currentRunId !== typewriterRunId || finished) {
        window.clearInterval(interval);
        return;
      }
      index += 1;
      target.textContent = fullText.slice(0, index);
      if (index >= fullText.length) {
        window.clearInterval(interval);
        target.classList.remove("is-typing");
      }
    }, 28);
    target.addEventListener("click", finish, { once: true });
  }
}

function element<K extends keyof HTMLElementTagNameMap>(tagName: K, className: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tagName);
  node.className = className;
  return node;
}

function setShapeStyle(node: HTMLElement, color: string, accent: string | undefined): void {
  node.style.setProperty("--shape-color", color);
  if (accent) {
    node.style.setProperty("--shape-accent", accent);
  }
}
