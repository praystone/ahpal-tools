// ═══════════════════════════════════════════════════════
// 共用骨架：地區切換 + 地圖 + 資料卡渲染
// 適用：民俗大全、美食探索、祕境探索（任何「地區 × 分類 × 資料庫」）
// 用法：new RegionMap({ dataUrl, containerId, mapId, cardClass, fields })
// ═══════════════════════════════════════════════════════

function RegionMap(opts) {
  this.dataUrl = opts.dataUrl;
  this.containerId = opts.containerId;
  this.mapId = opts.mapId;
  this.cardClass = opts.cardClass || 'item-card';
  this.fields = opts.fields || { name: 'name', category: 'god', region: 'region', note: 'note', url: 'url' };
  this.data = [];
  this.currentRegion = '全部';
  this.map = null;
  this.markers = [];
  this.searchInput = null;
  this.gridEl = null;
  this.countEl = null;
  this.regionBarEl = null;
  this.mapRegionBarEl = null;
  this.mapCountEl = null;
}

RegionMap.prototype.init = function() {
  var self = this;
  this.gridEl = document.getElementById(this.containerId);
  this.countEl = document.getElementById(this.containerId + '-count');
  this.regionBarEl = document.getElementById(this.containerId + '-regions');
  this.mapRegionBarEl = document.getElementById(this.mapId + '-regions');
  this.mapCountEl = document.getElementById(this.mapId + '-count');
  this.searchInput = document.getElementById(this.containerId + '-search');

  fetch(this.dataUrl)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      self.data = data.items || data.temples || [];
      self.data.forEach(function(t) {
        if (!t.region) t.region = '全部';
      });
      self.renderRegions();
      self.renderList(self.getFiltered());
    })
    .catch(function(err) {
      if (self.countEl) self.countEl.textContent = '載入失敗：' + err.message;
    });

  if (this.searchInput) {
    this.searchInput.addEventListener('input', function() {
      self.renderList(self.getFiltered());
    });
  }
};

RegionMap.prototype.getRegions = function() {
  var regions = ['全部'];
  var seen = {};
  this.data.forEach(function(t) {
    if (t.region && !seen[t.region]) {
      seen[t.region] = true;
      regions.push(t.region);
    }
  });
  return regions;
};

RegionMap.prototype.renderRegions = function() {
  var self = this;
  var regions = this.getRegions();
  var html = '';
  regions.forEach(function(r) {
    html += '<button class="region-btn' + (r === self.currentRegion ? ' active' : '') + '" data-region="' + r + '">' + r + '</button>';
  });
  if (this.regionBarEl) this.regionBarEl.innerHTML = html;
  if (this.mapRegionBarEl) this.mapRegionBarEl.innerHTML = html;
  document.querySelectorAll('.region-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      self.currentRegion = btn.dataset.region;
      self.renderRegions();
      self.renderList(self.getFiltered());
      if (self.map) self.renderMap(self.getFiltered());
    });
  });
};

RegionMap.prototype.getFiltered = function() {
  var self = this;
  var q = this.searchInput ? this.searchInput.value.trim().toLowerCase() : '';
  return this.data.filter(function(t) {
    var matchRegion = self.currentRegion === '全部' || t.region === self.currentRegion;
    var f = self.fields;
    var matchQ = !q
      || (t[f.name] || '').toLowerCase().indexOf(q) >= 0
      || (t[f.category] || '').toLowerCase().indexOf(q) >= 0
      || (t[f.region] || '').toLowerCase().indexOf(q) >= 0
      || (t[f.note] || '').toLowerCase().indexOf(q) >= 0;
    return matchRegion && matchQ;
  });
};

