/* oxlint-disable unicorn/consistent-function-scoping -- every runtime is inlined into one shared <script>; the surrounding block keeps these helpers private instead of global */
// quiz unit runtime. Registers YESUnits.kinds.quiz (contract: see video/runtime.js).
// data: { title, sub?, questions: [{ q, choices, answer, why, from?, ref? }] }
// Picking a choice answers that question at once; when all are answered the unit reports
// host.result({ score, total, wrong: [question index], answers: [{ ref, correct }] }) and host.complete().
{
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

(window.YESUnits = window.YESUnits || { kinds: {} }).kinds.quiz = function quizUnit(root, data, host) {
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  root.classList.add('qz');
  const page = el('div', 'qz-in');
  root.append(page);

  function render() {
    page.textContent = '';
    const head = el('div', 'qz-head');
    head.append(el('h1', null, data.title || '確認テスト'), el('span', null, data.sub || `${data.questions.length} 問 ・ 選ぶとすぐ答え合わせ`));
    page.append(head);
    const answers = data.questions.map(() => null);
    const result = el('div', 'qz-result'); result.hidden = true;
    data.questions.forEach((q, n) => {
      const card = el('div', 'qz-q');
      card.append(el('div', 'qz-n', `問 ${n + 1}`));
      if (q.from) card.append(el('div', 'qz-from', `${q.from} より`));
      card.append(el('div', 'qz-t', q.q));
      const why = el('div', 'qz-why'); why.hidden = true;
      const buttons = q.choices.map((choice, ci) => {
        const b = el('button', 'qz-ch'); b.append(el('b', null, LETTERS[ci]), document.createTextNode(choice));
        b.addEventListener('click', () => {
          answers[n] = ci;
          buttons.forEach((x, xi) => {
            x.disabled = true;
            if (xi === q.answer) { x.classList.add('right'); x.append(el('span', 'mark', '✓ 正解')); }
            else if (xi === ci) { x.classList.add('wrong'); x.append(el('span', 'mark', '✗ あなたの回答')); }
          });
          why.textContent = (ci === q.answer ? '正解です。' : '不正解です。') + (q.why || ''); why.hidden = false;
          if (answers.every((a) => a != null)) finish(answers, result);
        });
        card.append(b); return b;
      });
      card.append(why); page.append(card);
    });
    page.append(result);
  }

  function finish(answers, result) {
    const correct = answers.map((a, n) => a === data.questions[n].answer);
    const score = correct.filter(Boolean).length, total = correct.length;
    host.result({ score, total, wrong: correct.flatMap((c, n) => (c ? [] : [n])),
                  answers: correct.map((c, n) => ({ ref: data.questions[n].ref, correct: c })) });
    host.complete();
    result.textContent = '';
    result.append(el('div', 'score', `${score} / ${total}`));
    if (score === total) result.append(el('div', 'crown', '★ 全問正解'));
    const acts = el('div', 'qz-acts');
    const actions = [...host.endActions(), { label: '解き直す', run: () => { render(); root.scrollTop = 0; } }];
    for (const a of actions) { const b = el('button', a.primary ? 'qz-act primary' : 'qz-act', a.label); b.addEventListener('click', a.run); acts.append(b); }
    result.append(acts); result.hidden = false;
    result.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  render();
  return {
    show() { root.hidden = false; render(); root.scrollTop = 0; },
    hide() { root.hidden = true; },
  };
};
}
