"use strict";

(function () {
  function L(fr, en) {
    var lang = "";
    if (typeof document !== "undefined" && document.documentElement) {
      lang = document.documentElement.lang || "";
    }
    return /^en/i.test(lang) ? en : fr;
  }

  var GROUPS = [
    { bits: [15], place: "×100000" },
    { bits: [14, 13, 12], place: "×10000" },
    { bits: [11, 10, 9], place: "×1000" },
    { bits: [8, 7, 6], place: "×100" },
    { bits: [5, 4, 3], place: "×10" },
    { bits: [2, 1, 0], place: "×1" },
  ];

  var m = PDP11.createMachine();
  var course = Course.createCourse(m);
  var chalKey = "pdp11-ecole-defis";
  var doneChal = {};
  try {
    doneChal = JSON.parse(localStorage.getItem(chalKey) || "{}") || {};
  } catch (e) {
    doneChal = {};
  }

  var bitCursor = 0;
  var dwell = 0;
  var builtStep = null;
  var resetArmed = false;
  var decodeText = "";

  var el = {};

  function oct(n) {
    return PDP11.oct(n);
  }

  function groupDigit(value, bits) {
    var digit = 0;
    for (var i = 0; i < bits.length; i++) {
      if (value & (1 << bits[i])) digit += 1 << (bits.length - 1 - i);
    }
    return digit;
  }

  function $(id) {
    return document.getElementById(id);
  }

  function lampValue() {
    if (m.running) return m.r[7] & 0xffff;
    return m.addr & 0xffff;
  }

  function dataValue() {
    if (m.running) return PDP11.displayedData(m);
    return m.data & 0xffff;
  }

  function addrCaption() {
    return m.running ? L("Compteur ordinal (PC)", "Program counter (PC)") : L("Registre d'adresse du pupitre", "Panel address register");
  }

  function dataCaption() {
    if (!m.running) return L("Dernier EXAM ou DEP", "Last EXAM or DEP");
    if (m.display === "r0") return L("Registre R0, parce que l'affichage est sur R0", "Register R0, because the display is on R0");
    if (m.display === "instr") return L("Mot à l'adresse du PC", "Word at the PC address");
    return L("Dernier mot lu ou écrit sur le bus", "Last word read or written on the bus");
  }

  function statusText() {
    if (m.running) return "RUN";
    if (m.haltReason === "opcode") return L("ARRÊT PAR L'INSTRUCTION HALT", "HALTED BY THE HALT INSTRUCTION");
    if (m.haltReason === "switch") return L("ARRÊT PAR L'OPÉRATEUR", "HALTED BY THE OPERATOR");
    if (m.haltReason === "step") return L("UN PAS EXÉCUTÉ", "ONE STEP EXECUTED");
    if (m.haltReason === "wait") return "WAIT";
    if (m.haltReason === "bus") return L("ERREUR DE BUS", "BUS ERROR");
    if (m.haltReason === "unknown") return L("MOT INCONNU ", "UNKNOWN WORD ") + oct(m.unknown);
    return L("SOUS TENSION, ARRÊTÉE", "POWER ON, HALTED");
  }

  function narrate() {
    var e = course.lastEvent;
    if (!e) {
      return L("Aucun geste encore. Les interrupteurs se lisent en octal, par groupes de trois bits : poids 4, 2 et 1.", "No gesture yet. The switches are read in octal, in groups of three bits: weights 4, 2, and 1.");
    }
    if (e.type === "switch") {
      return L("Interrupteurs à ", "Switches at ") + oct(m.switches) + "₈ (" + (m.switches & 0xffff) + L("₁₀). Les lampes ne suivent pas toutes seules.", "₁₀). The lamps do not follow by themselves.");
    }
    if (e.type === "load") {
      return L("LOAD ADRS a copié ", "LOAD ADRS copied ") + oct(e.addr) + L(" dans le registre d'adresse.", " into the address register.");
    }
    if (e.type === "exam" && e.rejected) {
      return L("EXAM ignoré : la machine tourne. Baisse HALT d'abord.", "EXAM ignored: the machine is running. Lower HALT first.");
    }
    if (e.type === "exam" && e.err) {
      return "EXAM " + L("en ", "at ") + oct(e.at) + L(" : adresse impaire. ADRS ERR s'allume, rien n'est lu.", ": odd address. ADRS ERR lights, nothing is read.");
    }
    if (e.type === "exam" && typeof e.reg === "number") {
      var name = e.reg === 7 ? "PC" : "R" + e.reg;
      return "EXAM " + oct(e.at) + L(" lit ", " reads ") + name + " = " + oct(e.data) + L(". L'adresse avance de 1, à ", ". The address advances by 1, to ") + oct(m.addr) + ".";
    }
    if (e.type === "exam") {
      return "EXAM " + oct(e.at) + L(" lit ", " reads ") + oct(e.data) + L(". L'adresse avance de 2, à ", ". The address advances by 2, to ") + oct(m.addr) + ".";
    }
    if (e.type === "dep" && e.rejected) return L("DEP ignoré pendant RUN.", "DEP ignored while RUN is on.");
    if (e.type === "dep" && e.err) return L("DEP refusé : adresse impaire.", "DEP refused: odd address.");
    if (e.type === "dep" && typeof e.reg === "number") {
      return L("DEP a écrit ", "DEP wrote ") + oct(e.data) + L(" dans R", " into R") + e.reg + ".";
    }
    if (e.type === "dep") {
      return L("DEP a écrit ", "DEP wrote ") + oct(e.data) + L(" en ", " at ") + oct(e.at) + L(". Adresse suivante : ", ". Next address: ") + oct(m.addr) + ".";
    }
    if (e.type === "start" && e.rejected) return L("START ignoré : déjà en marche.", "START ignored: already running.");
    if (e.type === "start" && e.running) return L("START a copié ", "START copied ") + oct(e.pc) + L(" dans le PC et lancé l'exécution.", " into the PC and started execution.");
    if (e.type === "start") return L("START a chargé le PC avec ", "START loaded the PC with ") + oct(e.pc) + L(", sans lancer : l'interrupteur est sur HALT.", ", without starting: the switch is on HALT.");
    if (e.type === "cont" && e.rejected) return L("CONT ignoré : la machine tourne déjà.", "CONT ignored: the machine is already running.");
    if (e.type === "cont" && e.running) return L("CONT relance l'exécution depuis le PC actuel.", "CONT resumes execution from the current PC.");
    if (e.type === "cont") return L("CONT a exécuté une instruction (", "CONT executed one instruction (") + e.why + "). PC = " + oct(e.pc) + ".";
    if (e.type === "enable") return e.on ? L("ENABLE autorise START et CONT à lancer la course.", "ENABLE lets START and CONT begin the run.") : L("Interrupteur sur HALT.", "Switch on HALT.");
    if (e.type === "knob") return L("Affichage DATA pendant RUN : ", "DATA display while running: ") + knobLabel(m.display) + ".";
    return L("Geste enregistré.", "Gesture recorded.");
  }

  function knobLabel(id) {
    if (id === "r0") return "R0";
    if (id === "instr") return "INSTR";
    return "BUS";
  }

  function blocked() {
    var goal = $("goal");
    goal.classList.add("shake");
    window.setTimeout(function () { goal.classList.remove("shake"); }, 350);
  }

  function act(fn) {
    if (course.satisfied) {
      blocked();
      return;
    }
    var event = fn();
    course.input(event);
    paint();
  }

  function toggleBit(bit) {
    act(function () {
      var mask = 1 << bit;
      if (m.switches & mask) m.switches &= ~mask;
      else m.switches |= mask;
      m.switches &= 0xffff;
      return { type: "switch", bit: bit };
    });
  }

  function setEnable(on) {
    if (course.satisfied) {
      blocked();
      return;
    }
    m.enable = on;
    if (!on) PDP11.runSlice(m, 1);
    course.input({ type: "enable", on: on });
    paint();
  }

  function setDisplay(mode) {
    if (course.satisfied) {
      blocked();
      return;
    }
    m.display = mode;
    course.input({ type: "knob", knob: mode });
    paint();
  }

  function buildLamps(host) {
    host.replaceChildren();
    GROUPS.forEach(function (group) {
      var box = document.createElement("div");
      box.className = "group";
      var digit = document.createElement("div");
      digit.className = "digit";
      box.appendChild(digit);
      var row = document.createElement("div");
      row.className = "bits";
      group.bits.forEach(function (bit) {
        var lamp = document.createElement("i");
        lamp.className = "led";
        lamp.dataset.bit = String(bit);
        row.appendChild(lamp);
      });
      box.appendChild(row);
      host.appendChild(box);
      group.digitEl = digit;
    });
  }

  function paintLamps(host, value) {
    var boxes = host.children;
    for (var g = 0; g < GROUPS.length; g++) {
      var group = GROUPS[g];
      boxes[g].querySelector(".digit").textContent = String(groupDigit(value, group.bits));
      var leds = boxes[g].querySelectorAll(".led");
      for (var i = 0; i < group.bits.length; i++) {
        var on = !!(value & (1 << group.bits[i]));
        leds[i].classList.toggle("on", on);
      }
    }
  }

  function buildSwitches(host) {
    host.replaceChildren();
    GROUPS.forEach(function (group) {
      var box = document.createElement("div");
      box.className = "group";
      var digit = document.createElement("div");
      digit.className = "digit live";
      box.appendChild(digit);
      var weights = document.createElement("div");
      weights.className = "weights";
      var ws = group.bits.length === 1 ? [1] : [4, 2, 1];
      var row = document.createElement("div");
      row.className = "bits";
      group.bits.forEach(function (bit, i) {
        var wrap = document.createElement("div");
        wrap.className = "bit";
        var w = document.createElement("span");
        w.className = "weight";
        w.textContent = String(ws[i]);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sw";
        btn.dataset.bit = String(bit);
        btn.setAttribute("aria-label", "Bit " + bit + ", poids " + ws[i] + " dans le groupe " + group.place);
        var paddle = document.createElement("i");
        btn.appendChild(paddle);
        var num = document.createElement("span");
        num.className = "bitno";
        num.textContent = String(bit);
        btn.addEventListener("click", function () {
          bitCursor = bit;
          toggleBit(bit);
        });
        wrap.appendChild(w);
        wrap.appendChild(btn);
        wrap.appendChild(num);
        row.appendChild(wrap);
      });
      var place = document.createElement("div");
      place.className = "place";
      place.textContent = group.place;
      box.appendChild(weights);
      box.appendChild(row);
      box.appendChild(place);
      host.appendChild(box);
    });
  }

  function paintSwitches(ghost) {
    var buttons = document.querySelectorAll("#switches .sw");
    buttons.forEach(function (btn) {
      var bit = Number(btn.dataset.bit);
      var on = !!(m.switches & (1 << bit));
      btn.classList.toggle("on", on);
      btn.classList.toggle("cursor", bit === bitCursor);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.remove("want-up", "want-down");
      if (ghost !== null && ghost !== undefined) {
        var want = !!(ghost & (1 << bit));
        if (want && !on) btn.classList.add("want-up");
        if (!want && on) btn.classList.add("want-down");
      }
    });
    var boxes = $("switches").children;
    for (var g = 0; g < GROUPS.length; g++) {
      boxes[g].querySelector(".digit").textContent = String(groupDigit(m.switches, GROUPS[g].bits));
    }
    $("switch-oct").textContent = oct(m.switches) + "₈  ·  " + (m.switches & 0xffff) + "₁₀";
  }

  function buildChrome() {
    var root = $("app");
    root.innerHTML = "";

    var head = document.createElement("header");
    head.className = "top";
    document.title = L("École du pupitre PDP-11", "PDP-11 front panel school");
    head.innerHTML = "<div class='brand'><p class='kicker'>" + L("École du pupitre", "Front panel school") + "</p><h1>" + L("PDP-11, geste par geste", "PDP-11, one gesture at a time") + "</h1></div>";
    var progress = document.createElement("div");
    progress.className = "progress";
    progress.id = "progress";
    head.appendChild(progress);
    root.appendChild(head);

    var main = document.createElement("main");
    main.className = "layout";

    var fiche = document.createElement("section");
    fiche.className = "fiche";
    fiche.innerHTML = "<p class='fiche-kicker' id='fiche-kicker'></p><h2 id='fiche-title'></h2><div id='teach'></div><div id='listing'></div><div id='goal'></div><div class='fiche-actions'><button type='button' id='next'>" + L("Continuer", "Continue") + "</button><button type='button' id='restart' class='ghost-btn'>" + L("Reprendre le chapitre", "Restart the chapter") + "</button></div><div id='challenges'></div>";
    main.appendChild(fiche);

    var bench = document.createElement("section");
    bench.className = "bench";
    bench.innerHTML =
      "<div class='bezel'>" +
      "<div class='plaque'><span>" + L("PUPITRE PÉDAGOGIQUE", "TEACHING PANEL") + "</span><span>" + L("16 bits · octal", "16 bits · octal") + "</span></div>" +
      "<div class='face'>" +
      "<div class='lamp-block'><div class='lamp-head'><span>ADDRESS</span><strong id='addr-oct'>000000</strong></div><div class='groups' id='addr-lamps'></div><p class='caption' id='addr-cap'></p></div>" +
      "<div class='lamp-block'><div class='lamp-head'><span>DATA</span><strong id='data-oct'>000000</strong></div><div class='groups' id='data-lamps'></div><p class='caption' id='data-cap'></p></div>" +
      "<div class='status-row'>" +
      "<span class='pill' id='run-pill'>RUN</span>" +
      "<span class='pill' id='err-pill'>ADRS ERR</span>" +
      "<span class='flag' data-flag='n'>N</span><span class='flag' data-flag='z'>Z</span><span class='flag' data-flag='v'>V</span><span class='flag' data-flag='c'>C</span>" +
      "<p class='status-text' id='status-text'></p></div>" +
      "<div class='switch-head'><span>" + L("INTERRUPTEURS", "SWITCHES") + "</span><strong id='switch-oct'>000000</strong></div>" +
      "<p class='hint'>" + L("Levé = 1. Dans chaque groupe, les poids sont 4, 2, 1. Le fantôme pointillé est le bit à corriger.", "Up = 1. In each group the weights are 4, 2, 1. The dotted ghost is the bit to correct.") + "</p>" +
      "<div class='groups' id='switches'></div>" +
      "<div class='keys'>" +
      "<button type='button' id='key-load'>LOAD ADRS</button>" +
      "<button type='button' id='key-exam'>EXAM</button>" +
      "<button type='button' id='key-dep' class='dep'>DEP ↑</button>" +
      "<button type='button' id='key-cont'>CONT</button>" +
      "<button type='button' id='key-enable' class='enable'>HALT</button>" +
      "<button type='button' id='key-start'>START</button>" +
      "</div>" +
      "<div class='knob' id='knob'><span>" + L("Affichage DATA pendant RUN", "DATA display while running") + "</span><div class='knob-keys'><button type='button' data-mode='bus'>BUS</button><button type='button' data-mode='r0'>R0</button><button type='button' data-mode='instr'>INSTR</button></div></div>" +
      "</div></div>" +
      "<aside class='coach'><p class='coach-kicker'>" + L("Ce que le geste vient de faire", "What that gesture just did") + "</p><p id='coach-text'></p><button type='button' id='decode' class='ghost-btn'>" + L("Lire le mot affiché par DATA", "Read the word shown on DATA") + "</button><p id='decode-text'></p><div id='regs'></div></aside>";
    main.appendChild(bench);
    root.appendChild(main);

    var foot = document.createElement("footer");
    foot.innerHTML = "<p>" + L("Les touches : ← → choisissent un bit, espace le bascule, L charge l'adresse, E examine, D dépose, C continue, S lance, H bascule ENABLE/HALT.", "Keys: ← → pick a bit, space toggles it, L loads the address, E examines, D deposits, C continues, S starts, H toggles ENABLE/HALT.") + "</p><p>" + L("Le pupitre complet, avec Unix et RSTS, est celui de <a href='https://paulnank.github.io/pdp11-js/pdp11.html'>Paul Nankervis</a>. Cette page n'en reprend pas le code : elle n'enseigne que le geste.", "The full panel, with Unix and RSTS, is <a href='https://paulnank.github.io/pdp11-js/pdp11.html'>Paul Nankervis</a>'s. This page does not reuse that code: it only teaches the gesture.") + "</p><button type='button' id='reset-all' class='ghost-btn'>" + L("Recommencer le cours", "Restart the course") + "</button>";
    root.appendChild(foot);

    buildLamps($("addr-lamps"));
    buildLamps($("data-lamps"));
    buildSwitches($("switches"));

    $("key-load").addEventListener("click", function () { act(function () { return PDP11.loadAddress(m); }); });
    $("key-exam").addEventListener("click", function () { act(function () { return PDP11.examine(m); }); });
    $("key-dep").addEventListener("click", function () { act(function () { return PDP11.deposit(m); }); });
    $("key-cont").addEventListener("click", function () { act(function () { return PDP11.cont(m); }); });
    $("key-start").addEventListener("click", function () { act(function () { return PDP11.start(m); }); });
    $("key-enable").addEventListener("click", function () { setEnable(!m.enable); });
    $("knob").addEventListener("click", function (event) {
      var mode = event.target && event.target.dataset && event.target.dataset.mode;
      if (mode) setDisplay(mode);
    });
    $("next").addEventListener("click", function () {
      if (!course.continue()) return;
      decodeText = "";
      resetArmed = false;
      paint();
    });
    $("restart").addEventListener("click", function () {
      course.restartChapter();
      decodeText = "";
      paint();
    });
    $("decode").addEventListener("click", function () {
      var word = dataValue();
      var info = Disasm.describe(word);
      decodeText = oct(word) + "₈ = " + (word & 0xffff) + "₁₀. " + L("Comme instruction : ", "As an instruction: ") + info.mnemonic + ". " + (info.note || L("Comme donnée, c'est seulement cette valeur.", "As data, it is only this value."));
      paint();
    });
    $("reset-all").addEventListener("click", function () {
      var button = $("reset-all");
      if (!resetArmed) {
        resetArmed = true;
        button.textContent = L("Confirmer : effacer la progression", "Confirm: erase progress");
        return;
      }
      doneChal = {};
      localStorage.removeItem(chalKey);
      course.restartAll();
      decodeText = "";
      resetArmed = false;
      button.textContent = L("Recommencer le cours", "Restart the course");
      paint();
    });

    document.addEventListener("keydown", onKey);
  }

  function onKey(event) {
    var tag = event.target && event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    var key = event.key;
    if (key === "ArrowLeft" || key === "ArrowRight") {
      event.preventDefault();
      bitCursor = key === "ArrowLeft" ? Math.min(15, bitCursor + 1) : Math.max(0, bitCursor - 1);
      paint();
      return;
    }
    if (key === " " || key === "Spacebar") {
      event.preventDefault();
      toggleBit(bitCursor);
      return;
    }
    var map = { l: "load", L: "load", e: "exam", E: "exam", d: "dep", D: "dep", c: "cont", C: "cont", s: "start", S: "start", h: "enable", H: "enable" };
    if (!map[key]) return;
    event.preventDefault();
    if (map[key] === "load") act(function () { return PDP11.loadAddress(m); });
    else if (map[key] === "exam") act(function () { return PDP11.examine(m); });
    else if (map[key] === "dep") act(function () { return PDP11.deposit(m); });
    else if (map[key] === "cont") act(function () { return PDP11.cont(m); });
    else if (map[key] === "start") act(function () { return PDP11.start(m); });
    else setEnable(!m.enable);
  }

  function chapterProgress() {
    var host = $("progress");
    host.replaceChildren();
    var current = course.chapterIndex();
    var max = course.maxChapterIndex();
    Ecole.CHAPTERS.forEach(function (chapter, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = chapter.title;
      btn.disabled = i > max;
      if (i === current) btn.className = "now";
      else if (i < current) btn.className = "done";
      btn.addEventListener("click", function () {
        if (course.jumpToChapter(chapter.id)) {
          decodeText = "";
          paint();
        }
      });
      host.appendChild(btn);
    });
  }

  function stepsOf(chapterId) {
    return Ecole.steps.filter(function (step) { return step.chapter === chapterId; });
  }

  function fillFiche(guide) {
    var step = course.step();
    var same = builtStep === step.id;
    if (!same) {
      builtStep = step.id;
      var list = stepsOf(step.chapter);
      var nth = 0;
      for (var i = 0; i < list.length; i++) if (list[i].id === step.id) nth = i + 1;
      var chapter = Ecole.CHAPTERS[course.chapterIndex()];
      $("fiche-kicker").textContent = chapter.title + L(" · geste ", " · step ") + nth + L(" sur ", " of ") + list.length;
      $("fiche-title").textContent = step.title;
      var teach = $("teach");
      teach.replaceChildren();
      (step.teach || []).forEach(function (paragraph) {
        var p = document.createElement("p");
        p.textContent = paragraph;
        teach.appendChild(p);
      });
    }

    var listing = $("listing");
    listing.replaceChildren();
    if (step.program) {
      var ol = document.createElement("ol");
      ol.className = "listing";
      step.program.forEach(function (row) {
        var li = document.createElement("li");
        var got = m.mem[row.addr >> 1] & 0xffff;
        li.className = got === (row.word & 0xffff) ? "ok" : "miss";
        li.textContent = oct(row.addr) + "   " + oct(row.word) + "   " + row.asm;
        ol.appendChild(li);
      });
      listing.appendChild(ol);
    }

    var goal = $("goal");
    goal.textContent = guide.text;
    goal.classList.toggle("success", !!guide.done);

    var next = $("next");
    var showNext = guide.done && !course.isLast();
    next.hidden = !showNext;
    $("restart").hidden = step.id === "free";

    var chal = $("challenges");
    if (step.id !== "free") {
      chal.replaceChildren();
      $("speed-wrap") && $("speed-wrap").remove();
      return;
    }
    if (!same) {
      chal.replaceChildren();
      var speed = document.createElement("label");
      speed.className = "speed";
      speed.id = "speed-wrap";
      speed.textContent = L("Vitesse libre ", "Free speed ");
      var input = document.createElement("input");
      input.type = "range";
      input.min = "1";
      input.max = "3";
      input.value = "1";
      input.addEventListener("input", function () {
        course.view.budget = [1, 30, 400][Number(input.value) - 1];
      });
      speed.appendChild(input);
      chal.appendChild(speed);

      var clear = document.createElement("button");
      clear.type = "button";
      clear.className = "ghost-btn";
      clear.textContent = L("Effacer la mémoire basse et les registres", "Clear low memory and the registers");
      clear.addEventListener("click", function () {
        if (m.running) return;
        PDP11.wipe(m, 0, 0o2000);
        PDP11.clearRegs(m);
        m.addr = 0;
        m.data = 0;
        m.haltReason = null;
        paint();
      });
      chal.appendChild(clear);

      Ecole.challenges.forEach(function (item) {
        var card = document.createElement("article");
        card.className = "challenge";
        card.dataset.id = item.id;
        var h = document.createElement("h3");
        h.textContent = item.title;
        var p = document.createElement("p");
        p.textContent = item.text;
        var row = document.createElement("div");
        row.className = "chal-row";
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = L("Vérifier", "Check");
        var note = document.createElement("p");
        note.className = "chal-note";
        button.addEventListener("click", function () {
          if (item.test(m)) {
            doneChal[item.id] = true;
            localStorage.setItem(chalKey, JSON.stringify(doneChal));
            note.textContent = L("Oui. R0 = ", "Yes. R0 = ") + oct(m.r[0]) + L(", arrêté par l'instruction HALT.", ", halted by the HALT instruction.");
          } else if (m.running) {
            note.textContent = L("Elle tourne encore.", "It is still running.");
          } else {
            note.textContent = L("Pas encore. R0 = ", "Not yet. R0 = ") + oct(m.r[0]) + L(". Arrêt : ", ". Stop: ") + (m.haltReason || L("aucun", "none")) + ".";
          }
          card.classList.toggle("solved", !!doneChal[item.id]);
        });
        row.appendChild(button);
        card.appendChild(h);
        card.appendChild(p);
        card.appendChild(row);
        card.appendChild(note);
        chal.appendChild(card);
      });
    }
    chal.querySelectorAll(".challenge").forEach(function (card) {
      card.classList.toggle("solved", !!doneChal[card.dataset.id]);
    });
  }

  function paintRegs() {
    var host = $("regs");
    var step = course.step();
    if (!step.revealRegs) {
      host.replaceChildren();
      return;
    }
    if (!host.firstChild) {
      var title = document.createElement("p");
      title.className = "coach-kicker";
      title.textContent = L("Cahier du maître — absent du vrai pupitre", "Teacher's notebook — not on a real panel");
      host.appendChild(title);
      var grid = document.createElement("div");
      grid.className = "reg-grid";
      host.appendChild(grid);
    }
    var grid = host.querySelector(".reg-grid");
    grid.replaceChildren();
    for (var i = 0; i < 8; i++) {
      var cell = document.createElement("span");
      var name = i === 7 ? "PC" : "R" + i;
      cell.textContent = name + " " + oct(m.r[i]);
      grid.appendChild(cell);
    }
  }

  function paint() {
    var guide = course.evaluate();
    chapterProgress();
    fillFiche(guide);

    var addr = lampValue();
    var data = dataValue();
    $("addr-oct").textContent = oct(addr);
    $("data-oct").textContent = oct(data);
    $("addr-cap").textContent = addrCaption();
    $("data-cap").textContent = dataCaption();
    paintLamps($("addr-lamps"), addr);
    paintLamps($("data-lamps"), data);
    paintSwitches(guide.ghost);

    $("run-pill").classList.toggle("on", m.running);
    $("err-pill").classList.toggle("on", m.adrsErr);
    document.querySelectorAll(".flag").forEach(function (flag) {
      flag.classList.toggle("on", !!m[flag.dataset.flag]);
    });
    $("status-text").textContent = statusText();
    $("key-enable").textContent = m.enable ? "ENABLE" : "HALT";
    $("key-enable").classList.toggle("armed", m.enable);
    $("coach-text").textContent = narrate();
    $("decode-text").textContent = decodeText;

    ["load", "exam", "dep", "cont", "start", "enable", "knob", "switches"].forEach(function (name) {
      var node = name === "switches" ? $("switches") : name === "knob" ? $("knob") : $("key-" + name);
      if (node) node.classList.toggle("is-next", guide.focus === name);
    });

    document.querySelectorAll("#knob button").forEach(function (btn) {
      btn.classList.toggle("chosen", btn.dataset.mode === m.display);
    });

    paintRegs();
  }

  function tick() {
    var pace = course.step().pace || "normal";
    var every = pace === "normal" ? 8 : 1;
    dwell += 1;
    if (dwell >= every) {
      dwell = 0;
      var budget = pace === "free" ? course.view.budget : 1;
      m.fast = budget > 1;
      if (m.running) PDP11.runSlice(m, budget);
      course.onFrame();
    }
    paint();
    window.requestAnimationFrame(tick);
  }

  buildChrome();
  paint();
  window.requestAnimationFrame(tick);
})();
