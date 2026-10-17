(() => {
  const key = 'pokergym:weekly-01:scores:v1';
  const attemptKey = 'pokergym:weekly-01:attempt:v1';
  const choicesKey = 'pokergym:weekly-01:choices:v1';
  const cards = [...document.querySelectorAll('article[data-answer]')];
  const score = document.getElementById('pack-score');
  const history = document.getElementById('pack-history');
  const storage = document.getElementById('pack-storage');
  const retry = document.getElementById('pack-retry');
  const share = document.getElementById('pack-share');
  const shareText = document.getElementById('pack-share-text');
  const shareStatus = document.getElementById('pack-share-status');
  let saved = null;
  let results = [];
  let chosen = [];
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
      attempt.some(value => value !== null)) {
      results = attempt.map(value => value === null ? undefined : value);
    }
  } catch { saving = false; }
  // Keep legacy attempts valid; only restore choices consistent with their score.
  try {
    const value = JSON.parse(localStorage.getItem(choicesKey));
    if (Array.isArray(value) && value.length === cards.length) {
      chosen = value.map((move, index) => {
        const legal = ['hit', 'stand', 'double', ...([2, 3].includes(index) ? ['split'] : [])];
        return typeof results[index] === 'boolean' && legal.includes(move) &&
          (move === cards[index].dataset.answer) === results[index] ? move : null;
      });
    }
  } catch { saving = false; }
  function saveAttempt() {
    const started = results.some(value => value !== undefined);
    try {
      if (started) localStorage.setItem(attemptKey,
        JSON.stringify(Array.from({ length: cards.length }, (_, index) => results[index] ?? null)));
      else localStorage.removeItem(attemptKey);
      if (started) localStorage.setItem(choicesKey,
        JSON.stringify(Array.from({ length: cards.length }, (_, index) => chosen[index] ?? null)));
      else localStorage.removeItem(choicesKey);
    } catch { saving = false; }
  }
  function render() {
    const done = results.filter(value => value !== undefined).length;
    const correct = results.filter(value => value === true).length;
    score.textContent = `This attempt: ${correct}/${cards.length} correct · ${done}/${cards.length} completed.`;
    history.textContent = saved
      ? `First completed attempt: ${saved.first.correct}/${cards.length} (${saved.first.revealed} revealed before choosing). Latest completed attempt: ${saved.latest.correct}/${cards.length} (${saved.latest.revealed} revealed before choosing).`
      : 'No completed score saved yet.';
    const storageText = saving ? 'Your current attempt, completed answers and scores stay in this browser. Choose Retry to start again. No score is sent to Poker Gym.'
      : 'Saving unavailable. Keep a note of your scores before closing this page.';
    if (storage.textContent !== storageText) storage.textContent = storageText;
    retry.hidden = done !== cards.length;
    if (share) {
      share.hidden = done !== cards.length;
      if (done !== cards.length) {
        shareText.hidden = true;
        shareStatus.textContent = '';
      }
    }
  }
  if (share) share.onclick = async () => {
    if (results.filter(value => value !== undefined).length !== cards.length) return;
    const correct = results.filter(value => value === true).length;
    const revealed = results.filter(value => value === 'revealed').length;
    const text = `Poker Gym blackjack pack 01: ${correct}/5 correct (${revealed} revealed before choosing).\nFree five-decision practice, no signup or real-money wagering. Try the same drill:\nhttps://playpokergym.com/guides/weekly-01/?ref=share`;
    shareText.value = text;
    shareText.hidden = false;
    shareStatus.textContent = 'Review the text below. Nothing is posted automatically.';
    try {
      await navigator.clipboard.writeText(text);
      shareStatus.textContent = 'Copied. Paste only where sharing is welcome. Nothing was posted.';
    } catch {
      shareStatus.textContent = 'Copy unavailable. Select and copy the text below to share it yourself.';
      shareText.focus();
      shareText.select();
    }
  };
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
        chosen[index] = move;
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
        : `Resumed: ${chosen[index] ? 'you chose ' + chosen[index] + '; ' : ''}${results[index] ? 'correct' : 'review the explanation'}.`;
      details.open = true;
    }
  });
  retry.onclick = () => {
    results = [];
    chosen = [];
    saveAttempt();
    cards.forEach(card => {
      card.querySelector('details').open = false;
      card.querySelector('.decision-result').textContent = '';
      card.querySelectorAll('button').forEach(button => { button.disabled = false; });
    });
    render();
    cards[0].querySelector('button').focus();
  };
  const feedback = document.getElementById('pack-feedback');
  // Older cached HTML can load the updated asset during a deployment.
  if (!feedback) { render(); return; }
  const draft = document.getElementById('pack-feedback-draft');
  const review = document.getElementById('pack-feedback-review');
  const copyFeedback = document.getElementById('pack-feedback-copy');
  const copyStatus = document.getElementById('pack-feedback-copy-status');
  if (copyFeedback && copyStatus) copyFeedback.onclick = async () => {
    try {
      await navigator.clipboard.writeText(draft.value);
      copyStatus.textContent = 'Copied your edited draft. Paste it into a feedback conversation you choose. Nothing was sent.';
    } catch {
      copyStatus.textContent = 'Copy unavailable. Select and copy the draft below. Nothing was sent.';
      draft.focus();
      draft.select();
    }
  };
  function updateDraftLinks() {
    const body = encodeURIComponent(draft.value.slice(0, 1800));
    const subject = encodeURIComponent('Poker Gym drill pack 01 feedback');
    document.getElementById('pack-feedback-email').href =
      `mailto:wesleympennock@gmail.com?subject=${subject}&body=${body}`;
    document.getElementById('pack-feedback-github').href =
      `https://github.com/MeepTheTendie/pokergym/issues/new?title=${subject}&body=${body}`;
  }
  feedback.hidden = false;
  feedback.addEventListener('submit', event => {
    event.preventDefault();
    draft.value = [
      'Poker Gym voluntary drill pack 01 feedback',
      saved ? `First completed score: ${saved.first.correct}/5 (${saved.first.revealed} revealed before choosing).` : 'No completed score available.',
      saved ? `Latest completed score: ${saved.latest.correct}/5 (${saved.latest.revealed} revealed before choosing).` : '',
      '',
      `Useful or unclear: ${document.getElementById('pack-note').value.slice(0, 400).trim() || '(no comment)'}`,
    ].filter((line, index) => line || index === 3).join('\n');
    updateDraftLinks();
    if (copyStatus) copyStatus.textContent = '';
    review.hidden = false;
    draft.focus();
  });
  draft.addEventListener('input', () => {
    updateDraftLinks();
    if (copyStatus) copyStatus.textContent = '';
  });
  render();
})();
