(() => {
  // src/shared/geometry.js
  function placeCard(anchor, card, viewport, gap = 10, margin = 8) {
    const width = card.width;
    const height = card.height;
    let left = anchor.left;
    let top = anchor.bottom + gap;
    const roomBelow = viewport.height - margin - top;
    const aboveTop = anchor.top - gap - height;
    if (roomBelow < height && aboveTop >= margin) {
      top = aboveTop;
    } else if (roomBelow < height) {
      top = Math.max(margin, viewport.height - margin - height);
    }
    if (left + width > viewport.width - margin) {
      left = viewport.width - margin - width;
    }
    left = Math.max(margin, left);
    top = Math.max(margin, top);
    return { left: Math.round(left), top: Math.round(top) };
  }
  function placeTrigger(anchor, size, viewport, gap = 4, margin = 4) {
    let left = anchor.right - size;
    let top = anchor.top - size - gap;
    if (top < margin) top = anchor.bottom + gap;
    if (left + size > viewport.width - margin) left = viewport.width - margin - size;
    left = Math.max(margin, left);
    top = Math.max(margin, Math.min(top, viewport.height - size - margin));
    return { left: Math.round(left), top: Math.round(top) };
  }

  // src/shared/sections.js
  var KEYS = { \u91CA\u4E49: "meaning", \u8BED\u5883: "context", \u5EF6\u4F38: "extra", \u7FFB\u8BD1: "translation" };
  function parseSections(raw) {
    const text = String(raw || "");
    const hits = [];
    const re = /【(释义|语境|延伸|翻译)】/g;
    let match = re.exec(text);
    while (match) {
      hits.push({ label: match[1], index: match.index, end: match.index + match[0].length });
      match = re.exec(text);
    }
    const out = {
      meaning: "",
      context: "",
      extra: "",
      translation: "",
      preamble: "",
      raw: text
    };
    if (!hits.length) {
      out.preamble = text.trim();
      return out;
    }
    out.preamble = text.slice(0, hits[0].index).trim();
    hits.forEach((hit, index) => {
      const stop = index + 1 < hits.length ? hits[index + 1].index : text.length;
      out[KEYS[hit.label]] = text.slice(hit.end, stop).trim();
    });
    return out;
  }
  function isEmptySection(text) {
    const trimmed = String(text || "").trim().replace(/[。．.]+$/u, "");
    if (!trimmed) return true;
    const lowered = trimmed.toLowerCase();
    return ["\u65E0", "\u7121", "n/a", "none", "null", "-", "\u2014", "\uFF08\u65E0\uFF09", "(\u65E0)"].includes(trimmed) || ["n/a", "none", "null"].includes(lowered);
  }
  function formatExplanation(initialRaw, followups = []) {
    const parsed = parseSections(initialRaw);
    const parts = [];
    if (parsed.meaning) parts.push(parsed.meaning);
    if (parsed.context) parts.push(parsed.context);
    if (!isEmptySection(parsed.extra)) parts.push(`\u5EF6\u4F38\uFF1A${parsed.extra}`);
    if (!isEmptySection(parsed.translation)) parts.push(`\u7FFB\u8BD1\uFF1A${parsed.translation}`);
    if (!parsed.meaning && !parsed.context) {
      const fallback = (parsed.preamble || parsed.raw).trim();
      if (fallback) parts.push(fallback);
    }
    for (const turn of followups) {
      if (!turn) continue;
      parts.push("");
      parts.push(`\u95EE\uFF1A${turn.question || ""}`);
      if (turn.answer) parts.push(turn.answer);
    }
    return parts.join("\n").trim();
  }

  // src/content/overlay.js
  var CSS = `
:host {
  color: #221c18 !important;
  font-family: "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
  letter-spacing: normal !important;
  text-transform: none !important;
  direction: ltr !important;
  writing-mode: horizontal-tb !important;
  color-scheme: light;
}
.layer, .layer * { box-sizing: border-box; }
.layer button, .layer input { font-family: "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", sans-serif; }
.layer button { cursor: pointer; border: 0; background: transparent; color: inherit; padding: 0; }
.layer button:focus-visible, .layer input:focus-visible { outline: 2px solid #08756f; outline-offset: 2px; }
.trigger, .card, .hint { position: fixed; z-index: 2147483647; pointer-events: auto; }
button.trigger {
  width: 28px; height: 28px; border-radius: 8px;
  background: #08756f; color: #fff8f2;
  font-family: "Iowan Old Style", Palatino, "Songti SC", "Noto Serif SC", serif;
  font-size: 14px; font-weight: 650;
  display: grid; place-items: center;
  box-shadow: 0 6px 16px rgba(8, 117, 111, 0.35);
}
button.trigger:hover { background: #065e59; color: #fff8f2; }
.trigger[hidden], .card[hidden], .hint[hidden] { display: none !important; }
.card {
  width: min(380px, calc(100vw - 16px));
  max-height: min(72vh, 540px);
  display: flex; flex-direction: column;
  background: #fbf7f1; color: #221c18;
  border-radius: 16px; overflow: hidden;
  box-shadow: 0 18px 50px rgba(48, 32, 20, 0.18), 0 0 0 1px rgba(80, 50, 30, 0.08);
  animation: huaci-rise 140ms ease-out;
}
@keyframes huaci-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
header {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 8px 8px 12px;
  border-bottom: 1px solid #eadfd2;
}
.seal {
  width: 26px; height: 26px; border-radius: 8px; flex: none;
  display: grid; place-items: center;
  background: #08756f; color: #fff8f2;
  font-family: "Iowan Old Style", Palatino, "Songti SC", "Noto Serif SC", serif;
  font-size: 14px;
}
.mark { height: 3px; background: #f5cc20; flex: none; }
.heading { min-width: 0; flex: 1; }
.kicker {
  display: block; font-size: 10px; letter-spacing: 0.16em; color: #9a8f84;
}
.term {
  display: block; font-size: 14px; font-weight: 650;
  font-family: "Iowan Old Style", Palatino, "Songti SC", "Noto Serif SC", serif;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.tools { display: flex; gap: 2px; flex: none; }
.tools button {
  width: 28px; height: 28px; border-radius: 8px; color: #6d645c;
  display: grid; place-items: center;
}
.tools button:hover { background: #f0e8de; color: #2a2420; }
.tools button.on { background: #e5f6f3; color: #08756f; }
.tools button.done { color: #2f6b4f; }
.body { overflow: auto; padding: 12px 14px 14px; min-height: 84px; }
.loading { display: flex; align-items: center; gap: 8px; color: #8a8178; font-size: 13px; }
.loading[hidden] { display: none !important; }
.dots { display: flex; gap: 4px; }
.dots i {
  width: 5px; height: 5px; border-radius: 50%; background: #08756f;
  animation: huaci-dot 1s infinite; display: block;
}
.dots i:nth-child(2) { animation-delay: .15s; }
.dots i:nth-child(3) { animation-delay: .3s; }
@keyframes huaci-dot { 50% { opacity: .25; } }
.sections { display: flex; flex-direction: column; gap: 12px; }
.sections[hidden], .error[hidden], .preamble[hidden], section[hidden] { display: none !important; }
.sections h3 {
  margin: 0 0 4px; font-size: 11px; font-weight: 650; letter-spacing: 0.14em; color: #9a8f84;
}
.sections p, .preamble, .a {
  margin: 0; white-space: pre-wrap; overflow-wrap: anywhere;
  font-family: "Iowan Old Style", Palatino, "Palatino Linotype", "Songti SC", "Noto Serif SC", "Source Han Serif SC", serif;
}
.meaning p { font-size: 16.5px; line-height: 1.55; font-weight: 650; color: #221c18; }
.context p, .extra p, .translation p, .preamble, .a { font-size: 14.5px; line-height: 1.7; color: #3f3833; }
.translation { padding-left: 10px; border-left: 2px solid #b7e0db; }
.error-text { margin: 0 0 8px; color: #08756f; font-size: 13.5px; line-height: 1.6; }
.error-actions { display: flex; gap: 8px; }
.error-actions button, footer > button.more {
  border-radius: 999px; padding: 6px 10px; font-size: 12.5px; color: #08756f; background: #e5f6f3;
}
.turn { margin-top: 12px; padding-top: 10px; border-top: 1px dashed #e6ddd1; }
.q { font-size: 12px; color: #08756f; margin-bottom: 4px; }
.caret {
  display: inline-block; width: 7px; height: 1em; margin-left: 2px;
  background: #08756f; vertical-align: text-bottom; animation: huaci-dot 1s steps(1) infinite;
}
footer {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px 10px; border-top: 1px solid #eadfd2;
}
footer[hidden] { display: none !important; }
form { flex: 1; display: flex; gap: 6px; min-width: 0; }
input {
  flex: 1; min-width: 0; border: 1px solid #e6ddd1; background: #fffdfb; color: #221c18;
  border-radius: 999px; padding: 7px 12px; font-size: 13px;
}
form button {
  flex: none; background: #08756f; color: #fff8f2; border-radius: 999px;
  padding: 7px 12px; font-size: 12.5px;
}
form button:disabled, footer > button:disabled { opacity: .45; cursor: default; }
.hint {
  pointer-events: none; background: #2a2420; color: #fff8f2;
  font-size: 12.5px; padding: 6px 10px; border-radius: 999px;
  box-shadow: 0 8px 20px rgba(0,0,0,.18);
}
@media (prefers-reduced-motion: reduce) {
  .card, .dots i, .caret { animation: none; }
}
`;
  var PIN = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M16 12V4h2V2H6v2h2v8l-2 2v2h5v6h2v-6h5v-2l-2-2z"/></svg>';
  var COPY = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M6 15.5V6.2A1.7 1.7 0 0 1 7.7 4.5H16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  var CLOSE = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  var IMA = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 17.5a4.2 4.2 0 0 1-.5-8.37A5.6 5.6 0 0 1 17.4 7.6a4.4 4.4 0 0 1-.6 8.76" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M12 12.5V21m0-8.5-2.6 2.6M12 12.5l2.6 2.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function protectHost(host) {
    const props = {
      all: "initial",
      display: "block",
      position: "fixed",
      top: "0",
      left: "0",
      width: "0",
      height: "0",
      overflow: "visible",
      "z-index": "2147483647",
      "pointer-events": "none",
      margin: "0",
      padding: "0",
      border: "none",
      background: "transparent",
      visibility: "visible",
      opacity: "1",
      transform: "none",
      filter: "none",
      perspective: "none",
      contain: "none",
      "clip-path": "none",
      float: "none",
      clear: "none",
      inset: "auto"
    };
    for (const [key, value] of Object.entries(props)) {
      host.style.setProperty(key, value, "important");
    }
  }
  function shortTerm(text) {
    const flat = String(text || "").replace(/\s+/g, " ").trim();
    return flat.length > 22 ? `${flat.slice(0, 22)}\u2026` : flat;
  }
  function mountOverlay(doc) {
    doc.getElementById("huaci-root")?.remove();
    const host = doc.createElement("div");
    host.id = "huaci-root";
    host.dataset.huaciRoot = "1";
    protectHost(host);
    const shadow = host.attachShadow({ mode: "open" });
    const style = doc.createElement("style");
    style.textContent = CSS;
    const layer = doc.createElement("div");
    layer.className = "layer";
    layer.innerHTML = `
    <button class="trigger" type="button" hidden aria-label="\u7528\u79D2\u61C2\u89E3\u91CA">\u61C2</button>
    <section class="card" role="dialog" aria-label="\u79D2\u61C2" hidden>
      <header>
        <span class="seal" aria-hidden="true">\u61C2</span>
        <div class="heading">
          <span class="kicker">\u79D2\u61C2</span>
          <strong class="term"></strong>
        </div>
        <div class="tools">
          <button type="button" data-act="pin" title="\u56FA\u5B9A\uFF0C\u4E0D\u968F\u70B9\u51FB\u5916\u9762\u5173\u95ED" aria-pressed="false">${PIN}</button>
          <button type="button" data-act="copy" title="\u590D\u5236\u89E3\u91CA">${COPY}</button>
          <button type="button" data-act="ima" title="\u5B58\u5165 ima \u77E5\u8BC6\u5E93\uFF08\u4FDD\u5B58\u4E3A Markdown\uFF0C\u5728 ima \u4E2D\u5BFC\u5165\uFF09">${IMA}</button>
          <button type="button" data-act="close" title="\u5173\u95ED" aria-label="\u5173\u95ED">${CLOSE}</button>
        </div>
      </header>
      <div class="mark" aria-hidden="true"></div>
      <div class="body">
        <div class="loading"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span>\u6B63\u5728\u5BF9\u7167\u8FD9\u4E00\u6BB5\u2026</span></div>
        <div class="error" hidden>
          <p class="error-text"></p>
          <div class="error-actions">
            <button type="button" data-act="retry">\u91CD\u8BD5</button>
            <button type="button" data-act="settings">\u6253\u5F00\u8BBE\u7F6E</button>
          </div>
        </div>
        <div class="preamble" hidden></div>
        <article class="sections" hidden>
          <section class="meaning" data-sec="meaning" hidden><h3>\u91CA\u4E49</h3><p></p></section>
          <section class="context" data-sec="context" hidden><h3>\u8BED\u5883</h3><p></p></section>
          <section class="extra" data-sec="extra" hidden><h3>\u5EF6\u4F38</h3><p></p></section>
          <section class="translation" data-sec="translation" hidden><h3>\u7FFB\u8BD1</h3><p></p></section>
        </article>
        <div class="followups"></div>
      </div>
      <footer hidden>
        <button type="button" class="more" data-act="more">\u518D\u8BE6\u7EC6\u4E00\u70B9</button>
        <form>
          <input type="text" maxlength="400" placeholder="\u8FFD\u95EE\u4E00\u53E5" aria-label="\u8FFD\u95EE\u4E00\u53E5" />
          <button type="submit">\u53D1\u9001</button>
        </form>
      </footer>
    </section>
    <div class="hint" hidden role="status"></div>
  `;
    shadow.append(style, layer);
    (doc.documentElement || doc.body).append(host);
    const trigger = shadow.querySelector(".trigger");
    const card = shadow.querySelector(".card");
    const termEl = shadow.querySelector(".term");
    const loading = shadow.querySelector(".loading");
    const errorBox = shadow.querySelector(".error");
    const errorText = shadow.querySelector(".error-text");
    const settingsBtn = shadow.querySelector('[data-act="settings"]');
    const preamble = shadow.querySelector(".preamble");
    const sections = shadow.querySelector(".sections");
    const followups = shadow.querySelector(".followups");
    const footer = shadow.querySelector("footer");
    const pinBtn = shadow.querySelector('[data-act="pin"]');
    const copyBtn = shadow.querySelector('[data-act="copy"]');
    const imaBtn = shadow.querySelector('[data-act="ima"]');
    const moreBtn = shadow.querySelector('[data-act="more"]');
    const form = shadow.querySelector("form");
    const input = shadow.querySelector("input");
    const hint = shadow.querySelector(".hint");
    const body = shadow.querySelector(".body");
    const handlers = {};
    let anchor = null;
    let pinned = false;
    let hintTimer = 0;
    let activeAnswer = null;
    const view = doc.defaultView || window;
    const emit = (name, detail) => handlers[name]?.(detail);
    const viewport = () => ({ width: view.innerWidth, height: view.innerHeight });
    function placeCardNow() {
      if (!anchor || card.hidden) return;
      const box = card.getBoundingClientRect();
      const pos = placeCard(anchor, {
        width: box.width || 360,
        height: box.height || 240
      }, viewport());
      card.style.left = `${pos.left}px`;
      card.style.top = `${pos.top}px`;
    }
    function moveTrigger(rect) {
      anchor = rect;
      const pos = placeTrigger(rect, 28, viewport());
      trigger.style.left = `${pos.left}px`;
      trigger.style.top = `${pos.top}px`;
    }
    function moveCard(rect) {
      anchor = rect;
      placeCardNow();
    }
    function setText(el, text, streaming) {
      el.textContent = text || "";
      if (streaming && text) {
        const caret = doc.createElement("span");
        caret.className = "caret";
        caret.setAttribute("aria-hidden", "true");
        el.append(caret);
      }
    }
    function showLoading() {
      loading.hidden = false;
      errorBox.hidden = true;
      sections.hidden = true;
      preamble.hidden = true;
      footer.hidden = true;
    }
    const api = {
      on(name, fn) {
        handlers[name] = fn;
      },
      eventInHost(event) {
        const path = event.composedPath?.() || [];
        return path.includes(host);
      },
      triggerHidden() {
        return trigger.hidden;
      },
      showTrigger(rect, title) {
        moveTrigger(rect);
        trigger.hidden = false;
        const label = title ? `\u79D2\u61C2\u300C${shortTerm(title)}\u300D` : "\u7528\u79D2\u61C2\u89E3\u91CA";
        trigger.title = label;
        trigger.setAttribute("aria-label", label);
      },
      hideTrigger() {
        trigger.hidden = true;
      },
      moveTrigger,
      moveCard,
      openCard(rect, title) {
        anchor = rect;
        termEl.textContent = shortTerm(title);
        termEl.title = title || "";
        followups.replaceChildren();
        activeAnswer = null;
        input.value = "";
        pinned = false;
        api.setPinned(false);
        copyBtn.classList.remove("done");
        showLoading();
        card.hidden = false;
        card.style.visibility = "hidden";
        view.requestAnimationFrame(() => {
          placeCardNow();
          card.style.visibility = "visible";
        });
      },
      hideCard() {
        card.hidden = true;
      },
      hideAll() {
        trigger.hidden = true;
        card.hidden = true;
        hint.hidden = true;
      },
      setPinned(next) {
        pinned = Boolean(next);
        pinBtn.classList.toggle("on", pinned);
        pinBtn.setAttribute("aria-pressed", pinned ? "true" : "false");
        pinBtn.title = pinned ? "\u5DF2\u56FA\u5B9A" : "\u56FA\u5B9A\uFF0C\u4E0D\u968F\u70B9\u51FB\u5916\u9762\u5173\u95ED";
      },
      isPinned() {
        return pinned;
      },
      setBusy(busy) {
        moreBtn.disabled = busy;
        input.disabled = busy;
        form.querySelector("button").disabled = busy;
      },
      showLoading,
      renderInitial(raw, streaming) {
        const parsed = parseSections(raw);
        const values = {
          meaning: parsed.meaning,
          context: parsed.context,
          extra: parsed.extra,
          translation: parsed.translation
        };
        const started = Boolean(raw && raw.trim());
        if (!started) {
          showLoading();
          return;
        }
        loading.hidden = true;
        errorBox.hidden = true;
        footer.hidden = false;
        const order = ["meaning", "context", "extra", "translation"];
        let any = false;
        let lastVisible = null;
        for (const key of order) {
          const value = values[key];
          const visible = key === "extra" || key === "translation" ? !isEmptySection(value) : Boolean(value);
          if (visible) {
            any = true;
            lastVisible = key;
          }
        }
        for (const key of order) {
          const section = shadow.querySelector(`[data-sec="${key}"]`);
          const value = values[key];
          const visible = key === "extra" || key === "translation" ? !isEmptySection(value) : Boolean(value);
          section.hidden = !visible;
          setText(section.querySelector("p"), value, streaming && key === lastVisible);
        }
        if (!parsed.meaning && !parsed.context && parsed.preamble) {
          preamble.hidden = false;
          setText(preamble, parsed.preamble, streaming);
          any = true;
        } else {
          preamble.hidden = true;
        }
        sections.hidden = !any || !parsed.meaning && !parsed.context && !parsed.extra && !parsed.translation;
        if (!any && parsed.preamble) sections.hidden = true;
      },
      beginFollowUp(label) {
        const turn = doc.createElement("div");
        turn.className = "turn";
        const q = doc.createElement("div");
        q.className = "q";
        q.textContent = label;
        const a = doc.createElement("div");
        a.className = "a";
        turn.append(q, a);
        followups.append(turn);
        activeAnswer = a;
        body.scrollTop = body.scrollHeight;
        view.requestAnimationFrame(placeCardNow);
      },
      updateFollowUp(text, streaming) {
        if (!activeAnswer) return;
        setText(activeAnswer, text, streaming);
        body.scrollTop = body.scrollHeight;
        placeCardNow();
      },
      showError(message) {
        loading.hidden = true;
        errorBox.hidden = false;
        errorText.textContent = message || "\u89E3\u91CA\u5931\u8D25\u4E86\u3002";
        const needsSettings = /API Key|密钥|接口地址|模型/.test(message || "");
        settingsBtn.hidden = !needsSettings;
        footer.hidden = false;
        view.requestAnimationFrame(placeCardNow);
      },
      markCopied() {
        copyBtn.classList.add("done");
        copyBtn.title = "\u5DF2\u590D\u5236";
        view.setTimeout(() => {
          copyBtn.classList.remove("done");
          copyBtn.title = "\u590D\u5236\u89E3\u91CA";
        }, 1400);
      },
      markImaSaved() {
        imaBtn.classList.add("done");
        imaBtn.title = "\u5DF2\u4FDD\u5B58\u5230\u79D2\u61C2\u7B14\u8BB0";
        view.setTimeout(() => {
          imaBtn.classList.remove("done");
          imaBtn.title = "\u5B58\u5165 ima \u77E5\u8BC6\u5E93\uFF08\u4FDD\u5B58\u4E3A Markdown\uFF0C\u5728 ima \u4E2D\u5BFC\u5165\uFF09";
        }, 1600);
      },
      showHint(x, y, text) {
        hint.textContent = text;
        hint.hidden = false;
        const width = 180;
        const left = Math.max(8, Math.min(x, view.innerWidth - width - 8));
        const top = Math.max(8, Math.min(y + 14, view.innerHeight - 40));
        hint.style.left = `${left}px`;
        hint.style.top = `${top}px`;
        view.clearTimeout(hintTimer);
        hintTimer = view.setTimeout(() => {
          hint.hidden = true;
        }, 1600);
      },
      destroy() {
        host.remove();
      }
    };
    trigger.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      emit("explain");
    });
    shadow.addEventListener("mousedown", (event) => {
      event.stopPropagation();
    });
    shadow.addEventListener("click", (event) => {
      const act = event.target?.closest?.("[data-act]")?.dataset.act;
      if (!act || act === "explain") return;
      if (act === "close") emit("close");
      if (act === "pin") emit("pin");
      if (act === "copy") emit("copy");
      if (act === "ima") emit("ima");
      if (act === "more") emit("more");
      if (act === "retry") emit("retry");
      if (act === "settings") emit("settings");
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const question = input.value.trim();
      if (!question) return;
      input.value = "";
      emit("ask", question);
    });
    if (view.ResizeObserver) {
      const observer = new view.ResizeObserver(() => {
        if (!card.hidden && !pinned) placeCardNow();
      });
      observer.observe(card);
    }
    return api;
  }

  // src/shared/context.js
  var INLINE = /* @__PURE__ */ new Set([
    "SPAN",
    "A",
    "EM",
    "STRONG",
    "B",
    "I",
    "U",
    "MARK",
    "SMALL",
    "SUB",
    "SUP",
    "CODE",
    "ABBR",
    "CITE",
    "Q",
    "FONT",
    "S",
    "DEL",
    "INS",
    "WBR",
    "RUBY",
    "RT",
    "RP",
    "LABEL",
    "TIME"
  ]);
  function normalizeText(value) {
    return String(value || "").replace(/\u00a0/g, " ").replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
  }
  function normalizeSelection(value) {
    return normalizeText(value).slice(0, 1800);
  }
  function isMeaningfulSelection(value) {
    return /[\p{L}\p{N}]/u.test(value || "");
  }
  function detectScript(value) {
    const text = String(value || "");
    const zh = (text.match(/[\u3400-\u9fff]/g) || []).length;
    const latin = (text.match(/[A-Za-z]/g) || []).length;
    const kana = (text.match(/[\u3040-\u30ff]/g) || []).length;
    if (kana > zh && kana >= latin && kana > 0) return "ja";
    if (zh === 0 && latin === 0) return "other";
    if (zh > 0 && latin > 0 && Math.min(zh, latin) / Math.max(zh, latin) > 0.25) return "mixed";
    if (latin > zh) return "en";
    return "zh";
  }
  function hostOf(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  }
  function defaultIsBlock(el) {
    if (!el || el.nodeType !== 1) return false;
    if (INLINE.has(el.tagName)) return false;
    const view = el.ownerDocument?.defaultView;
    if (view?.getComputedStyle) {
      try {
        const display = view.getComputedStyle(el).display;
        if (display) return !display.startsWith("inline");
      } catch {
      }
    }
    return true;
  }
  function collectText(el) {
    let out = "";
    for (const node of el.childNodes || []) {
      if (node.nodeType === 3) out += node.nodeValue || "";
      else if (node.nodeType === 1) {
        const tag = node.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") continue;
        if (tag === "BR" || tag === "P" || tag === "DIV" || tag === "LI" || tag === "TR") out += "\n";
        out += collectText(node);
      }
    }
    return out;
  }
  function textOf(el) {
    if (!el) return "";
    if (typeof el.innerText === "string" && el.innerText.trim()) return normalizeText(el.innerText);
    return normalizeText(collectText(el));
  }
  function elementFrom(node) {
    if (!node) return null;
    if (node.nodeType === 1) return node;
    return node.parentElement || null;
  }
  function insideHuaci(node) {
    const el = elementFrom(node);
    if (!el) return false;
    if (el.closest?.("#huaci-root, [data-huaci-root]")) return true;
    const root = el.getRootNode?.();
    return Boolean(root?.host && (root.host.id === "huaci-root" || root.host.dataset?.huaciRoot === "1"));
  }
  function findBlock(anchor, isBlock) {
    let el = elementFrom(anchor);
    if (!el) return null;
    let current = el;
    while (current && current.parentElement && !isBlock(current)) current = current.parentElement;
    if (current && /^(BODY|HTML)$/.test(current.tagName)) {
      let nearer = el;
      let candidate = null;
      while (nearer && nearer !== current) {
        if (isBlock(nearer) && !/^(BODY|HTML)$/.test(nearer.tagName)) candidate = nearer;
        nearer = nearer.parentElement;
      }
      if (candidate) return candidate;
    }
    return current;
  }
  function siblingText(block) {
    if (!block?.parentElement) return { before: "", after: "" };
    const kids = [...block.parentElement.children];
    const index = kids.indexOf(block);
    return {
      before: index > 0 ? textOf(kids[index - 1]) : "",
      after: index >= 0 && index < kids.length - 1 ? textOf(kids[index + 1]) : ""
    };
  }
  function locate(haystack, needle) {
    const probe = needle.slice(0, 80);
    const direct = haystack.indexOf(probe);
    if (direct >= 0) return direct;
    const compactNeedle = probe.replace(/\s+/g, "");
    if (!compactNeedle) return -1;
    const compactHaystack = haystack.replace(/\s+/g, "");
    const compactIndex = compactHaystack.indexOf(compactNeedle.slice(0, 40));
    if (compactIndex < 0) return -1;
    let seen = 0;
    for (let i = 0; i < haystack.length; i += 1) {
      if (/\s/.test(haystack[i])) continue;
      if (seen === compactIndex) return i;
      seen += 1;
    }
    return -1;
  }
  function fitWindow(raw, selection, siblings) {
    const text = normalizeText(raw);
    const paraMax = 900;
    const sideMax = 280;
    if (text.length <= paraMax) {
      return {
        paragraph: text,
        before: normalizeText(siblings.before).slice(-sideMax),
        after: normalizeText(siblings.after).slice(0, sideMax)
      };
    }
    const index = Math.max(0, locate(text, selection));
    const start = Math.max(0, index - 400);
    const end = Math.min(text.length, index + Math.min(selection.length, 600) + 400);
    return {
      before: text.slice(Math.max(0, start - sideMax), start),
      paragraph: text.slice(start, end),
      after: text.slice(end, end + sideMax)
    };
  }
  function tryPdfJs(anchor, selectedText) {
    const el = elementFrom(anchor);
    const layer = el?.closest?.(".textLayer");
    if (!layer) return null;
    const spans = [...layer.querySelectorAll("span")].filter((span) => normalizeText(span.textContent));
    if (!spans.length) return null;
    let index = spans.findIndex((span) => span === el || span.contains(el));
    if (index < 0) {
      const probe = selectedText.slice(0, 24);
      index = spans.findIndex((span) => (span.textContent || "").includes(probe));
    }
    if (index < 0) index = 0;
    const join = (list) => normalizeText(list.map((span) => span.textContent || "").join(""));
    const paragraph = join(spans.slice(Math.max(0, index - 1), Math.min(spans.length, index + 2))) || selectedText;
    const before = join(spans.slice(Math.max(0, index - 3), Math.max(0, index - 1)));
    const after = join(spans.slice(Math.min(spans.length, index + 2), Math.min(spans.length, index + 4)));
    return { paragraph, before, after };
  }
  function extractContext({ anchor, selectedText, title = "", url = "", isBlock = defaultIsBlock } = {}) {
    const selection = normalizeSelection(selectedText);
    if (!selection || !isMeaningfulSelection(selection)) return null;
    if (insideHuaci(anchor)) return null;
    const pdf = tryPdfJs(anchor, selection);
    let paragraph = "";
    let before = "";
    let after = "";
    let source = "html";
    if (pdf) {
      paragraph = pdf.paragraph;
      before = pdf.before;
      after = pdf.after;
      source = "pdfjs";
    } else {
      const block = findBlock(anchor, isBlock);
      const raw = block ? textOf(block) : selection;
      const fitted = fitWindow(raw, selection, siblingText(block));
      paragraph = fitted.paragraph;
      before = fitted.before;
      after = fitted.after;
      source = "html";
    }
    const promptSelection = selection.slice(0, 600);
    return {
      selection: promptSelection,
      selectionFull: selection,
      truncated: selection.length > 600,
      paragraph: normalizeText(paragraph).slice(0, 1800) || promptSelection,
      before: normalizeText(before).slice(0, 400),
      after: normalizeText(after).slice(0, 400),
      title: normalizeText(title).slice(0, 200),
      url: url || "",
      host: hostOf(url),
      script: detectScript(selection),
      source
    };
  }

  // shared/prompt-spec.json
  var prompt_spec_default = {
    version: 1,
    sectionLabels: ["\u91CA\u4E49", "\u8BED\u5883", "\u5EF6\u4F38", "\u7FFB\u8BD1"],
    empty: "\uFF08\u65E0\uFF09",
    maxTokens: {
      brief: 360,
      standard: 700,
      detailed: 1200
    },
    systemTemplate: "\u4F60\u662F\u300C\u79D2\u61C2\u300D\u3002\u6709\u4EBA\u6B63\u5728\u9605\u8BFB\uFF0C\u521A\u521A\u9009\u4E2D\u4E00\u5C0F\u6BB5\u6587\u5B57\uFF08\u53EF\u80FD\u662F\u8BCD\u3001\u672F\u8BED\u3001\u7F29\u5199\u3001\u6982\u5FF5\u3001\u4EBA\u540D\u3001\u516C\u5F0F\u6216\u53E5\u5B50\uFF09\uFF0C\u5E0C\u671B\u4F60\u5C31\u5730\u89E3\u91CA\uFF0C\u4E0D\u8981\u628A\u8BDD\u9898\u626F\u5F00\u3002\u8BFB\u8005\u53D7\u8FC7\u6559\u80B2\uFF0C\u53EA\u662F\u773C\u524D\u8FD9\u4E2A\u8BF4\u6CD5\u4E0D\u719F\u3002\u5BF9\u65B9\u5E38\u8BFB\u793E\u4F1A\u5B66\u548C\u4EBA\u6587\u793E\u79D1\uFF0C\u4E5F\u4F1A\u78B0\u5230\u82F1\u6587\u3001\u7F29\u5199\u548C\u516C\u5F0F\u3002\u522B\u5199\u6210\u513F\u7AE5\u8BFB\u7269\uFF0C\u4E5F\u522B\u5806\u780C\u884C\u8BDD\u3002\n\n\u53EA\u8F93\u51FA\u4E0B\u9762\u56DB\u6BB5\u3002\u6BCF\u6BB5\u5355\u72EC\u8D77\u884C\uFF0C\u4EE5\u4E2D\u6587\u6807\u7B7E\u5F00\u5934\u3002\u4E0D\u8981\u7FFB\u8BD1\u6807\u7B7E\u672C\u8EAB\u3002\u4E0D\u8981\u5199\u524D\u8A00\u3001\u6807\u9898\u3001\u7F16\u53F7\u6216\u7ED3\u675F\u8BED\u3002\n\n\u3010\u91CA\u4E49\u3011\n\u3010\u8BED\u5883\u3011\n\u3010\u5EF6\u4F38\u3011\n\u3010\u7FFB\u8BD1\u3011\n\n\u5404\u6BB5\u600E\u4E48\u5199\uFF1A\n- \u3010\u91CA\u4E49\u3011\u53EA\u7528\u4E00\u53E5\u8BDD\uFF0C\u89E3\u91CA\u9009\u4E2D\u6587\u5B57\u672C\u8EAB\u7684\u76F4\u767D\u610F\u601D\u3002\u4E0D\u8981\u628A\u6240\u5728\u6BB5\u843D\u91CD\u8BF4\u4E00\u904D\u3002\n- \u3010\u8BED\u5883\u3011\u8BF4\u660E\u5B83\u5728\u7ED9\u5B9A\u6BB5\u843D\u91CC\u5177\u4F53\u6307\u4EC0\u4E48\u3001\u548C\u524D\u540E\u53E5\u662F\u4EC0\u4E48\u5173\u7CFB\u3002\u70B9\u5230\u4E3A\u6B62\u3002\n- \u3010\u5EF6\u4F38\u3011\u7ED9\u4E00\u4E2A\u8D34\u8FD1\u7684\u4F8B\u5B50\uFF0C\u6216\u4E24\u5230\u4E09\u4E2A\u76F8\u5173\u672F\u8BED\uFF08\u7528\u300C \xB7 \u300D\u8FDE\u63A5\uFF09\u3002\u6CA1\u6709\u5408\u9002\u7684\u5C31\u53EA\u5199\u300C\u65E0\u300D\u3002\n- \u3010\u7FFB\u8BD1\u3011{{translationRule}}\n\n\u82E5\u9009\u4E2D\u7684\u662F\u4EBA\u540D\uFF1A\u8BF4\u660E\u8FD9\u4E2A\u4EBA\u662F\u8C01\u3001\u5728\u8FD9\u7C7B\u8BA8\u8BBA\u91CC\u901A\u5E38\u56E0\u4E3A\u4EC0\u4E48\u88AB\u63D0\u5230\u3002\u4E0D\u8981\u5199\u4E00\u7BC7\u4F20\u8BB0\u3002\n\n\u7EA6\u675F\uFF1A\n- \u8F93\u51FA\u8BED\u8A00\uFF1A{{language}}\n- \u8BE6\u7565\uFF1A{{length}}\n- \u7528\u5E73\u5E38\u8BDD\u628A\u4E8B\u60C5\u8BF4\u6E05\u695A\u3002\u5FC5\u8981\u7684\u4E13\u540D\u4FDD\u7559\u539F\u6587\uFF0C\u53EF\u5728\u540E\u9762\u52A0\u4E00\u4E2A\u77ED\u6CE8\u3002\n- \u4E0D\u786E\u5B9A\u5C31\u76F4\u63A5\u8BF4\u4E0D\u786E\u5B9A\u3002\u4E0D\u8981\u7F16\u9020\u4E66\u540D\u3001\u9875\u7801\u3001\u5E74\u4EFD\u3001\u5F15\u6587\u6216\u7EDF\u8BA1\u6570\u5B57\u3002\n- \u9047\u5230\u516C\u5F0F\uFF0C\u53EA\u8BF4\u660E\u7B26\u53F7\u5728\u8FD9\u91CC\u5927\u6982\u8868\u793A\u4EC0\u4E48\uFF0C\u4E0D\u8981\u5C55\u5F00\u63A8\u5BFC\u3002\n- \u4E0D\u8981\u81EA\u79F0\u4EBA\u5DE5\u667A\u80FD\uFF0C\u4E0D\u8981\u5199\u300C\u6839\u636E\u4F60\u63D0\u4F9B\u7684\u4E0A\u4E0B\u6587\u300D\u300C\u5E0C\u671B\u8FD9\u5BF9\u4F60\u6709\u5E2E\u52A9\u300D\u8FD9\u7C7B\u5957\u8BDD\u3002",
    userTemplate: "\u9009\u4E2D\u6587\u5B57\uFF1A\n{{selection}}\n\n\u6240\u5728\u6BB5\u843D\uFF1A\n{{paragraph}}\n\n\u524D\u6587\uFF1A\n{{before}}\n\n\u540E\u6587\uFF1A\n{{after}}\n\n\u9875\u9762\u6807\u9898\uFF1A{{title}}\n\u7AD9\u70B9\uFF1A{{host}}\n\u8FD9\u6BB5\u9009\u4E2D\u6587\u5B57\u7684\u811A\u672C\uFF1A{{script}}",
    languages: {
      zh: "\u5168\u6587\u4F7F\u7528\u7B80\u4F53\u4E2D\u6587\u3002\u4E13\u540D\u548C\u539F\u6587\u672F\u8BED\u53EF\u4EE5\u4FDD\u7559\u539F\u6587\u3002",
      "zh-Hant": "\u5168\u6587\u4F7F\u7528\u7E41\u9AD4\u4E2D\u6587\u3002\u5C08\u540D\u548C\u539F\u6587\u8853\u8A9E\u53EF\u4EE5\u4FDD\u7559\u539F\u6587\u3002",
      en: "Write the body of each section in English. Keep the Chinese section labels exactly as given. Keep proper nouns as they appear in the source.",
      ja: "\u5404\u6BB5\u306E\u672C\u6587\u306F\u65E5\u672C\u8A9E\u3067\u66F8\u304F\u3002\u898B\u51FA\u3057\u306E\u3010\u3011\u30E9\u30D9\u30EB\u306F\u4E2D\u56FD\u8A9E\u306E\u307E\u307E\u306B\u3059\u308B\u3002\u56FA\u6709\u540D\u8A5E\u306F\u539F\u6587\u306E\u307E\u307E\u6B8B\u3057\u3066\u3088\u3044\u3002"
    },
    translationRules: {
      zh: "\u9009\u4E2D\u6587\u5B57\u7684\u4E3B\u4F53\u82E5\u4E0D\u662F\u4E2D\u6587\uFF0C\u5728\u8FD9\u91CC\u7ED9\u51FA\u901A\u987A\u7684\u7B80\u4F53\u4E2D\u6587\u7FFB\u8BD1\uFF1B\u82E5\u4E3B\u4F53\u5DF2\u662F\u4E2D\u6587\uFF0C\u53EA\u5199\u300C\u65E0\u300D\u3002",
      "zh-Hant": "\u9078\u4E2D\u6587\u5B57\u7684\u4E3B\u9AD4\u82E5\u4E0D\u662F\u4E2D\u6587\uFF0C\u5728\u9019\u88E1\u7D66\u51FA\u901A\u9806\u7684\u7E41\u9AD4\u4E2D\u6587\u7FFB\u8B6F\uFF1B\u82E5\u4E3B\u9AD4\u5DF2\u662F\u4E2D\u6587\uFF0C\u53EA\u5BEB\u300C\u7121\u300D\u3002",
      en: 'If the selection is not primarily English, give a natural English translation; if it is already English, write "none".',
      ja: "\u9078\u3070\u308C\u305F\u6587\u5B57\u306E\u4E3B\u4F53\u304C\u65E5\u672C\u8A9E\u3067\u306A\u3051\u308C\u3070\u3001\u3053\u3053\u306B\u81EA\u7136\u306A\u65E5\u672C\u8A9E\u8A33\u3092\u66F8\u304F\u3002\u3059\u3067\u306B\u65E5\u672C\u8A9E\u306A\u3089\u300C\u7121\u300D\u3068\u3060\u3051\u66F8\u304F\u3002"
    },
    lengths: {
      brief: "\u5C3D\u91CF\u77ED\u3002\u3010\u91CA\u4E49\u3011\u4E00\u53E5\uFF1B\u3010\u8BED\u5883\u3011\u4E00\u53E5\uFF1B\u3010\u5EF6\u4F38\u3011\u5199\u300C\u65E0\u300D\uFF0C\u9664\u975E\u4E00\u4E2A\u76F8\u5173\u672F\u8BED\u80FD\u6D88\u6389\u660E\u663E\u6B67\u4E49\u3002",
      standard: "\u3010\u91CA\u4E49\u3011\u4E00\u53E5\u8BDD\uFF1B\u3010\u8BED\u5883\u3011\u4E24\u5230\u56DB\u53E5\uFF1B\u3010\u5EF6\u4F38\u3011\u4E00\u4E2A\u8D34\u8FD1\u7684\u4F8B\u5B50\uFF0C\u6216\u4E24\u5230\u4E09\u4E2A\u76F8\u5173\u672F\u8BED\u3002",
      detailed: "\u3010\u91CA\u4E49\u3011\u4E00\u5230\u4E24\u53E5\uFF0C\u628A\u8FB9\u754C\u8BF4\u6E05\uFF1B\u3010\u8BED\u5883\u3011\u56DB\u5230\u516D\u53E5\uFF1B\u3010\u5EF6\u4F38\u3011\u4E00\u4E2A\u5177\u4F53\u4F8B\u5B50\uFF0C\u5E76\u70B9\u51FA\u4E00\u4E2A\u5BB9\u6613\u6DF7\u6DC6\u7684\u90BB\u8FD1\u6982\u5FF5\u3002"
    },
    scripts: {
      zh: "\u4E2D\u6587\u4E3A\u4E3B",
      en: "\u62C9\u4E01\u5B57\u6BCD\u4E3A\u4E3B\uFF0C\u591A\u534A\u9700\u8981\u7FFB\u8BD1",
      mixed: "\u4E2D\u5916\u6587\u5939\u6742",
      ja: "\u65E5\u6587\u4E3A\u4E3B",
      other: "\u7B26\u53F7\u3001\u516C\u5F0F\u6216\u5176\u5B83\u6587\u5B57"
    },
    followUp: {
      preamble: "\u4E0B\u9762\u662F\u8FFD\u95EE\u3002\u8BF7\u76F4\u63A5\u7528\u6563\u6587\u56DE\u7B54\uFF0C\u4E0D\u8981\u518D\u4F7F\u7528\u3010\u91CA\u4E49\u3011\u3010\u8BED\u5883\u3011\u3010\u5EF6\u4F38\u3011\u3010\u7FFB\u8BD1\u3011\u8FD9\u4E9B\u6807\u7B7E\uFF0C\u4E5F\u4E0D\u8981\u5206\u6210\u56DB\u6BB5\u3002\u7D27\u6263\u5DF2\u7ECF\u89E3\u91CA\u8FC7\u7684\u9009\u4E2D\u6587\u5B57\u548C\u5B83\u6240\u5728\u7684\u6BB5\u843D\uFF0C\u4E0D\u8981\u53E6\u8D77\u65E0\u5173\u7684\u8BDD\u9898\u3002\u8F93\u51FA\u8BED\u8A00\uFF1A{{language}}\u3002\u4E0D\u786E\u5B9A\u5C31\u8BF4\u660E\u4E0D\u786E\u5B9A\uFF0C\u4E0D\u8981\u7F16\u9020\u51FA\u5904\u3002",
      elaborate: "\u8BF7\u8BB2\u5F97\u518D\u5177\u4F53\u4E00\u4E9B\uFF1A\u8865\u4E0A\u8FD9\u4E2A\u8BF4\u6CD5\u7684\u8FB9\u754C\u3001\u4E00\u4E2A\u80FD\u60F3\u8C61\u7684\u4F8B\u5B50\uFF0C\u4EE5\u53CA\u4E00\u4E2A\u5BB9\u6613\u6DF7\u5728\u4E00\u8D77\u7684\u90BB\u8FD1\u8BF4\u6CD5\u3002\u4E0D\u8981\u91CD\u590D\u521A\u624D\u5DF2\u7ECF\u8BF4\u8FC7\u7684\u539F\u53E5\u3002",
      question: "\u8BFB\u8005\u7684\u8FFD\u95EE\uFF1A{{question}}\n\u8BF7\u9488\u5BF9\u9009\u4E2D\u6587\u5B57\u300C{{selection}}\u300D\u548C\u5B83\u6240\u5728\u7684\u6BB5\u843D\u6765\u7B54\u3002\u77ED\u4E00\u4E9B\uFF0C\u4F46\u628A\u95EE\u9898\u7B54\u5B8C\u3002"
    }
  };

  // src/shared/template.js
  function fillTemplate(template, vars) {
    return String(template).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
      const value = vars[key];
      return value == null ? "" : String(value);
    });
  }

  // src/shared/prompt.js
  function languageOf(settings, spec) {
    return spec.languages[settings.outputLanguage] || spec.languages.zh;
  }
  function blank(value, spec) {
    const text = String(value || "").trim();
    return text || spec.empty;
  }
  function buildInitialMessages(ctx, settings, spec = prompt_spec_default) {
    const language = languageOf(settings, spec);
    const length = spec.lengths[settings.length] || spec.lengths.standard;
    const translationRule = spec.translationRules[settings.outputLanguage] || spec.translationRules.zh;
    const script = spec.scripts[ctx.script] || spec.scripts.other;
    const system = fillTemplate(spec.systemTemplate, { language, length, translationRule });
    let user = fillTemplate(spec.userTemplate, {
      selection: blank(ctx.selection, spec),
      paragraph: blank(ctx.paragraph, spec),
      before: blank(ctx.before, spec),
      after: blank(ctx.after, spec),
      title: blank(ctx.title, spec),
      host: blank(ctx.host, spec),
      script
    });
    if (ctx.truncated) user += "\n\n\uFF08\u9009\u4E2D\u6587\u5B57\u8FC7\u957F\uFF0C\u8FD9\u91CC\u53EA\u4FDD\u7559\u4E86\u524D\u6BB5\u3002\uFF09";
    return [
      { role: "system", content: system },
      { role: "user", content: user }
    ];
  }
  function buildFollowUpMessages(priorTurns, { settings, ctx, kind, question }, spec = prompt_spec_default) {
    const language = languageOf(settings, spec);
    const preamble = fillTemplate(spec.followUp.preamble, { language });
    const body = kind === "question" ? fillTemplate(spec.followUp.question, {
      question: String(question || "").trim(),
      selection: blank(ctx?.selection, spec)
    }) : spec.followUp.elaborate;
    return [
      ...priorTurns,
      { role: "user", content: `${preamble}

${body}` }
    ];
  }

  // src/shared/settings.js
  var PRESETS = {
    deepseek: {
      id: "deepseek",
      label: "DeepSeek",
      baseUrl: "https://api.deepseek.com/v1",
      model: "deepseek-chat",
      keyUrl: "https://platform.deepseek.com/api_keys",
      note: "\u6A21\u578B\u4E00\u822C\u7528 deepseek-chat\u3002Key \u5728 platform.deepseek.com \u521B\u5EFA\u3002"
    },
    doubao: {
      id: "doubao",
      label: "\u8C46\u5305 \xB7 \u706B\u5C71\u65B9\u821F",
      baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
      model: "",
      modelPlaceholder: "ep-xxxxxxxx",
      keyUrl: "https://console.volcengine.com/ark",
      note: "\u6A21\u578B\u4E00\u680F\u586B\u65B9\u821F\u7684\u63A8\u7406\u63A5\u5165\u70B9 ID\uFF08ep- \u5F00\u5934\uFF09\uFF0C\u4E0D\u662F\u63A7\u5236\u53F0\u4E0A\u7684\u5C55\u793A\u540D\u3002Key \u5728\u65B9\u821F\u300CAPI Key \u7BA1\u7406\u300D\u91CC\u521B\u5EFA\u3002"
    },
    qwen: {
      id: "qwen",
      label: "\u901A\u4E49\u5343\u95EE",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: "qwen-plus",
      keyUrl: "https://bailian.console.aliyun.com/?apiKey=1",
      note: "\u517C\u5BB9\u6A21\u5F0F\u7684 Base URL \u8981\u5E26 /compatible-mode/v1\u3002\u6A21\u578B\u53EF\u7528 qwen-plus\u3001qwen-turbo\u3002"
    },
    kimi: {
      id: "kimi",
      label: "Kimi",
      baseUrl: "https://api.moonshot.cn/v1",
      model: "moonshot-v1-8k",
      keyUrl: "https://platform.moonshot.cn/console/api-keys",
      note: "\u6A21\u578B\u53EF\u7528 moonshot-v1-8k \u6216 moonshot-v1-auto\u3002"
    },
    zhipu: {
      id: "zhipu",
      label: "智谱 GLM",
      baseUrl: "https://open.bigmodel.cn/api/paas/v4",
      model: "glm-4-flash",
      keyUrl: "https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys",
      note: "模型可用 glm-4-flash、glm-4-air、glm-4-plus，以账号权限为准。"
    },
    minimax: {
      id: "minimax",
      label: "MiniMax",
      baseUrl: "https://api.minimaxi.com/v1",
      model: "MiniMax-M2",
      keyUrl: "https://platform.minimaxi.com/user-center/basic-information/interface-key",
      note: "模型可用 MiniMax-M2、MiniMax-Text-01，以控制台为准。"
    },
    wenxin: {
      id: "wenxin",
      label: "文心 · 百度千帆",
      baseUrl: "https://qianfan.baidubce.com/v2",
      model: "ernie-4.0-8k",
      keyUrl: "https://console.bce.baidu.com/qianfan/ais/console/apiKey",
      note: "使用千帆 ModelBuilder 的 API Key；模型可用 ernie-4.0-8k、ernie-speed-128k，以控制台为准。"
    },
    hunyuan: {
      id: "hunyuan",
      label: "腾讯混元",
      baseUrl: "https://api.hunyuan.cloud.tencent.com/v1",
      model: "hunyuan-turbo",
      keyUrl: "https://console.cloud.tencent.com/hunyuan/api-key",
      note: "模型可用 hunyuan-turbo、hunyuan-lite、hunyuan-standard，以控制台为准。"
    },
    spark: {
      id: "spark",
      label: "讯飞星火",
      baseUrl: "https://spark-api-open.xf-yun.com/v1",
      model: "generalv3.5",
      keyUrl: "https://console.xfyun.cn/",
      note: "模型可用 lite、generalv3、generalv3.5、4.0Ultra；API Key 填控制台对应应用的 APIPassword。"
    },
    stepfun: {
      id: "stepfun",
      label: "阶跃星辰",
      baseUrl: "https://api.stepfun.com/v1",
      model: "step-2-16k",
      keyUrl: "https://platform.stepfun.com/interface-key",
      note: "模型可用 step-2-16k、step-1-8k，以控制台为准。"
    },
    openrouter: {
      id: "openrouter",
      label: "OpenRouter",
      baseUrl: "https://openrouter.ai/api/v1",
      model: "openai/gpt-4o-mini",
      keyUrl: "https://openrouter.ai/keys",
      note: "聚合各家模型。模型名带厂商前缀，例如 openai/gpt-4o-mini、anthropic/claude-3.5-haiku、deepseek/deepseek-chat，以 openrouter.ai/models 为准。"
    },
    siliconflow: {
      id: "siliconflow",
      label: "硅基流动",
      baseUrl: "https://api.siliconflow.cn/v1",
      model: "deepseek-ai/DeepSeek-V3",
      keyUrl: "https://cloud.siliconflow.cn/account/ak",
      note: "模型名带厂商前缀，例如 deepseek-ai/DeepSeek-V3、Qwen/Qwen2.5-72B-Instruct、THUDM/glm-4-9b-chat，以云平台模型广场为准。"
    },
    openai: {
      id: "openai",
      label: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      keyUrl: "https://platform.openai.com/api-keys",
      note: "\u6A21\u578B\u540D\u6309\u8D26\u53F7\u6743\u9650\u586B\u5199\uFF0C\u4F8B\u5982 gpt-4o-mini\u3002"
    },
    custom: {
      id: "custom",
      label: "\u81EA\u5B9A\u4E49",
      baseUrl: "",
      model: "",
      keyUrl: "",
      note: "\u4EFB\u4F55 OpenAI \u517C\u5BB9\u63A5\u53E3\uFF1A\u5411 {Base URL}/chat/completions \u53D1 POST\uFF0CBearer \u9274\u6743\uFF0C\u5E76\u652F\u6301 stream\u3002"
    }
  };
  var LANGUAGES = [
    { id: "zh", label: "\u7B80\u4F53\u4E2D\u6587" },
    { id: "zh-Hant", label: "\u7E41\u4F53\u4E2D\u6587" },
    { id: "en", label: "English" },
    { id: "ja", label: "\u65E5\u672C\u8A9E" }
  ];
  var LENGTHS = [
    { id: "brief", label: "\u7B80\u77ED" },
    { id: "standard", label: "\u6807\u51C6" },
    { id: "detailed", label: "\u8BE6\u7EC6" }
  ];
  var DEFAULT_SETTINGS = {
    enabled: true,
    provider: "deepseek",
    baseUrl: PRESETS.deepseek.baseUrl,
    apiKey: "",
    model: PRESETS.deepseek.model,
    outputLanguage: "zh",
    length: "standard",
    triggerMode: "icon",
    blacklist: ""
  };
  function normalizeBaseUrl(input) {
    let url = String(input || "").trim();
    if (!url) return "";
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    url = url.replace(/\/+$/, "");
    url = url.replace(/\/chat\/completions$/i, "");
    url = url.replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(url)) return "";
    return url;
  }
  function normalizeApiKey(input) {
    return String(input || "").trim().replace(/^Bearer\s+/i, "");
  }
  function normalizeSettings(raw = {}) {
    const provider = PRESETS[raw.provider] ? raw.provider : DEFAULT_SETTINGS.provider;
    const language = LANGUAGES.some((item) => item.id === raw.outputLanguage) ? raw.outputLanguage : DEFAULT_SETTINGS.outputLanguage;
    const length = LENGTHS.some((item) => item.id === raw.length) ? raw.length : DEFAULT_SETTINGS.length;
    const triggerMode = raw.triggerMode === "immediate" ? "immediate" : "icon";
    return {
      enabled: raw.enabled !== false,
      provider,
      baseUrl: normalizeBaseUrl(raw.baseUrl || PRESETS[provider].baseUrl || ""),
      apiKey: normalizeApiKey(raw.apiKey),
      model: String(raw.model ?? PRESETS[provider].model ?? "").trim(),
      outputLanguage: language,
      length,
      triggerMode,
      blacklist: typeof raw.blacklist === "string" ? raw.blacklist : ""
    };
  }

  // src/shared/blacklist.js
  function parseBlacklist(text) {
    return String(text || "").split(/[\n,]/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
  }
  function hostMatches(hostname, pattern) {
    let host = String(hostname || "").trim().toLowerCase().replace(/\.$/, "");
    let rule = String(pattern || "").trim().toLowerCase();
    if (!host || !rule) return false;
    rule = rule.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
    rule = rule.split("/")[0].split(":")[0].replace(/\.$/, "");
    if (!rule || rule === "*") return false;
    if (rule.startsWith("*.")) {
      const rest = rule.slice(2);
      return host === rest || host.endsWith(`.${rest}`);
    }
    return host === rule || host.endsWith(`.${rule}`);
  }
  function isBlacklisted(hostname, text) {
    return parseBlacklist(text).some((pattern) => hostMatches(hostname, pattern));
  }

  // src/shared/history.js
  var HISTORY_LIMIT = 100;
  function prependHistory(items, entry, max = HISTORY_LIMIT) {
    const list = Array.isArray(items) ? items : [];
    const filtered = list.filter((item) => {
      if (!item) return false;
      const same = item.term === entry.term && item.url === entry.url;
      const recent = entry.createdAt - (item.createdAt || 0) < 12e4;
      return !(same && recent);
    });
    return [entry, ...filtered].slice(0, max);
  }

  // src/content/content-script.js
  if (globalThis.chrome?.runtime?.id && !globalThis.__huaciMounted) {
    globalThis.__huaciMounted = true;
    boot();
  }
  function boot() {
    const overlay = mountOverlay(document);
    let settings = normalizeSettings({});
    let currentCtx = null;
    let activeRange = null;
    let cardOpen = false;
    let pinned = false;
    let busy = false;
    let port = null;
    let requestSeq = 0;
    let activeRequest = 0;
    let phase = "initial";
    let messages = [];
    let draft = "";
    let initialText = "";
    let followups = [];
    let historyId = null;
    let lastExplained = "";
    let shortcutAt = 0;
    let scrollTick = 0;
    const lastMouse = { x: 48, y: 48 };
    const alive = () => {
      try {
        return Boolean(chrome.runtime?.id);
      } catch {
        return false;
      }
    };
    loadSettings().catch(() => {
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.settings) {
        settings = normalizeSettings(changes.settings.newValue || {});
        if (!allowed()) overlay.hideAll();
      }
    });
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg?.type === "explain-command") explainFromShortcut();
    });
    document.addEventListener("mousemove", (event) => {
      lastMouse.x = event.clientX;
      lastMouse.y = event.clientY;
    }, true);
    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("mouseup", onMouseUp, true);
    document.addEventListener("keyup", onKeyUp, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("selectionchange", () => {
      if (cardOpen || pinned) return;
      const text = normalizeText(window.getSelection?.()?.toString() || "");
      if (!text) overlay.hideTrigger();
    });
    window.addEventListener("scroll", scheduleReposition, true);
    window.addEventListener("resize", scheduleReposition);
    overlay.on("explain", () => {
      const ctx = readContext() || currentCtx;
      if (!ctx) return;
      openExplain(ctx);
    });
    overlay.on("close", () => {
      closeCard();
      overlay.hideTrigger();
    });
    overlay.on("pin", () => {
      pinned = !pinned;
      overlay.setPinned(pinned);
    });
    overlay.on("copy", () => copyExplanation());
    overlay.on("ima", () => saveToIma());
    overlay.on("more", () => ask("elaborate"));
    overlay.on("ask", (question) => ask("question", question));
    overlay.on("retry", () => retry());
    overlay.on("settings", () => {
      chrome.runtime.sendMessage({ type: "open-options" }).catch(() => {
      });
    });
    document.documentElement.dataset.huaciBoot = "1";
    async function loadSettings() {
      const data = await chrome.storage.local.get("settings");
      settings = normalizeSettings(data.settings || {});
    }
    function allowed() {
      if (!settings.enabled) return false;
      return !isBlacklisted(location.hostname, settings.blacklist);
    }
    function onMouseDown(event) {
      lastMouse.x = event.clientX;
      lastMouse.y = event.clientY;
      if (overlay.eventInHost(event)) return;
      overlay.hideTrigger();
      if (cardOpen && !pinned) closeCard();
    }
    function onMouseUp(event) {
      if (overlay.eventInHost(event)) return;
      window.setTimeout(() => presentSelection(), 0);
    }
    function onKeyUp(event) {
      if (["Shift", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        window.setTimeout(() => presentSelection(), 0);
      }
    }
    function onKeyDown(event) {
      if (event.key === "Escape" && (cardOpen || !overlay.triggerHidden())) {
        event.stopPropagation();
        closeCard();
        overlay.hideTrigger();
        return;
      }
      if (!isShortcut(event)) return;
      event.preventDefault();
      event.stopPropagation();
      explainFromShortcut();
    }
    function isShortcut(event) {
      if (event.repeat || !event.altKey || !event.shiftKey || event.metaKey || event.ctrlKey) return false;
      return event.code === "KeyE" || event.key === "e" || event.key === "E";
    }
    function explainFromShortcut() {
      const now = Date.now();
      if (now - shortcutAt < 450) return;
      shortcutAt = now;
      if (!alive() || !allowed()) return;
      if (pinned && cardOpen) {
        overlay.showHint(lastMouse.x, lastMouse.y, "\u5361\u7247\u5DF2\u56FA\u5B9A");
        return;
      }
      const ctx = readContext();
      if (!ctx) {
        overlay.showHint(lastMouse.x, lastMouse.y, "\u5148\u9009\u4E2D\u4E00\u6BB5\u6587\u5B57");
        return;
      }
      openExplain(ctx);
    }
    function presentSelection() {
      if (!alive() || !allowed()) {
        overlay.hideTrigger();
        return;
      }
      const ctx = readContext();
      if (!ctx) {
        if (!cardOpen) overlay.hideTrigger();
        return;
      }
      currentCtx = ctx;
      if (pinned) return;
      if (settings.triggerMode === "immediate") {
        if (cardOpen && ctx.selectionFull === lastExplained) return;
        openExplain(ctx);
        return;
      }
      if (cardOpen) return;
      overlay.showTrigger(ctx.rect, ctx.selectionFull);
    }
    function openExplain(ctx) {
      if (!allowed()) return;
      if (pinned && cardOpen) return;
      currentCtx = ctx;
      lastExplained = ctx.selectionFull;
      cardOpen = true;
      pinned = false;
      historyId = null;
      draft = "";
      initialText = "";
      followups = [];
      phase = "initial";
      messages = buildInitialMessages(ctx, settings);
      overlay.hideTrigger();
      overlay.openCard(ctx.rect, ctx.selectionFull);
      overlay.setBusy(true);
      busy = true;
      startRequest(messages, "initial");
    }
    function closeCard() {
      cardOpen = false;
      pinned = false;
      overlay.hideCard();
      overlay.setPinned(false);
      cancelRequest();
      busy = false;
    }
    function ask(kind, question = "") {
      if (busy || !currentCtx || !initialText) return;
      const label = kind === "elaborate" ? "\u518D\u8BE6\u7EC6\u4E00\u70B9" : String(question || "").trim();
      if (!label) return;
      if (phase !== "followup" && messages.at(-1)?.role !== "assistant") {
        messages = [...messages, { role: "assistant", content: initialText }];
      }
      messages = buildFollowUpMessages(messages, {
        settings,
        ctx: currentCtx,
        kind,
        question: label
      });
      phase = "followup";
      draft = "";
      followups.push({ question: label, answer: "" });
      overlay.beginFollowUp(label);
      overlay.setBusy(true);
      busy = true;
      startRequest(messages, "followup");
    }
    function retry() {
      if (busy || !messages.length) return;
      draft = "";
      overlay.setBusy(true);
      busy = true;
      if (phase === "followup") overlay.updateFollowUp("", true);
      else overlay.showLoading();
      startRequest(messages, phase);
    }
    function ensurePort() {
      if (port) return port;
      port = chrome.runtime.connect({ name: "huaci" });
      port.onMessage.addListener(onPortMessage);
      port.onDisconnect.addListener(() => {
        port = null;
        if (!busy) return;
        busy = false;
        overlay.setBusy(false);
        overlay.showError("\u8FDE\u63A5\u4E2D\u65AD\u4E86\uFF0C\u8BF7\u518D\u8BD5\u4E00\u6B21\u3002");
      });
      return port;
    }
    function startRequest(nextMessages, nextPhase) {
      const previous = activeRequest;
      if (previous && port) {
        try {
          port.postMessage({ type: "abort", requestId: previous });
        } catch {
          port = null;
        }
      }
      const id = ++requestSeq;
      activeRequest = id;
      phase = nextPhase;
      draft = "";
      try {
        ensurePort().postMessage({
          type: "start",
          requestId: id,
          phase: nextPhase,
          messages: nextMessages
        });
      } catch {
        port = null;
        busy = false;
        overlay.setBusy(false);
        overlay.showError("\u6269\u5C55\u521A\u521A\u66F4\u65B0\u4E86\uFF0C\u5237\u65B0\u9875\u9762\u540E\u518D\u8BD5\u3002");
      }
    }
    function cancelRequest() {
      const id = activeRequest;
      activeRequest = 0;
      if (!id || !port) return;
      try {
        port.postMessage({ type: "abort", requestId: id });
      } catch {
        port = null;
      }
    }
    function onPortMessage(msg) {
      if (!msg || msg.requestId !== activeRequest) return;
      if (msg.type === "delta") {
        draft += msg.text || "";
        if (msg.phase === "followup") {
          if (followups.length) followups[followups.length - 1].answer = draft;
          overlay.updateFollowUp(draft, true);
        } else {
          initialText = draft;
          overlay.renderInitial(draft, true);
        }
        return;
      }
      if (msg.type === "done") {
        busy = false;
        overlay.setBusy(false);
        if (msg.phase === "followup") {
          if (followups.length) followups[followups.length - 1].answer = draft;
          overlay.updateFollowUp(draft, false);
          if (messages.at(-1)?.role !== "assistant") {
            messages = [...messages, { role: "assistant", content: draft }];
          }
        } else {
          initialText = draft;
          overlay.renderInitial(draft, false);
          if (messages.at(-1)?.role !== "assistant") {
            messages = [...messages, { role: "assistant", content: draft }];
          }
        }
        saveHistory().catch(() => {
        });
        return;
      }
      if (msg.type === "error") {
        busy = false;
        overlay.setBusy(false);
        overlay.showError(msg.message || "\u89E3\u91CA\u5931\u8D25\u4E86\u3002");
        return;
      }
      if (msg.type === "aborted") {
        busy = false;
        overlay.setBusy(false);
      }
    }
    async function saveHistory() {
      if (!currentCtx || !initialText) return;
      if (!historyId) historyId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const entry = {
        id: historyId,
        term: (currentCtx.selectionFull || currentCtx.selection).slice(0, 80),
        explanation: formatExplanation(initialText, followups),
        meaning: parseSections(initialText).meaning,
        title: currentCtx.title || "",
        url: currentCtx.url || "",
        createdAt: Date.now()
      };
      const data = await chrome.storage.local.get("history");
      const history = prependHistory(data.history, entry);
      await chrome.storage.local.set({ history });
    }
    async function copyExplanation() {
      const text = formatExplanation(initialText, followups);
      if (!text) return;
      let copied = false;
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.append(area);
        area.select();
        copied = document.execCommand("copy");
        area.remove();
      }
      if (copied) overlay.markCopied();
    }
    function buildImaMarkdown(text) {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const term = (currentCtx?.selectionFull || currentCtx?.selection || "").slice(0, 80);
      const lines = [`# ${term || "\u672A\u547D\u540D"}`, "", `- \u8BB0\u5F55\u65F6\u95F4\uFF1A${stamp}`, `- \u6765\u6E90\uFF1A${currentCtx?.title || "\u672A\u77E5\u9875\u9762"}`];
      if (currentCtx?.url) lines.push(`- \u94FE\u63A5\uFF1A${currentCtx.url}`);
      lines.push("", "\u7531\u300C\u79D2\u61C2\u300D\u5212\u8BCD\u89E3\u91CA\u751F\u6210", "", "---", "", text);
      return lines.join("\n");
    }
    async function saveToIma() {
      const text = formatExplanation(initialText, followups);
      if (!text) {
        overlay.showHint(lastMouse.x, lastMouse.y, "\u8FD8\u6CA1\u6709\u53EF\u4FDD\u5B58\u7684\u89E3\u91CA");
        return;
      }
      try {
        const res = await chrome.runtime.sendMessage({
          type: "save-to-ima",
          term: currentCtx?.selectionFull || currentCtx?.selection || "",
          markdown: buildImaMarkdown(text)
        });
        if (res?.ok) {
          overlay.markImaSaved();
          overlay.showHint(lastMouse.x, lastMouse.y, res.mode === "pushed" ? "\u5DF2\u63A8\u9001\u5230 ima \u7B14\u8BB0" : "\u5DF2\u5B58\u5165\u300C\u4E0B\u8F7D/\u79D2\u61C2\u7B14\u8BB0\u300D");
        } else {
          overlay.showHint(lastMouse.x, lastMouse.y, res?.message || "\u4FDD\u5B58\u5931\u8D25\u4E86");
        }
      } catch {
        overlay.showHint(lastMouse.x, lastMouse.y, "\u4FDD\u5B58\u5931\u8D25\u4E86");
      }
    }
    function scheduleReposition() {
      if (pinned || scrollTick) return;
      scrollTick = window.requestAnimationFrame(() => {
        scrollTick = 0;
        if (!activeRange?.startContainer?.isConnected) return;
        const rect = rectOf(activeRange);
        if (!rect) return;
        if (cardOpen) overlay.moveCard(rect);
        else if (!overlay.triggerHidden()) overlay.moveTrigger(rect);
      });
    }
    function readContext() {
      return readFieldContext() || readDomContext();
    }
    function readFieldContext() {
      const el = document.activeElement;
      if (!el) return null;
      const isField = el.tagName === "TEXTAREA" || el.tagName === "INPUT" && /^(text|search)$/i.test(el.type || "");
      if (!isField || el.type === "password") return null;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      if (start == null || end == null || start === end) return null;
      const selected = el.value.slice(start, end);
      const normalized = normalizeSelection(selected);
      if (!isMeaningfulSelection(normalized)) return null;
      const value = el.value;
      const paraStart = value.lastIndexOf("\n", Math.max(0, start - 1));
      let paraEnd = value.indexOf("\n", end);
      if (paraEnd < 0) paraEnd = value.length;
      const box = el.getBoundingClientRect();
      const inside = lastMouse.x >= box.left && lastMouse.x <= box.right && lastMouse.y >= box.top && lastMouse.y <= box.bottom;
      const rect = inside ? { left: lastMouse.x, top: lastMouse.y, right: lastMouse.x + 4, bottom: lastMouse.y + 18, width: 4, height: 18 } : { left: box.left + 8, top: box.top + 8, right: box.left + 16, bottom: box.top + 28, width: 8, height: 20 };
      activeRange = null;
      return {
        selection: normalized.slice(0, 600),
        selectionFull: normalized,
        truncated: normalized.length > 600,
        paragraph: normalizeText(value.slice(paraStart + 1, paraEnd)).slice(0, 1800) || normalized.slice(0, 600),
        before: normalizeText(value.slice(Math.max(0, start - 280), start)).slice(-400),
        after: normalizeText(value.slice(end, end + 280)).slice(0, 400),
        title: document.title,
        url: location.href,
        host: location.hostname,
        script: detectScript(normalized),
        source: "field",
        rect
      };
    }
    function readDomContext() {
      const sel = pickSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
      if (insideUi(sel.anchorNode) || insideUi(sel.focusNode)) return null;
      const normalized = normalizeSelection(sel.toString());
      if (!isMeaningfulSelection(normalized)) return null;
      const range = sel.getRangeAt(0);
      const rect = rectOf(range);
      if (!rect) return null;
      const ctx = extractContext({
        anchor: range.commonAncestorContainer,
        selectedText: normalized,
        title: document.title,
        url: location.href
      });
      if (!ctx) return null;
      activeRange = range.cloneRange();
      ctx.rect = rect;
      return ctx;
    }
    function pickSelection() {
      const direct = window.getSelection?.();
      if (direct && !direct.isCollapsed && normalizeText(direct.toString())) return direct;
      return selectionInShadows(document, 0, { seen: 0 });
    }
    function selectionInShadows(root, depth, state) {
      if (depth > 3 || !root.querySelectorAll) return null;
      for (const el of root.querySelectorAll("*")) {
        if (!el.shadowRoot || el.id === "huaci-root") continue;
        state.seen += 1;
        if (state.seen > 30) return null;
        const sel = el.shadowRoot.getSelection?.();
        if (sel && !sel.isCollapsed && normalizeText(sel.toString()) && !insideUi(sel.anchorNode)) return sel;
        const nested = selectionInShadows(el.shadowRoot, depth + 1, state);
        if (nested) return nested;
      }
      return null;
    }
    function insideUi(node) {
      const el = node?.nodeType === 1 ? node : node?.parentElement;
      if (!el) return false;
      if (el.closest?.("#huaci-root")) return true;
      const root = el.getRootNode?.();
      return root?.host?.id === "huaci-root";
    }
    function rectOf(range) {
      const list = [...range.getClientRects()].filter((item) => item.width > 0 || item.height > 0);
      const rect = list.at(-1) || range.getBoundingClientRect();
      if (!rect || rect.width === 0 && rect.height === 0) return null;
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      };
    }
  }
})();
