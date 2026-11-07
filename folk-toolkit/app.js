var temples = [];
var currentRegion = '全部';
var map = null;
var markers = [];
var searchInput = document.getElementById('search-input');
var templeGrid = document.getElementById('temple-grid');
var resultCount = document.getElementById('result-count');
var regionBarTemples = document.getElementById('region-bar-temples');
var regionBarMap = document.getElementById('region-bar-map');
var mapCount = document.getElementById('map-count');

function renderRegions() {
  var regions = ['全部', '台灣', '華北', '華東', '華南'];
  var html = '';
  regions.forEach(function(r) {
    html += '<button class="region-btn' + (r === currentRegion ? ' active' : '') + '" data-region="' + r + '">' + r + '</button>';
  });
  regionBarTemples.innerHTML = html;
  regionBarMap.innerHTML = html;
  // 綁定事件
  document.querySelectorAll('.region-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      currentRegion = btn.dataset.region;
      renderRegions();
      renderTemples(getFilteredTemples());
      if (map) renderMap(getFilteredTemples());
    });
  });
}

function getFilteredTemples() {
  var q = searchInput.value.trim().toLowerCase();
  return temples.filter(function(t) {
    var matchRegion = currentRegion === '全部' || (t.region || '台灣') === currentRegion;
    var matchQ = !q || t.name.toLowerCase().indexOf(q) >= 0
                 || t.god.toLowerCase().indexOf(q) >= 0
                 || (t.area || '').toLowerCase().indexOf(q) >= 0;
    return matchRegion && matchQ;
  });
}

function renderTemples(list) {
  templeGrid.innerHTML = '';
  list.forEach(function(t) {
    var div = document.createElement('div');
    div.className = 'temple';
    var html = '<div class="name">' + t.name + '</div>';
    html += '<div class="god">主神：' + t.god + '</div>';
    html += '<div class="region">' + (t.area || '') + (t.region && t.region !== '台灣' ? ' · ' + t.region : '') + '</div>';
    if (t.note) html += '<div class="note">' + t.note + '</div>';
    if (t.url) html += '<div class="link"><a href="' + t.url + '" target="_blank" rel="noopener">官方網站 →</a></div>';
    div.innerHTML = html;
    templeGrid.appendChild(div);
  });
  resultCount.textContent = '共 ' + list.length + ' 間宮廟（' + currentRegion + '）';
}

function renderMap(list) {
  if (!map) {
    map = L.map('map').setView([23.5, 121.0], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map);
  }
  markers.forEach(function(m) { map.removeLayer(m); });
  markers = [];
  var valid = list.filter(function(t) { return t.lat && t.lng; });
  valid.forEach(function(t) {
    var m = L.marker([t.lat, t.lng]).addTo(map);
    var popup = '<strong>' + t.name + '</strong><br>主神：' + t.god + '<br>' + (t.area || '');
    if (t.note) popup += '<br><small>' + t.note + '</small>';
    if (t.url) popup += '<br><a href="' + t.url + '" target="_blank">官方網站</a>';
    m.bindPopup(popup);
    markers.push(m);
  });
  if (valid.length > 0) {
    var group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.1));
  }
  mapCount.textContent = '地圖上有 ' + valid.length + ' 間宮廟（有座標）（' + currentRegion + '）';
}

fetch('./data.json')
  .then(function(r) { return r.json(); })
  .then(function(data) {
    temples = data.temples || [];
    // 補預設 area（如果沒有，用 region 代替）
    temples.forEach(function(t) {
      if (!t.area && t.region) t.area = t.region;
      if (!t.region) t.region = '台灣';
    });
    renderRegions();
    renderTemples(getFilteredTemples());
  })
  .catch(function(err) {
    resultCount.textContent = '載入失敗：' + err.message;
  });

searchInput.addEventListener('input', function() {
  renderTemples(getFilteredTemples());
});

// 頁籤切換
document.querySelectorAll('.tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'map') {
      setTimeout(function() { if (map) map.invalidateSize(); }, 100);
      renderMap(getFilteredTemples());
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
