"use strict";

var Ecole = (function (PDP11) {
  var oct = PDP11.oct;

  function L(fr, en) {
    var lang = "";
    if (typeof document !== "undefined" && document.documentElement) {
      lang = document.documentElement.lang || "";
    }
    return /^en/i.test(lang) ? en : fr;
  }


  var EXAM_DEMO = [
    { addr: 0o1000, word: 0o012700, asm: "mov #1, r0" },
    { addr: 0o1002, word: 0o000001, asm: L("(donnée 1)", "(data 1)") },
    { addr: 0o1004, word: 0o000000, asm: "halt" },
  ];

  var CHASER = [
    { addr: 0o1000, word: 0o012700, asm: "mov #1, r0" },
    { addr: 0o1002, word: 0o000001, asm: L("(donnée 1)", "(data 1)") },
    { addr: 0o1004, word: 0o006100, asm: "rol r0" },
    { addr: 0o1006, word: 0o000005, asm: "reset" },
    { addr: 0o1010, word: PDP11.encodeBranch(0o000400, -3), asm: "br .-4" },
  ];

  var ADD = [
    { addr: 0o1000, word: 0o012700, asm: "mov #14, r0" },
    { addr: 0o1002, word: 0o000014, asm: L("(donnée 14)", "(data 14)") },
    { addr: 0o1004, word: 0o062700, asm: "add #3, r0" },
    { addr: 0o1006, word: 0o000003, asm: L("(donnée 3)", "(data 3)") },
    { addr: 0o1010, word: 0o000000, asm: "halt" },
  ];

  var LOOP = [
    { addr: 0o1000, word: 0o005000, asm: "clr r0" },
    { addr: 0o1002, word: 0o005200, asm: "inc r0" },
    { addr: 0o1004, word: 0o022700, asm: "cmp #5, r0" },
    { addr: 0o1006, word: 0o000005, asm: L("(donnée 5)", "(data 5)") },
    { addr: 0o1010, word: PDP11.encodeBranch(0o001000, -4), asm: "bne .-6" },
    { addr: 0o1012, word: 0o000000, asm: "halt" },
  ];

  var CHAPTERS = [
    { id: "switches", title: L("Interrupteurs", "Switches") },
    { id: "address", title: L("Adresse", "Address") },
    { id: "exam", title: L("Examiner", "Examine") },
    { id: "deposit", title: L("Déposer", "Deposit") },
    { id: "run", title: L("Lancer", "Run") },
    { id: "calc", title: L("Calcul", "Arithmetic") },
    { id: "step", title: L("Pas à pas", "Single step") },
    { id: "loop", title: L("Boucle", "Loop") },
    { id: "free", title: L("Libre", "Free") },
  ];

  function blankUnknown(m) {
    var a;
    for (a = 0o1000; a < 0o1100; a += 2) m.mem[a >> 1] = 0o125252;
  }

  function stopConsole(m) {
    m.running = false;
    m.enable = false;
    m.stall = 0;
    m.adrsErr = false;
    m.haltReason = null;
    m.addr = 0;
    m.data = 0;
    m.switches = 0;
  }

  function prepare(m) {
    stopConsole(m);
    PDP11.clearRegs(m);
  }

  function ghostFor(current, target) {
    return (current & 0xffff) === (target & 0xffff) ? null : target;
  }

  function focusSwitchOr(m, target, nextKey) {
    if ((m.switches & 0xffff) !== (target & 0xffff)) {
      return { focus: "switches", ghost: target };
    }
    return { focus: nextKey, ghost: null };
  }

  function depositGuide(m, program) {
    var hole = PDP11.firstMismatch(m, program);
    if (!hole) {
      return {
        done: true,
        focus: null,
        ghost: null,
        text: L("Tous les mots sont en mémoire.", "Every word is in memory."),
        success: L("Tous les mots sont en mémoire. Sur une vraie machine, on relisait avant de lancer : un bit faux et le programme part dans le décor.", "Every word is in memory. On a real machine you read it back before starting: one wrong bit and the program runs off into the weeds."),
      };
    }
    var at = m.addr & 0xffff;
    if (at !== hole.addr) {
      var arm = focusSwitchOr(m, hole.addr, "load");
      return {
        done: false,
        focus: arm.focus,
        ghost: arm.ghost,
        text: L("Prochain trou en ", "Next gap at ") + oct(hole.addr) + " (" + hole.asm + L("). Compose cette adresse, puis LOAD ADRS.", "). Set that address, then LOAD ADRS."),
      };
    }
    if ((m.switches & 0xffff) !== hole.word) {
      return {
        done: false,
        focus: "switches",
        ghost: hole.word,
        text: L("Adresse ", "Address ") + oct(hole.addr) + L(" prête. Compose ", " is set. Enter ") + oct(hole.word) + " — " + hole.asm + L(" — puis DEP.", " — then DEP."),
      };
    }
    return {
      done: false,
      focus: "dep",
      ghost: null,
      text: L("DEP écrit ", "DEP writes ") + oct(hole.word) + L(" en ", " at ") + oct(hole.addr) + L(" et avance de 2.", " and advances by 2."),
    };
  }

  function lostProgram(m, program) {
    if (PDP11.memoryMatches(m, program)) return null;
    return {
      done: false,
      focus: null,
      ghost: null,
      text: L("Le programme en mémoire ne correspond plus à la fiche. Reprends le chapitre : le bouton est sous la fiche.", "Memory no longer matches the sheet. Restart the chapter: the button is under the sheet."),
    };
  }

  var steps = [
    {
      id: "bit0",
      chapter: "switches",
      title: L("La machine n'a pas de clavier", "The machine has no keyboard"),
      pace: "normal",
      teach: [
        L("Ce pupitre est celui d'un PDP-11, un mini-ordinateur des années 1970. À la mise sous tension, personne ne va chercher un système sur le disque. Il n'y a pas de BIOS. Pour entrer un programme, l'opérateur compose des mots sur les interrupteurs.", "This is the front panel of a PDP-11, a 1970s minicomputer. At power-on, nobody fetches a system from the disk. There is no BIOS. To enter a program, the operator sets words on the switches."),
        L("Chaque interrupteur est un bit. Levé, c'est 1. Baissé, c'est 0. Les lampes ne changent pas quand tu bouges un interrupteur : les interrupteurs ne sont pas la mémoire. Ils attendent un geste.", "Each switch is a bit. Up is 1. Down is 0. The lamps do not change when you move a switch: the switches are not memory. They wait for a gesture."),
      ],
      enter: function (ctx) {
        prepare(ctx.m);
      },
      guide: function (ctx) {
        var bit0 = ctx.m.switches & 1;
        return {
          done: bit0 === 1,
          focus: "switches",
          ghost: bit0 === 1 ? null : 1,
          text: L("Lève l'interrupteur 0, tout à droite. Un seul.", "Raise switch 0, at the far right. Just that one."),
          success: L("Le bit 0 est levé. Le chiffre du groupe ×1 passe à 1. Rien d'autre n'a bougé : ni l'adresse, ni la mémoire.", "Bit 0 is up. The ×1 group digit becomes 1. Nothing else moved: not the address, not the memory."),
        };
      },
    },
    {
      id: "seven",
      chapter: "switches",
      title: L("Trois bits, un chiffre octal", "Three bits, one octal digit"),
      pace: "normal",
      teach: [
        L("Le PDP-11 se lit en octal : les bits sont groupés par trois. Dans un groupe, les poids sont 4, 2 et 1, de gauche à droite. 111 binaire fait donc 7, pas 3 et pas 8.", "A PDP-11 is read in octal: bits are grouped by three. In a group the weights are 4, 2, and 1, left to right. Binary 111 is therefore 7, not 3 and not 8."),
        L("Il n'y a pas de chiffre 8 ni de chiffre 9 dans cette machine. Si tu vois 8, tu n'es plus en octal.", "This machine has no digit 8 and no digit 9. If you see an 8, you have left octal."),
      ],
      guide: function (ctx) {
        var ok = (ctx.m.switches & 0xffff) === 7;
        return {
          done: ok,
          focus: "switches",
          ghost: ok ? null : 7,
          text: L("Compose 000007. Dans le groupe ×1 : les trois interrupteurs levés. Tous les autres baissés. Le chiffre au-dessus du groupe doit afficher 7.", "Set 000007. In the ×1 group, raise all three switches. Leave every other switch down. The digit above the group must show 7."),
          success: L("000007. Les trois bits de droite valent 4 + 2 + 1. Tu viens de lire un chiffre octal sur le pupitre, pas dans un manuel.", "000007. The three right-hand bits are 4 + 2 + 1. You just read an octal digit on the panel, not in a manual."),
        };
      },
    },
    {
      id: "addr1000",
      chapter: "switches",
      title: L("L'adresse 001000", "Address 001000"),
      pace: "normal",
      teach: [
        L("Les opérateurs déposaient presque toujours le premier programme en 001000 octal. Ce n'est pas 1000 en décimal. 1000₈ vaut 512₁₀.", "Operators almost always deposited the first program at octal 001000. That is not decimal 1000. 1000₈ is 512₁₀."),
        L("Regarde les places sous les groupes. 001000 veut dire : le groupe ×1000 affiche 1, et tous les autres affichent 0. Dans ce groupe, le poids 1 est le bit 9.", "Look at the place values under the groups. 001000 means: the ×1000 group shows 1, and every other group shows 0. In that group, weight 1 is bit 9."),
      ],
      guide: function (ctx) {
        var ok = (ctx.m.switches & 0xffff) === 0o1000;
        return {
          done: ok,
          focus: "switches",
          ghost: null,
          text: L("Baisse tout, puis lève seulement le bit 9. Les chiffres doivent lire 001000. Pas de fantôme cette fois : lis les groupes.", "Lower everything, then raise only bit 9. The digits must read 001000. No ghost this time: read the groups."),
          success: L("001000 est sur les interrupteurs. Les lampes d'adresse sont encore à l'ancienne valeur : copier, c'est un geste à part.", "001000 is on the switches. The address lamps still show the old value: copying is a separate gesture."),
        };
      },
    },
    {
      id: "load1000",
      chapter: "address",
      title: L("LOAD ADRS copie", "LOAD ADRS copies"),
      pace: "normal",
      teach: [
        L("LOAD ADRS prend le nombre composé sur les interrupteurs et le copie dans le registre d'adresse. Ce sont les lampes du haut.", "LOAD ADRS takes the number set on the switches and copies it into the address register. Those are the lamps on top."),
        L("Tant que tu n'as pas appuyé, la machine ne devine pas ce que tu vises.", "Until you press it, the machine does not guess what you are aiming at."),
      ],
      enter: function (ctx) {
        prepare(ctx.m);
        ctx.m.switches = 0o1000;
      },
      guide: function (ctx) {
        var armed = focusSwitchOr(ctx.m, 0o1000, "load");
        var loaded = ctx.session.loaded && ctx.m.addr === 0o1000;
        return {
          done: loaded,
          focus: loaded ? null : armed.focus,
          ghost: loaded ? null : armed.ghost,
          text: L("Les interrupteurs doivent lire 001000. Ensuite, LOAD ADRS.", "The switches must read 001000. Then LOAD ADRS."),
          success: L("Les lampes ADDRESS affichent 001000. Le sous-titre dit « registre d'adresse » : ce n'est pas le compteur du programme. Le programme n'a pas encore de compteur.", "The ADDRESS lamps show 001000. The caption says “address register”: that is not the program counter. The program does not have a counter yet."),
        };
      },
      onEvent: function (ctx, e) {
        if (e.type === "load" && e.addr === 0o1000) ctx.session.loaded = true;
      },
    },
    {
      id: "sticky",
      chapter: "address",
      title: L("Les interrupteurs redeviennent libres", "The switches are free again"),
      pace: "normal",
      teach: [
        L("Une fois l'adresse copiée, les interrupteurs servent à autre chose : la donnée à écrire, ou une autre adresse. Les lampes du haut ne les suivent plus.", "Once the address is copied, the switches are for something else: the data to write, or another address. The top lamps no longer follow them."),
      ],
      guide: function (ctx) {
        if (ctx.m.addr !== 0o1000) {
          return {
            done: false,
            focus: "switches",
            ghost: 0o1000,
            text: L("LOAD ADRS a encore été pressé, et l'adresse a changé. Recompose 001000 et copie-la de nouveau. Ensuite seulement, baisse tous les interrupteurs.", "LOAD ADRS was pressed again, and the address changed. Set 001000 and copy it once more. Only then, lower every switch."),
          };
        }
        var cleared = (ctx.m.switches & 0xffff) === 0;
        return {
          done: cleared,
          focus: cleared ? null : "switches",
          ghost: cleared ? null : 0,
          text: L("Baisse tous les interrupteurs. Les lampes ADDRESS doivent rester sur 001000.", "Lower every switch. The ADDRESS lamps must stay on 001000."),
          success: L("Les interrupteurs sont à 000000 et l'adresse est restée 001000. Le pupitre a deux registres distincts : ce que tu composes, et l'adresse retenue.", "The switches are 000000 and the address stayed 001000. The panel has two separate registers: what you set, and the address it is holding."),
        };
      },
    },
    {
      id: "load1234",
      chapter: "address",
      title: L("Changer d'adresse", "Change the address"),
      pace: "normal",
      teach: [
        L("Pour viser ailleurs, on recompose, puis on recopie. 001234 se lit groupe par groupe.", "To aim elsewhere, set the switches again, then copy again. 001234 is read group by group."),
        L("×1000 = 1 (bit 9). ×100 = 2 (bit 7, le poids 2 du groupe). ×10 = 3 (bits 4 et 3, soit 2+1). ×1 = 4 (bit 2, le poids 4).", "×1000 = 1 (bit 9). ×100 = 2 (bit 7, weight 2 in that group). ×10 = 3 (bits 4 and 3, that is 2+1). ×1 = 4 (bit 2, weight 4)."),
      ],
      guide: function (ctx) {
        var armed = focusSwitchOr(ctx.m, 0o1234, "load");
        var done = ctx.session.loaded && ctx.m.addr === 0o1234;
        return {
          done: done,
          focus: done ? null : armed.focus,
          ghost: null,
          text: L("Compose 001234 sans fantôme, en lisant les chiffres au-dessus des groupes. Puis LOAD ADRS.", "Set 001234 with no ghost, reading the digits above the groups. Then LOAD ADRS."),
          success: L("Adresse 001234. Tu sais maintenant viser un mot. La suite, c'est le lire.", "Address 001234. You can now aim at a word. Next is to read it."),
        };
      },
      onEvent: function (ctx, e) {
        if (e.type === "load" && e.addr === 0o1234) ctx.session.loaded = true;
      },
    },
    {
      id: "exam-known",
      chapter: "exam",
      title: L("EXAM lit un mot", "EXAM reads a word"),
      pace: "normal",
      program: EXAM_DEMO,
      teach: [
        L("Quelqu'un a déjà déposé trois mots en 001000. EXAM lit le mot visé par les lampes d'adresse et le montre sur les lampes DATA.", "Someone already deposited three words at 001000. EXAM reads the word the address lamps point at and shows it on the DATA lamps."),
        L("Ensuite il avance l'adresse de 2. Un mot PDP-11 fait 16 bits, donc deux octets. On ne relit pas le même mot en appuyant deux fois.", "Then it advances the address by 2. A PDP-11 word is 16 bits, so two bytes. Pressing twice does not reread the same word."),
      ],
      enter: function (ctx) {
        prepare(ctx.m);
        PDP11.wipe(ctx.m, 0o1000, 0o1100);
        ctx.m.mem[0o1000 >> 1] = 0o012700;
        ctx.m.mem[0o1002 >> 1] = 0o000001;
        ctx.m.mem[0o1004 >> 1] = 0o000000;
      },
      guide: function (ctx) {
        if ((ctx.m.mem[0o1000 >> 1] & 0xffff) !== 0o012700) {
          return lostProgram(ctx.m, EXAM_DEMO);
        }
        if (ctx.session.seen) {
          return {
            done: true,
            focus: null,
            ghost: null,
            text: "",
            success: L("DATA montre 012700. C'est un MOV. L'adresse est passée à 001002, prête pour le mot suivant. Tu n'as pas recomposé 001002 : EXAM l'a fait.", "DATA shows 012700. That is a MOV. The address moved to 001002, ready for the next word. You did not set 001002: EXAM did."),
          };
        }
        var armed = focusSwitchOr(ctx.m, 0o1000, "load");
        if (ctx.m.addr !== 0o1000) {
          return {
            done: false,
            focus: armed.focus,
            ghost: null,
            text: L("Compose 001000, LOAD ADRS, puis EXAM.", "Set 001000, LOAD ADRS, then EXAM."),
          };
        }
        return {
          done: false,
          focus: "exam",
          ghost: null,
          text: L("L'adresse est 001000. EXAM.", "The address is 001000. EXAM."),
        };
      },
      onEvent: function (ctx, e) {
        if (e.type === "exam" && !e.err && !e.rejected && e.at === 0o1000 && e.data === 0o012700) {
          ctx.session.seen = true;
        }
      },
    },
    {
      id: "exam-next",
      chapter: "exam",
      title: L("Le mot suivant est la donnée", "The next word is the data"),
      pace: "normal",
      teach: [
        L("012700 se lit mov #n, r0. Le n n'est pas dans le mot de l'instruction. Il occupe le mot d'après. Ici, ce mot est 000001.", "012700 reads as mov #n, r0. The n is not inside the instruction word. It occupies the next word. Here that word is 000001."),
      ],
      guide: function (ctx) {
        if (ctx.session.seen) {
          return {
            done: true,
            focus: null,
            ghost: null,
            text: "",
            success: L("000001. Comme instruction, ce mot serait WAIT. Ici c'est une donnée : la valeur 1 que MOV va copier dans R0. Le sens d'un mot dépend de la façon dont on l'atteint.", "000001. As an instruction, this word would be WAIT. Here it is data: the value 1 that MOV will copy into R0. What a word means depends on how you reach it."),
          };
        }
        if (ctx.m.addr !== 0o1002) {
          return {
            done: false,
            focus: "switches",
            ghost: 0o1002,
            text: L("L'adresse n'est plus 001002. Recompose 001002, LOAD ADRS, puis EXAM. La prochaine fois, laisse EXAM avancer tout seul.", "The address is no longer 001002. Set 001002, LOAD ADRS, then EXAM. Next time, let EXAM advance on its own."),
          };
        }
        return {
          done: false,
          focus: "exam",
          ghost: null,
          text: L("N'appuie pas sur LOAD ADRS. EXAM seulement.", "Do not press LOAD ADRS. EXAM only."),
        };
      },
      onEvent: function (ctx, e) {
        if (e.type === "exam" && e.at === 0o1002 && e.data === 1) ctx.session.seen = true;
      },
    },
    {
      id: "exam-halt",
      chapter: "exam",
      title: L("Le mot nul", "The zero word"),
      pace: "normal",
      teach: [
        L("000000 est l'instruction HALT. Ce n'est pas « vide ». C'est un ordre : arrête-toi.", "000000 is the HALT instruction. It is not “empty”. It is an order: stop."),
      ],
      guide: function (ctx) {
        if (ctx.session.seen) {
          return {
            done: true,
            focus: null,
            ghost: null,
            text: "",
            success: L("000000, HALT. Si on lançait le processeur en 001000, il copierait 1 dans R0 puis s'arrêterait sur ce mot. L'interrupteur HALT du pupitre et l'instruction HALT sont deux choses différentes. Tu verras les deux.", "000000, HALT. If the processor were started at 001000, it would copy 1 into R0 and then stop on this word. The panel HALT switch and the HALT instruction are two different things. You will see both."),
          };
        }
        if (ctx.m.addr !== 0o1004) {
          return {
            done: false,
            focus: "switches",
            ghost: 0o1004,
            text: L("Reviens en 001004 (LOAD ADRS) puis EXAM.", "Go back to 001004 (LOAD ADRS), then EXAM."),
          };
        }
        return {
          done: false,
          focus: "exam",
          ghost: null,
          text: L("EXAM. Les lampes DATA doivent faire 000000.", "EXAM. The DATA lamps must show 000000."),
        };
      },
      onEvent: function (ctx, e) {
        if (e.type === "exam" && e.at === 0o1004 && e.data === 0) ctx.session.seen = true;
      },
    },
    {
      id: "odd",
      chapter: "exam",
      title: L("Pas d'adresse impaire", "No odd address"),
      pace: "normal",
      teach: [
        L("Les octets existent dans la machine, mais le pupitre dépose et examine des mots. Un mot commence toujours sur une adresse paire. 001001 n'est pas une case de mot.", "Bytes exist in the machine, but the panel deposits and examines words. A word always starts at an even address. 001001 is not a word cell."),
      ],
      guide: function (ctx) {
        if (ctx.session.seen) {
          return {
            done: true,
            focus: null,
            ghost: null,
            text: "",
            success: L("ADRS ERR est allumé. Rien n'a été lu, l'adresse n'a pas avancé. LOAD ADRS éteint l'erreur. Retiens : 001000, 001002, 001004… jamais 001001.", "ADRS ERR is lit. Nothing was read, and the address did not advance. LOAD ADRS clears the error. Remember: 001000, 001002, 001004… never 001001."),
          };
        }
        var armed = focusSwitchOr(ctx.m, 0o1001, "load");
        if (!ctx.session.armed) {
          return {
            done: false,
            focus: armed.focus,
            ghost: null,
            text: L("Compose 001001 (001000, plus le bit 0) et LOAD ADRS.", "Set 001001 (001000, plus bit 0) and LOAD ADRS."),
          };
        }
        return {
          done: false,
          focus: "exam",
          ghost: null,
          text: L("Adresse impaire chargée. EXAM.", "Odd address loaded. EXAM."),
        };
      },
      onEvent: function (ctx, e) {
        if (e.type === "load" && e.addr === 0o1001) ctx.session.armed = true;
        if (e.type === "exam" && e.err && e.at === 0o1001) ctx.session.seen = true;
      },
    },
    {
      id: "dep-chaser",
      chapter: "deposit",
      title: L("Déposer le chenillard", "Deposit the chaser"),
      pace: "normal",
      program: CHASER,
      teach: [
        L("Tu vas entrer le plus petit programme qui se voit. Il met 1 dans R0, fait tourner ce bit vers la gauche en passant par la retenue, attend, et recommence.", "You are about to enter the smallest program you can watch. It puts 1 in R0, rotates that bit left through the carry, waits, and does it again."),
        L("012700 est mov #n, r0. 006100 est rol r0. 000005 est reset : ici il sert de pause pour l'œil. 000775 est un branchement vers ROL. Le mot ne contient pas l'adresse 001004. Il contient un saut de −3 mots, parce que le PC aura déjà avancé. L'assembleur écrit ça br .-4.", "012700 is mov #n, r0. 006100 is rol r0. 000005 is reset: here it is a pause for the eye. 000775 is a branch to ROL. The word does not contain the address 001004. It contains a jump of −3 words, because the PC will already have moved on. The assembler writes that as br .-4."),
        L("Le fantôme montre le mot à composer. LOAD ADRS une fois, puis DEP pour chaque mot. Chaque DEP avance de 2. Si tu te trompes, la fiche te renvoie sur le premier trou.", "The ghost shows the word to set. LOAD ADRS once, then DEP for each word. Each DEP advances by 2. If you miss, the sheet sends you back to the first gap."),
      ],
      enter: function (ctx) {
        prepare(ctx.m);
        PDP11.wipe(ctx.m, 0o1000, 0o1100);
      },
      guide: function (ctx) {
        return depositGuide(ctx.m, CHASER);
      },
    },
    {
      id: "verify-chaser",
      chapter: "deposit",
      title: L("Relire avant de lancer", "Read back before you run"),
      pace: "normal",
      program: CHASER,
      teach: [
        L("L'opérateur refaisait un passage EXAM. Compare chaque mot des lampes DATA à la fiche. EXAM avance tout seul : charge 001000 une fois, puis EXAM cinq fois.", "The operator would pass through with EXAM again. Compare each DATA word with the sheet. EXAM advances by itself: load 001000 once, then EXAM five times."),
      ],
      guide: function (ctx) {
        var badMem = lostProgram(ctx.m, CHASER);
        if (badMem) return badMem;
        if (ctx.session.cursor >= CHASER.length) {
          return {
            done: true,
            focus: null,
            ghost: null,
            text: "",
            success: L("Les cinq mots correspondent. Tu peux lancer sans te demander si un interrupteur a glissé.", "The five words match. You can start without wondering whether a switch slipped."),
          };
        }
        var row = CHASER[ctx.session.cursor];
        if (ctx.session.bad) {
          var back = focusSwitchOr(ctx.m, row.addr, "load");
          return {
            done: false,
            focus: ctx.m.addr === row.addr ? "exam" : back.focus,
            ghost: ctx.m.addr === row.addr ? null : back.ghost,
            text: L("Séquence rompue. Recharge ", "Sequence broken. Reload ") + oct(row.addr) + L(" et relis depuis ce mot, dans l'ordre.", " and read again from that word, in order."),
          };
        }
        if (ctx.m.addr !== row.addr) {
          var arm = focusSwitchOr(ctx.m, row.addr, "load");
          return {
            done: false,
            focus: arm.focus,
            ghost: arm.ghost,
            text: L("LOAD ADRS sur ", "LOAD ADRS at ") + oct(row.addr) + L(", puis EXAM jusqu'au bout de la liste.", ", then EXAM through the rest of the list."),
          };
        }
        return {
          done: false,
          focus: "exam",
          ghost: null,
          text: L("EXAM. Tu dois lire ", "EXAM. You should read ") + oct(row.word) + " (" + row.asm + ").",
        };
      },
      onEvent: function (ctx, e) {
        if (e.type !== "exam" || e.err || e.rejected) return;
        var i = ctx.session.cursor;
        if (i >= CHASER.length) return;
        if (e.at === CHASER[i].addr && e.data === CHASER[i].word) {
          ctx.session.cursor = i + 1;
          ctx.session.bad = false;
        } else {
          ctx.session.cursor = 0;
          ctx.session.bad = true;
        }
      },
    },
    {
      id: "knob",
      chapter: "run",
      title: L("Choisir ce que DATA montre", "Choose what DATA shows"),
      pace: "slow",
      program: CHASER,
      teach: [
        L("Pendant que le processeur tourne, les lampes du bas ne sont plus « le dernier EXAM ». Sur une 11/70, un rotacteur choisit la source. Ici il a trois positions.", "While the processor runs, the lower lamps are no longer “the last EXAM”. On an 11/70 a rotary switch selects the source. Here it has three positions."),
        L("BUS montre le dernier mot lu sur le bus. INSTR montre le mot à l'adresse du PC. R0 montre le registre, celui que le chenillard fait tourner. À l'arrêt, le rotacteur ne change rien : DATA redevient le registre du pupitre.", "BUS shows the last word read on the bus. INSTR shows the word at the PC. R0 shows the register, the one the chaser rotates. When halted, the knob changes nothing: DATA goes back to the panel register."),
      ],
      enter: function (ctx) {
        prepare(ctx.m);
        PDP11.wipe(ctx.m, 0o1000, 0o1100);
        PDP11.writeProgram(ctx.m, CHASER);
        ctx.m.display = "bus";
      },
      guide: function (ctx) {
        var done = ctx.m.display === "r0";
        return {
          done: done,
          focus: done ? null : "knob",
          ghost: null,
          text: L("Mets l'affichage DATA sur R0.", "Set the DATA display to R0."),
          success: L("R0 est choisi. Tant que RUN est éteint, les lampes DATA ne montrent pas encore R0. Elles le montreront dès le départ.", "R0 is selected. While RUN is off, the DATA lamps do not show R0 yet. They will, as soon as it starts."),
        };
      },
    },
    {
      id: "start-chaser",
      chapter: "run",
      title: L("ENABLE, puis START", "ENABLE, then START"),
      pace: "slow",
      program: CHASER,
      teach: [
        L("START copie l'adresse du pupitre dans le PC, remet les codes N, Z, V, C à zéro, et lance — seulement si l'interrupteur est sur ENABLE.", "START copies the panel address into the PC, clears the N, Z, V, and C codes, and runs — only if the switch is on ENABLE."),
        L("S'il est sur HALT, START charge le PC et n'exécute rien. C'est voulu : on prépare, puis on autorise.", "If it is on HALT, START loads the PC and executes nothing. That is intentional: you set up, then you enable."),
      ],
      guide: function (ctx) {
        var bad = lostProgram(ctx.m, CHASER);
        if (bad) return bad;
        if (ctx.session.startedOk && ctx.m.running) {
          return {
            done: true,
            focus: null,
            ghost: null,
            text: "",
            success: L("RUN est allumé. Le PC est parti de 001000. Les lampes ADDRESS montrent maintenant le PC, plus le registre du pupitre. Regarde le sous-titre sous les lampes : il change selon l'état.", "RUN is lit. The PC started at 001000. The ADDRESS lamps now show the PC, not the panel register. Look at the caption under the lamps: it changes with the state."),
          };
        }
        if (!ctx.m.enable) {
          var arm = focusSwitchOr(ctx.m, 0o1000, "load");
          if (ctx.m.addr !== 0o1000) {
            return {
              done: false,
              focus: arm.focus,
              ghost: arm.ghost,
              text: L("Compose 001000 et LOAD ADRS. L'interrupteur ENABLE/HALT est encore sur HALT : tu le lèveras ensuite.", "Set 001000 and LOAD ADRS. The ENABLE/HALT switch is still on HALT: you will raise it next."),
            };
          }
          return {
            done: false,
            focus: "enable",
            ghost: null,
            text: L("Adresse prête. Lève ENABLE. Tant qu'il reste sur HALT, START ne fera que charger le PC.", "Address ready. Raise ENABLE. While it stays on HALT, START only loads the PC."),
          };
        }
        if (ctx.m.addr !== 0o1000) {
          var again = focusSwitchOr(ctx.m, 0o1000, "load");
          return {
            done: false,
            focus: again.focus,
            ghost: again.ghost,
            text: L("ENABLE est levé. Remets l'adresse 001000 avec LOAD ADRS, puis START.", "ENABLE is up. Set address 001000 with LOAD ADRS, then START."),
          };
        }
        return {
          done: false,
          focus: "start",
          ghost: null,
          text: "START.",
        };
      },
      onEvent: function (ctx, e) {
        if (e.type === "start" && e.pc === 0o1000 && e.running) ctx.session.startedOk = true;
      },
    },
    {
      id: "watch-chaser",
      chapter: "run",
      title: L("Le bit qui traverse la retenue", "The bit that crosses the carry"),
      pace: "slow",
      teach: [
        L("R0 commence à 1. rol le décale vers la gauche. Le bit qui sort du poids fort entre dans C, la retenue. Au tour suivant, C entre dans le bit 0.", "R0 starts at 1. rol shifts it left. The bit that leaves the high end enters C, the carry. On the next turn, C enters bit 0."),
        L("Tu dois voir les lampes DATA s'éteindre pendant que C s'allume, puis le bit revenir à droite. RESET, le mot 000005, est la pause qui rend ça lisible. L'adresse reste longtemps sur 001010 : c'est le branchement, pendant la pause.", "You should see the DATA lamps go dark while C lights, then the bit come back on the right. RESET, the word 000005, is the pause that makes this readable. The address stays on 001010 for a long time: that is the branch, during the pause."),
      ],
      guide: function (ctx) {
        if (ctx.session.sawReturn) {
          return {
            done: true,
            focus: null,
            ghost: null,
            text: "",
            success: L("Le bit a quitté R0 (il était dans C, les lampes DATA éteintes) puis il est revenu à droite. Un ROL n'est pas un décalage qui perd le bit : c'est un anneau de 17 positions, les 16 bits plus la retenue.", "The bit left R0 (it was in C, DATA lamps dark) and then came back on the right. A ROL is not a shift that drops the bit: it is a ring of 17 positions, the 16 bits plus the carry."),
          };
        }
        if (!ctx.m.running) {
          return {
            done: false,
            focus: ctx.m.enable ? "cont" : "enable",
            ghost: null,
            text: ctx.m.enable
              ? L("La machine est arrêtée. CONT reprend là où le PC s'est figé.", "The machine is stopped. CONT resumes where the PC froze.")
              : L("ENABLE est sur HALT. Lève-le, puis CONT.", "ENABLE is on HALT. Raise it, then CONT."),
          };
        }
        return {
          done: false,
          focus: null,
          ghost: null,
          text: ctx.session.sawCarry
            ? L("C tient le bit. Attends qu'il revienne dans R0.", "C is holding the bit. Wait until it comes back into R0.")
            : L("Regarde R0 tourner. Attends le passage par le noir, quand seule la retenue C est allumée.", "Watch R0 rotate. Wait for the dark pass, when only the C carry is lit."),
        };
      },
      onFrame: function (ctx) {
        if (!ctx.m.running) return;
        var r = ctx.m.r[0] & 0xffff;
        if (r === 0 && ctx.m.c) ctx.session.sawCarry = true;
        if (ctx.session.sawCarry && r === 1 && !ctx.m.c) ctx.session.sawReturn = true;
      },
    },
    {
      id: "halt-chaser",
      chapter: "run",
      title: L("L'opérateur arrête", "The operator stops it"),
      pace: "slow",
      teach: [
        L("Baisser ENABLE/HALT demande l'arrêt entre deux instructions. Le programme, lui, ne contient pas de HALT : il tournerait indéfiniment.", "Lowering ENABLE/HALT asks for a stop between two instructions. The program itself contains no HALT: it would run forever."),
      ],
      guide: function (ctx) {
        var stopped = !ctx.m.running && !ctx.m.enable && ctx.m.haltReason === "switch";
        if (stopped) {
          return {
            done: true,
            focus: null,
            ghost: null,
            text: "",
            success: L("RUN est éteint. Les lampes ADDRESS sont revenues au registre du pupitre, pas au PC. Le PC est resté quelque part dans la boucle. Pour le lire, il a une adresse de console.", "RUN is off. The ADDRESS lamps have returned to the panel register, not the PC. The PC is still somewhere in the loop. To read it, it has a console address."),
          };
        }
        return {
          done: false,
          focus: "enable",
          ghost: null,
          text: L("Baisse l'interrupteur sur HALT.", "Lower the switch to HALT."),
        };
      },
    },
    {
      id: "read-r0",
      chapter: "run",
      title: L("Les registres ont une adresse de pupitre", "The registers have a panel address"),
      pace: "normal",
      teach: [
        L("Un programme désigne R0 dans l'instruction, pas par une adresse. Depuis le pupitre, DEC a quand même donné une adresse à chaque registre : 177700 est R0, 177701 est R1, jusqu'à 177707 qui est le PC.", "A program names R0 inside the instruction, not by an address. From the panel, DEC still gave each register an address: 177700 is R0, 177701 is R1, up to 177707 which is the PC."),
        L("Cette fenêtre n'existe que pour EXAM et DEP. Et comme ce sont des registres, pas des mots mémoire, l'adresse avance de 1, pas de 2.", "That window exists only for EXAM and DEP. And because these are registers, not memory words, the address advances by 1, not by 2."),
      ],
      guide: function (ctx) {
        if (ctx.session.seen) {
          return {
            done: true,
            focus: null,
            ghost: null,
            text: "",
            success: L("R0 vaut ", "R0 is ") + oct(ctx.session.value) + L(". L'adresse est passée à 177701 : un cran, pas deux. 177707 te donnerait le PC, figé dans le chenillard. Les lampes DATA à l'arrêt ne devinent pas un registre. Tu viens de le demander.", ". The address moved to 177701: one step, not two. 177707 would give you the PC, frozen inside the chaser. Halted DATA lamps do not guess a register. You just asked for it."),
          };
        }
        if (ctx.m.running) {
          return {
            done: false,
            focus: "enable",
            ghost: null,
            text: L("La machine tourne encore. HALT d'abord : EXAM est ignoré pendant RUN.", "The machine is still running. HALT first: EXAM is ignored while RUN is on."),
          };
        }
        var armed = focusSwitchOr(ctx.m, 0o177700, "load");
        if (ctx.m.addr !== 0o177700) {
          return {
            done: false,
            focus: armed.focus,
            ghost: null,
            text: L("Compose 177700 : bit 15 levé, bits 14 à 6 levés, bits 5 à 0 baissés. Les chiffres doivent lire 177700. Puis LOAD ADRS et EXAM.", "Set 177700: bit 15 up, bits 14 through 6 up, bits 5 through 0 down. The digits must read 177700. Then LOAD ADRS and EXAM."),
          };
        }
        return {
          done: false,
          focus: "exam",
          ghost: null,
          text: L("EXAM. DATA montre R0.", "EXAM. DATA shows R0."),
        };
      },
      onEvent: function (ctx, e) {
        if (e.type === "exam" && e.reg === 0 && e.at === 0o177700) {
          ctx.session.seen = true;
          ctx.session.value = e.data;
        }
      },
    },
    {
      id: "dep-add",
      chapter: "calc",
      title: L("Un calcul qui s'arrête seul", "A calculation that stops itself"),
      pace: "normal",
      program: ADD,
      teach: [
        L("14₈ vaut 12 en décimal. Lui ajouter 3 donne 17₈, soit 15. Le programme copie 14 dans R0, ajoute 3, puis exécute HALT.", "14₈ is 12 decimal. Adding 3 makes 17₈, which is 15. The program copies 14 into R0, adds 3, then executes HALT."),
        L("L'instruction HALT n'a pas besoin de l'interrupteur. Le processeur s'arrête, ENABLE peut rester levé. RUN s'éteint quand même.", "The HALT instruction does not need the switch. The processor stops, and ENABLE may stay up. RUN goes off anyway."),
      ],
      enter: function (ctx) {
        prepare(ctx.m);
        blankUnknown(ctx.m);
      },
      guide: function (ctx) {
        return depositGuide(ctx.m, ADD);
      },
    },
    {
      id: "run-add",
      chapter: "calc",
      title: L("Lire le résultat dans R0", "Read the result in R0"),
      pace: "normal",
      program: ADD,
      revealRegs: false,
      teach: [
        L("Même geste qu'avec le chenillard : adresse 001000, ENABLE, START. Cette fois le programme s'arrête tout seul. Quand RUN s'éteint, le résultat n'est pas sur les lampes DATA. Il est dans R0, donc en 177700.", "Same gesture as the chaser: address 001000, ENABLE, START. This time the program stops by itself. When RUN goes off, the result is not on the DATA lamps. It is in R0, so at 177700."),
      ],
      enter: function (ctx) {
        ctx.m.running = false;
        ctx.m.enable = false;
        ctx.m.stall = 0;
        ctx.m.haltReason = null;
        ctx.m.addr = 0;
        ctx.m.switches = 0;
        PDP11.clearRegs(ctx.m);
      },
      guide: function (ctx) {
        var bad = lostProgram(ctx.m, ADD);
        if (bad) return bad;
        var finished = ctx.session.startedOk && !ctx.m.running && ctx.m.haltReason === "opcode" && (ctx.m.r[0] & 0xffff) === 0o17;
        if (ctx.session.seen && finished) {
          return {
            done: true,
            focus: null,
            ghost: null,
            text: "",
            success: L("000017. Quinze, en octal. L'instruction HALT a éteint RUN sans que tu baisses l'interrupteur. ENABLE peut rester levé : c'est le programme qui a demandé l'arrêt.", "000017. Fifteen, in octal. The HALT instruction turned RUN off without you lowering the switch. ENABLE may stay up: the program asked to stop."),
          };
        }
        if (!finished) {
          if (!ctx.m.enable) {
            var arm = focusSwitchOr(ctx.m, 0o1000, "load");
            if (ctx.m.addr !== 0o1000) {
              return {
                done: false,
                focus: arm.focus,
                ghost: arm.ghost,
                text: L("Compose 001000, LOAD ADRS. ENABLE est encore sur HALT.", "Set 001000, LOAD ADRS. ENABLE is still on HALT."),
              };
            }
            return {
              done: false,
              focus: "enable",
              ghost: null,
              text: L("Lève ENABLE, puis START. Attends que RUN s'éteigne de lui-même.", "Raise ENABLE, then START. Wait until RUN turns itself off."),
            };
          }
          if (ctx.m.addr !== 0o1000 && !ctx.session.startedOk) {
            var again = focusSwitchOr(ctx.m, 0o1000, "load");
            return {
              done: false,
              focus: again.focus,
              ghost: again.ghost,
              text: L("Remets 001000 avec LOAD ADRS, puis START.", "Set 001000 again with LOAD ADRS, then START."),
            };
          }
          if (!ctx.session.startedOk) {
            return { done: false, focus: "start", ghost: null, text: "START." };
          }
          if (ctx.m.running) {
            return { done: false, focus: null, ghost: null, text: L("Le programme tourne. Il va rencontrer HALT.", "The program is running. It will meet HALT.") };
          }
          return {
            done: false,
            focus: null,
            ghost: null,
            text: L("Arrêt inattendu (", "Unexpected stop (") + (ctx.m.haltReason || "?") + L("). Reprends le chapitre.", "). Restart the chapter."),
          };
        }
        var read = focusSwitchOr(ctx.m, 0o177700, "load");
        if (ctx.m.addr !== 0o177700) {
          return {
            done: false,
            focus: read.focus,
            ghost: null,
            text: L("RUN est éteint par l'instruction. Compose 177700, LOAD ADRS, EXAM. Tu dois lire 000017.", "RUN was turned off by the instruction. Set 177700, LOAD ADRS, EXAM. You should read 000017."),
          };
        }
        return {
          done: false,
          focus: "exam",
          ghost: null,
          text: L("EXAM. 000017 est 15 en décimal : 12 + 3, écrit en octal.", "EXAM. 000017 is 15 decimal: 12 + 3, written in octal."),
        };
      },
      onEvent: function (ctx, e) {
        if (e.type === "start" && e.pc === 0o1000 && e.running) ctx.session.startedOk = true;
        if (e.type === "exam" && e.reg === 0 && e.data === 0o17) ctx.session.seen = true;
      },
    },
    {
      id: "step-mov",
      chapter: "step",
      title: L("Une instruction, pas une ligne", "One instruction, not one line"),
      pace: "normal",
      program: ADD,
      revealRegs: true,
      teach: [
        L("Avec HALT baissé, CONT exécute exactement une instruction puis rend la main. START, dans cette position, chargerait le PC sans rien exécuter.", "With HALT down, CONT executes exactly one instruction and then gives back control. START, in that position, would load the PC and execute nothing."),
        L("mov #14, r0 est une seule instruction, même si elle occupe deux mots. Un CONT consomme les deux. Le cahier du maître apparaît : la machine, elle, ne montre toujours pas les registres.", "mov #14, r0 is a single instruction, even though it occupies two words. One CONT consumes both. The teacher's notebook appears: the machine itself still does not show the registers."),
      ],
      enter: function (ctx) {
        prepare(ctx.m);
        PDP11.wipe(ctx.m, 0o1000, 0o1100);
        PDP11.writeProgram(ctx.m, ADD);
      },
      guide: function (ctx) {
        var done = ctx.session.stepped && (ctx.m.r[0] & 0xffff) === 0o14 && (ctx.m.r[7] & 0xffff) === 0o1004;
        if (done) {
          return {
            done: true,
            focus: null,
            ghost: null,
            text: "",
            success: L("Un pas. R0 contient 000014, et le PC est en 001004, sur le ADD. Les deux mots du MOV ont été lus. Le cahier le montre. Les lampes DATA, non : tu ne l'as pas examiné.", "One step. R0 holds 000014, and the PC is at 001004, on the ADD. Both words of the MOV were read. The notebook shows it. The DATA lamps do not: you have not examined it."),
          };
        }
        if (ctx.m.enable) {
          return {
            done: false,
            focus: "enable",
            ghost: null,
            text: L("Baisse ENABLE/HALT. Le pas à pas se fait l'interrupteur sur HALT.", "Lower ENABLE/HALT. Single step is done with the switch on HALT."),
          };
        }
        if (ctx.m.addr !== 0o1000 || ctx.session.started) {
          if (!ctx.session.loaded) {
            var arm = focusSwitchOr(ctx.m, 0o1000, "load");
            return {
              done: false,
              focus: arm.focus,
              ghost: arm.ghost,
              text: L("LOAD ADRS 001000. Ne lève pas ENABLE.", "LOAD ADRS 001000. Do not raise ENABLE."),
            };
          }
        }
        if (!ctx.session.loaded) {
          var arm2 = focusSwitchOr(ctx.m, 0o1000, "load");
          return {
            done: false,
            focus: arm2.focus,
            ghost: arm2.ghost,
            text: L("Compose 001000 et LOAD ADRS.", "Set 001000 and LOAD ADRS."),
          };
        }
        if (!ctx.session.started) {
          return {
            done: false,
            focus: "start",
            ghost: null,
            text: L("START charge le PC depuis les lampes d'adresse, sans lancer la course.", "START loads the PC from the address lamps, without starting the run."),
          };
        }
        return {
          done: false,
          focus: "cont",
          ghost: null,
          text: L("CONT. Une instruction.", "CONT. One instruction."),
        };
      },
      onEvent: function (ctx, e) {
        if (e.type === "load" && e.addr === 0o1000) ctx.session.loaded = true;
        if (e.type === "start" && e.pc === 0o1000 && !e.running) ctx.session.started = true;
        if (e.type === "cont" && e.why === "mov") ctx.session.stepped = true;
      },
    },
    {
      id: "step-see",
      chapter: "step",
      title: L("Confirmer sur les lampes", "Confirm it on the lamps"),
      pace: "normal",
      revealRegs: true,
      teach: [
        L("Le cahier est un aide. La lecture qui compte est celle du pupitre.", "The notebook is an aid. The reading that counts is the one on the panel."),
      ],
      guide: function (ctx) {
        if ((ctx.m.r[0] & 0xffff) !== 0o14 || (ctx.m.r[7] & 0xffff) !== 0o1004) {
          return {
            done: false,
            focus: null,
            ghost: null,
            text: L("Le MOV a été dépassé. Reprends le chapitre pour le rejouer pas à pas.", "The MOV was passed. Restart the chapter to single-step it again."),
          };
        }
        if (ctx.session.seen) {
          return {
            done: true,
            focus: null,
            ghost: null,
            text: "",
            success: L("Les lampes DATA disent 000014, en accord avec le cahier. 14₈ = 12₁₀. Le PC n'a pas bougé : EXAM ne lance pas le programme.", "The DATA lamps say 000014, in agreement with the notebook. 14₈ = 12₁₀. The PC did not move: EXAM does not start the program."),
          };
        }
        var arm = focusSwitchOr(ctx.m, 0o177700, "load");
        if (ctx.m.addr !== 0o177700) {
          return {
            done: false,
            focus: arm.focus,
            ghost: null,
            text: L("EXAM de R0 : adresse 177700, puis EXAM. Tu dois lire 000014.", "EXAM of R0: address 177700, then EXAM. You should read 000014."),
          };
        }
        return { done: false, focus: "exam", ghost: null, text: "EXAM." };
      },
      onEvent: function (ctx, e) {
        if (e.type === "exam" && e.reg === 0 && e.data === 0o14) ctx.session.seen = true;
      },
    },
    {
      id: "step-add",
      chapter: "step",
      title: L("Le pas du ADD", "The ADD step"),
      pace: "normal",
      revealRegs: true,
      teach: [
        L("ADD additionne la source et la destination, et range le résultat dans la destination. add #3, r0 laisse R0 à 17₈.", "ADD adds the source and the destination, and stores the result in the destination. add #3, r0 leaves R0 at 17₈."),
      ],
      guide: function (ctx) {
        var done = ctx.session.stepped && (ctx.m.r[0] & 0xffff) === 0o17 && (ctx.m.r[7] & 0xffff) === 0o1010;
        if (done) {
          return {
            done: true,
            focus: null,
            ghost: null,
            text: "",
            success: L("R0 vaut 000017. Le PC est sur 001010, le mot HALT, qui n'est pas encore exécuté. Un pas = une instruction, et HALT est la prochaine.", "R0 is 000017. The PC is at 001010, the HALT word, which has not executed yet. One step = one instruction, and HALT is next."),
          };
        }
        if (ctx.m.enable) {
          return { done: false, focus: "enable", ghost: null, text: L("Laisse l'interrupteur sur HALT.", "Leave the switch on HALT.") };
        }
        return { done: false, focus: "cont", ghost: null, text: L("CONT, pour exécuter le ADD.", "CONT, to execute the ADD.") };
      },
      onEvent: function (ctx, e) {
        if (e.type === "cont" && e.why === "add") ctx.session.stepped = true;
      },
    },
    {
      id: "step-halt",
      chapter: "step",
      title: L("Le pas qui s'arrête", "The step that stops"),
      pace: "normal",
      revealRegs: true,
      teach: [
        L("Le prochain CONT exécute HALT. Le PC avance quand même d'un mot : il pointe après l'instruction qui a arrêté.", "The next CONT executes HALT. The PC still advances one word: it points after the instruction that stopped."),
      ],
      guide: function (ctx) {
        var done = ctx.m.haltReason === "opcode" && (ctx.m.r[7] & 0xffff) === 0o1012 && (ctx.m.r[0] & 0xffff) === 0o17;
        if (done) {
          return {
            done: true,
            focus: null,
            ghost: null,
            text: "",
            success: L("HALT exécuté. Le PC vaut 001012, juste après le mot 000000. R0 n'a pas changé. Tu as vu les trois instructions, une par une, sans que la machine te devance.", "HALT executed. The PC is 001012, just after the word 000000. R0 did not change. You saw the three instructions, one by one, without the machine running ahead of you."),
          };
        }
        return { done: false, focus: "cont", ghost: null, text: L("CONT. C'est le HALT.", "CONT. This is the HALT.") };
      },
    },
    {
      id: "dep-loop",
      chapter: "loop",
      title: L("Une boucle dont le saut est une distance", "A loop whose branch is a distance"),
      pace: "normal",
      program: LOOP,
      revealRegs: true,
      teach: [
        L("Ce programme met R0 à 0, puis ajoute 1 tant que R0 n'est pas 5. cmp #5, r0 calcule 5 − R0 et ne range rien : il règle seulement les codes. bne repart vers INC tant que le résultat n'est pas zéro.", "This program sets R0 to 0, then adds 1 while R0 is not 5. cmp #5, r0 computes 5 − R0 and stores nothing: it only sets the condition codes. bne goes back to INC while the result is not zero."),
        L("bne est en 001010. Au moment du saut, le PC vaut déjà 001012. La cible est 001002. L'écart est −4 mots. Le mot déposé est 001374, pas 001002. L'assembleur note bne .-6 parce que l'adresse de l'instruction, 001010, moins 6, fait 001002.", "bne is at 001010. When the branch happens, the PC is already 001012. The target is 001002. The offset is −4 words. The deposited word is 001374, not 001002. The assembler writes bne .-6 because the instruction address, 001010, minus 6, is 001002."),
      ],
      enter: function (ctx) {
        prepare(ctx.m);
        blankUnknown(ctx.m);
      },
      guide: function (ctx) {
        return depositGuide(ctx.m, LOOP);
      },
    },
    {
      id: "run-loop",
      chapter: "loop",
      title: L("Laisser la boucle finir", "Let the loop finish"),
      pace: "normal",
      program: LOOP,
      revealRegs: true,
      teach: [
        L("Lance en 001000. La boucle est trop rapide pour les lampes : le résultat se lit après l'arrêt, dans R0. Tu dois y trouver 000005.", "Start at 001000. The loop is too fast for the lamps: the result is read after the stop, in R0. You should find 000005 there."),
      ],
      enter: function (ctx) {
        ctx.m.running = false;
        ctx.m.enable = false;
        ctx.m.stall = 0;
        ctx.m.haltReason = null;
        PDP11.clearRegs(ctx.m);
        ctx.m.addr = 0;
        ctx.m.switches = 0;
      },
      guide: function (ctx) {
        var bad = lostProgram(ctx.m, LOOP);
        if (bad) return bad;
        var finished = ctx.session.startedOk && !ctx.m.running && ctx.m.haltReason === "opcode" && (ctx.m.r[0] & 0xffff) === 5;
        if (ctx.session.seen && finished) {
          return {
            done: true,
            focus: null,
            ghost: null,
            text: "",
            success: L("000005. La branche ne contenait pas l'adresse de retour, seulement une distance, et pourtant elle est revenue cinq fois sur INC avant de laisser passer HALT. C'est le même geste que le chenillard, avec un résultat qu'on peut vérifier.", "000005. The branch did not contain the return address, only a distance, and still it came back to INC five times before letting HALT through. Same gesture as the chaser, with a result you can check."),
          };
        }
        if (!finished) {
          if (!ctx.m.enable) {
            var arm = focusSwitchOr(ctx.m, 0o1000, "load");
            if (ctx.m.addr !== 0o1000) {
              return {
                done: false,
                focus: arm.focus,
                ghost: arm.ghost,
                text: L("001000, LOAD ADRS, puis tu lèveras ENABLE.", "001000, LOAD ADRS, then you will raise ENABLE."),
              };
            }
            return { done: false, focus: "enable", ghost: null, text: L("Lève ENABLE, puis START.", "Raise ENABLE, then START.") };
          }
          if (!ctx.session.startedOk && ctx.m.addr !== 0o1000) {
            var again = focusSwitchOr(ctx.m, 0o1000, "load");
            return { done: false, focus: again.focus, ghost: again.ghost, text: L("Remets 001000, LOAD ADRS, START.", "Set 001000 again, LOAD ADRS, START.") };
          }
          if (!ctx.session.startedOk) return { done: false, focus: "start", ghost: null, text: "START." };
          if (ctx.m.running) return { done: false, focus: null, ghost: null, text: L("La boucle tourne.", "The loop is running.") };
          return { done: false, focus: null, ghost: null, text: L("Arrêt inattendu. Reprends le chapitre.", "Unexpected stop. Restart the chapter.") };
        }
        var read = focusSwitchOr(ctx.m, 0o177700, "load");
        if (ctx.m.addr !== 0o177700) {
          return {
            done: false,
            focus: read.focus,
            ghost: null,
            text: L("Le programme s'est arrêté. EXAM de R0 en 177700 : 000005.", "The program has stopped. EXAM R0 at 177700: 000005."),
          };
        }
        return { done: false, focus: "exam", ghost: null, text: "EXAM." };
      },
      onEvent: function (ctx, e) {
        if (e.type === "start" && e.pc === 0o1000 && e.running) ctx.session.startedOk = true;
        if (e.type === "exam" && e.reg === 0 && e.data === 5) ctx.session.seen = true;
      },
    },
    {
      id: "free",
      chapter: "free",
      title: L("Le pupitre est à toi", "The panel is yours"),
      pace: "free",
      revealRegs: true,
      teach: [
        L("Les leçons sont finies. La mémoire garde ton dernier programme. Tu peux l'effacer, déposer autre chose, lancer, t'arrêter, examiner.", "The lessons are finished. Memory still holds your last program. You can clear it, deposit something else, start, stop, and examine."),
        L("Cette école exécute MOV, CMP, BIT, BIC, BIS, ADD, SUB, CLR, COM, INC, DEC, NEG, TST, ROL, ROR, ASL, ASR, SWAB, les branches, RESET, WAIT, NOP et HALT. Pas d'octets, pas de périphériques, pas de gestion mémoire. Le PDP-11 complet de Paul Nankervis, avec Unix et RSTS, est lié en bas de page.", "This school executes MOV, CMP, BIT, BIC, BIS, ADD, SUB, CLR, COM, INC, DEC, NEG, TST, ROL, ROR, ASL, ASR, SWAB, the branches, RESET, WAIT, NOP, and HALT. No bytes, no peripherals, no memory management. Paul Nankervis's full PDP-11, with Unix and RSTS, is linked at the bottom of the page."),
        L("Trois défis utilisent le même geste. Le programme doit s'arrêter par l'instruction HALT, pas par l'interrupteur. Vérifie ensuite.", "Three challenges use the same gesture. The program must stop on the HALT instruction, not on the switch. Then check."),
      ],
      enter: function (ctx) {
        ctx.m.running = false;
        ctx.m.stall = 0;
      },
      guide: function () {
        return {
          done: false,
          focus: null,
          ghost: null,
          text: L("Dépose à partir de 001000. ENABLE et START pour lancer. HALT pour t'arrêter. 177700 pour lire R0.", "Deposit from 001000. ENABLE and START to run. HALT to stop. 177700 to read R0."),
        };
      },
    },
  ];

  var challenges = [
    {
      id: "cent",
      title: L("Cent octal", "Octal one hundred"),
      text: L("Programme en 001000 qui met 000100 dans R0, puis HALT. 100₈ vaut 64.", "A program at 001000 that puts 000100 in R0, then HALT. 100₈ is 64."),
      test: function (m) {
        return !m.running && m.haltReason === "opcode" && (m.r[0] & 0xffff) === 0o100 && memHas(m, 0o000100);
      },
    },
    {
      id: "shift",
      title: L("Trois décalages", "Three shifts"),
      text: L("Pars de 1 et fais ASL R0 trois fois. ASL R0 s'écrit 006300. 1 décalé trois fois fait 000010. Termine par HALT. Pas de branchement.", "Start from 1 and ASL R0 three times. ASL R0 is written 006300. 1 shifted three times is 000010. End with HALT. No branch."),
      test: function (m) {
        return !m.running && m.haltReason === "opcode" && (m.r[0] & 0xffff) === 0o10 && memHas(m, 0o006300) && !memHasBranch(m);
      },
    },
    {
      id: "dix",
      title: L("Compter jusqu'à dix octal", "Count to octal ten"),
      text: L("Une boucle, avec un BNE, qui laisse 000010 dans R0 puis HALT. Dix octal, huit décimal.", "A loop, with a BNE, that leaves 000010 in R0 and then HALT. Octal ten, decimal eight."),
      test: function (m) {
        return !m.running && m.haltReason === "opcode" && (m.r[0] & 0xffff) === 0o10 && memHasBranch(m);
      },
    },
  ];

  function memHas(m, word) {
    for (var a = 0o1000; a < 0o1100; a += 2) {
      if ((m.mem[a >> 1] & 0xffff) === (word & 0xffff)) return true;
    }
    return false;
  }

  function memHasBranch(m) {
    for (var a = 0o1000; a < 0o1100; a += 2) {
      var w = m.mem[a >> 1] & 0xffff;
      var hi = (w >> 8) & 0xff;
      if (hi === 0x02) return true;
    }
    return false;
  }

  return {
    CHAPTERS: CHAPTERS,
    steps: steps,
    challenges: challenges,
    CHASER: CHASER,
    ADD: ADD,
    LOOP: LOOP,
  };
})(typeof PDP11 !== "undefined" ? PDP11 : globalThis.PDP11);

if (typeof module !== "undefined" && module.exports) module.exports = Ecole;
