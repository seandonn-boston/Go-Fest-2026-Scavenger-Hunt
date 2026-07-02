/* ============================================================================
 * GO Fest 2026 Scavenger Hunt — app logic
 * All state lives in localStorage on the trainer's device. Nothing is sent
 * anywhere; verification happens in person with a Community Ambassador.
 * ==========================================================================*/

(function () {
  "use strict";

  const STORAGE_KEY = "gofest2026-hunt-v1";
  const TASK_COUNT = 3;

  /** @type {{username:string, tasks:Array, rerollUsed:boolean, createdAt:number}|null} */
  let state = null;

  // ---------------------------------------------------------------- storage
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.username !== "string" || !Array.isArray(parsed.tasks) || parsed.tasks.length !== TASK_COUNT) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full/blocked — app still works for this visit */
    }
  }

  // ------------------------------------------------------------- randomness
  function randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function pickFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // --------------------------------------------------------- task generation
  function makeCountTask(species) {
    const range = TIER_COUNTS[species.tier];
    return {
      id: cryptoId(),
      type: "count",
      species: species.name,
      habitat: species.habitat,
      count: randInt(range.min, range.max),
      done: false,
    };
  }

  function makeShinyTask(species) {
    return {
      id: cryptoId(),
      type: "shiny",
      species: species.name,
      habitat: species.habitat,
      done: false,
    };
  }

  function makeMewtwoTask() {
    return { id: cryptoId(), type: "mewtwo", done: false };
  }

  function cryptoId() {
    return Math.random().toString(36).slice(2, 10);
  }

  /**
   * Pick a species whose name and habitat differ from the ones already used.
   * Habitat exclusion is best-effort: relaxed if it would empty the pool.
   */
  function pickSpecies(usedNames, usedHabitats) {
    let pool = SPECIES.filter((s) => !usedNames.has(s.name) && !usedHabitats.has(s.habitat));
    if (pool.length === 0) pool = SPECIES.filter((s) => !usedNames.has(s.name));
    if (pool.length === 0) pool = SPECIES;
    return pickFrom(pool);
  }

  /**
   * Build one new task. `slots` are the task types to fill; species-based
   * types avoid repeating species/habitats already in `usedNames`/`usedHabitats`.
   */
  function buildTask(type, usedNames, usedHabitats) {
    if (type === "mewtwo") return makeMewtwoTask();
    const species = pickSpecies(usedNames, usedHabitats);
    usedNames.add(species.name);
    usedHabitats.add(species.habitat);
    return type === "shiny" ? makeShinyTask(species) : makeCountTask(species);
  }

  function generateTaskSet() {
    const slots = ["count", "count", "count"];
    let special = 0;
    if (Math.random() < MEWTWO_TASK_CHANCE) slots[special++] = "mewtwo";
    if (Math.random() < SHINY_TASK_CHANCE) slots[special++] = "shiny";

    const usedNames = new Set();
    const usedHabitats = new Set();
    return shuffle(slots).map((type) => buildTask(type, usedNames, usedHabitats));
  }

  /** Replacement task for a reroll: never repeats species/habitats on the board. */
  function rerollReplacement(oldTask, keptTasks) {
    const usedNames = new Set(keptTasks.map((t) => t.species).filter(Boolean));
    const usedHabitats = new Set(keptTasks.map((t) => t.habitat).filter(Boolean));
    if (oldTask.species) usedNames.add(oldTask.species); // never re-deal the same species

    // A reroll never introduces a second special of a kind already on the board,
    // and never deals Mewtwo (it stays a rare initial-draw surprise).
    const hasShiny = keptTasks.some((t) => t.type === "shiny");
    const type = !hasShiny && Math.random() < SHINY_TASK_CHANCE ? "shiny" : "count";
    return buildTask(type, usedNames, usedHabitats);
  }

  // ---------------------------------------------------------------- helpers
  function taskText(task) {
    if (task.type === "mewtwo") return MEWTWO_TASK.text;
    if (task.type === "shiny") return `Catch a shiny ${task.species}`;
    return `Catch ${task.count} ${task.species}`;
  }

  function taskNote(task) {
    if (task.type === "mewtwo") return MEWTWO_TASK.note;
    const species = SPECIES.find((s) => s.name === task.species);
    const line = species ? species.line : task.species;
    if (task.type === "shiny") {
      return `Any shiny in the family counts: ${line}.`;
    }
    return `The whole family counts: any mix of ${line}.`;
  }

  // ---------------------------------------------------------------- elements
  const $ = (sel) => document.querySelector(sel);
  const screenWelcome = $("#screen-welcome");
  const screenTasks = $("#screen-tasks");
  const taskList = $("#task-list");
  const greeting = $("#greeting");
  const rerollStatus = $("#reroll-status");
  const allDoneBanner = $("#all-done-banner");
  const menuBtn = $("#menu-btn");
  const menuPop = $("#menu-pop");
  const modalBackdrop = $("#modal-backdrop");
  const modalEl = modalBackdrop.querySelector(".modal");
  const modalTitle = $("#modal-title");
  const modalBody = $("#modal-body");
  const modalCancel = $("#modal-cancel");
  const modalConfirm = $("#modal-confirm");

  // ---------------------------------------------------------------- modal
  let onModalConfirm = null;

  function openModal({ title, bodyHTML, confirmLabel, infoOnly = false, danger = false, onConfirm = null }) {
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHTML;
    modalConfirm.textContent = confirmLabel;
    modalConfirm.style.background = danger ? "linear-gradient(120deg,#e03131,#ff6b6b)" : "";
    modalEl.classList.toggle("modal-info", infoOnly);
    onModalConfirm = onConfirm;
    modalBackdrop.hidden = false;
    modalConfirm.focus();
  }

  function closeModal() {
    modalBackdrop.hidden = true;
    onModalConfirm = null;
  }

  modalCancel.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModal();
  });
  modalConfirm.addEventListener("click", () => {
    const fn = onModalConfirm;
    closeModal();
    if (fn) fn();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalBackdrop.hidden) closeModal();
  });

  // ---------------------------------------------------------------- render
  function show(screen) {
    screenWelcome.hidden = screen !== "welcome";
    screenTasks.hidden = screen !== "tasks";
  }

  function renderTasks(rerolledId) {
    greeting.textContent = `Trainer ${state.username}`;
    taskList.innerHTML = "";

    state.tasks.forEach((task, index) => {
      const li = document.createElement("li");
      li.className = "task-card" + (task.done ? " is-done" : "");
      if (task.id === rerolledId) li.classList.add("rerolling");

      const habitat = task.habitat ? HABITATS[task.habitat] : null;

      const top = document.createElement("div");
      top.className = "task-top";
      const chip = document.createElement("span");
      chip.className = "habitat-chip";
      if (habitat) {
        chip.style.setProperty("--chip", habitat.color);
        chip.textContent = `${habitat.emoji} ${habitat.name}`;
      } else {
        chip.style.setProperty("--chip", "#5f3dc4");
        chip.textContent = "🧬 Legendary Exception";
      }
      top.appendChild(chip);
      if (habitat) {
        const when = document.createElement("span");
        when.className = "habitat-when";
        when.textContent = habitat.day;
        top.appendChild(when);
      }

      const text = document.createElement("p");
      text.className = "task-text";
      if (task.type === "shiny") {
        text.append("Catch a ");
        const em = document.createElement("span");
        em.className = "shiny";
        em.textContent = "✨ shiny";
        text.appendChild(em);
        text.append(` ${task.species}`);
      } else {
        text.textContent = taskText(task);
      }

      const note = document.createElement("p");
      note.className = "task-note";
      note.textContent = taskNote(task);

      const actions = document.createElement("div");
      actions.className = "task-actions";

      const doneBtn = document.createElement("button");
      doneBtn.className = "done-toggle";
      doneBtn.setAttribute("aria-pressed", String(task.done));
      doneBtn.innerHTML = `<span class="check" aria-hidden="true">✓</span><span>${task.done ? "Completed!" : "Mark complete"}</span>`;
      doneBtn.addEventListener("click", () => toggleDone(index));
      actions.appendChild(doneBtn);

      if (!state.rerollUsed) {
        const rerollBtn = document.createElement("button");
        rerollBtn.className = "reroll-btn";
        rerollBtn.innerHTML = `<span aria-hidden="true">🎲</span> Reroll`;
        rerollBtn.addEventListener("click", () => confirmReroll(index));
        actions.appendChild(rerollBtn);
      }

      li.append(top, text, note, actions);
      taskList.appendChild(li);
    });

    rerollStatus.textContent = state.rerollUsed
      ? "Your one reroll has been used."
      : "You may reroll ONE task — once for the whole hunt.";

    const allDone = state.tasks.every((t) => t.done);
    allDoneBanner.hidden = !allDone;
  }

  // ---------------------------------------------------------------- actions
  function toggleDone(index) {
    const wasAllDone = state.tasks.every((t) => t.done);
    state.tasks[index].done = !state.tasks[index].done;
    saveState();
    renderTasks();
    if (!wasAllDone && state.tasks.every((t) => t.done)) celebrate();
  }

  function confirmReroll(index) {
    const task = state.tasks[index];
    openModal({
      title: "Use your only reroll?",
      bodyHTML: `
        <p>This will replace:</p>
        <div class="modal-task-preview">${escapeHTML(taskText(task))}</div>
        <p>You get <strong>one reroll for the entire hunt</strong> — after this, your tasks are locked in.</p>`,
      confirmLabel: "Reroll it",
      onConfirm: () => {
        const kept = state.tasks.filter((_, i) => i !== index);
        const fresh = rerollReplacement(task, kept);
        state.tasks[index] = fresh;
        state.rerollUsed = true;
        saveState();
        renderTasks(fresh.id);
      },
    });
  }

  function confirmReset() {
    openModal({
      title: "Start over?",
      bodyHTML: `<p>This erases your trainer name, your three tasks, and your reroll. <strong>Community Ambassadors may not accept a re-dealt hunt</strong> — only do this if an Ambassador tells you to.</p>`,
      confirmLabel: "Erase & start over",
      danger: true,
      onConfirm: () => {
        localStorage.removeItem(STORAGE_KEY);
        state = null;
        $("#username").value = "";
        show("welcome");
      },
    });
  }

  function showAbout() {
    openModal({
      title: "About this hunt",
      bodyHTML: `
        <p>An <strong>unofficial, community-run scavenger hunt</strong> for GO Fest 2026: Global (July 11–12).</p>
        <p>Tasks are dealt from the event's wild habitat spawns — evolutions, babies, and regional forms all count toward a task (plus one special exception: Mewtwo).</p>
        <p>Everything is stored on this device only. To claim your reward, show this app and your Pokémon GO app to a Community Ambassador.</p>
        <p>Not affiliated with Niantic, Nintendo, or The Pokémon Company.</p>`,
      confirmLabel: "Got it",
      infoOnly: true,
    });
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------------------------------------------------------------- confetti
  function celebrate() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#ffd43b", "#845ef7", "#51cf66", "#ff6b6b", "#22b8cf", "#f783ac"];
    for (let i = 0; i < 80; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti";
      piece.style.left = Math.random() * 100 + "vw";
      piece.style.background = pickFrom(colors);
      piece.style.animationDuration = 2.2 + Math.random() * 2.2 + "s";
      piece.style.animationDelay = Math.random() * 0.6 + "s";
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 5500);
    }
  }

  // ---------------------------------------------------------------- wire-up
  $("#welcome-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const username = $("#username").value.trim();
    if (!username) return;
    state = {
      username,
      tasks: generateTaskSet(),
      rerollUsed: false,
      createdAt: Date.now(),
    };
    saveState();
    renderTasks();
    show("tasks");
    window.scrollTo(0, 0);
  });

  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = menuPop.hidden;
    menuPop.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", () => {
    if (!menuPop.hidden) {
      menuPop.hidden = true;
      menuBtn.setAttribute("aria-expanded", "false");
    }
  });
  menuPop.addEventListener("click", (e) => e.stopPropagation());

  $("#reset-btn").addEventListener("click", () => {
    menuPop.hidden = true;
    confirmReset();
  });
  $("#about-btn").addEventListener("click", () => {
    menuPop.hidden = true;
    showAbout();
  });

  // ---------------------------------------------------------------- boot
  state = loadState();
  if (state) {
    renderTasks();
    show("tasks");
  } else {
    show("welcome");
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {
        /* offline install is a bonus, not a requirement */
      });
    });
  }
})();
