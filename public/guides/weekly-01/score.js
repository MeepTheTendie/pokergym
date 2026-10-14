(() => {
  const key = 'pokergym:weekly-01:scores:v1';
  const attemptKey = 'pokergym:weekly-01:attempt:v1';
  const cards = [...document.querySelectorAll('article[data-answer]')];
  const score = document.getElementById('pack-score');
  const history = document.getElementById('pack-history');
  const storage = document.getElementById('pack-storage');
  const retry = document.getElementById('pack-retry');
  let saved = null;
  let results = [];
  let saving = true;
  const valid = value => value && Number.isInteger(value.correct) && value.correct >= 0 &&
    value.correct <= cards.length && Number.isInteger(value.revealed) && value.revealed >= 0 &&
    value.correct + value.revealed <= cards.length;
  try {
    const value = JSON.parse(localStorage.getItem(key));
    if (valid(value?.first) && valid(value?.latest)) saved = { first: value.first, latest: value.latest };
  } catch { saving = false; }
  try {
    const attempt = JSON.parse(localStorage.getItem(attemptKey));
    if (Array.isArray(attempt) && attempt.length === cards.length &&
      attempt.every(value => [null, true, false, 'revealed'].includes(value)) &&
      attempt.some(value => value !== null) && attempt.some(value => value === null)) {
      results = attempt.map(value => value === null ? undefined : value);
    }
  } catch { saving = false; }
  function saveAttempt() {
    const incomplete = results.some(value => value !== undefined) &&
      results.filter(value => value !== undefined).length < cards.length;
    try {
      if (incomplete) localStorage.setItem(attemptKey,
        JSON.stringify(Array.from({ length: cards.length }, (_, index) => results[index] ?? null)));
      else localStorage.removeItem(attemptKey);
    } catch { saving = false; }
  }
  function render() {
    const done = results.filter(value => value !== undefined).length;
    const correct = results.filter(value => value === true).length;
    score.textContent = `This attempt: ${correct}/${cards.length} correct · ${done}/${cards.length} completed.`;
    history.textContent = saved
      ? `First completed attempt: ${saved.first.correct}/${cards.length} (${saved.first.revealed} revealed before choosing). Latest completed attempt: ${saved.latest.correct}/${cards.length} (${saved.latest.revealed} revealed before choosing).`
      : 'No completed score saved yet.';
    storage.textContent = saving ? 'Your current attempt and completed scores stay in this browser. No score is sent to Poker Gym.'
      : 'Saving unavailable. Keep a note of your scores before closing this page.';
    retry.hidden = done !== cards.length;
  }
  function record(index, value) {
    if (results[index] !== undefined) return;
    results[index] = value;
    cards[index].querySelectorAll('button').forEach(button => { button.disabled = true; });
    if (results.filter(value => value !== undefined).length === cards.length) {
      const latest = { correct: results.filter(value => value === true).length,
        revealed: results.filter(value => value === 'revealed').length };
      saved = { first: saved?.first ?? latest, latest };
      try { localStorage.setItem(key, JSON.stringify(saved)); } catch { saving = false; }
    }
    saveAttempt();
    render();
  }
  cards.forEach((card, index) => {
    const details = card.querySelector('details');
    const choices = document.createElement('div');
    choices.className = 'choices';
    choices.setAttribute('role', 'group');
    choices.setAttribute('aria-label', `Decision ${index + 1}: choose your move`);
    const response = document.createElement('p');
    response.setAttribute('role', 'status');
    response.className = 'decision-result';
    const moves = ['hit', 'stand', 'double'];
    if ([2, 3].includes(index)) moves.push('split');
    for (const move of moves) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = move[0].toUpperCase() + move.slice(1);
      button.dataset.move = move;
      button.onclick = () => {
        if (results[index] !== undefined) return;
        const correct = move === card.dataset.answer;
        record(index, correct);
        response.textContent = `${button.textContent}: ${correct ? 'correct' : 'review the explanation'}.`;
        details.open = true;
      };
      choices.append(button);
    }
    // Record synchronously on opening, before a player can close and choose.
    card.querySelector('summary').addEventListener('click', () => {
      if (!details.open && results[index] === undefined) {
        record(index, 'revealed');
        response.textContent = 'Answer revealed before choosing: no point this attempt.';
      }
    });
    details.addEventListener('toggle', () => {
      if (details.open && results[index] === undefined) {
        record(index, 'revealed');
        response.textContent = 'Answer revealed before choosing: no point this attempt.';
      }
    });
    card.insertBefore(choices, details);
    card.insertBefore(response, details);
    if (results[index] !== undefined) {
      choices.querySelectorAll('button').forEach(button => { button.disabled = true; });
      response.textContent = results[index] === 'revealed'
        ? 'Resumed: answer revealed before choosing, no point this attempt.'
        : `Resumed: ${results[index] ? 'correct' : 'review the explanation'}.`;
      details.open = true;
    }
  });
  retry.onclick = () => {
    results = [];
    saveAttempt();
    cards.forEach(card => {
      card.querySelector('details').open = false;
      card.querySelector('.decision-result').textContent = '';
      card.querySelectorAll('button').forEach(button => { button.disabled = false; });
    });
    render();
    cards[0].querySelector('button').focus();
  };
  render();
})();
