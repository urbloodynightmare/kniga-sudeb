// A single, local SVG vocabulary: consistent strokes, no icon fonts or network requests.
const shapes = {
  hero:'<circle cx="12" cy="7" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3M8 21h8"/>',
  book:'<path d="M12 5C8 2 4 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-2-1-6-2-10 1Zm0 0v16"/>',
  notes:'<path d="M6 3h13v18H5V7M9 7h6M9 11h6M9 15h4M3 3v13"/>',
  scroll:'<path d="M6 4h13a3 3 0 0 1 3 3v2h-5V7a3 3 0 0 1 2-3M6 4a3 3 0 0 0-3 3v2h3v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-2h-5v2a3 3 0 0 1-6 0V7a3 3 0 0 0-3-3Z"/>',
  swords:'<path d="m4 3 3 1 13 13-3 3L4 7 4 3Zm16 0-3 1-5 5m-3 3-5 5 3 3 5-5M3 14l7 7m4-18 7 7M3 21l3-3m12 0 3 3"/>',
  sword:'<path d="m17 3 4 0 0 4L9 19l-4-4L17 3ZM3 12l9 9M3 21l4-4"/>',
  bow:'<path d="M5 3c11 0 16 5 16 16L5 3Zm0 0L3 21l18-2M3 21 16 8m-5 0h5v5"/>',
  shield:'<path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4Z"/><path d="M12 6v11"/>',
  helmet:'<path d="M4 18v-7a8 8 0 0 1 16 0v7l-5 3v-7H9v7l-5-3ZM5 10l4 2m10-2-4 2M12 3v7"/>',
  cloak:'<path d="M9 3h6l6 17-6 1-3-3-3 3-6-1L9 3Zm0 0 3 4 3-4M8 8l-2 8m10-8 2 8"/>',
  armor:'<path d="m8 3-5 3 2 6 2-1-1 10h12l-1-10 2 1 2-6-5-3a4 4 0 0 1-8 0ZM9 12h6m-7 5h8"/>',
  glove:'<path d="M8 21 4 14V9a2 2 0 0 1 3 0v3-7a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-6a1.5 1.5 0 0 1 3 0v6-4a1.5 1.5 0 0 1 3 0v9l-3 6H8Z"/>',
  boot:'<path d="M8 3h10v10l3 4v4H3v-4l5-3V3ZM8 7h10M3 18h18"/>',
  ring:'<circle cx="12" cy="14" r="7"/><path d="m8 4 4-2 4 2-4 5-4-5Z"/>',
  amulet:'<path d="M5 3c0 6 2 9 7 11 5-2 7-5 7-11M12 11l5 5-5 6-5-6 5-5Z"/>',
  bag:'<path d="M8 3h8l-2 5c5 3 7 6 7 9 0 4-18 4-18 0 0-3 2-6 7-9L8 3ZM8 8h8m-6 6h4"/>',
  chest:'<path d="M3 10V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v3M3 10h18v11H3V10Zm6-7v7m6-7v7M3 14h6m6 0h6"/><rect x="9" y="12" width="6" height="5" rx="1"/>',
  gem:'<path d="m7 3-5 6 10 13L22 9l-5-6H7ZM2 9h20M7 3l5 19 5-19M7 3l5 6 5-6"/>',
  artifact:'<path d="m12 2 8 5v10l-8 5-8-5V7l8-5ZM4 7l8 5 8-5M12 12v10M12 2v5M8 10l4-3 4 3"/>',
  sparkles:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4m-2-2h4M3 18v4m-2-2h4"/>',
  wand:'<path d="m3 19 11-11 3 3L6 22 3 19ZM9 4V1m9 4 3-3M20 12h3M4 10H1"/>',
  flame:'<path d="M13 2c2 7-5 7-2 11 2-1 3-3 3-5 5 4 7 7 5 11-3 5-12 4-14-1-2-5 3-8 8-16Z"/>',
  leaf:'<path d="M20 3C8 1 1 9 5 17s17 0 15-14ZM3 21 16 8m-9 8h6M11 12V7"/>',
  mask:'<path d="M3 5c5 2 13 2 18 0v7c0 5-9 10-9 10s-9-5-9-10V5ZM6 10l4 2-4 1m12-3-4 2 4 1M9 17h6"/>',
  eye:'<path d="M2 12S6 5 12 5s10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
  heart:'<path d="M12 21 3 12C-2 5 7-1 12 6c5-7 14-1 9 6l-9 9Z"/>',
  dice:'<path d="m12 2 10 6v9l-10 5-10-5V8l10-6ZM2 8l10 5 10-5M12 13v9M12 2 7 10m5-8 5 8M2 17l10-4 10 4"/>',
  coins:'<ellipse cx="9" cy="6" rx="7" ry="3"/><path d="M2 6v4c0 4 14 4 14 0V6M2 10v4c0 3 8 4 12 2M6 17v2c0 4 16 4 16 0v-5c0-2-3-3-6-3M6 16c0 4 16 4 16-2"/>',
  shop:'<path d="M3 10v11h18V10M2 10l3-7h14l3 7M2 10c0 4 5 4 5 0 0 4 5 4 5 0 0 4 5 4 5 0 0 4 5 4 5 0M9 21v-6h6v6M8 3l-1 7m9-7 1 7"/>',
  tag:'<path d="M3 3h8l11 11-8 8L3 11V3Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon:'<path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z"/>',
  camp:'<path d="m3 20 9-17 9 17H3Zm5 0 4-8 4 8M10 3l2 4 2-4M2 22h20"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 6 6"/>',
  edit:'<path d="m15 3 6 6M3 21l6-2L22 6l-4-4L5 15l-2 6Z"/>',
  trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  plus:'<path d="M12 4v16M4 12h16"/>',
  minus:'<path d="M4 12h16"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  check:'<path d="m4 12 5 5L20 6"/>',
  chevron:'<path d="m8 4 8 8-8 8"/>',
  down:'<path d="m5 9 7 7 7-7"/>',
  up:'<path d="m5 15 7-7 7 7"/>',
  upload:'<path d="M12 16V2m-5 5 5-5 5 5M3 15v6h18v-6"/>',
  download:'<path d="M12 2v14m-5-5 5 5 5-5M3 15v6h18v-6"/>',
  refresh:'<path d="M20 8a9 9 0 0 0-15-3L2 8m0-6v6h6m-4 8a9 9 0 0 0 15 3l3-3m0 6v-6h-6"/>',
  undo:'<path d="M9 4 3 10l6 6M3 10h11a7 7 0 0 1 7 7v3"/>',
  copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  history:'<path d="M3 8a9 9 0 1 1-1 7M3 3v5h5M12 7v5l3 2"/>',
  door:'<path d="M13 21H3V3h10v5m-4 4h13m-4-4 4 4-4 4M13 16v5"/>',
  crown:'<path d="m2 5 5 5 5-7 5 7 5-5-3 14H5L2 5Zm3 14h14M6 22h12"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
  stop:'<rect x="5" y="5" width="14" height="14" rx="2"/>',
  play:'<path d="m7 3 14 9-14 9V3Z"/>',
  pause:'<path d="M8 4v16M16 4v16"/>',
  print:'<path d="M6 8V2h12v6M6 17H2V8h20v9h-4M6 14h12v8H6V14Zm12-3h1"/>',
};

