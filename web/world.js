// Original tile scenery drawn at native handheld resolution.
export function drawWorld(canvas, title = false) {
  const c = canvas.getContext('2d');
  const ink = '#263c35', grass = '#a8bf86', light = '#dce6b8';
  const rect = (x, y, w, h, color) => { c.fillStyle = color; c.fillRect(x, y, w, h); };
  // Explicit pixel glyphs avoid antialiased 5px system-font lettering.
  const glyphs = { G: ['111','100','101','101','111'], Y: ['101','101','010','010','010'], M: ['10001','11011','10101','10001','10001'] };
  const gymSign = (x, y) => {
    let cursor = x;
    for (const letter of 'GYM') {
      const rows = glyphs[letter];
      rows.forEach((row, py) => [...row].forEach((pixel, px) => {
        if (pixel === '1') rect(cursor + px, y + py, 1, 1, light);
      }));
      cursor += rows[0].length + 1;
    }
  };
  rect(0, 0, 240, canvas.height, grass);
  for (let y = 0; y < canvas.height; y += 8) for (let x = 0; x < 240; x += 8) {
    if ((x / 8 + y / 8) % 3 === 0) {
      rect(x + 2, y + 3, 1, 2, '#839d6c'); rect(x + 4, y + 2, 1, 2, '#839d6c');
    }
  }
  rect(24, 88, 192, 24, '#e7d7a1'); rect(108, 44, 24, 140, '#e7d7a1');
  for (let y = 92; y < 112; y += 8) for (let x = 28; x < 216; x += 12) rect(x, y, 2, 1, '#bda97b');
  rect(168, 138, 64, 56, ink); rect(170, 140, 60, 52, '#719ea0');
  for (let y = 144; y < 190; y += 8) for (let x = 174; x < 228; x += 16) rect(x, y, 9, 1, '#b1d1bb');
  function tree(x, y) {
    rect(x + 7, y + 15, 4, 7, '#786e4f');
    rect(x + 4, y, 10, 3, ink); rect(x + 1, y + 3, 16, 15, ink);
    rect(x + 3, y + 4, 12, 10, '#527858'); rect(x + 6, y + 3, 6, 7, '#86a574');
    rect(x + 4, y + 16, 10, 3, ink);
  }
  for (let x = 0; x < 240; x += 20) { tree(x, 0); tree(x, canvas.height - 23); }
  for (let y = 26; y < canvas.height - 30; y += 25) { tree(0, y); tree(222, y); }
  const homes = [[34, 36], [148, 36], [34, 124], [148, 124]];
  homes.forEach(([x, y], i) => {
    const roof = ['#a45e57', '#6886a2', '#967896', '#b49157'][i];
    rect(x, y + 5, 56, 37, ink); rect(x + 3, y + 19, 50, 20, light);
    rect(x - 2, y + 3, 60, 17, ink); rect(x, y + 4, 56, 13, roof);
    for (let k = 0; k < 3; k++) rect(x, y + 6 + k * 4, 56, 1, '#ffffff35');
    rect(x + 22, y + 27, 12, 15, ink); rect(x + 25, y + 28, 6, 12, '#716d58');
    for (const dx of [7, 40]) { rect(x + dx, y + 24, 9, 9, ink); rect(x + dx + 2, y + 26, 5, 5, '#87b5b6'); }
    rect(x + 18, y + 18, 20, 7, ink);
    if (!title) gymSign(x + 22, y + 19);
  });
}

export function drawTrainerBack(canvas, classId) {
  canvas.width = canvas.height = 48;
  const c = canvas.getContext('2d');
  const shirt = { scholar: '#8b709a', dealer: '#a45e57', countess: '#6886a2', grinder: '#6b885b' }[classId];
  const box = (x, y, w, h, color) => { c.fillStyle = color; c.fillRect(x, y, w, h); };
  box(15, 4, 17, 3, '#263c35'); box(12, 7, 22, 12, '#263c35');
  box(14, 7, 18, 8, '#a45e57'); box(14, 15, 22, 3, '#713f3c');
  box(14, 18, 19, 9, '#263c35'); box(16, 18, 15, 7, '#ddc79d');
  box(18, 25, 10, 4, '#263c35'); box(11, 28, 25, 16, '#263c35');
  box(7, 32, 5, 13, '#263c35'); box(36, 32, 5, 13, '#263c35');
  box(9, 33, 4, 10, shirt); box(35, 33, 4, 10, shirt);
  box(13, 30, 21, 14, shirt); box(16, 31, 15, 15, '#263c35');
  box(18, 32, 11, 12, '#b69865'); box(19, 35, 9, 2, '#dbc69b');
  box(11, 44, 25, 4, '#263c35');
}
