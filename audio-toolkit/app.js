var audioCtx = null;
var tracks = [];
var subtitles = [];
var playing = false;
var startTime = 0;
var playTimer = null;
var totalDuration = 0;
var activeSubIndex = -1;
var coverImage = null;
var recordedBlob = null;
var mediaRecorder = null;
var recordChunks = [];
var recordCanvasStream = null;
var recordAudioDest = null;
var recordAnimId = null;

var fileInput = document.getElementById('file-input');
var statusEl = document.getElementById('status');
var timeInfo = document.getElementById('time-info');
var tracksEl = document.getElementById('tracks');
var trackLanes = document.getElementById('track-lanes');
var rulerEl = document.getElementById('ruler');
var playheadEl = document.getElementById('playhead');
var subLane = document.getElementById('sub-lane');
var subList = document.getElementById('sub-list');
var subInput = document.getElementById('sub-input');
var btnPlay = document.getElementById('btn-play');
var btnStop = document.getElementById('btn-stop');
var btnClear = document.getElementById('btn-clear');
var btnExport = document.getElementById('btn-export');
var btnAddSub = document.getElementById('btn-add-sub');
var btnClearSub = document.getElementById('btn-clear-sub');
var btnExportSrt = document.getElementById('btn-export-srt');
var btnExportVtt = document.getElementById('btn-export-vtt');
var coverInput = document.getElementById('cover-input');
var videoTitle = document.getElementById('video-title');
var renderCanvas = document.getElementById('render-canvas');
var previewVideo = document.getElementById('preview-video');
var btnRecord = document.getElementById('btn-record');
var btnStopRecord = document.getElementById('btn-stop-record');
var btnDownloadWebm = document.getElementById('btn-download-webm');
var btnMp4Cmd = document.getElementById('btn-mp4-cmd');
var recordStatus = document.getElementById('record-status');
var mp4Output = document.getElementById('mp4-output');

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function fmtTime(s) {
  var m = Math.floor(s / 60);
  var sec = (s % 60).toFixed(2);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

function fmtSrtTime(s) {
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  var sec = Math.floor(s % 60);
  var ms = Math.round((s - Math.floor(s)) * 1000);
  function pad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }
  return pad(h,2) + ':' + pad(m,2) + ':' + pad(sec,2) + ',' + pad(ms,3);
}

function fmtVttTime(s) {
  return fmtSrtTime(s).replace(',', '.');
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
  trackLanes.innerHTML = '';
  tracks.forEach(function(t, i) {
    var lane = document.createElement('div');
    lane.className = 'track-lane';
    if (t.buffer && totalDuration > 0) {
      var clipStart = t.start || 0;
      var clipEnd = (t.start || 0) + t.buffer.duration;
      var clip = document.createElement('div');
      clip.className = 'clip';
      clip.style.left = (clipStart / totalDuration * 100) + '%';
      clip.style.width = ((clipEnd - clipStart) / totalDuration * 100) + '%';
      clip.textContent = t.name;
      lane.appendChild(clip);
    }
    trackLanes.appendChild(lane);
  });
  renderSubLane();
  timeInfo.textContent = '總時長：' + fmtTime(totalDuration);
  updateRecordButtons();
}