export const iconNames = Object.freeze(Object.keys(shapes));
export function icon(name) {
  const shape = Object.hasOwn(shapes,name) ? shapes[name] : shapes.gem;
  return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${shape}</svg>`;
}

const actions = {
  account:'hero',edit:'edit','actor-edit':'edit','pool-edit':'edit','feature-edit':'edit','resource-edit':'edit','item-edit':'edit','attack-edit':'edit','note-edit':'edit',
  new:'plus',create:'plus',manage:'crown','item-add':'plus','spell-add':'plus','attack-add':'plus','resource-add':'plus','feature-add':'plus','language-add':'plus','note-new':'plus','new-scene':'plus','add-monster':'plus',manual:'plus',add:'plus',
  delete:'trash','confirm-delete':'trash','item-remove':'trash','attack-remove':'trash','spell-remove':'trash','feature-remove':'trash','resource-remove':'trash','pool-delete':'trash','delete-scene':'trash','delete-room':'trash','note-delete':'trash','note-purge':'trash','remove-member':'trash',remove:'trash',
  import:'upload','import-dataset':'upload','note-import':'upload',export:'download','export-one':'download','export-dataset':'download',template:'download',
  refresh:'refresh','cloud-retry':'refresh','cloud-reload':'refresh','cloud-reload-confirm':'refresh',rotate:'refresh',
  'short-rest':'camp','long-rest':'moon',undo:'undo','note-restore':'undo','note-history':'history',duplicate:'copy','copy-invite':'copy','conflict-copy':'copy','standard-copy':'copy',
  level:'sparkles','learn-spell':'book','custom-spell':'wand','manual-feat':'sparkles',cast:'wand',jackpot:'dice','item-sale':'tag','item-slot-clear':'minus',
  'start-combat':'swords','new-turn':'chevron',start:'play',finish:'stop',next:'chevron','roll-all':'dice',initiative:'dice',percentile:'dice',d10:'dice',
  ready:'check',close:'close',print:'print',logout:'door',leave:'door',join:'door',master:'crown','full-character':'scroll',
};

// Keep the original text and action attributes; icons are decorative only.
export function actionLabel(label, action) {
  const name = action==='start' && label==='Пауза' ? 'pause' : actions[action];
  if (!name || String(label).includes('ui-icon')) return label;
  const text = String(label).replace(/^[+✎✧↥↧↻↶☾☽×⋯]\s*/, '').replace(/\s*[↥↧↗→]+$/, '');
  return icon(name) + (text ? ' ' + text : '');
}