RegionMap.prototype.renderList = function(list) {
  var self = this;
  this.gridEl.innerHTML = '';
  var f = this.fields;
  list.forEach(function(t) {
    var div = document.createElement('div');
    div.className = self.cardClass;
    var html = '<div class="name">' + (t[f.name] || '') + '</div>';
    html += '<div class="category">' + (t[f.category] || '') + '</div>';
    html += '<div class="region">' + (t[f.region] || '') + '</div>';
    if (t[f.note]) html += '<div class="note">' + t[f.note] + '</div>';
    if (t[f.url]) html += '<div class="link"><a href="' + t[f.url] + '" target="_blank" rel="noopener">官方連結 →</a></div>';
    div.innerHTML = html;
    div.style.cursor = 'pointer';
    div.dataset.idx = self.data.indexOf(t);
    div.addEventListener('click', function() { self.openDetail(t); });
    self.gridEl.appendChild(div);
  });
  if (this.countEl) this.countEl.textContent = '共 ' + list.length + ' 項（' + this.currentRegion + '）';
};

RegionMap.prototype.renderMap = function(list) {
  var self = this;
  if (!this.map) {
    this.map = L.map(this.mapId).setView([23.5, 121.0], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(this.map);
  }
  this.markers.forEach(function(m) { self.map.removeLayer(m); });
  this.markers = [];
  var valid = list.filter(function(t) { return t.lat && t.lng; });
  valid.forEach(function(t) {
    var m = L.marker([t.lat, t.lng]).addTo(self.map);
    var popup = '<strong>' + (t[self.fields.name] || '') + '</strong><br>' + (t[self.fields.category] || '');
    if (t[self.fields.note]) popup += '<br><small>' + t[self.fields.note] + '</small>';
    if (t[self.fields.url]) popup += '<br><a href="' + t[self.fields.url] + '" target="_blank">官方連結</a>';
    m.bindPopup(popup);
    self.markers.push(m);
  });
  if (valid.length > 0) {
    var group = L.featureGroup(this.markers);
    this.map.fitBounds(group.getBounds().pad(0.1));
  }
  if (this.mapCountEl) this.mapCountEl.textContent = '地圖上有 ' + valid.length + ' 項（有座標）（' + this.currentRegion + '）';
};

RegionMap.prototype.refreshMap = function() {
  if (this.map) this.map.invalidateSize();
  this.renderMap(this.getFiltered());
};

RegionMap.prototype.openDetail = function(t) {
  var self = this;
  var f = this.fields;
  var name = t[f.name] || '';
  var cat  = t[f.category] || '';
  var reg  = t[f.region] || '';
  var body = t.detail || ('<p>' + (t[f.note] || '（尚無詳細內容）') + '</p>');

  var old = document.getElementById('rm-detail-modal');
  if (old) old.remove();

  var wrap = document.createElement('div');
  wrap.id = 'rm-detail-modal';
  wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
  wrap.addEventListener('click', function(e) { if (e.target === wrap) wrap.remove(); });

  var box = document.createElement('div');
  box.style.cssText = 'background:#161B22;border:1px solid #D4AF37;border-radius:12px;max-width:760px;width:100%;max-height:85vh;overflow-y:auto;padding:24px 28px;color:#E6EDF3;line-height:1.9;position:relative;';

  var closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'position:absolute;top:12px;right:14px;background:transparent;border:1px solid #D4AF37;color:#D4AF37;border-radius:6px;width:32px;height:32px;cursor:pointer;font-size:16px;';
  closeBtn.addEventListener('click', function() { wrap.remove(); });

  var meta = '<div style="color:#58A6FF;font-size:13px;margin-bottom:12px;">' + cat + (cat && reg ? '｜' : '') + reg + '</div>';
  var content = '<div class="rm-detail-body" style="font-size:14px;">' + body + '</div>';

  box.innerHTML = meta + content;
  box.appendChild(closeBtn);
  wrap.appendChild(box);
  document.body.appendChild(wrap);

  // Esc 關閉
  var esc = function(e) { if (e.key === 'Escape') { wrap.remove(); document.removeEventListener('keydown', esc); } };
  document.addEventListener('keydown', esc);
};

// 全域掛載（讓 index.html 可以直接 new RegionMap）
window.RegionMap = RegionMap;
