import "./styles.css";
import { firstRoom } from "./content/rooms";
import { t, type TextKey } from "./i18n";
import { gameStore } from "./store";
import type { Anomaly, LayerId, Room, SceneObject } from "./types";

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
let repairFinishTimer = 0;

document.title = t("app.title");
gameStore.subscribe(render);
gameStore.on("repairStarted", scheduleRepair);

render();

function render(): void {
  const state = gameStore.getState();
  appRoot.replaceChildren();

  if (state.phase === "intro") {
    appRoot.append(renderIntro());
    return;
  }

  if (state.phase === "continued") {
    appRoot.append(renderContinued());
    return;
  }

  appRoot.append(renderGame(room));
}

function renderIntro(): HTMLElement {
  const screen = element("main", "intro-screen");
  const title = element("h1", "intro-title");
  title.textContent = t("app.title");
  const text = element("p", "intro-text");
  text.textContent = t("intro.text");
  const enterButton = textButton("intro.enter", "primary-button", () => {
    gameStore.enterRoom();
  });

  screen.append(title, text, enterButton);
  return screen;
}

function renderContinued(): HTMLElement {
  const screen = element("main", "continued-screen");
  const title = element("h1", "continued-title");
  title.textContent = t("continued.title");
  const body = element("p", "continued-body");
  body.textContent = t("continued.body");
  const note = element("p", "continued-note");
  note.textContent = t("continued.note");
  const restartButton = textButton("action.restart", "secondary-button", () => {
    clearRepairTimers();
    gameStore.reset();
  });

  screen.append(title, body, note, restartButton);
  return screen;
}

function renderGame(activeRoom: Room): HTMLElement {
  const state = gameStore.getState();
  const shell = element("main", "game-shell");
  const visibleLayer = state.peekLayer ?? state.activeLayer;

  if (state.debug) {
    shell.classList.add("is-debug");
  }

  const topBar = element("header", "top-bar");
  const location = element("div", "location-label");
  location.textContent = t("object.room");
  const layerChip = element("div", "layer-chip");
  layerChip.textContent = t(visibleLayer === "photo" ? "layer.photo" : "layer.now");
  topBar.append(location, layerChip);

  const stageShell = element("section", "stage-shell");
  const stage = renderStage(activeRoom, visibleLayer);
  stageShell.append(stage);

  const drawer = renderDrawer(activeRoom);
  shell.append(topBar, stageShell, drawer);

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
  stage.dataset.layer = visibleLayer;
  stage.addEventListener("pointerdown", handleStagePointerDown);
  stage.addEventListener("contextmenu", (event) => event.preventDefault());

  if (state.phase === "accuseSpot") {
    stage.classList.add("is-accusing");
  }

  if (state.phase === "repairing") {
    stage.classList.add("is-repairing");
  }

  const background = element("div", "scene-background");
  background.classList.add(`shape-${activeRoom.background.fallbackShape.kind}`);
  setShapeStyle(background, activeRoom.background.fallbackShape.color, activeRoom.background.fallbackShape.accent);
  if (activeRoom.background.image) {
    background.style.backgroundImage = `url(${activeRoom.background.image})`;
  }

  const layer = element("div", "scene-layer");
  const objects = activeRoom.layers[visibleLayer].filter((sceneObject) => shouldRenderObject(sceneObject));
  for (const sceneObject of objects) {
    layer.append(renderSceneObject(sceneObject, visibleLayer));
  }

  stage.append(background, layer);

  if (visibleLayer === "photo") {
    stage.append(element("div", "photo-grain"), element("div", "photo-vignette"));
  }

  const stageBanner = renderStageBanner();
  if (stageBanner) {
    stage.append(stageBanner);
  }

  return stage;
}

function shouldRenderObject(sceneObject: SceneObject): boolean {
  const state = gameStore.getState();
  if (sceneObject.appearsAfterRepair && !state.doorRevealed) {
    return false;
  }
  if (sceneObject.hiddenWhenRepaired && state.repairedLie && state.phase !== "repairing") {
    return false;
  }
  return true;
}

