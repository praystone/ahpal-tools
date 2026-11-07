var temples = [];
var searchInput = document.getElementById('search-input');
var templeGrid = document.getElementById('temple-grid');
var resultCount = document.getElementById('result-count');

function renderTemples(list) {
  templeGrid.innerHTML = '';
  list.forEach(function(t) {
    var div = document.createElement('div');
    div.className = 'temple';
    var html = '<div class="name">' + t.name + '</div>';
    html += '<div class="god">主神：' + t.god + '</div>';
    html += '<div class="region">' + t.region + '</div>';
    if (t.note) html += '<div class="note">' + t.note + '</div>';
    if (t.url) html += '<div class="link"><a href="' + t.url + '" target="_blank" rel="noopener">官方網站 →</a></div>';
    div.innerHTML = html;
    templeGrid.appendChild(div);
  });
  resultCount.textContent = '共 ' + list.length + ' 間宮廟';
}

fetch('./data.json')
  .then(function(r) { return r.json(); })
  .then(function(data) {
    temples = data.temples || [];
    renderTemples(temples);
  })
  .catch(function(err) {
    resultCount.textContent = '載入失敗：' + err.message;
  });

searchInput.addEventListener('input', function() {
  var q = searchInput.value.trim().toLowerCase();
  if (!q) { renderTemples(temples); return; }
  var filtered = temples.filter(function(t) {
    return t.name.toLowerCase().indexOf(q) >= 0
        || t.god.toLowerCase().indexOf(q) >= 0
        || t.region.toLowerCase().indexOf(q) >= 0;
  });
  renderTemples(filtered);
});

// 頁籤切換
document.querySelectorAll('.tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
  });
});

// 年曆（第一階段：三大類）
document.getElementById('calendar-content').innerHTML =
  '<h3 style="color:#58A6FF;font-size:16px;margin-bottom:8px;">農曆三月：媽祖遶境</h3>' +
  '<p style="color:#C9D1D9;line-height:1.9;">「三月瘋媽祖」是台灣最盛大的民俗活動。大甲鎮瀾宮媽祖遶境進香，九天八夜、全程逾300公里，途經台中、彰化、雲林、嘉義[citation:12]。</p>' +
  '<h3 style="color:#58A6FF;font-size:16px;margin:16px 0 8px;">王船祭（三年一科）</h3>' +
  '<p style="color:#C9D1D9;line-height:1.9;">台南安定長興宮「瘟王祭」是台灣最早的王船祭典，每逢丑、辰、未、戌年舉行[citation:4]。東港東隆宮、小琉球三隆宮也是著名王船祭廟宇。</p>' +
  '<h3 style="color:#58A6FF;font-size:16px;margin:16px 0 8px;">原住民歲時祭儀</h3>' +
  '<p style="color:#C9D1D9;line-height:1.9;">阿美族豐年祭（7-10月）、布農族射耳祭（3-5月）、排灣族五年祭（五年一次）等[citation:6]。</p>';

// 知識庫（第一階段：10 篇）
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
