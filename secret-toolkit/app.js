var rm = new RegionMap({
  dataUrl: './data.json',
  containerId: 'secret-grid',
  mapId: 'map',
  cardClass: 'item-card',
  fields: { name: 'name', category: 'type', region: 'region', note: 'note', url: 'url' }
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
  '喀斯特地貌：石灰岩溶蝕，桂林、陽朔',
  '丹霞地貌：紅色砂礫岩，武夷山、丹霞山',
  '石英砂岩峰林：張家界、天子山',
  '火山口湖：長白山天池、五大連池',
  '冰川地貌：玉龍雪山、稻城亞丁',
  '珊瑚礁海岸：墾丁、澎湖',
  '高山雲海：阿里山、黃山、泰山',
  '原始森林：神農架、額濟納胡楊林'
];
document.getElementById('knowledge-content').innerHTML = knowledgeTopics.map(function(t, i) {
  return '<div style="background:#0D1117;border:1px solid #2D303A;border-radius:6px;padding:10px 14px;margin-bottom:8px;color:#C9D1D9;font-size:13px;">' + (i+1) + '. ' + t + '</div>';
}).join('');
