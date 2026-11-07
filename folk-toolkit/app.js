// ═══════════════════════════════════════════════════════
// folk-toolkit/app.js
// 只留「宮廟專屬」的知識庫內容 + 初始化共用 RegionMap
// ═══════════════════════════════════════════════════════

var rm = new RegionMap({
  dataUrl: './data.json',
  containerId: 'temple-grid',
  mapId: 'map',
  cardClass: 'item-card',
  fields: { name: 'name', category: 'god', region: 'region', note: 'note', url: 'url' }
});
rm.init();

// 頁籤切換
document.querySelectorAll('.tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'map') {
      setTimeout(function() { rm.refreshMap(); }, 100);
    }
  });
});

// 年曆
document.getElementById('calendar-content').innerHTML =
  '<h3 style="color:#58A6FF;font-size:16px;margin-bottom:8px;">農曆三月：媽祖遶境</h3>' +
  '<p style="color:#C9D1D9;line-height:1.9;">「三月瘋媽祖」是漢人民俗最盛大的活動之一。大甲鎮瀾宮媽祖遶境進香，九天八夜、全程逾300公里。</p>' +
  '<h3 style="color:#58A6FF;font-size:16px;margin:16px 0 8px;">王船祭（三年一科）</h3>' +
  '<p style="color:#C9D1D9;line-height:1.9;">台南安定長興宮「瘟王祭」是歷史悠久的王船祭典，每逢丑、辰、未、戌年舉行。東港東隆宮、小琉球三隆宮也是著名王船祭廟宇。</p>' +
  '<h3 style="color:#58A6FF;font-size:16px;margin:16px 0 8px;">原住民歲時祭儀</h3>' +
  '<p style="color:#C9D1D9;line-height:1.9;">阿美族豐年祭（7-10月）、布農族射耳祭（3-5月）、排灣族五年祭（五年一次）等。</p>';

// 知識庫
var knowledgeTopics = [
  '遶境進香：媽祖鑾轎出巡，信眾跟隨徒步',
  '鑽轎底：信眾匍匐穿過神轎下方，祈求平安',
  '王船祭：送王船燒化（遊天河）或放水流（遊地河）',
  '陣頭：宋江陣、八家將、官將首、舞龍舞獅',
  '普渡：農曆七月的中元普渡，祭拜好兄弟',
  '安太歲：犯太歲者到廟裡安奉太歲星君',
  '點光明燈：祈求一整年光明順遂',
  '拜拜順序：天公爐→主神→配祀神→虎爺',
  '擲筊：以筊杯請示神明，一正一反為「聖筊」',
  '廟宇建築：燕尾脊、龍柱、石獅、藻井的意義'
];
document.getElementById('knowledge-content').innerHTML = knowledgeTopics.map(function(t, i) {
  return '<div style="background:#0D1117;border:1px solid #2D303A;border-radius:6px;padding:10px 14px;margin-bottom:8px;color:#C9D1D9;font-size:13px;">' + (i+1) + '. ' + t + '</div>';
}).join('');
