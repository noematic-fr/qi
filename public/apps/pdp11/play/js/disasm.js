"use strict";

var Disasm = (function () {
  var BRANCH = {
    0x01: "br",
    0x02: "bne",
    0x03: "beq",
    0x04: "bge",
    0x05: "blt",
    0x06: "bgt",
    0x07: "ble",
    0x80: "bpl",
    0x81: "bmi",
    0x82: "bhi",
    0x83: "blos",
    0x84: "bvc",
    0x85: "bvs",
    0x86: "bcc",
    0x87: "bcs",
  };

  var UNARY = {
    0o000300: "swab",
    0o005000: "clr",
    0o005100: "com",
    0o005200: "inc",
    0o005300: "dec",
    0o005400: "neg",
    0o005700: "tst",
    0o006000: "ror",
    0o006100: "rol",
    0o006200: "asr",
    0o006300: "asl",
  };

  var DOUBLE = {
    1: "mov",
    2: "cmp",
    3: "bit",
    4: "bic",
    5: "bis",
    6: "add",
    14: "sub",
  };

  function L(fr, en) {
    var lang = "";
    if (typeof document !== "undefined" && document.documentElement) {
      lang = document.documentElement.lang || "";
    }
    return /^en/i.test(lang) ? en : fr;
  }

  function regName(reg) {
    if (reg === 7) return "pc";
    if (reg === 6) return "sp";
    return "r" + reg;
  }

  function formatOperand(modeReg) {
    var mode = (modeReg >> 3) & 7;
    var reg = modeReg & 7;
    var name = regName(reg);
    if (mode === 0) return name;
    if (mode === 1) return "(" + name + ")";
    if (mode === 2) return reg === 7 ? "#n" : "(" + name + ")+";
    if (mode === 3) return reg === 7 ? "@#A" : "@(" + name + ")+";
    if (mode === 4) return "-(" + name + ")";
    if (mode === 5) return "@-(" + name + ")";
    if (mode === 6) return "X(" + name + ")";
    return "@X(" + name + ")";
  }

  function extraWords(modeReg) {
    var mode = (modeReg >> 3) & 7;
    var reg = modeReg & 7;
    if (mode === 6 || mode === 7) return 1;
    if ((mode === 2 || mode === 3) && reg === 7) return 1;
    return 0;
  }

  function describe(word) {
    word &= 0xffff;
    if (word === 0) {
      return { mnemonic: "halt", note: L("Arrête le processeur. Le PC pointe déjà sur le mot suivant.", "Stops the processor. The PC already points at the next word.") };
    }
    if (word === 1) {
      return { mnemonic: "wait", note: L("Attend une interruption. Cette école n'en a pas : WAIT stoppe.", "Waits for an interrupt. This school has none: WAIT stops.") };
    }
    if (word === 5) {
      return { mnemonic: "reset", note: L("Sur une vraie machine, RESET initialise le bus. Ici, c'est une pause visible.", "On a real machine, RESET initializes the bus. Here it is a visible pause.") };
    }
    if (word === 0o240) {
      return { mnemonic: "nop", note: L("Ne fait rien.", "Does nothing.") };
    }

    var hi = (word >> 8) & 0xff;
    if (BRANCH[hi]) {
      var off = word & 0xff;
      if (off & 0x80) off -= 256;
      return {
        mnemonic: BRANCH[hi] + " " + off,
        note: L("Déplacement de ", "Offset of ") + off + L(" mot(s), ajouté au PC. Le PC pointe déjà après cette instruction, donc l'adresse atteinte n'est pas écrite dans le mot.", " word(s), added to the PC. The PC already points past this instruction, so the destination address is not written in the word."),
      };
    }

    var nibble = (word >> 12) & 0xf;
    if (DOUBLE[nibble]) {
      var src = (word >> 6) & 0x3f;
      var dst = word & 0x3f;
      var extra = extraWords(src) + extraWords(dst);
      var note = "";
      if (extra) {
        note = extra === 1
          ? L("Le mot suivant en mémoire est une donnée de cette instruction (un immédiat, ou un index).", "The next word in memory is data for this instruction (an immediate, or an index).")
          : L("Les mots suivants sont des données de cette instruction.", "The following words are data for this instruction.");
      }
      return {
        mnemonic: DOUBLE[nibble] + " " + formatOperand(src) + ", " + formatOperand(dst),
        note: note,
      };
    }

    var unary = UNARY[word & 0xffc0];
    if (unary) {
      var modeReg = word & 0x3f;
      var extraU = extraWords(modeReg);
      return {
        mnemonic: unary + " " + formatOperand(modeReg),
        note: extraU ? L("Le mot suivant est un index.", "The next word is an index.") : "",
      };
    }

    return { mnemonic: L("mot", "word"), note: L("Ce n'est pas une instruction de cette école. Comme donnée, c'est une valeur.", "This is not an instruction in this school. As data, it is a value.") };
  }

  return { describe: describe };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Disasm;
