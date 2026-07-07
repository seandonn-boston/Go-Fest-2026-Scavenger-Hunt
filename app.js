/* ============================================================================
 * GO Fest 2026 Scavenger Hunt — app logic
 * All state lives in localStorage on the trainer's device. Nothing is sent
 * anywhere; verification happens in person with a Community Ambassador.
 *
 * The hunt runs once per event day: each day gets its own four tasks
 * (catch 26 / obtain 1 shiny / catch 1 Mewtwo / high five) with separate
 * progress. The catch and shiny tasks are each rerollable once per day, and
 * no species is ever dealt twice in the same weekend.
 * ==========================================================================*/

(function () {
  "use strict";

  // Bump this when the saved-hunt shape or the deal rules change, so hunts
  // dealt under old rules are discarded instead of rendered with stale data
  // (e.g. a pre-window-cut habitat, or a catch task with no random count).
  const STORAGE_KEY = "gofest2026-hunt-v3";

  /**
   * @type {{
   *   username: string,
   *   createdAt: number,
   *   usedSpecies: string[],  // every species ever dealt, incl. rerolled-away
   *   days: {[dayKey: string]: null | {
   *     tasks: Array<{id:string, type:string, species?:string, habitat?:string, done:boolean}>,
   *     rerolls: {catch: boolean, shiny: boolean},
   *   }},
   * }|null}
   */
  let state = null;
  let activeDay = defaultDay();

  function defaultDay() {
    // Default to Sunday's hunt once Saturday is over (event: Jul 11–12, 2026).
    return new Date() >= new Date(2026, 6, 12) ? "day2" : "day1";
  }

  // ---------------------------------------------------------------- storage
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.username !== "string" || !parsed.days || !Array.isArray(parsed.usedSpecies)) {
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
  function pickFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function cryptoId() {
    return Math.random().toString(36).slice(2, 10);
  }

  // --------------------------------------------------------- task generation
  /** A species qualifies for a day if EITHER of its types is featured that day. */
  function onDay(species, dayKey) {
    return species.types.some((t) => DAYS[dayKey].types.includes(t));
  }

  /** The habitat block a species belongs to on a given day (for the card chip):
   *  its primary type's block if featured that day, otherwise its second type's. */
  function habitatFor(species, dayKey) {
    const type = species.types.find((t) => DAYS[dayKey].types.includes(t)) || species.types[0];
    return TYPE_HABITAT[type];
  }

  /**
   * Pick a species featured on the given day from the allowed tiers, never
   * repeating anything dealt earlier this weekend (rerolled-away picks
   * included). The tier filter is relaxed in the unlikely event it empties
   * the pool; the no-repeat rule is only relaxed if literally every featured
   * species has already been dealt.
   */
  function pickSpecies(dayKey, tiers) {
    const used = new Set(state.usedSpecies);
    let pool = SPECIES.filter((s) => onDay(s, dayKey) && tiers.includes(s.tier) && !used.has(s.name));
    if (pool.length === 0) pool = SPECIES.filter((s) => onDay(s, dayKey) && !used.has(s.name));
    if (pool.length === 0) pool = SPECIES.filter((s) => onDay(s, dayKey));
    const species = pickFrom(pool);
    state.usedSpecies.push(species.name);
    return species;
  }

  function makeSpeciesTask(type, dayKey) {
    const species = pickSpecies(dayKey, type === "catch" ? CATCH_TASK_TIERS : SHINY_TASK_TIERS);
    const task = { id: cryptoId(), type, species: species.name, habitat: habitatFor(species, dayKey), done: false };
    // Catch tasks get a fresh random target count (re-rolled with the task).
    if (type === "catch") task.count = randInt(CATCH_COUNT_MIN, CATCH_COUNT_MAX);
    return task;
  }

  /** Deal a full day: catch N, shiny, Mewtwo, high five — in that order. */
  function dealDay(dayKey) {
    state.days[dayKey] = {
      tasks: [
        makeSpeciesTask("catch", dayKey),
        makeSpeciesTask("shiny", dayKey),
        { id: cryptoId(), type: "mewtwo", done: false },
        { id: cryptoId(), type: "highfive", done: false },
      ],
      rerolls: { catch: false, shiny: false },
    };
    saveState();
  }

  // ---------------------------------------------------------------- helpers
  function taskText(task) {
    if (task.type === "mewtwo") return MEWTWO_TASK.text;
    if (task.type === "highfive") return HIGHFIVE_TASK.text;
    if (task.type === "shiny") return `Obtain 1 shiny ${task.species}`;
    return `Catch ${task.count} ${task.species}`;
  }

  function taskNote(task) {
    if (task.type === "mewtwo") return MEWTWO_TASK.note;
    if (task.type === "highfive") return HIGHFIVE_TASK.note;
    const species = SPECIES.find((s) => s.name === task.species);
    const line = species ? species.line : task.species;
    if (task.type === "shiny") {
      return `Catching it or trading for it both count. Any shiny in the family works: ${line}.`;
    }
    return `The whole family counts: any mix of ${line}.`;
  }

  // ---------------------------------------------------------------- elements
  const $ = (sel) => document.querySelector(sel);
  const screenWelcome = $("#screen-welcome");
  const screenTasks = $("#screen-tasks");
  const taskList = $("#task-list");
  const greeting = $("#greeting");
  const dayTabs = $("#day-tabs");
  const dayIntro = $("#day-intro");
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

  function renderDayTabs() {
    dayTabs.innerHTML = "";
    for (const [dayKey, day] of Object.entries(DAYS)) {
      const btn = document.createElement("button");
      btn.className = "day-tab" + (dayKey === activeDay ? " is-active" : "");
      btn.setAttribute("aria-pressed", String(dayKey === activeDay));
      const dayState = state.days[dayKey];
      const doneCount = dayState ? dayState.tasks.filter((t) => t.done).length : 0;
      const progress = dayState ? ` · ${doneCount}/${dayState.tasks.length}` : "";
      btn.innerHTML = `<strong>${day.label}</strong><span>${day.date}${progress}</span>`;
      btn.addEventListener("click", () => {
        activeDay = dayKey;
        renderTasks();
      });
      dayTabs.appendChild(btn);
    }
  }

  function renderTasks(rerolledId) {
    greeting.textContent = `Trainer ${state.username}`;

    // Deal this day's tasks the first time it's viewed.
    if (!state.days[activeDay]) dealDay(activeDay);
    const dayState = state.days[activeDay];
    const day = DAYS[activeDay];

    renderDayTabs();

    dayIntro.innerHTML = "";
    for (const key of day.habitats) {
      const h = HABITATS[key];
      const chip = document.createElement("span");
      chip.className = "habitat-chip habitat-chip-mini";
      chip.style.setProperty("--chip", h.color);
      chip.textContent = `${h.emoji} ${h.name} · ${h.time}`;
      dayIntro.appendChild(chip);
    }

    taskList.innerHTML = "";
    dayState.tasks.forEach((task, index) => {
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
      } else if (task.type === "mewtwo") {
        chip.style.setProperty("--chip", "#5f3dc4");
        chip.textContent = "🧬 Legendary Exception";
      } else {
        chip.style.setProperty("--chip", "#e8590c");
        chip.textContent = "🖐️ Just for fun";
      }
      top.appendChild(chip);
      if (habitat) {
        const when = document.createElement("span");
        when.className = "habitat-when";
        when.textContent = `${day.label} · ${habitat.time}`;
        top.appendChild(when);
      }

      const text = document.createElement("p");
      text.className = "task-text";
      if (task.type === "shiny") {
        text.append("Obtain 1 ");
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

      const rerollable = task.type === "catch" || task.type === "shiny";
      if (rerollable && !dayState.rerolls[task.type]) {
        const rerollBtn = document.createElement("button");
        rerollBtn.className = "reroll-btn";
        rerollBtn.innerHTML = `<span aria-hidden="true">🎲</span> Reroll`;
        rerollBtn.addEventListener("click", () => confirmReroll(index));
        actions.appendChild(rerollBtn);
      }

      li.append(top, text, note, actions);
      taskList.appendChild(li);
    });

    const left = ["catch", "shiny"].filter((t) => !dayState.rerolls[t]).length;
    rerollStatus.textContent =
      left === 0
        ? `Both of ${day.label}'s rerolls have been used.`
        : `${left} of 2 rerolls left for ${day.label} — one each for the Catch and Shiny tasks.`;

    // "Qualified" = the three real tasks are done (the high five happens at the
    // tent, so it doesn't gate the giveaway).
    allDoneBanner.hidden = !isQualified(dayState);
  }

  /** The giveaway-qualifying tasks: everything except the high five. */
  function qualifyingTasks(dayState) {
    return dayState.tasks.filter((t) => t.type !== "highfive");
  }

  function isQualified(dayState) {
    return qualifyingTasks(dayState).every((t) => t.done);
  }

  // ---------------------------------------------------------------- actions
  function toggleDone(index) {
    const dayState = state.days[activeDay];
    const wasQualified = isQualified(dayState);
    dayState.tasks[index].done = !dayState.tasks[index].done;
    saveState();
    renderTasks();
    // Fire the fun popup the moment the three real tasks are all complete
    // (the high five may or may not be done — it doesn't matter).
    if (!wasQualified && isQualified(dayState)) showGiveawayPopup();
  }

  function showGiveawayPopup() {
    celebrate();
    openModal({
      title: "🎉 Tasks complete!",
      bodyHTML: `<p style="font-size:16px;color:var(--ink)"><strong>Check in with the Community Ambassador Tent to enter the giveaway!</strong></p>`,
      confirmLabel: "On my way!",
      infoOnly: true,
    });
  }

  function confirmReroll(index) {
    const dayState = state.days[activeDay];
    const task = dayState.tasks[index];
    const label = task.type === "catch" ? "Catch" : "Shiny";
    openModal({
      title: `Reroll your ${label} task?`,
      bodyHTML: `
        <p>This will replace:</p>
        <div class="modal-task-preview">${escapeHTML(taskText(task))}</div>
        <p>The ${label} task can be rerolled <strong>once per day</strong> — after this, it's locked in for ${DAYS[activeDay].label}.</p>`,
      confirmLabel: "Reroll it",
      onConfirm: () => {
        const fresh = makeSpeciesTask(task.type, activeDay);
        dayState.tasks[index] = fresh;
        dayState.rerolls[task.type] = true;
        saveState();
        renderTasks(fresh.id);
      },
    });
  }

  function confirmReset() {
    openModal({
      title: "Start over?",
      bodyHTML: `<p>This erases your trainer name and BOTH days' tasks, progress, and rerolls. <strong>Community Ambassadors may not accept a re-dealt hunt</strong> — only do this if an Ambassador tells you to.</p>`,
      confirmLabel: "Erase & start over",
      danger: true,
      onConfirm: () => {
        localStorage.removeItem(STORAGE_KEY);
        state = null;
        activeDay = defaultDay();
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
        <p>You hunt twice — four fresh tasks each day, matched to what spawns in that day's 10am–4pm window (the final 4–7pm block is left out so rewards can be handed out earlier). Every wild-spawning, non-Legendary Pokémon in that window is fair game (minus regionals we can't get in Boston, egg/raid-only species, and shape-shifters — sorry, Ditto and Zorua). A task for one species is satisfied by anything in its evolutionary family, and you'll never be asked to hunt the same species twice all weekend.</p>
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
      createdAt: Date.now(),
      usedSpecies: [],
      days: { day1: null, day2: null },
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
