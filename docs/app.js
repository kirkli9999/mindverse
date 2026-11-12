// 預約表單草稿小幫手 — 前端
// 所有回答只存在這個分頁的記憶體裡:不用 cookie、localStorage,也沒有任何追蹤程式。
(function () {
  "use strict";

  const API = (window.INTAKE_API || "").trim();

  const QUESTIONS = [
    {
      id: "topics",
      title: "最近主要是哪些事,讓你想找人談?",
      hint: "可以複選。選「說不上來」也完全沒問題。",
      multi: true,
      options: ["心情低落", "焦慮、緊張", "睡不好", "容易煩躁、生氣", "提不起勁", "注意力不集中", "工作或學業壓力",
        "家庭關係", "伴侶或感情", "人際相處", "失去重要的人事物", "過去不好的經驗", "身體不舒服但查不出原因",
        "對自己很不滿意", "說不上來,就是不對勁"],
      textKey: "topicsNote",
      textLabel: "想補一句自己的話嗎?(可留空)",
    },
    {
      id: "duration",
      title: "這樣的狀況大概多久了?",
      hint: "抓個大概就好。",
      multi: false,
      options: ["最近一兩週", "一個月左右", "幾個月", "半年以上", "好幾年了", "時好時壞,說不準"],
    },
    {
      id: "impact",
      title: "它影響到生活的哪些部分?",
      hint: "可以複選。",
      multi: true,
      options: ["睡眠", "食慾或體重", "工作或課業表現", "出門或上班上課", "和家人朋友的相處", "體力、容易累",
        "原本喜歡的事變得沒興趣", "照顧自己(吃飯、洗澡、整理)", "目前還撐得住"],
    },
    {
      id: "trigger",
      title: "最近有發生什麼事或變化嗎?",
      hint: "例如換工作、搬家、分手、家人生病。沒有、或不確定有沒有關係,都可以跳過。",
      textOnly: true,
      textKey: "trigger",
      textLabel: "幾個字就夠了",
    },
    {
      id: "history",
      title: "以前有看過身心科或做過諮商嗎?",
      hint: "可以複選。",
      multi: true,
      options: ["這是第一次", "以前看過身心科/精神科", "以前做過心理諮商", "目前有在服用相關藥物", "以前吃過藥,現在沒有", "不想在表單上寫"],
    },
    {
      id: "goals",
      title: "這次最希望得到什麼?",
      hint: "可以複選。不確定也沒關係,這本來就可以見面再談。",
      multi: true,
      options: ["想知道自己怎麼了", "想睡得好一點", "想讓情緒穩定一點", "想有人聽我說", "想學怎麼面對壓力",
        "想處理一段關係", "想評估需不需要用藥", "還不確定,想先談談看"],
    },
    {
      id: "extra",
      title: "還有什麼想先讓對方知道的?",
      hint: "例如希望對方的說話方式、不方便談的主題、擔心的事。沒有就直接完成。",
      textOnly: true,
      textKey: "extra",
      textLabel: "可留空",
    },
  ];

  const state = { step: 0, length: "standard", busy: false, answers: emptyAnswers() };

  function emptyAnswers() {
    return { topics: [], topicsNote: "", duration: "", impact: [], trigger: "", history: [], goals: [], extra: "" };
  }

  const $ = (id) => document.getElementById(id);
  const views = { intro: $("view-intro"), question: $("view-question"), result: $("view-result") };

  function show(name, focusEl) {
    for (const key of Object.keys(views)) views[key].hidden = key !== name;
    window.scrollTo(0, 0);
    if (focusEl) focusEl.focus({ preventScroll: true });
  }

  // ── 問題畫面 ─────────────────────────────────────────────
  function renderQuestion() {
    const q = QUESTIONS[state.step];
    const a = state.answers;

    $("progress").innerHTML = QUESTIONS.map((_, i) => `<span class="${i <= state.step ? "done" : ""}"></span>`).join("");
    $("step-label").textContent = `第 ${state.step + 1} 題,共 ${QUESTIONS.length} 題`;
    $("q-title").textContent = q.title;
    $("q-hint").textContent = q.hint;

    const chips = $("q-chips");
    chips.innerHTML = "";
    chips.hidden = !!q.textOnly;
    if (!q.textOnly) {
      for (const option of q.options) {
        const selected = q.multi ? a[q.id].includes(option) : a[q.id] === option;
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        chip.textContent = option;
        chip.setAttribute("aria-pressed", String(selected));
        chip.addEventListener("click", () => {
          if (q.multi) {
            a[q.id] = a[q.id].includes(option) ? a[q.id].filter((v) => v !== option) : [...a[q.id], option];
          } else {
            a[q.id] = a[q.id] === option ? "" : option;
          }
          renderQuestion();
        });
        chips.appendChild(chip);
      }
    }

    const hasText = !!q.textKey;
    $("q-text").hidden = !hasText;
    $("q-text-label").hidden = !hasText;
    if (hasText) {
      $("q-text-label").textContent = q.textLabel;
      $("q-text").value = a[q.textKey];
    }

    $("back").textContent = state.step === 0 ? "回首頁" : "上一題";
    $("next").textContent = state.step === QUESTIONS.length - 1 ? "完成,幫我整理" : "下一題";
  }

  function saveText() {
    const q = QUESTIONS[state.step];
    if (q.textKey) state.answers[q.textKey] = $("q-text").value.trim();
  }

  function clearCurrent() {
    const q = QUESTIONS[state.step];
    if (!q.textOnly) state.answers[q.id] = q.multi ? [] : "";
    if (q.textKey) state.answers[q.textKey] = "";
  }

  function advance() {
    if (state.step < QUESTIONS.length - 1) {
      state.step += 1;
      renderQuestion();
      show("question", $("q-title"));
    } else {
      show("result", $("r-title"));
      generate();
    }
  }

  // ── 本機範本(不連線)────────────────────────────────────
  function localDraft(a, length) {
    const s = [];
    const topics = a.topics.filter((t) => t !== "說不上來,就是不對勁");
    if (topics.length) s.push(`最近主要的困擾是${topics.join("、")}。`);
    else if (a.topics.length) s.push("最近覺得自己狀況不太對勁,但說不太上來是什麼。");
    if (a.topicsNote) s.push(ensureEnd(a.topicsNote));
    if (a.duration) {
      s.push(a.duration === "時好時壞,說不準" ? "這樣的狀況時好時壞,說不準持續了多久。" : `這樣的狀況已經持續${a.duration.replace(/了$/, "")}。`);
    }
    const impact = a.impact.filter((t) => t !== "目前還撐得住");
    if (impact.length) s.push(`受到影響的部分包括:${impact.join("、")}。`);
    if (a.impact.includes("目前還撐得住")) s.push(impact.length ? "日常生活目前還撐得住。" : "日常生活目前還撐得住,但想及早處理。");
    if (a.trigger) s.push(`近期的事件或變化:${ensureEnd(a.trigger)}`);
    const history = a.history.filter((t) => t !== "不想在表單上寫");
    if (history.length) {
      s.push(history.map((h) => (h === "這是第一次" ? "這是我第一次尋求這類協助" : h)).join(";") + "。");
    }
    if (length !== "short") {
      const goals = a.goals.filter((t) => t !== "還不確定,想先談談看");
      if (goals.length) s.push(`這次希望能:${goals.map((g) => g.replace(/^想/, "")).join("、")}。`);
      else if (a.goals.length) s.push("這次還不確定想要什麼,想先談談看。");
      if (a.extra) s.push(`另外想先說明:${ensureEnd(a.extra)}`);
    }
    return s.join("");
  }

  function ensureEnd(text) {
    return /[。!?!?…]$/.test(text) ? text : text + "。";
  }

  function hasAnyAnswer(a) {
    return Object.values(a).some((v) => (Array.isArray(v) ? v.length : v));
  }

  // ── 產生草稿 ─────────────────────────────────────────────
  const FALLBACK_NOTES = {
    user_quota: "今天的 AI 整理次數已經用完,先用基本範本幫你組好了,內容一樣可以用。",
    site_quota: "今天全站的 AI 整理額度已用完,先用基本範本幫你組好了,內容一樣可以用。",
    declined: "AI 這次沒有產出內容,先用基本範本幫你組好了。",
    offline: "目前連不上 AI 整理服務,先用基本範本幫你組好了,內容一樣可以用。",
  };

  async function generate() {
    const a = state.answers;
    const draft = $("draft");
    const status = $("status");

    if (!hasAnyAnswer(a)) {
      draft.value = "";
      status.textContent = "每一題都跳過了,所以沒有內容可以整理。回去隨便點一兩個選項就可以,不用多。";
      return;
    }

    if (!API) {
      draft.value = localDraft(a, state.length);
      $("regen").hidden = true;
      status.textContent = "已用基本範本組好(未連線到任何 AI 服務)。";
      return;
    }

    setBusy(true);
    draft.value = "";
    status.textContent = "整理中,大約需要十幾秒…";
    let note = FALLBACK_NOTES.offline;
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: a, length: state.length }),
        referrerPolicy: "no-referrer",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.draft) {
        draft.value = data.draft;
        status.textContent = typeof data.remaining === "number" ? `整理好了。今天還可以再整理 ${data.remaining} 次。` : "整理好了。";
        setBusy(false);
        return;
      }
      note = FALLBACK_NOTES[data.error] || FALLBACK_NOTES.offline;
    } catch (err) {
      note = FALLBACK_NOTES.offline;
    }
    draft.value = localDraft(a, state.length);
    status.textContent = note;
    setBusy(false);
  }

  function setBusy(busy) {
    state.busy = busy;
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

  // ── 事件 ─────────────────────────────────────────────────
  $("privacy-line").textContent = API
    ? "最後一步會把你的回答傳給 AI(Anthropic 的 Claude)整理成通順的文字。本站不保存內容;AI 服務商會依其政策短期留存請求紀錄,所以請不要寫姓名等個人資料。"
    : "目前是離線範本模式:所有內容都只在你的瀏覽器裡處理,不會傳到任何地方。";

  $("start").addEventListener("click", () => {
    state.step = 0;
    renderQuestion();
    show("question", $("q-title"));
  });
  $("next").addEventListener("click", () => { saveText(); advance(); });
  $("skip").addEventListener("click", () => { clearCurrent(); advance(); });
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
    state.answers = emptyAnswers();
    state.step = 0;
    state.length = "standard";
    $("shorter").textContent = "換成簡短版";
    $("draft").value = "";
    $("status").textContent = "";
    show("intro");
  });
})();