function renderTracks() {
  tracksEl.innerHTML = '';
  tracks.forEach(function(t, i) {
    var div = document.createElement('div');
    div.className = 'track';
    var info = document.createElement('div');
    info.className = 'info';
    info.innerHTML = '<div class="name">' + t.name + '</div><div class="meta">' + (t.buffer ? fmtTime(t.buffer.duration) + ' · ' + t.buffer.numberOfChannels + 'ch' : '') + '</div>';
    div.appendChild(info);
    var canvas = document.createElement('canvas');
    if (t.buffer) drawTrackWave(canvas, t.buffer);
    div.appendChild(canvas);
    var ctrl = document.createElement('div');
    ctrl.className = 'controls';
    var vol = document.createElement('input');
    vol.type = 'range'; vol.min = '0'; vol.max = '2'; vol.step = '0.1'; vol.value = '1';
    vol.addEventListener('input', function() { t.volume = parseFloat(vol.value); });
    ctrl.appendChild(vol);
    var muteBtn = document.createElement('button');
    muteBtn.className = 'btn gray';
    muteBtn.textContent = 'M';
    muteBtn.addEventListener('click', function() { t.mute = !t.mute; muteBtn.style.background = t.mute ? '#F85149' : '#2D303A'; });
    ctrl.appendChild(muteBtn);
    var soloBtn = document.createElement('button');
    soloBtn.className = 'btn gray';
    soloBtn.textContent = 'S';
    soloBtn.addEventListener('click', function() { t.solo = !t.solo; soloBtn.style.background = t.solo ? '#3FB950' : '#2D303A'; });
    ctrl.appendChild(soloBtn);
    var delBtn = document.createElement('button');
    delBtn.className = 'btn red';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', function() { tracks.splice(i, 1); renderTracks(); updateTotalDuration(); });
    ctrl.appendChild(delBtn);
    div.appendChild(ctrl);
    tracksEl.appendChild(div);
  });
  btnPlay.disabled = tracks.length === 0;
  btnStop.disabled = tracks.length === 0;
  btnClear.disabled = tracks.length === 0;
  btnExport.disabled = tracks.length === 0;
  updateRecordButtons();
}

function renderSubLane() {
  subLane.innerHTML = '';
  subtitles.forEach(function(s, i) {
    if (totalDuration <= 0) return;
    var clip = document.createElement('div');
    clip.className = 'sub-clip' + (i === activeSubIndex ? ' active' : '');
    clip.style.left = (s.start / totalDuration * 100) + '%';
    clip.style.width = ((s.end - s.start) / totalDuration * 100) + '%';
    clip.textContent = s.text;
    clip.title = fmtTime(s.start) + ' - ' + fmtTime(s.end) + '：' + s.text;
    clip.addEventListener('click', function() { activeSubIndex = i; renderSubLane(); renderSubList(); });
    subLane.appendChild(clip);
  });
}

function renderSubList() {
  subList.innerHTML = '';
  subtitles.forEach(function(s, i) {
    var item = document.createElement('div');
    item.className = 'sub-item' + (i === activeSubIndex ? ' active' : '');
    item.innerHTML = '<span class="idx">' + (i+1) + '</span><span class="times">' + fmtSrtTime(s.start) + ' → ' + fmtSrtTime(s.end) + '</span>';
    var inp = document.createElement('input');
    inp.value = s.text;
    inp.addEventListener('input', function() { s.text = inp.value; renderSubLane(); });
    item.appendChild(inp);
    var del = document.createElement('button');
    del.className = 'btn red';
    del.textContent = '✕';
    del.addEventListener('click', function() { subtitles.splice(i, 1); renderSubLane(); renderSubList(); updateSubButtons(); });
    item.appendChild(del);
    subList.appendChild(item);
  });
  updateSubButtons();
}

