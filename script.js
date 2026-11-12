(function () {
    'use strict';
  
    var grid   = document.getElementById('grid');
    var addBtn = document.getElementById('addBtn');
    var fsBtn  = document.getElementById('fsBtn');
  
    var timers = new Map();   // id -> timer 物件
    var seq    = 0;
    var rafId  = null;
  
    /* ---------------- 時間工具 ---------------- */
  
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
  
    function format(ms) {
      if (ms < 0) ms = 0;
      ms = Math.floor(ms);
      var cs = Math.floor(ms / 10) % 100;
      var s  = Math.floor(ms / 1000) % 60;
      var m  = Math.floor(ms / 60000) % 60;
      var h  = Math.floor(ms / 3600000);
      return pad(h) + ':' + pad(m) + ':' + pad(s) + '.' + pad(cs);
    }
  
    function elapsedMs(t) {
      return t.accumulated + (t.running ? performance.now() - t.startStamp : 0);
    }
  
    function displayMs(t) {
      var e = elapsedMs(t);
      if (t.mode === 'down') return Math.max(0, t.duration - e);
      return e;
    }
  
    function updateTime(t) {
      t.timeEl.textContent = format(displayMs(t));
      t.timeEl.classList.toggle('finished', t.mode === 'down' && t.finished);
    }
  
    function setInputsEnabled(t, enabled) {
      t.modeSelect.disabled = !enabled;
      t.durHr.disabled  = !enabled;
      t.durMin.disabled = !enabled;
      t.durSec.disabled = !enabled;
    }
  
    /* ---------------- 單一 rAF 迴圈 ---------------- */
  
    function ensureLoop() {
      if (rafId === null) rafId = requestAnimationFrame(loop);
    }
  
    function loop() {
      rafId = null;
      var anyRunning = false;
  
      timers.forEach(function (t) {
        if (!t.running) return;
  
        if (t.mode === 'down' && elapsedMs(t) >= t.duration) {
          t.accumulated = t.duration;
          t.running = false;
          t.finished = true;
          t.startBtn.textContent = '開始';
          t.lapBtn.disabled = true;
          setInputsEnabled(t, true);
          updateTime(t);
          return;
        }
  
        updateTime(t);
        anyRunning = true;
      });
  
      if (anyRunning) rafId = requestAnimationFrame(loop);
    }
  
    /* ---------------- 計時器行為 ---------------- */
  
    function startTimer(t) {
      if (t.running) return;
  
      if (t.mode === 'down') {
        if (t.duration <= 0) return;
        if (t.finished || t.accumulated >= t.duration) {
          t.accumulated = 0;
          t.finished = false;
          t.lapCount = 0;
          t.lapsEl.innerHTML = '';
          t.lapsEl.classList.remove('visible');
          updateTime(t);
        }
      }
  
      t.running = true;
      t.startStamp = performance.now();
      t.startBtn.textContent = '暫停';
      t.lapBtn.disabled = false;
      setInputsEnabled(t, false);
      updateTime(t);
      ensureLoop();
    }
  
    function pauseTimer(t) {
      if (!t.running) return;
      t.accumulated += performance.now() - t.startStamp;
      t.running = false;
      t.startBtn.textContent = '開始';
      setInputsEnabled(t, true);
      updateTime(t);
    }
  
    function toggleTimer(t) {
      t.running ? pauseTimer(t) : startTimer(t);
    }
  
    function resetTimer(t) {
      t.running = false;
      t.accumulated = 0;
      t.startStamp = 0;
      t.lapCount = 0;
      t.finished = false;
  
      t.startBtn.textContent = '開始';
      t.lapBtn.disabled = true;
      t.lapsEl.innerHTML = '';
      t.lapsEl.classList.remove('visible');
      setInputsEnabled(t, true);
      updateTime(t);
    }
  
    function addLap(t) {
      if (!t.running && t.accumulated === 0) return;
  
      t.lapCount++;
  
      var li   = document.createElement('li');
      var name = document.createElement('span');
      var time = document.createElement('span');
  
      name.textContent = '第 ' + t.lapCount + ' 次';
      time.textContent = format(displayMs(t));
  
      li.appendChild(name);
      li.appendChild(time);
      t.lapsEl.insertBefore(li, t.lapsEl.firstChild);
      t.lapsEl.classList.add('visible');
    }
  
    /* ---------------- 模式 / 時長 ---------------- */
  
    function onModeChange(t) {
      t.mode = t.modeSelect.value;
      t.durWrap.classList.toggle('hidden', t.mode !== 'down');
      resetTimer(t);
    }
  
    function applyDuration(t) {
      var h = parseInt(t.durHr.value, 10);
      var m = parseInt(t.durMin.value, 10);
      var s = parseInt(t.durSec.value, 10);
  
      if (isNaN(h) || h < 0) h = 0;
      if (isNaN(m) || m < 0) m = 0;
      if (isNaN(s) || s < 0) s = 0;
      h = Math.min(h, 99);
      m = Math.min(m, 59);
      s = Math.min(s, 59);
  
      t.durHr.value  = h;
      t.durMin.value = m;
      t.durSec.value = s;
      t.duration = (h * 3600 + m * 60 + s) * 1000;
  
      resetTimer(t);
    }
  
    /* ---------------- 建立 / 刪除計時器 ---------------- */
  
    function createTimer(name) {
      var id = ++seq;
  
      var el = document.createElement('section');
      el.className = 'timer-card';
      el.dataset.id = String(id);
      el.innerHTML =
        '<div class="card-head">' +
          '<input class="timer-name" type="text" spellcheck="false" aria-label="計時器名稱">' +
          '<button class="icon-btn" type="button" title="刪除計時器" aria-label="刪除計時器">✕</button>' +
        '</div>' +
        '<div class="time">00:00:00.00</div>' +
        '<div class="btns">' +
          '<button type="button" class="start">開始</button>' +
          '<button type="button" class="lap secondary" disabled>計次</button>' +
          '<button type="button" class="reset secondary">重設</button>' +
        '</div>' +
        '<div class="mode-row">' +
          '<select class="mode-select" aria-label="計時模式">' +
            '<option value="up">正計時</option>' +
            '<option value="down">倒計時</option>' +
          '</select>' +
          '<div class="duration-inputs hidden">' +
            '<input class="dur-hr"  type="number" min="0" max="99" step="1" value="0" aria-label="小時">' +
            '<span>時</span>' +
            '<input class="dur-min" type="number" min="0" max="59" step="1" value="5" aria-label="分鐘">' +
            '<span>分</span>' +
            '<input class="dur-sec" type="number" min="0" max="59" step="1" value="0" aria-label="秒">' +
            '<span>秒</span>' +
          '</div>' +
        '</div>' +
        '<ul class="laps"></ul>';
  
      var t = {
        id: id,
        el: el,
        nameEl:     el.querySelector('.timer-name'),
        timeEl:     el.querySelector('.time'),
        startBtn:   el.querySelector('.start'),
        lapBtn:     el.querySelector('.lap'),
        resetBtn:   el.querySelector('.reset'),
        lapsEl:     el.querySelector('.laps'),
        modeSelect: el.querySelector('.mode-select'),
        durWrap:    el.querySelector('.duration-inputs'),
        durHr:      el.querySelector('.dur-hr'),
        durMin:     el.querySelector('.dur-min'),
        durSec:     el.querySelector('.dur-sec'),
        mode: 'up',
        duration: 5 * 60 * 1000,
        finished: false,
        running: false,
        startStamp: 0,
        accumulated: 0,
        lapCount: 0
      };
  
      t.nameEl.value = name || ('計時器 ' + id);
  
      t.startBtn.addEventListener('click', function () { toggleTimer(t); });
      t.lapBtn.addEventListener('click',   function () { addLap(t); });
      t.resetBtn.addEventListener('click', function () { resetTimer(t); });
  
      t.modeSelect.addEventListener('change', function () { onModeChange(t); });
      t.durHr.addEventListener('change',  function () { applyDuration(t); });
      t.durMin.addEventListener('change', function () { applyDuration(t); });
      t.durSec.addEventListener('change', function () { applyDuration(t); });
  
      el.querySelector('.icon-btn').addEventListener('click', function () {
        removeTimer(t.id);
      });
  
      updateTime(t);
      return t;
    }
  
    function addTimer(name, focusName) {
      var t = createTimer(name);
      timers.set(t.id, t);
      grid.appendChild(t.el);
  
      if (focusName) {
        t.nameEl.focus();
        t.nameEl.select();
      }
      return t;
    }
  
    function removeTimer(id) {
      var t = timers.get(id);
      if (!t) return;
  
      timers.delete(id);
      t.el.remove();
  
      if (timers.size === 0) addTimer();
    }
  
    /* ---------------- 全螢幕 ---------------- */
  
    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        var p = document.documentElement.requestFullscreen &&
                document.documentElement.requestFullscreen();
        if (p && p.catch) p.catch(function () {});
      } else if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  
    document.addEventListener('fullscreenchange', function () {
      fsBtn.textContent = document.fullscreenElement ? '退出全螢幕' : '全螢幕';
    });
  
    /* ---------------- 事件綁定 ---------------- */
  
    addBtn.addEventListener('click', function () { addTimer(null, true); });
    fsBtn.addEventListener('click', toggleFullscreen);
  
    /* ---------------- 初始 ---------------- */
  
    addTimer('計時器 1', false);
  })();
  
  /* ---------------- Service Worker 註冊 ---------------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (err) {
        console.warn('Service Worker 註冊失敗:', err);
      });
    });
  }