function renderSceneObject(sceneObject: SceneObject, visibleLayer: LayerId): HTMLElement {
  const state = gameStore.getState();
  const tagName = sceneObject.interactive === false ? "div" : "button";
  const node = element(tagName, "scene-object");
  node.classList.add(`shape-${sceneObject.fallbackShape.kind}`);
  node.style.setProperty("--x", `${sceneObject.rect.x}%`);
  node.style.setProperty("--y", `${sceneObject.rect.y}%`);
  node.style.setProperty("--w", `${sceneObject.rect.w}%`);
  node.style.setProperty("--h", `${sceneObject.rect.h}%`);
  node.style.setProperty("--z", String(sceneObject.z));
  setShapeStyle(node, sceneObject.fallbackShape.color, sceneObject.fallbackShape.accent);

  if (sceneObject.image) {
    node.classList.add("has-image");
    node.style.backgroundImage = `url(${sceneObject.image})`;
  }

  if (state.phase === "accuseSpot" && sceneObject.selectableForLie) {
    node.classList.add("is-candidate");
  }

  if (state.phase === "repairing" && sceneObject.hiddenWhenRepaired) {
    node.classList.add("is-dissolving");
  }

  const label = element("span", "object-label");
  label.textContent = t(sceneObject.fallbackShape.labelKey);
  node.append(label);

  if (sceneObject.interactive !== false) {
    const button = node as HTMLButtonElement;
    button.type = "button";
    button.setAttribute("aria-label", t(sceneObject.fallbackShape.labelKey));
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      handleObjectClick(sceneObject, visibleLayer);
    });
  } else {
    node.setAttribute("aria-hidden", "true");
  }

  return node;
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

  if (state.phase === "explore") {
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

  const foundAnomalies = getFoundAnomalies(activeRoom);
  if (state.phase === "explore" && foundAnomalies.length >= 2 && !state.repairedLie) {
    controls.append(textButton("action.accuse", "accent-button", () => gameStore.beginAccusation()));
  }

  drawer.append(controls);

  if (state.flavorTextKey) {
    const flavor = element("div", "flavor-line");
    const flavorTitle = element("span", "flavor-title");
    flavorTitle.textContent = t("drawer.flavorTitle");
    const flavorText = element("span", "flavor-text");
    flavorText.textContent = t(state.flavorTextKey);
    flavor.append(flavorTitle, flavorText);
    drawer.append(flavor);
  }

  const memo = element("div", "memo-panel");
  const memoTitle = element("h2", "memo-title");
  memoTitle.textContent = t("drawer.memoTitle");
  memo.append(memoTitle);

  if (foundAnomalies.length === 0) {
    const empty = element("p", "memo-empty");
    empty.textContent = t("drawer.memoEmpty");
    memo.append(empty);
  } else {
    const list = element("ol", "memo-list");
    for (const anomaly of foundAnomalies) {
      const item = element("li", "memo-item");
      item.textContent = t(anomaly.memoTextKey);
      list.append(item);
    }
    memo.append(list);
  }

  drawer.append(memo);

  if (state.phase === "accuseReason") {
    drawer.append(renderReasonChoices(foundAnomalies));
  }

  return drawer;
}

function renderReasonChoices(foundAnomalies: Anomaly[]): HTMLElement {
  const choices = element("div", "reason-panel");
  const prompt = element("p", "reason-prompt");
  prompt.textContent = t("stage.accuseReason");
  choices.append(prompt);

  for (const anomaly of foundAnomalies) {
    const choice = textButton(anomaly.memoTextKey, "reason-button", () => {
      submitReason(anomaly.id);
    });
    choices.append(choice);
  }

  return choices;
}

function renderDebugPanel(activeRoom: Room): HTMLElement {
  const panel = element("aside", "debug-panel");
  const title = element("strong", "debug-title");
  title.textContent = t("debug.title");
  const answer = element("span", "debug-answer");
  answer.textContent = t("debug.answer");
  const unlock = textButton("debug.unlock", "debug-button", () => {
    gameStore.unlockAll(activeRoom.anomalies.map((anomaly) => anomaly.id));
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
    gameStore.unlockAll(activeRoom.anomalies.map((anomaly) => anomaly.id));
    gameStore.beginAccusation();
  });
  const repair = textButton("debug.repair", "debug-button", () => {
    gameStore.startRepair();
  });
  const continued = textButton("debug.continued", "debug-button", () => {
    gameStore.finishRepair();
  });

  panel.append(title, answer, unlock, now, photo, accuse, repair, continued);
  return panel;
}

function handleObjectClick(sceneObject: SceneObject, visibleLayer: LayerId): void {
  if (Date.now() < suppressClicksUntil) {
    return;
  }

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

  if (state.phase === "explore" || state.phase === "repairMessage") {
    if (visibleLayer === "photo" && sceneObject.anomalyId) {
      const anomaly = room.anomalies.find((candidate) => candidate.id === sceneObject.anomalyId);
      if (anomaly) {
        gameStore.addAnomaly(anomaly.id, anomaly.toastTextKey);
      }
      return;
    }

    gameStore.inspect(sceneObject.inspectTextKey);
  }
}

function submitReason(reasonId: string): void {
  const state = gameStore.getState();
  if (state.selectedSpotId === room.lie.spotId && reasonId === room.lie.reasonId) {
    gameStore.startRepair();
    return;
  }

  gameStore.wrongAnswer();
}

function getFoundAnomalies(activeRoom: Room): Anomaly[] {
  const state = gameStore.getState();
  return activeRoom.anomalies.filter((anomaly) => state.foundAnomalyIds.includes(anomaly.id));
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
  }, 1150);
}

function finishRepairNow(): void {
  clearRepairTimers();
  gameStore.finishRepair();
}

function clearRepairTimers(): void {
  window.clearTimeout(repairDoorTimer);
  window.clearTimeout(repairFinishTimer);
}

function textButton(key: TextKey, className: string, onClick: () => void): HTMLButtonElement {
  const button = element("button", className);
  button.type = "button";
  button.textContent = t(key);
  button.addEventListener("click", onClick);
  return button;
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
