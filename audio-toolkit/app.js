var audioCtx = null;
var tracks = [];
var playing = false;
var startTime = 0;
var playTimer = null;
var totalDuration = 0;

var fileInput = document.getElementById('file-input');
var statusEl = document.getElementById('status');
var timeInfo = document.getElementById('time-info');
var tracksEl = document.getElementById('tracks');
var trackLanes = document.getElementById('track-lanes');
var rulerEl = document.getElementById('ruler');
var playheadEl = document.getElementById('playhead');
var btnPlay = document.getElementById('btn-play');
var btnStop = document.getElementById('btn-stop');
var btnClear = document.getElementById('btn-clear');
var btnExport = document.getElementById('btn-export');

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function fmtTime(s) {
  var m = Math.floor(s / 60);
  var sec = (s % 60).toFixed(2);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

function computePeaks(buf, width) {
  var data = buf.getChannelData(0);
  var step = Math.floor(data.length / width);
  var result = [];
  for (var i = 0; i < width; i++) {
    var min = 1.0, max = -1.0;
    var start = i * step;
    var end = Math.min(start + step, data.length);
    for (var j = start; j < end; j++) {
      var v = data[j];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    result.push([min, max]);
  }
  return result;
}

function drawTrackWave(canvas, buffer) {
  var ctx = canvas.getContext('2d');
  var w = canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
  var h = canvas.height = 50 * (window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#161B22';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#2D303A';
  ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();
  var peaks = computePeaks(buffer, w);
  ctx.fillStyle = '#D4AF37';
  for (var i = 0; i < peaks.length; i++) {
    var p = peaks[i];
    var yMin = h/2 - p[1] * h/2 * 0.9;
    var yMax = h/2 - p[0] * h/2 * 0.9;
    ctx.fillRect(i, yMin, 1, yMax - yMin);
  }
}

function updateTotalDuration() {
  totalDuration = 0;
  tracks.forEach(function(t) {
    if (t.buffer && t.buffer.duration > totalDuration) totalDuration = t.buffer.duration;
  });
  // 畫時間軸尺標
  rulerEl.innerHTML = '';
  if (totalDuration > 0) {
    var step = totalDuration > 300 ? 30 : totalDuration > 60 ? 10 : 5;
    for (var s = 0; s <= totalDuration; s += step) {
      var tick = document.createElement('div');
      tick.className = 'tick';
      tick.style.left = (s / totalDuration * 100) + '%';
      tick.textContent = fmtTime(s);
      rulerEl.appendChild(tick);
    }
  }
  // 畫軌道 lanes
  trackLanes.innerHTML = '';
  tracks.forEach(function(t, i) {
    var lane = document.createElement('div');
    lane.style.position = 'relative';
    lane.style.height = '50px';
    lane.style.marginBottom = '4px';
    lane.style.background = '#0D1117';
    lane.style.borderRadius = '4px';
    lane.style.overflow = 'hidden';
    // clip 區塊
    var clipStart = t.start || 0;
    var clipEnd = (t.start || 0) + (t.buffer ? t.buffer.duration : 0);
    if (totalDuration > 0) {
      var left = (clipStart / totalDuration * 100) + '%';
      var width = ((clipEnd - clipStart) / totalDuration * 100) + '%';
      var clip = document.createElement('div');
      clip.style.position = 'absolute';
      clip.style.left = left;
      clip.style.width = width;
      clip.style.top = '4px';
      clip.style.bottom = '4px';
      clip.style.background = 'rgba(212,175,55,0.2)';
      clip.style.border = '1px solid #D4AF37';
      clip.style.borderRadius = '4px';
      clip.textContent = t.name;
      clip.style.fontSize = '10px';
      clip.style.color = '#D4AF37';
      clip.style.padding = '2px 4px';
      lane.appendChild(clip);
    }
    trackLanes.appendChild(lane);
  });
  timeInfo.textContent = '總時長：' + fmtTime(totalDuration);
}

function renderTracks() {
  tracksEl.innerHTML = '';
  tracks.forEach(function(t, i) {
    var div = document.createElement('div');
    div.className = 'track';
    // 名稱
    var info = document.createElement('div');
    info.className = 'info';
    info.innerHTML = '<div class="name">' + t.name + '</div><div class="meta">' + (t.buffer ? fmtTime(t.buffer.duration) + ' · ' + t.buffer.numberOfChannels + 'ch' : '') + '</div>';
    div.appendChild(info);
    // 波形
    var canvas = document.createElement('canvas');
    if (t.buffer) drawTrackWave(canvas, t.buffer);
    div.appendChild(canvas);
    // 控制
    var ctrl = document.createElement('div');
    ctrl.className = 'controls';
    // volume
    var vol = document.createElement('input');
    vol.type = 'range'; vol.min = '0'; vol.max = '2'; vol.step = '0.1'; vol.value = '1';
    vol.title = '音量';
    vol.addEventListener('input', function() { t.volume = parseFloat(vol.value); });
    ctrl.appendChild(vol);
    // mute
    var muteBtn = document.createElement('button');
    muteBtn.className = 'btn gray';
    muteBtn.textContent = 'M';
    muteBtn.title = '靜音';
    muteBtn.addEventListener('click', function() { t.mute = !t.mute; muteBtn.style.background = t.mute ? '#F85149' : '#2D303A'; });
    ctrl.appendChild(muteBtn);
    // solo
    var soloBtn = document.createElement('button');
    soloBtn.className = 'btn gray';
    soloBtn.textContent = 'S';
    soloBtn.title = '獨奏';
    soloBtn.addEventListener('click', function() { t.solo = !t.solo; soloBtn.style.background = t.solo ? '#3FB950' : '#2D303A'; });
    ctrl.appendChild(soloBtn);
    // delete
    var delBtn = document.createElement('button');
    delBtn.className = 'btn red';
    delBtn.textContent = '✕';
    delBtn.title = '刪除';
    delBtn.addEventListener('click', function() { tracks.splice(i, 1); renderTracks(); updateTotalDuration(); });
    ctrl.appendChild(delBtn);
    div.appendChild(ctrl);
    tracksEl.appendChild(div);
  });
  btnPlay.disabled = tracks.length === 0;
  btnStop.disabled = tracks.length === 0;
  btnClear.disabled = tracks.length === 0;
  btnExport.disabled = tracks.length === 0;
}

fileInput.addEventListener('change', async function(e) {
  var files = Array.from(e.target.files);
  if (files.length === 0) return;
  statusEl.textContent = '解碼 ' + files.length + ' 個檔案...';
  var ctx = getCtx();
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    try {
      var ab = await f.arrayBuffer();
      var buf = await ctx.decodeAudioData(ab.slice(0));
      tracks.push({ name: f.name, buffer: buf, volume: 1, pan: 0, mute: false, solo: false, start: 0 });
      statusEl.textContent = '已載入 ' + tracks.length + ' 軌';
    } catch (err) {
      statusEl.textContent = '無法解碼 ' + f.name + '：' + err.message;
    }
  }
  renderTracks();
  updateTotalDuration();
});

btnPlay.addEventListener('click', async function() {
  if (tracks.length === 0) return;
  var ctx = getCtx();
  if (ctx.state === 'suspended') await ctx.resume();
  stopAll();
  var hasSolo = tracks.some(function(t) { return t.solo; });
  startTime = ctx.currentTime;
  tracks.forEach(function(t) {
    if (!t.buffer) return;
    if (t.mute) return;
    if (hasSolo && !t.solo) return;
    var src = ctx.createBufferSource();
    src.buffer = t.buffer;
    var gain = ctx.createGain();
    gain.gain.value = t.volume;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    t._src = src;
    t._gain = gain;
  });
  playing = true;
  playheadEl.style.display = 'block';
  tickPlayhead();
});

function tickPlayhead() {
  if (!playing) return;
  var elapsed = getCtx().currentTime - startTime;
  if (elapsed > totalDuration) { stopAll(); return; }
  var pct = totalDuration > 0 ? (elapsed / totalDuration * 100) : 0;
  playheadEl.style.left = pct + '%';
  timeInfo.textContent = '時間：' + fmtTime(elapsed) + ' / ' + fmtTime(totalDuration);
  playTimer = requestAnimationFrame(tickPlayhead);
}

function stopAll() {
  tracks.forEach(function(t) { if (t._src) { try { t._src.stop(); } catch(e) {} t._src = null; } });
  playing = false;
  playheadEl.style.display = 'none';
  if (playTimer) { cancelAnimationFrame(playTimer); playTimer = null; }
}

btnStop.addEventListener('click', stopAll);
btnClear.addEventListener('click', function() { tracks = []; renderTracks(); updateTotalDuration(); });

btnExport.addEventListener('click', async function() {
  if (tracks.length === 0) return;
  statusEl.textContent = '匯出中（OfflineAudioContext 渲染）...';
  var sampleRate = 44100;
  var offline = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);
  var hasSolo = tracks.some(function(t) { return t.solo; });
  tracks.forEach(function(t) {
    if (!t.buffer) return;
    if (t.mute) return;
    if (hasSolo && !t.solo) return;
    var src = offline.createBufferSource();
    src.buffer = t.buffer;
    var gain = offline.createGain();
    gain.gain.value = t.volume;
    src.connect(gain);
    gain.connect(offline.destination);
    src.start(0);
  });
  try {
    var rendered = await offline.startRendering();
    var wav = encodeWav(rendered);
    var blob = new Blob([wav], { type: 'audio/wav' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'ahpal-mix-' + Date.now() + '.wav';
    a.click();
    URL.revokeObjectURL(url);
    statusEl.textContent = '匯出完成！WAV 已下載。';
  } catch (err) {
    statusEl.textContent = '匯出失敗：' + err.message;
  }
});

function encodeWav(buffer) {
  var numCh = buffer.numberOfChannels;
  var len = buffer.length;
  var sampleRate = buffer.sampleRate;
  var bytesPerSample = 2;
  var blockAlign = numCh * bytesPerSample;
  var byteRate = sampleRate * blockAlign;
  var dataSize = len * blockAlign;
  var bufferSize = 44 + dataSize;
  var ab = new ArrayBuffer(bufferSize);
  var view = new DataView(ab);
  function writeStr(offset, str) { for (var i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); }
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  var channels = [];
  for (var c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c));
  var offset = 44;
  for (var i = 0; i < len; i++) {
    for (var c = 0; c < numCh; c++) {
      var s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
  }
  return ab;
}
