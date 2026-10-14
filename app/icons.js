// Local pen illustrations: curved silhouettes, fine hatching and quiet ink shadows.
const shapes = {
  hero:'<path d="M8 5c2-3 7-3 8 1-3 2-5 1-8 2V5ZM5 20c3-1 4-2 7 0 3-2 5-1 7 0-4 2-10 2-14 0Z" fill="currentColor" fill-opacity=".14" stroke="none"/><path d="M7 8C6 1 18 1 17 8l-1 5c-1 3-7 3-8 0L7 8Zm2 7c-1 2-5 2-6 5 4 2 14 2 18 0-1-3-5-3-6-5M8 7c3 1 5-1 6-3 0 3 2 4 3 5"/><path d="M5 20c2-3 3-1 7 0 4-1 5-3 7 0" stroke-width=".7"/>',
  book:'<path d="M3 5c3-1 6-1 8 1v13c-3-2-5-2-7-2L3 5Z" fill="currentColor" fill-opacity=".14" stroke="none"/><path d="M12 5C9 2 5 3 2 4l1 15c3-1 6 0 9 2 3-2 6-3 9-2l1-15c-3-1-7-2-10 1Zm0 0v16M4 7c2-1 4 0 6 1m-6 3c2-1 4 0 6 1m4-4c2-1 4-2 6-1m-6 5c2-1 4-2 6-1"/><path d="M5 15c2 0 3 0 5 1m4 0c2-1 3-1 5-1" stroke-width=".7"/>',
  notes:'<path d="M10 12c2-5 5-7 10-9-2 5-5 8-10 9Z" fill="currentColor" fill-opacity=".14" stroke="none"/><path d="M5 20C6 12 9 5 21 2c0 9-5 15-12 14M3 22 17 6M9 14l-1-5m5 1 5-1"/><path d="M4 16c-3 0-3 5 0 5h5m5-3h6m-7 3h7" stroke-width=".8"/>',
  scroll:'<path d="M6 3c-4 0-4 5-1 5h3M6 3h12c-3 0-3 3-3 7v8c0 4-8 4-8 0V7c0-3-1-4-1-4Zm9 15h6c0 4-8 4-10 3M10 7h3m-3 4h3m-3 4h3"/>',
  swords:'<path d="M4 2c0 5 6 12 12 17l3-3C14 10 7 4 4 2Zm16 0c-1 4-3 6-6 9m-4 3-5 5-2-2 5-6M12 18c2-2 4-4 7-5M5 13c3 1 5 3 7 5M17 20l3 2m-15-2-2 2"/><path d="m7 7 8 9m2-9-2 3" stroke-width=".7"/>',
  sword:'<path d="M8 15c3-5 6-9 11-12-2 5-6 10-11 12Z" fill="currentColor" fill-opacity=".14" stroke="none"/><path d="M20 2c-7 2-11 8-15 14l3 3c5-4 10-10 12-17ZM3 13c3 0 6 4 7 7M6 18l-3 4m-1-1 2 2"/><path d="m8 15 9-10" stroke-width=".7"/>',
  bow:'<path d="M5 2c1 5 8 5 10 10s-3 9 0 10M5 2l10 20M2 19 20 5m-5 0h5v5M3 16l2 5m-3-2 5 2"/><path d="M6 4c1 4 7 5 8 9" stroke-width=".7"/>',
  shield:'<path d="M12 3C9 5 5 5 3 5c-1 8 2 13 9 17 7-4 10-9 9-17-3 0-6 0-9-2Z"/><path d="M12 6C10 7 7 8 6 7c0 6 1 9 6 12 5-3 6-6 6-12-2 0-4 0-6-1Zm0 1v10" stroke-width=".7"/>',
  helmet:'<path d="M13 5c5 1 7 4 6 9l-1 4-3 1 1-6-3-1V5Z" fill="currentColor" fill-opacity=".14" stroke="none"/><path d="M4 18c1-4-1-11 5-13 7-3 12 3 11 9l-1 5-5 2 1-7-6 1 1 6-6-3ZM7 10l4 2m6-2-3 2M12 5c-1-3 1-4 4-4"/><path d="M6 8c1-2 3-3 5-3m5 12 2-1" stroke-width=".7"/>',
  cloak:'<path d="M13 8c1 3 2 7 5 11l-5 1-2-1c2-4 2-6 2-11Z" fill="currentColor" fill-opacity=".14" stroke="none"/><path d="M8 6c0-6 8-6 8 0 1 5 4 9 6 13-3 3-6 0-9 2-4-3-8 1-11-2 2-4 5-8 6-13Zm0 0c3 3 5 3 8 0M10 10c-1 2-2 5-3 7m7-7c0 2 1 5 3 8"/><path d="M10 5c0-2 3-3 4 0" stroke-width=".7"/>',
  armor:'<path d="M13 8c1 0 3-1 4-3l2 2-1 3-2-1 1 10-4 1V8Z" fill="currentColor" fill-opacity=".14" stroke="none"/><path d="M8 3C6 4 5 6 3 6l1 6 3-1c1 4-1 6-1 9 4 2 8 2 12 0 0-3-2-5-1-9l3 1 1-6c-2 0-3-2-5-3-1 5-7 5-8 0ZM8 11c2 2 6 2 8 0M7 16c3 2 7 2 10 0"/><path d="M12 9v10M6 6l1 3m11-3-1 3" stroke-width=".7"/>',
  glove:'<path d="M9 21c-2-3-5-5-5-8 0-2 2-2 3 0l1 1-1-8c0-2 3-2 3 0l1 5V4c0-2 3-2 3 0v7l1-6c0-2 3-1 3 1l-1 6 1-3c1-2 3-1 2 1l-1 8-2 3H9Z"/><path d="M10 17c2 1 4 1 6 0" stroke-width=".7"/>',
  boot:'<path d="M8 3c3 1 7 1 10 0l-1 10c0 2 3 3 4 5 2 4-10 3-16 3-4 0-4-4-1-5l4-2V3ZM8 7c3 1 6 1 10 0M3 18c3 2 10 2 17 1"/><path d="m11 10 4 1m-4 2 3 1" stroke-width=".7"/>',
  ring:'<path d="M8 8c-8 4-4 15 4 14 9-1 10-11 4-14M9 11c-5 3-2 10 4 8M8 5c0-4 8-4 8 0l-2 5h-4L8 5Z"/><path d="M10 4c2-1 3 0 4 1M9 9l-2 2m8-2 2 2" stroke-width=".7"/>',
  amulet:'<path d="M4 2c0 6 2 10 8 12 6-2 8-6 8-12M12 12c7 4 7 10 0 10s-7-6 0-10Z"/><path d="M12 15c-4 3-3 5 0 5s4-2 0-5M6 4l1 3m10-3-1 3" stroke-width=".7"/>',
  bag:'<path d="M14 10c5 3 7 10 2 10h-5c5-2 5-5 3-10Z" fill="currentColor" fill-opacity=".14" stroke="none"/><path d="M8 3c3 1 5 1 8 0l-2 5c5 3 7 7 6 11-2 4-14 4-16 0-1-4 1-8 6-11L8 3ZM8 8c3 1 5 1 8 0M8 10c-3-1-4 1-3 3m10-3c3-1 5 2 4 4"/><path d="M7 15c-2 3-1 4 1 5m8-6c2 2 2 4 0 5" stroke-width=".7"/>',
  chest:'<path d="M17 5c2 1 3 3 3 6l-1 9-3 1V5Z" fill="currentColor" fill-opacity=".14" stroke="none"/><path d="M3 11C1 0 23 0 21 11l-1 10c-5 1-11 1-16 0L3 11Zm0 0c6 1 12 1 18 0M7 4c-1 3 0 5 0 7m10-7c1 3 0 5 0 7M3 16h6m6 0h6"/><path d="M10 13h4v6h-4v-6Z"/><path d="M6 14v5m12-5v5" stroke-width=".7"/>',
  gem:'<path d="M8 3c3-1 7-1 9 1l4 6c-2 5-6 9-9 12-3-3-7-7-10-12l6-7ZM2 10c6 1 12 1 19 0M8 3l4 19 5-18"/>',
  artifact:'<path d="M14 4c6 2 6 11 2 14-2 1-4 1-6 0 6-1 8-7 4-14Z" fill="currentColor" fill-opacity=".14" stroke="none"/><path d="M12 3C4 3 3 16 9 19c3 2 8 1 10-2 3-5 0-14-7-14ZM10 3c-2-2 4-3 5 0M8 20c2 2 6 3 9 0"/><path d="M9 15c-2-5 2-9 5-8 4 2 1 8-2 7-3 0-1-5 1-3M5 5 3 3m18 3 1-2" stroke-width=".8"/>',
  sparkles:'<path d="M12 3c0 6 2 8 8 9-6 0-8 3-8 9 0-6-3-9-9-9 6-1 9-3 9-9Z"/><path d="M20 2c0 2 1 3 3 3-2 0-3 1-3 3 0-2-1-3-3-3 2 0 3-1 3-3M4 18c0 2 1 3 2 3-1 0-2 1-2 2 0-1-1-2-2-2 1 0 2-1 2-3" stroke-width=".8"/>',
  wand:'<path d="M3 21c4-3 7-7 12-13l2 2C12 16 8 19 4 22l-1-1ZM14 3c1 2 3 3 5 2M18 1c-1 2-1 3 1 4m0 0c2-1 3-1 4 0M6 6c0 3 1 4 4 4-3 0-4 1-4 4 0-3-1-4-4-4 3 0 4-1 4-4"/>',
  flame:'<path d="M15 12c5 5 2 10-3 9 4-2 3-5 3-9Z" fill="currentColor" fill-opacity=".14" stroke="none"/><path d="M13 2c3 7-5 8-2 12 3-1 4-4 4-6 5 4 7 9 4 12-4 5-14 2-14-4 0-5 5-7 8-14Z"/><path d="M12 17c-3 3 1 5 3 3 1-2-1-3-1-5" stroke-width=".8"/>',
  leaf:'<path d="M6 17C7 9 12 7 19 4c-1 7-5 11-13 13Z" fill="currentColor" fill-opacity=".14" stroke="none"/><path d="M21 3C9 0 1 9 5 17c5 10 18 1 16-14ZM3 22C9 14 13 9 19 5M7 17c2-1 5 0 8-1M10 13c0-3 0-4 2-6"/><path d="M14 10c2 0 4-1 5-2" stroke-width=".7"/>',
  mask:'<path d="M3 6c3-4 6-1 9 0 3-1 6-4 9 0 1 7-4 9-7 11l-2 4-2-4C7 15 2 13 3 6ZM6 9c2-1 3 0 4 2-2 1-3 0-4-2Zm12 0c-2-1-3 0-4 2 2 1 3 0 4-2ZM10 16c1-1 3-1 4 0"/>',
  eye:'<path d="M2 12C7 3 17 3 22 12 17 21 7 21 2 12ZM8 10c-3 6 7 9 8 3 1-6-7-7-8-3Z"/><path d="M5 5 3 3m8 1V2m8 3 2-2M10 11c0-1 1-2 2-2" stroke-width=".8"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
  heart:'<path d="M19 5c5 7-4 12-7 15 4-5 8-9 7-15Z" fill="currentColor" fill-opacity=".14" stroke="none"/><path d="M12 21C8 18 2 14 2 9 1 2 10 1 12 7c3-6 11-5 10 2 0 5-6 9-10 12Z"/><path d="M5 9c-1-3 2-4 4-3" stroke-width=".7"/>',
  dice:'<path d="m12 2 10 6v9l-10 5-10-5V8l10-6ZM2 8l10 5 10-5M12 13v9M12 2 7 10m5-8 5 8M2 17l10-4 10 4"/>',
  coins:'<path d="M2 6c0-4 13-5 14-1s-13 6-14 1Zm0 0 1 5c1 3 13 2 13-2V5M3 11l1 4c1 2 6 2 10 1M16 11c8 0 8 4 1 5-4 1-8 0-8-2m0 0 1 6c1 3 12 2 12-2v-5"/><path d="M6 6c2-1 5-1 7-1m0 14c2 0 4 0 6-1" stroke-width=".7"/>',
  shop:'<path d="M12 3v17M5 21c4-2 10-2 14 0M3 7c5-3 13-3 18 0M6 6l-4 8h8L6 6Zm12 0-4 8h8l-4-8ZM2 14c1 5 7 5 8 0m4 0c1 5 7 5 8 0"/><path d="M10 3c0-3 4-3 4 0"/>',
  tag:'<path d="M3 3h8l11 11-8 8L3 11V3Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1c-2 2 1 3 0 5m7-3c-3 0-2 3-4 4m8 5c-2-2-3 1-5 0m3 7c0-3-3-2-4-4m-5 8c2-2-1-3 0-5m-7 3c3 0 2-3 4-4m-8-5c2 2 3-1 5 0M3 5c0 3 3 2 4 4" stroke-width="1"/>',
  moon:'<path d="M11 3C1 6 2 20 13 21 4 22-2 7 11 3Z" fill="currentColor" fill-opacity=".14" stroke="none"/><path d="M17 2C2-1-4 20 10 22c6 1 10-2 12-6-11 5-18-9-5-14Z"/><path d="M5 15c0 3 2 5 5 5M19 5c0 2 1 3 3 3-2 0-3 1-3 3 0-2-1-3-3-3 2 0 3-1 3-3" stroke-width=".8"/>',
  camp:'<path d="M3 19C5 14 10 6 12 3c3 3 7 11 9 16-6 2-12 2-18 0ZM9 20c1-4 2-6 3-8 1 2 2 4 3 8M10 2l2 3 2-3M2 22c6-1 14-1 20 0"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 6 6"/>',
  edit:'<path d="M10 12c2-5 5-7 10-9-2 5-5 8-10 9Z" fill="currentColor" fill-opacity=".14" stroke="none"/><path d="M3 22C7 14 9 6 21 2c0 9-4 15-12 15M3 22 18 5M9 16l-1-5m5 0 6-2"/><path d="M11 21c3-1 6-1 10 0" stroke-width=".8"/>',
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
  crown:'<path d="M3 7c3 2 5 4 6 2l3-6 3 6c1 2 3 0 6-2l-3 13c-4-1-8-1-12 0L3 7ZM6 16c4-1 8-1 12 0M7 22c3-1 7-1 10 0"/><circle cx="3" cy="5" r="1"/><circle cx="21" cy="5" r="1"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
  stop:'<rect x="5" y="5" width="14" height="14" rx="2"/>',
  play:'<path d="m7 3 14 9-14 9V3Z"/>',
  pause:'<path d="M8 4v16M16 4v16"/>',
  print:'<path d="M6 8V2h12v6M6 17H2V8h20v9h-4M6 14h12v8H6V14Zm12-3h1"/>',
};

export const iconNames = Object.freeze(Object.keys(shapes));
export function icon(name) {
  const shape = Object.hasOwn(shapes,name) ? shapes[name] : shapes.gem;
  return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${shape}</svg>`;
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
