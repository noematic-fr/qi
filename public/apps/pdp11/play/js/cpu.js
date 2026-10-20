"use strict";

// Sous-ensemble pédagogique du PDP-11.
// 16 bits, mots uniquement, pas de MMU ni de périphériques.
// Les registres 177700–177707 n'existent que pour EXAM/DEP du pupitre,
// comme sur la console réelle : un programme n'y accède pas par adresse.

var PDP11 = (function () {
  var MEM_WORDS = 32768;

  function createMachine() {
    return {
      mem: new Uint16Array(MEM_WORDS),
      r: new Uint16Array(8),
      n: false,
      z: false,
      v: false,
      c: false,
      switches: 0,
      addr: 0,
      data: 0,
      enable: false,
      running: false,
      haltReason: null,
      adrsErr: false,
      stall: 0,
      realtime: false,
      fast: false,
      trap: null,
      lastBusAddr: 0,
      lastBusData: 0,
      display: "bus",
      unknown: 0,
    };
  }

  function oct(n, digits) {
    var d = digits || 6;
    return (n & 0xffff).toString(8).padStart(d, "0");
  }

  function s16(n) {
    n &= 0xffff;
    return n & 0x8000 ? n - 0x10000 : n;
  }

  function setNZ(m, value) {
    value &= 0xffff;
    m.n = !!(value & 0x8000);
    m.z = value === 0;
  }

  function readWord(m, addr) {
    addr &= 0xffff;
    m.lastBusAddr = addr;
    if (addr & 1) {
      m.adrsErr = true;
      m.trap = "bus";
      return 0;
    }
    var value = m.mem[addr >> 1] & 0xffff;
    m.lastBusData = value;
    return value;
  }

  function writeWord(m, addr, value) {
    addr &= 0xffff;
    value &= 0xffff;
    m.lastBusAddr = addr;
    m.lastBusData = value;
    if (addr & 1) {
      m.adrsErr = true;
      m.trap = "bus";
      return;
    }
    m.mem[addr >> 1] = value;
  }

  // modeReg : 6 bits, mode dans les 3 de poids fort, registre dans les 3 de poids faible.
  function operand(m, modeReg) {
    var mode = (modeReg >> 3) & 7;
    var reg = modeReg & 7;
    var addr;
    var ptr;
    if (mode === 0) return { type: "reg", reg: reg };
    if (mode === 1) return { type: "mem", addr: m.r[reg] & 0xffff };
    if (mode === 2) {
      addr = m.r[reg] & 0xffff;
      m.r[reg] = (addr + 2) & 0xffff;
      return { type: "mem", addr: addr };
    }
    if (mode === 3) {
      ptr = m.r[reg] & 0xffff;
      m.r[reg] = (ptr + 2) & 0xffff;
      addr = readWord(m, ptr);
      if (m.trap) return null;
      return { type: "mem", addr: addr };
    }
    if (mode === 4) {
      m.r[reg] = (m.r[reg] - 2) & 0xffff;
      return { type: "mem", addr: m.r[reg] & 0xffff };
    }
    if (mode === 5) {
      m.r[reg] = (m.r[reg] - 2) & 0xffff;
      addr = readWord(m, m.r[reg]);
      if (m.trap) return null;
      return { type: "mem", addr: addr };
    }
    if (mode === 6 || mode === 7) {
      var index = readWord(m, m.r[7]);
      if (m.trap) return null;
      m.r[7] = (m.r[7] + 2) & 0xffff;
      var base = (m.r[reg] + index) & 0xffff;
      if (mode === 6) return { type: "mem", addr: base };
      addr = readWord(m, base);
      if (m.trap) return null;
      return { type: "mem", addr: addr };
    }
    return null;
  }

  function getOp(m, op) {
    if (!op) return 0;
    if (op.type === "reg") return m.r[op.reg] & 0xffff;
    return readWord(m, op.addr);
  }

  function setOp(m, op, value) {
    value &= 0xffff;
    if (!op) return;
    if (op.type === "reg") m.r[op.reg] = value;
    else writeWord(m, op.addr, value);
  }

  var BRANCH = {
    0x01: function () { return true; },
    0x02: function (m) { return !m.z; },
    0x03: function (m) { return m.z; },
    0x04: function (m) { return m.n === m.v; },
    0x05: function (m) { return m.n !== m.v; },
    0x06: function (m) { return !m.z && m.n === m.v; },
    0x07: function (m) { return m.z || m.n !== m.v; },
    0x80: function (m) { return !m.n; },
    0x81: function (m) { return m.n; },
    0x82: function (m) { return !m.c && !m.z; },
    0x83: function (m) { return m.c || m.z; },
    0x84: function (m) { return !m.v; },
    0x85: function (m) { return m.v; },
    0x86: function (m) { return !m.c; },
    0x87: function (m) { return m.c; },
  };

  function encodeBranch(opcode, wordOffset) {
    var off = wordOffset < 0 ? (wordOffset + 256) & 255 : wordOffset & 255;
    return ((opcode & 0xff00) | off) & 0xffff;
  }

  function execUnary(m, w) {
    var code = w & 0xffc0;
    var op = operand(m, w & 0x3f);
    if (m.trap) return "bus";
    var old;
    var neu;
    if (code === 0o000300) {
      old = getOp(m, op);
      neu = ((old << 8) | (old >> 8)) & 0xffff;
      setOp(m, op, neu);
      var low = neu & 0xff;
      m.n = !!(low & 0x80);
      m.z = low === 0;
      m.v = false;
      m.c = false;
      return "swab";
    }
    if (code === 0o005000) {
      setOp(m, op, 0);
      m.n = false;
      m.z = true;
      m.v = false;
      m.c = false;
      return "clr";
    }
    if (code === 0o005100) {
      old = getOp(m, op);
      neu = (~old) & 0xffff;
      setOp(m, op, neu);
      setNZ(m, neu);
      m.v = false;
      m.c = true;
      return "com";
    }
    if (code === 0o005200) {
      old = getOp(m, op);
      neu = (old + 1) & 0xffff;
      setOp(m, op, neu);
      setNZ(m, neu);
      m.v = old === 0o077777;
      return "inc";
    }
    if (code === 0o005300) {
      old = getOp(m, op);
      neu = (old - 1) & 0xffff;
      setOp(m, op, neu);
      setNZ(m, neu);
      m.v = old === 0o100000;
      return "dec";
    }
    if (code === 0o005400) {
      old = getOp(m, op);
      neu = (-old) & 0xffff;
      setOp(m, op, neu);
      setNZ(m, neu);
      m.v = old === 0x8000;
      m.c = neu !== 0;
      return "neg";
    }
    if (code === 0o005700) {
      old = getOp(m, op);
      setNZ(m, old);
      m.v = false;
      m.c = false;
      return "tst";
    }
    if (code === 0o006000) {
      old = getOp(m, op);
      var rorC = !!(old & 1);
      neu = ((old >> 1) | (m.c ? 0x8000 : 0)) & 0xffff;
      setOp(m, op, neu);
      m.c = rorC;
      setNZ(m, neu);
      m.v = m.n !== m.c;
      return "ror";
    }
    if (code === 0o006100) {
      old = getOp(m, op);
      var rolC = !!(old & 0x8000);
      neu = ((old << 1) & 0xffff) | (m.c ? 1 : 0);
      setOp(m, op, neu);
      m.c = rolC;
      setNZ(m, neu);
      m.v = m.n !== m.c;
      return "rol";
    }
    if (code === 0o006200) {
      old = getOp(m, op);
      var asrC = !!(old & 1);
      neu = ((old >> 1) | (old & 0x8000)) & 0xffff;
      setOp(m, op, neu);
      m.c = asrC;
      setNZ(m, neu);
      m.v = m.n !== m.c;
      return "asr";
    }
    if (code === 0o006300) {
      old = getOp(m, op);
      var aslC = !!(old & 0x8000);
      neu = (old << 1) & 0xffff;
      setOp(m, op, neu);
      m.c = aslC;
      setNZ(m, neu);
      m.v = m.n !== m.c;
      return "asl";
    }
    return null;
  }

  function execDouble(m, w) {
    var hi = (w >> 12) & 0xf;
    if (!((hi >= 1 && hi <= 6) || hi === 0xe)) return null;
    var src = operand(m, (w >> 6) & 0x3f);
    if (m.trap) return "bus";
    var dst = operand(m, w & 0x3f);
    if (m.trap) return "bus";
    var a = getOp(m, src);
    if (m.trap) return "bus";
    var b = getOp(m, dst);
    if (m.trap) return "bus";
    var sum;
    var neu;
    if (hi === 1) {
      setOp(m, dst, a);
      if (m.trap) return "bus";
      setNZ(m, a);
      m.v = false;
      return "mov";
    }
    if (hi === 2) {
      sum = a - b;
      neu = sum & 0xffff;
      setNZ(m, neu);
      m.c = (a & 0xffff) < (b & 0xffff);
      m.v = s16(a) - s16(b) !== s16(neu);
      return "cmp";
    }
    if (hi === 3) {
      neu = (a & b) & 0xffff;
      setNZ(m, neu);
      m.v = false;
      return "bit";
    }
    if (hi === 4) {
      neu = (b & ~a) & 0xffff;
      setOp(m, dst, neu);
      if (m.trap) return "bus";
      setNZ(m, neu);
      m.v = false;
      return "bic";
    }
    if (hi === 5) {
      neu = (b | a) & 0xffff;
      setOp(m, dst, neu);
      if (m.trap) return "bus";
      setNZ(m, neu);
      m.v = false;
      return "bis";
    }
    if (hi === 6) {
      sum = (a & 0xffff) + (b & 0xffff);
      neu = sum & 0xffff;
      setOp(m, dst, neu);
      if (m.trap) return "bus";
      setNZ(m, neu);
      m.c = sum > 0xffff;
      m.v = s16(a) + s16(b) !== s16(neu);
      return "add";
    }
    sum = (b & 0xffff) - (a & 0xffff);
    neu = sum & 0xffff;
    setOp(m, dst, neu);
    if (m.trap) return "bus";
    setNZ(m, neu);
    m.c = (b & 0xffff) < (a & 0xffff);
    m.v = s16(b) - s16(a) !== s16(neu);
    return "sub";
  }

  function step(m) {
    m.trap = null;
    if (m.stall > 0) {
      m.stall -= 1;
      return "stall";
    }
    var pc = m.r[7] & 0xffff;
    var w = readWord(m, pc);
    if (m.trap) {
      m.running = false;
      m.haltReason = "bus";
      return "bus";
    }
    m.r[7] = (pc + 2) & 0xffff;
    if (w === 0) return "halt";
    if (w === 1) return "wait";
    if (w === 5) {
      if (m.realtime && !m.fast) m.stall = 28;
      return "reset";
    }
    if (w === 0o240) return "nop";

    var hi = (w >> 8) & 0xff;
    if (BRANCH[hi]) {
      var off = w & 0xff;
      if (off & 0x80) off -= 256;
      if (BRANCH[hi](m)) m.r[7] = (m.r[7] + (off << 1)) & 0xffff;
      return "br";
    }

    var doubled = execDouble(m, w);
    if (doubled) return doubled;
    if (m.trap) {
      m.running = false;
      m.haltReason = "bus";
      return "bus";
    }
    var unary = execUnary(m, w);
    if (unary) return unary;
    if (m.trap) {
      m.running = false;
      m.haltReason = "bus";
      return "bus";
    }
    m.unknown = w;
    m.running = false;
    m.haltReason = "unknown";
    return "unknown";
  }

  function displayedData(m) {
    if (m.display === "r0") return m.r[0] & 0xffff;
    if (m.display === "instr") {
      var pc = m.r[7] & 0xfffe;
      return m.mem[pc >> 1] & 0xffff;
    }
    return m.lastBusData & 0xffff;
  }

  function freeze(m, reason) {
    if (m.running) m.data = displayedData(m);
    m.running = false;
    m.haltReason = reason;
    m.stall = 0;
  }

  function runSlice(m, budget) {
    if (!m.running) return;
    if (!m.enable) {
      freeze(m, "switch");
      return;
    }
    m.realtime = true;
    var n = budget || 1;
    for (var i = 0; i < n && m.running; i++) {
      var why = step(m);
      if (why === "halt") {
        freeze(m, "opcode");
        return;
      }
      if (why === "wait") {
        freeze(m, "wait");
        return;
      }
      if (why === "bus" || why === "unknown") return;
      if (why === "stall" || why === "reset") return;
    }
  }

  function loadAddress(m) {
    m.addr = m.switches & 0xffff;
    m.adrsErr = false;
    return { type: "load", addr: m.addr };
  }

  function examine(m) {
    if (m.running) return { type: "exam", rejected: true };
    var at = m.addr & 0xffff;
    if (at >= 0o177700 && at <= 0o177707) {
      var index = at - 0o177700;
      m.data = m.r[index] & 0xffff;
      m.addr = (at + 1) & 0xffff;
      m.adrsErr = false;
      return { type: "exam", at: at, data: m.data, reg: index };
    }
    if (at & 1) {
      m.adrsErr = true;
      return { type: "exam", at: at, err: true };
    }
    m.data = m.mem[at >> 1] & 0xffff;
    m.addr = (at + 2) & 0xffff;
    m.adrsErr = false;
    return { type: "exam", at: at, data: m.data };
  }

  function deposit(m) {
    if (m.running) return { type: "dep", rejected: true };
    var at = m.addr & 0xffff;
    var data = m.switches & 0xffff;
    if (at >= 0o177700 && at <= 0o177707) {
      var index = at - 0o177700;
      m.r[index] = data;
      m.data = data;
      m.addr = (at + 1) & 0xffff;
      m.adrsErr = false;
      return { type: "dep", at: at, data: data, reg: index };
    }
    if (at & 1) {
      m.adrsErr = true;
      return { type: "dep", at: at, err: true };
    }
    m.mem[at >> 1] = data;
    m.data = data;
    m.addr = (at + 2) & 0xffff;
    m.adrsErr = false;
    return { type: "dep", at: at, data: data };
  }

  function start(m) {
    if (m.running) return { type: "start", rejected: true };
    m.r[7] = m.addr & 0xfffe;
    m.n = m.z = m.v = m.c = false;
    m.adrsErr = false;
    m.stall = 0;
    m.unknown = 0;
    if (m.enable) {
      m.running = true;
      m.haltReason = null;
    } else {
      m.running = false;
      m.haltReason = "switch";
    }
    return { type: "start", pc: m.r[7], running: m.running };
  }

  function cont(m) {
    if (m.running) return { type: "cont", rejected: true };
    if (m.enable) {
      m.running = true;
      m.haltReason = null;
      m.stall = 0;
      return { type: "cont", running: true };
    }
    m.realtime = false;
    var why = step(m);
    if (why === "halt") freeze(m, "opcode");
    else if (why === "wait") freeze(m, "wait");
    else if (why === "bus") freeze(m, "bus");
    else if (why === "unknown") freeze(m, "unknown");
    else {
      m.running = false;
      m.haltReason = "step";
    }
    return { type: "cont", why: why, pc: m.r[7] & 0xffff };
  }

  function clearRegs(m) {
    for (var i = 0; i < 8; i++) m.r[i] = 0;
    m.n = m.z = m.v = m.c = false;
    m.stall = 0;
    m.running = false;
    m.haltReason = null;
    m.unknown = 0;
  }

  function wipe(m, from, to) {
    var a = from & 0xfffe;
    var end = to & 0xfffe;
    while (a < end) {
      m.mem[a >> 1] = 0;
      a += 2;
    }
  }

  function writeProgram(m, program) {
    for (var i = 0; i < program.length; i++) {
      m.mem[program[i].addr >> 1] = program[i].word & 0xffff;
    }
  }

  function memoryMatches(m, program) {
    for (var i = 0; i < program.length; i++) {
      if ((m.mem[program[i].addr >> 1] & 0xffff) !== (program[i].word & 0xffff)) {
        return false;
      }
    }
    return true;
  }

  function firstMismatch(m, program) {
    for (var i = 0; i < program.length; i++) {
      if ((m.mem[program[i].addr >> 1] & 0xffff) !== (program[i].word & 0xffff)) {
        return program[i];
      }
    }
    return null;
  }

  return {
    createMachine: createMachine,
    oct: oct,
    step: step,
    runSlice: runSlice,
    loadAddress: loadAddress,
    examine: examine,
    deposit: deposit,
    start: start,
    cont: cont,
    clearRegs: clearRegs,
    wipe: wipe,
    writeProgram: writeProgram,
    memoryMatches: memoryMatches,
    firstMismatch: firstMismatch,
    encodeBranch: encodeBranch,
    displayedData: displayedData,
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = PDP11;
