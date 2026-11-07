var rm = new RegionMap({
  dataUrl: './data.json',
  containerId: 'food-grid',
  mapId: 'map',
  cardClass: 'item-card',
  fields: { name: 'name', category: 'cuisine', region: 'region', note: 'note', url: 'url' }
});
rm.init();
document.querySelectorAll('.tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'map') { setTimeout(function() { rm.refreshMap(); }, 100); }
  });
});
var knowledgeTopics = [
  '川菜：麻辣鮮香，花椒與辣椒的藝術',
  '粵菜：清淡鮮美，注重原味與火候',
  '魯菜：鹹鮮為主，講究刀工與高湯',
  '蘇菜：清淡雅致，擅長河鮮與燉燜',
  '浙菜：清爽鮮嫩，講究時令與原味',
  '閩菜：湯菜見長，海鮮與山珍並重',
  '湘菜：香辣濃郁，臘味與剁椒',
  '徽菜：重油重色，擅長燒炖'
];
document.getElementById('knowledge-content').innerHTML = knowledgeTopics.map(function(t, i) {
  return '<div style="background:#0D1117;border:1px solid #2D303A;border-radius:6px;padding:10px 14px;margin-bottom:8px;color:#C9D1D9;font-size:13px;">' + (i+1) + '. ' + t + '</div>';
}).join('');