function updateSubButtons() {
  btnExportSrt.disabled = subtitles.length === 0;
  btnExportVtt.disabled = subtitles.length === 0;
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
  var idx = -1;
  for (var i = 0; i < subtitles.length; i++) {
    if (elapsed >= subtitles[i].start && elapsed <= subtitles[i].end) { idx = i; break; }
  }
  if (idx !== activeSubIndex) { activeSubIndex = idx; renderSubLane(); renderSubList(); }
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
  statusEl.textContent = '匯出中...';
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

subLane.addEventListener('click', function(e) {
  if (totalDuration <= 0) return;
  var rect = subLane.getBoundingClientRect();
  var pct = (e.clientX - rect.left) / rect.width;
  var t = pct * totalDuration;
  if (subtitles.length > 0) {
    var last = subtitles[subtitles.length - 1];
    if (last.end === null) {
      last.end = t;
      renderSubLane(); renderSubList();
      return;
    }
  }
  subtitles.push({ start: t, end: null, text: '字幕 ' + (subtitles.length + 1) });
  renderSubLane(); renderSubList();
});

btnAddSub.addEventListener('click', function() {
  var lines = subInput.value.split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
  if (lines.length === 0) { alert('請先貼上字幕文字'); return; }
  if (totalDuration <= 0) { alert('請先上傳音檔'); return; }
  var per = totalDuration / lines.length;
  subtitles = lines.map(function(text, i) {
    return { start: i * per, end: (i + 1) * per, text: text };
  });
  renderSubLane(); renderSubList();
});

btnClearSub.addEventListener('click', function() { subtitles = []; renderSubLane(); renderSubList(); });

btnExportSrt.addEventListener('click', function() {
  if (subtitles.length === 0) return;
  var lines = [];
  subtitles.forEach(function(s, i) {
    var end = s.end === null ? s.start + 2 : s.end;
    lines.push(String(i + 1));
    lines.push(fmtSrtTime(s.start) + ' --> ' + fmtSrtTime(end));
    lines.push(s.text);
    lines.push('');
  });
  downloadText(lines.join('\n'), 'ahpal-subtitles-' + Date.now() + '.srt');
});

btnExportVtt.addEventListener('click', function() {
  if (subtitles.length === 0) return;
  var lines = ['WEBVTT', ''];
  subtitles.forEach(function(s, i) {
    var end = s.end === null ? s.start + 2 : s.end;
    lines.push(String(i + 1));
    lines.push(fmtVttTime(s.start) + ' --> ' + fmtVttTime(end));
    lines.push(s.text);
    lines.push('');
  });
  downloadText(lines.join('\n'), 'ahpal-subtitles-' + Date.now() + '.vtt');
});

function downloadText(content, filename) {
  var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════
// 影片輸出
// ═══════════════════════════════════════════════════════
coverInput.addEventListener('change', function(e) {
  var f = e.target.files[0];
  if (!f) return;
  var img = new Image();
  img.onload = function() { coverImage = img; recordStatus.textContent = '封面圖已載入：' + f.name; };
  img.src = URL.createObjectURL(f);
});

function renderVideoFrame(ctx, elapsed) {
  var w = renderCanvas.width;
  var h = renderCanvas.height;
  ctx.fillStyle = '#0D1117';
  ctx.fillRect(0, 0, w, h);
  // 封面圖
  if (coverImage) {
    var scale = Math.max(w / coverImage.width, h / coverImage.height);
    var iw = coverImage.width * scale;
    var ih = coverImage.height * scale;
    ctx.drawImage(coverImage, (w - iw) / 2, (h - ih) / 2, iw, ih);
    ctx.fillStyle = 'rgba(13,17,23,0.6)';
    ctx.fillRect(0, 0, w, h);
  }
  // 標題
  var title = videoTitle.value.trim() || '雅寶音訊工作台';
  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 48px -apple-system, "Microsoft JhengHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, w / 2, h / 4);
  // 波形
  if (tracks.length > 0 && tracks[0].buffer) {
    var buf = tracks[0].buffer;
    var data = buf.getChannelData(0);
    var waveY = h * 0.55;
    var waveH = h * 0.25;
    ctx.strokeStyle = '#58A6FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    var step = Math.floor(data.length / w);
    for (var i = 0; i < w; i++) {
      var v = data[Math.min(i * step, data.length - 1)];
      var y = waveY - v * waveH;
      if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
    }
    ctx.stroke();
  }
  // 字幕
  if (subtitles.length > 0) {
    for (var s = 0; s < subtitles.length; s++) {
      var sub = subtitles[s];
      var end = sub.end === null ? sub.start + 2 : sub.end;
      if (elapsed >= sub.start && elapsed <= end) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, h * 0.85, w, h * 0.1);
        ctx.fillStyle = '#E6EDF3';
        ctx.font = 'bold 32px -apple-system, "Microsoft JhengHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(sub.text, w / 2, h * 0.92);
        break;
      }
    }
  }
  // 時間
  ctx.fillStyle = '#8B949E';
  ctx.font = '20px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(fmtTime(elapsed) + ' / ' + fmtTime(totalDuration), w - 20, h - 20);
}

