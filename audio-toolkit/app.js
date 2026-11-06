var audioCtx = null;
var buffer = null;
var source = null;
var startTime = 0;
var playing = false;
var zoom = 1;
var peaks = null;
var canvas = document.getElementById('waveform');
var ctx = canvas.getContext('2d');
var fileInfo = document.getElementById('file-info');
var playInfo = document.getElementById('play-info');
var btnPlay = document.getElementById('btn-play');
var btnStop = document.getElementById('btn-stop');
var btnZoomIn = document.getElementById('btn-zoom-in');
var btnZoomOut = document.getElementById('btn-zoom-out');

function resizeCanvas() {
  canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
  canvas.height = 120 * (window.devicePixelRatio || 1);
}

function computePeaks(buf, width) {
  var data = buf.getChannelData(0);
  var step = Math.floor(data.length / width);
  var result = [];
  for (var i = 0; i < width; i++) {
    var min = 1.0;
    var max = -1.0;
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

function drawWaveform() {
  if (!peaks) return;
  var w = canvas.width;
  var h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0D1117';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#2D303A';
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();
  ctx.fillStyle = '#D4AF37';
  var visibleCount = Math.floor(peaks.length / zoom);
  var offset = Math.floor((peaks.length - visibleCount) / 2);
  for (var i = 0; i < visibleCount; i++) {
    var p = peaks[offset + i];
    var x = (i / visibleCount) * w;
    var yMin = h / 2 - p[1] * h / 2 * 0.9;
    var yMax = h / 2 - p[0] * h / 2 * 0.9;
    ctx.fillRect(x, yMin, Math.max(1, w / visibleCount), yMax - yMin);
  }
}

function drawPlayhead() {
  if (!playing || !buffer || !audioCtx) return;
  var elapsed = audioCtx.currentTime - startTime;
  if (elapsed > buffer.duration) elapsed = buffer.duration;
  playInfo.textContent = '時間：' + elapsed.toFixed(2) + ' / ' + buffer.duration.toFixed(2) + ' 秒';
  var w = canvas.width;
  var x = (elapsed / buffer.duration) * w;
  ctx.fillStyle = '#58A6FF';
  ctx.fillRect(x, 0, 2, canvas.height);
  requestAnimationFrame(drawPlayhead);
}

document.getElementById('file-input').addEventListener('change', async function(e) {
  var f = e.target.files[0];
  if (!f) return;
  fileInfo.textContent = '讀取中：' + f.name + '（' + (f.size / 1024 / 1024).toFixed(2) + ' MB）';
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var ab = await f.arrayBuffer();
    buffer = await audioCtx.decodeAudioData(ab);
    fileInfo.textContent = f.name + '｜時長：' + buffer.duration.toFixed(2) + ' 秒｜取樣率：' + buffer.sampleRate + ' Hz｜聲道：' + buffer.numberOfChannels;
    resizeCanvas();
    peaks = computePeaks(buffer, canvas.width);
    drawWaveform();
    btnPlay.disabled = false;
    btnStop.disabled = false;
    btnZoomIn.disabled = false;
    btnZoomOut.disabled = false;
  } catch (err) {
    fileInfo.textContent = '無法解碼此音檔：' + err.message;
  }
});

btnPlay.addEventListener('click', function() {
  if (!buffer) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start(0);
  startTime = audioCtx.currentTime;
  playing = true;
  drawPlayhead();
  source.onended = function() { playing = false; playInfo.textContent = '播放結束'; };
});

btnStop.addEventListener('click', function() {
  if (source) { try { source.stop(); } catch (e) {} source = null; }
  playing = false;
  playInfo.textContent = '已停止';
  if (peaks) drawWaveform();
});

btnZoomIn.addEventListener('click', function() { zoom = Math.min(zoom * 2, 16); drawWaveform(); });
btnZoomOut.addEventListener('click', function() { zoom = Math.max(zoom / 2, 1); drawWaveform(); });

window.addEventListener('resize', function() {
  if (buffer) {
    resizeCanvas();
    peaks = computePeaks(buffer, canvas.width);
    drawWaveform();
  }
});
