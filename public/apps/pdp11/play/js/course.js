"use strict";

var Course = (function (Ecole) {
  var STORAGE = "pdp11-ecole-v1";

  function store() {
    try {
      if (typeof localStorage === "undefined") return null;
      return localStorage;
    } catch (e) {
      return null;
    }
  }

  function blankSession() {
    return {
      cursor: 0,
      bad: false,
      sawCarry: false,
      sawReturn: false,
      startedOk: false,
      seen: false,
      loaded: false,
      started: false,
      stepped: false,
      armed: false,
      value: 0,
    };
  }

  function createCourse(machine, options) {
    var opts = options || {};
    var steps = Ecole.steps;
    var index = 0;
    var maxIndex = 0;
    var satisfied = false;
    var successText = "";
    var session = blankSession();
    var lastEvent = null;
    var view = { budget: 1 };

    function step() {
      return steps[index];
    }

    function ctx() {
      return { m: machine, session: session, view: view };
    }

    function chapterIndexOf(stepIndex) {
      var id = steps[stepIndex].chapter;
      for (var i = 0; i < Ecole.CHAPTERS.length; i++) {
        if (Ecole.CHAPTERS[i].id === id) return i;
      }
      return 0;
    }

    function firstStepOfChapter(chapterId) {
      for (var i = 0; i < steps.length; i++) {
        if (steps[i].chapter === chapterId) return i;
      }
      return 0;
    }

    function persist() {
      try {
        var box = store();
        if (!box) return;
        box.setItem(STORAGE, JSON.stringify({
          stepId: step().id,
          maxStepId: steps[maxIndex].id,
        }));
      } catch (e) {}
    }

    function enter() {
      satisfied = false;
      successText = "";
      session = blankSession();
      var current = step();
      if (current.enter) current.enter(ctx());
    }

    function evaluate() {
      var guide = step().guide(ctx());
      if (guide.done && !satisfied) {
        satisfied = true;
        successText = guide.success || guide.text;
      }
      if (satisfied) {
        return {
          done: true,
          text: successText,
          success: successText,
          focus: null,
          ghost: null,
        };
      }
      return guide;
    }

    function input(event) {
      if (satisfied) return { blocked: true };
      lastEvent = event;
      var current = step();
      if (current.onEvent) current.onEvent(ctx(), event);
      return evaluate();
    }

    function onFrame() {
      var current = step();
      if (current.onFrame) current.onFrame(ctx());
    }

    function continueCourse() {
      if (!satisfied) return false;
      if (index >= steps.length - 1) return false;
      index += 1;
      if (index > maxIndex) maxIndex = index;
      enter();
      persist();
      return true;
    }

    function jumpToChapter(chapterId) {
      var target = firstStepOfChapter(chapterId);
      if (target > maxIndex) return false;
      index = target;
      enter();
      persist();
      return true;
    }

    function restartChapter() {
      index = firstStepOfChapter(step().chapter);
      enter();
      persist();
    }

    function restartAll() {
      index = 0;
      maxIndex = 0;
      enter();
      persist();
    }

    if (opts.fresh) {
      enter();
    } else {
      var saved = null;
      var box = store();
      if (box) {
        try { saved = JSON.parse(box.getItem(STORAGE) || "null"); } catch (e) { saved = null; }
      }
      if (saved && saved.stepId) {
        for (var i = 0; i < steps.length; i++) {
          if (steps[i].id === saved.maxStepId) maxIndex = i;
          if (steps[i].id === saved.stepId) index = i;
        }
        if (index > maxIndex) index = maxIndex;
        index = firstStepOfChapter(steps[index].chapter);
      }
      enter();
    }

    return {
      step: step,
      evaluate: evaluate,
      input: input,
      onFrame: onFrame,
      continue: continueCourse,
      jumpToChapter: jumpToChapter,
      restartChapter: restartChapter,
      restartAll: restartAll,
      chapterIndex: function () { return chapterIndexOf(index); },
      maxChapterIndex: function () { return chapterIndexOf(maxIndex); },
      isLast: function () { return index >= steps.length - 1; },
      get satisfied() { return satisfied; },
      get lastEvent() { return lastEvent; },
      view: view,
    };
  }

  return { createCourse: createCourse };
})(typeof Ecole !== "undefined" ? Ecole : globalThis.Ecole);

if (typeof module !== "undefined" && module.exports) module.exports = Course;