function updateRecordButtons() {
  btnRecord.disabled = tracks.length === 0 || mediaRecorder !== null;
  btnStopRecord.disabled = mediaRecorder === null;
  btnDownloadWebm.disabled = recordedBlob === null;
  btnMp4Cmd.disabled = recordedBlob === null;
}

btnRecord.addEventListener('click', async function() {
  if (tracks.length === 0) return;
  var ctx = getCtx();
  if (ctx.state === 'suspended') await ctx.resume();
  stopAll();

  // 初始化 Canvas
  var rctx = renderCanvas.getContext('2d');
  renderVideoFrame(rctx, 0);

  // 建立 MediaStream：Canvas 畫面 + 混音音訊
  recordCanvasStream = renderCanvas.captureStream(30);
  recordAudioDest = ctx.createMediaStreamDestination();
  var hasSolo = tracks.some(function(t) { return t.solo; });
  tracks.forEach(function(t) {
    if (!t.buffer) return;
    if (t.mute) return;
    if (hasSolo && !t.solo) return;
    var src = ctx.createBufferSource();
    src.buffer = t.buffer;
    var gain = ctx.createGain();
    gain.gain.value = t.volume;
    src.connect(gain);
    gain.connect(recordAudioDest);
    src.start(0);
    t._recordSrc = src;
  });
  recordAudioDest.stream.getAudioTracks().forEach(function(track) {
    recordCanvasStream.addTrack(track);
  });

  // MediaRecorder
  recordChunks = [];
  var mimeType = 'video/webm;codecs=vp9,opus';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
  }
  try {
    mediaRecorder = new MediaRecorder(recordCanvasStream, { mimeType: mimeType });
  } catch (e) {
    recordStatus.textContent = 'MediaRecorder 不支援：' + e.message;
    return;
  }
  mediaRecorder.ondataavailable = function(ev) { if (ev.data.size > 0) recordChunks.push(ev.data); };
  mediaRecorder.onstop = function() {
    recordedBlob = new Blob(recordChunks, { type: 'video/webm' });
    previewVideo.src = URL.createObjectURL(recordedBlob);
    previewVideo.style.display = 'block';
    recordStatus.textContent = '錄製完成！檔案大小：' + (recordedBlob.size / 1024 / 1024).toFixed(2) + ' MB';
    mediaRecorder = null;
    updateRecordButtons();
  };
  mediaRecorder.start(100);

  // 開始播放 + 渲染動畫
  playing = true;
  startTime = ctx.currentTime;
  playheadEl.style.display = 'block';
  var renderStart = ctx.currentTime;

  function renderLoop() {
    var elapsed = ctx.currentTime - renderStart;
    if (elapsed >= totalDuration) {
      stopRecording();
      return;
    }
    renderVideoFrame(rctx, elapsed);
    playheadEl.style.left = (elapsed / totalDuration * 100) + '%';
    timeInfo.textContent = '時間：' + fmtTime(elapsed) + ' / ' + fmtTime(totalDuration);
    recordAnimId = requestAnimationFrame(renderLoop);
  }
  renderLoop();
  recordStatus.textContent = '錄製中...';
  updateRecordButtons();
});

btnStopRecord.addEventListener('click', stopRecording);
function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (recordAnimId) { cancelAnimationFrame(recordAnimId); recordAnimId = null; }
  tracks.forEach(function(t) { if (t._recordSrc) { try { t._recordSrc.stop(); } catch(e) {} t._recordSrc = null; } });
  playing = false;
  updateRecordButtons();
}

btnDownloadWebm.addEventListener('click', function() {
  if (!recordedBlob) return;
  var a = document.createElement('a');
  a.href = URL.createObjectURL(recordedBlob);
  a.download = 'ahpal-video-' + Date.now() + '.webm';
  a.click();
});

btnMp4Cmd.addEventListener('click', function() {
  if (!recordedBlob) return;
  var cmd = 'ffmpeg -i "ahpal-video.webm" -c:v libx264 -crf 20 -preset fast -c:a aac -movflags +faststart "ahpal-video.mp4"';
  mp4Output.style.display = 'block';
  mp4Output.textContent = cmd;
  recordStatus.textContent = '轉 MP4 指令已產生（複製到終端機執行）。';
});
