// No network, storage, identity, or gameplay data is collected here.
export function feedbackDraft({ clarity, returnInterest, priceInterest, note = '' }) {
  if (!['clear', 'confusing'].includes(clarity)
      || !['yes', 'maybe', 'no'].includes(returnInterest)
      || !['interested', 'unsure', 'free-only'].includes(priceInterest)) {
    throw new Error('Choose all three feedback answers.');
  }
  const body = [
    'Poker Gym voluntary player feedback',
    `First session: ${clarity}`,
    `Return for short training: ${returnInterest}`,
    `Possible US$5/month weekly drills + deeper review: ${priceInterest}`,
    'This is feedback on a possible offer, not a purchase or subscription.',
    '',
    `Confusing or missing: ${String(note).slice(0, 400).trim() || '(no comment)'}`,
  ].join('\n');
  return {
    body,
    href: `mailto:wesleympennock@gmail.com?subject=${encodeURIComponent('Poker Gym player feedback')}&body=${encodeURIComponent(body)}`,
  };
}
