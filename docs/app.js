// 預約表單草稿小幫手 — 前端
// 所有回答只存在這個分頁的記憶體裡:不用 cookie、localStorage,也沒有任何追蹤程式。
(function () {
  "use strict";

  const API = (window.INTAKE_API || "").trim().replace(/\/+$/, "").replace(/\/api\/draft$/, "");

  // 通用題目:沒有貼上表單、或 AI 服務無法使用時採用
  const DEFAULT_QUESTIONS = [
    {
      key: "topics",
      title: "最近主要是哪些事,讓你想找人談?",
      hint: "可以複選。選「說不上來」也完全沒問題。",
      type: "multi",
      options: ["心情低落", "焦慮、緊張", "睡不好", "容易煩躁、生氣", "提不起勁", "注意力不集中", "工作或學業壓力",
        "家庭關係", "伴侶或感情", "人際相處", "失去重要的人事物", "過去不好的經驗", "身體不舒服但查不出原因",
        "對自己很不滿意", "說不上來,就是不對勁"],
    },
    {
      key: "duration",
      title: "這樣的狀況大概多久了?",
      hint: "抓個大概就好。",
      type: "single",
      options: ["最近一兩週", "一個月左右", "幾個月", "半年以上", "好幾年了", "時好時壞,說不準"],
    },
    {
      key: "impact",
      title: "它影響到生活的哪些部分?",
      hint: "可以複選。",
      type: "multi",
      options: ["睡眠", "食慾或體重", "工作或課業表現", "出門或上班上課", "和家人朋友的相處", "體力、容易累",
        "原本喜歡的事變得沒興趣", "照顧自己(吃飯、洗澡、整理)", "目前還撐得住"],
    },
    {
      key: "trigger",
      title: "最近有發生什麼事或變化嗎?",
      hint: "例如換工作、搬家、分手、家人生病。沒有、或不確定有沒有關係,都可以跳過。",
      type: "text",
      options: [],
    },
    {
      key: "history",
      title: "以前有看過身心科或做過諮商嗎?",
      hint: "可以複選。",
      type: "multi",
      options: ["這是第一次", "以前看過身心科/精神科", "以前做過心理諮商", "目前有在服用相關藥物", "以前吃過藥,現在沒有", "不想在表單上寫"],
    },
    {
      key: "goals",
      title: "這次最希望得到什麼?",
      hint: "可以複選。不確定也沒關係,這本來就可以見面再談。",
      type: "multi",
      options: ["想知道自己怎麼了", "想睡得好一點", "想讓情緒穩定一點", "想有人聽我說", "想學怎麼面對壓力",
        "想處理一段關係", "想評估需不需要用藥", "還不確定,想先談談看"],
    },
    {
      key: "extra",
      title: "還有什麼想先讓對方知道的?",
      hint: "例如希望對方的說話方式、不方便談的主題、擔心的事。沒有就直接完成。",
      type: "text",
      options: [],
    },
  ];

  const state = { step: 0, length: "standard", form: "", custom: false, questions: DEFAULT_QUESTIONS, answers: [] };

  const $ = (id) => document.getElementById(id);
  const views = { intro: $("view-intro"), question: $("view-question"), result: $("view-result") };

  function show(name, focusEl) {
    for (const key of Object.keys(views)) views[key].hidden = key !== name;
    window.scrollTo(0, 0);
    if (focusEl) focusEl.focus({ preventScroll: true });
  }

  function useQuestions(questions, custom) {
    state.questions = questions;
    state.custom = custom;
    state.answers = questions.map(() => ({ selected: [], text: "" }));
    state.step = 0;
  }

  // ── 問題畫面 ─────────────────────────────────────────────
  function renderQuestion() {
    const q = state.questions[state.step];
    const a = state.answers[state.step];
    const total = state.questions.length;

    $("progress").innerHTML = state.questions.map((_, i) => `<span class="${i <= state.step ? "done" : ""}"></span>`).join("");
    $("step-label").textContent = `第 ${state.step + 1} 題,共 ${total} 題`;
    $("q-title").textContent = q.title;
    $("q-hint").textContent = q.hint || "";

    const chips = $("q-chips");
    chips.innerHTML = "";
    chips.hidden = q.type === "text";
    if (q.type !== "text") {
      for (const option of q.options) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        chip.textContent = option;
        chip.setAttribute("aria-pressed", String(a.selected.includes(option)));
        chip.addEventListener("click", () => {
          if (a.selected.includes(option)) a.selected = a.selected.filter((v) => v !== option);
          else a.selected = q.type === "single" ? [option] : [...a.selected, option];
          a.text = $("q-text").value.trim();
          renderQuestion();
        });
        chips.appendChild(chip);
      }
    }

    // 每一題都可以手寫:選項不合用時,直接用自己的話說
    $("q-text-label").textContent = q.type === "text" ? "幾個字就夠了(可留空)" : "選項都不太對?用自己的話寫也可以(可留空)";
    $("q-text").value = a.text;

    $("back").textContent = state.step === 0 ? "回首頁" : "上一題";
    $("next").textContent = state.step === total - 1 ? "完成,幫我整理" : "下一題";
  }

  function saveText() {
    state.answers[state.step].text = $("q-text").value.trim();
  }

  function advance() {
    if (state.step < state.questions.length - 1) {
      state.step += 1;
      renderQuestion();
      show("question", $("q-title"));
    } else {
      show("result", $("r-title"));
      generate();
    }
  }

  function answeredItems() {
    return state.questions
      .map((q, i) => ({ question: q.title, selected: state.answers[i].selected, text: state.answers[i].text }))
      .filter((it) => it.selected.length || it.text);
  }

  // ── 本機範本(不連線)────────────────────────────────────
  function ensureEnd(text) {
    return /[。!?!?…]$/.test(text) ? text : text + "。";
  }

  function byKey(key) {
    const i = state.questions.findIndex((q) => q.key === key);
    return i < 0 ? { selected: [], text: "" } : state.answers[i];
  }

  function localDraftDefault(length) {
    const s = [];
    const topics = byKey("topics");
    const named = topics.selected.filter((t) => t !== "說不上來,就是不對勁");
    if (named.length) s.push(`最近主要的困擾是${named.join("、")}。`);
    else if (topics.selected.length) s.push("最近覺得自己狀況不太對勁,但說不太上來是什麼。");
    if (topics.text) s.push(ensureEnd(topics.text));

    const duration = byKey("duration");
    const d = duration.selected[0];
    if (d) s.push(d === "時好時壞,說不準" ? "這樣的狀況時好時壞,說不準持續了多久。" : `這樣的狀況已經持續${d.replace(/了$/, "")}。`);
    if (duration.text) s.push(ensureEnd(duration.text));

    const impact = byKey("impact");
    const affected = impact.selected.filter((t) => t !== "目前還撐得住");
    if (affected.length) s.push(`受到影響的部分包括:${affected.join("、")}。`);
    if (impact.selected.includes("目前還撐得住")) s.push(affected.length ? "日常生活目前還撐得住。" : "日常生活目前還撐得住,但想及早處理。");
    if (impact.text) s.push(ensureEnd(impact.text));

    const trigger = byKey("trigger");
    if (trigger.text) s.push(`近期的事件或變化:${ensureEnd(trigger.text)}`);

    const history = byKey("history");
    const past = history.selected.filter((t) => t !== "不想在表單上寫");
    if (past.length) s.push(past.map((h) => (h === "這是第一次" ? "這是我第一次尋求這類協助" : h)).join(";") + "。");
    if (history.text) s.push(ensureEnd(history.text));

    if (length !== "short") {
      const goals = byKey("goals");
      const wants = goals.selected.filter((t) => t !== "還不確定,想先談談看");
      if (wants.length) s.push(`這次希望能:${wants.map((g) => g.replace(/^想/, "")).join("、")}。`);
      else if (goals.selected.length) s.push("這次還不確定想要什麼,想先談談看。");
      if (goals.text) s.push(ensureEnd(goals.text));
      const extra = byKey("extra");
      if (extra.text) s.push(`另外想先說明:${ensureEnd(extra.text)}`);
    }
    return s.join("");
  }

  // 自訂題目沒有對應的句型,就照「題目 → 回答」逐項列出
  function localDraftGeneric() {
    return answeredItems()
      .map((it) => {
        const parts = [];
        if (it.selected.length) parts.push(it.selected.join("、") + "。");
        if (it.text) parts.push(ensureEnd(it.text));
        return `【${it.question}】\n${parts.join("")}`;
      })
      .join("\n\n");
  }

  function localDraft() {
    return state.custom ? localDraftGeneric() : localDraftDefault(state.length);
  }

  // ── 連線 ─────────────────────────────────────────────────
  async function postOnce(path, body) {
    const res = await fetch(API + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      referrerPolicy: "no-referrer",
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  // 連線偶爾會中斷,或 AI 偶爾沒產出:自動再試一次,使用者不必自己重按
  async function post(path, body) {
    try {
      const first = await postOnce(path, body);
      if (first.ok || first.status === 429 || first.status === 400) return first;
    } catch (err) { /* 再試一次 */ }
    return postOnce(path, body);
  }

  const QUOTA_NOTES = {
    user_quota: "今天的 AI 次數已經用完",
    site_quota: "今天全站的 AI 額度已用完",
  };

  // 把失敗原因講清楚(附代碼),方便回報與排查
  function failNote(data, fallback) {
    if (QUOTA_NOTES[data.error]) return QUOTA_NOTES[data.error];
    return data.error ? `${fallback}(${data.error}${data.upstream_status ? " " + data.upstream_status : ""})` : fallback;
  }
  function netNote(err) {
    return `目前連不上 AI 服務(${(err && err.message) || "network"})`;
  }

  async function startCustom() {
    const form = $("form-text").value.trim();
    const status = $("intro-status");
    if (!form) {
      status.textContent = "還沒有貼上表單題目。也可以直接按「用通用題目開始」。";
      $("form-text").focus();
      return;
    }
    $("start-custom").disabled = true;
    $("start").disabled = true;
    status.textContent = "正在依這份表單準備題目,大約需要十幾秒…";
    let reason = "目前連不上 AI 服務";
    try {
      const { ok, data } = await post("/api/questions", { form });
      if (ok && Array.isArray(data.questions) && data.questions.length) {
        state.form = form;
        useQuestions(data.questions, true);
        status.textContent = "";
        renderQuestion();
        show("question", $("q-title"));
        return;
      }
      reason = failNote(data, "這次沒能依表單出題");
    } catch (err) {
      reason = netNote(err);
    } finally {
      $("start-custom").disabled = false;
      $("start").disabled = false;
    }
    // 出題失敗不擋路:改用通用題目,表單內容仍會在最後整理時一併參考
    state.form = form;
    useQuestions(DEFAULT_QUESTIONS, false);
    renderQuestion();
    show("question", $("q-title"));
    $("q-hint").textContent = `${reason},先改用通用題目。` + $("q-hint").textContent;
  }

  async function generate() {
    const draft = $("draft");
    const status = $("status");
    const items = answeredItems();
    $("regen").hidden = !API;
    $("shorter").hidden = !API && state.custom;

    if (!items.length) {
      draft.value = "";
      status.textContent = "每一題都跳過了,所以沒有內容可以整理。回去隨便點一兩個選項就可以,不用多。";
      return;
    }
    if (!API) {
      draft.value = localDraft();
      status.textContent = "已用基本範本組好(未連線到任何 AI 服務)。";
      return;
    }

    setBusy(true);
    draft.value = "";
    status.textContent = "整理中,大約需要十幾秒…";
    let reason = "目前連不上 AI 整理服務";
    try {
      const { ok, data } = await post("/api/draft", { form: state.form, items, length: state.length });
      if (ok && data.draft) {
        draft.value = data.draft;
        status.textContent = typeof data.remaining === "number" ? `整理好了。今天還可以再用 ${data.remaining} 次。` : "整理好了。";
        setBusy(false);
        return;
      }
      reason = failNote(data, "AI 這次沒有產出內容");
    } catch (err) {
      reason = netNote(err);
    }
    draft.value = localDraft();
    status.textContent = `${reason},先用基本範本幫你組好了,內容一樣可以用。`;
    setBusy(false);
  }

  function setBusy(busy) {
    for (const id of ["copy", "shorter", "regen"]) $(id).disabled = busy;
  }

  async function copyDraft() {
    const draft = $("draft");
    if (!draft.value) return;
    try {
      await navigator.clipboard.writeText(draft.value);
    } catch (err) {
      draft.select();
      document.execCommand("copy");
    }
    $("status").textContent = "已複製。貼到預約表單就完成了。";
  }

  // ── 背景音樂:預設不播放、不預先下載,由使用者自己決定 ──
  const bgm = $("bgm");
  bgm.volume = 0.5;
  function syncMusic() {
    const playing = !bgm.paused;
    $("music").setAttribute("aria-pressed", String(playing));
    $("music").textContent = playing ? "♪ 暫停音樂" : "♪ 播放音樂";
  }
  bgm.addEventListener("play", syncMusic);
  bgm.addEventListener("pause", syncMusic);
  $("music").addEventListener("click", () => {
    if (bgm.paused) bgm.play().catch(syncMusic);
    else bgm.pause();
  });

  // ── 初始化與事件 ─────────────────────────────────────────
  $("paste-block").hidden = !API;
  $("start-custom").hidden = !API;
  if (!API) $("start").classList.add("primary");
  $("start").textContent = API ? "用通用題目開始" : "開始";
  $("privacy-line").textContent = API
    ? "內容會交給 AI 整理成文字,本站不保存;不用寫姓名。"
    : "內容只在你的瀏覽器裡處理,不會傳到任何地方。";

  $("start").addEventListener("click", () => {
    state.form = API ? $("form-text").value.trim() : "";
    useQuestions(DEFAULT_QUESTIONS, false);
    renderQuestion();
    show("question", $("q-title"));
  });
  $("start-custom").addEventListener("click", startCustom);
  $("next").addEventListener("click", () => { saveText(); advance(); });
  $("skip").addEventListener("click", () => {
    state.answers[state.step] = { selected: [], text: "" };
    advance();
  });
  $("back").addEventListener("click", () => {
    saveText();
    if (state.step === 0) return show("intro");
    state.step -= 1;
    renderQuestion();
    show("question", $("q-title"));
  });
  $("copy").addEventListener("click", copyDraft);
  $("regen").addEventListener("click", generate);
  $("shorter").addEventListener("click", () => {
    state.length = state.length === "short" ? "standard" : "short";
    $("shorter").textContent = state.length === "short" ? "換回標準版" : "換成簡短版";
    generate();
  });
  $("edit").addEventListener("click", () => {
    state.step = 0;
    renderQuestion();
    show("question", $("q-title"));
  });
  $("reset").addEventListener("click", () => {
    useQuestions(DEFAULT_QUESTIONS, false);
    state.form = "";
    state.length = "standard";
    $("form-text").value = "";
    $("shorter").textContent = "換成簡短版";
    $("draft").value = "";
    $("status").textContent = "";
    $("intro-status").textContent = "";
    show("intro");
  });
})();
