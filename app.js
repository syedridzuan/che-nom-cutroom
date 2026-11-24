'use strict';

const byId = id => document.getElementById(id);
const video = byId('video');
const icons = {
  monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M9 21h6m-3-4v4"/>',
  folder: '<path d="M3 7V5a1 1 0 0 1 1-1h5l2 3h9v3M3 8v11a1 1 0 0 0 1 1h14l4-11H7l-2 3"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/>',
  notes: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8m-8 4h8m-8 4h5"/>',
  timeline: '<path d="M3 6h18M3 12h18M3 18h18"/><path d="M8 3v6m8 0v6m-6 0v6" stroke-width="3"/>',
  play: '<path d="m7 4 13 8-13 8z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8 5v14m8-14v14" stroke-width="4"/>',
  volume: '<path d="m3 9 4 0 5-5v16l-5-5H3zM16 8q4 4 0 8m3-11q7 7 0 14"/>',
  muted: '<path d="m3 9 4 0 5-5v16l-5-5H3zM16 9l6 6m0-6-6 6"/>',
  expand: '<path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  pencil: '<path d="m4 16 11-11 4 4L8 20l-5 1zM13 7l4 4"/>',
  drive: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 14h18m-5 3h2"/>',
  keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h1m3 0h1m3 0h1m3 0h.2M6 12h1m3 0h1m3 0h1m3 0h.2M8 15h8"/>'
};
function icon(name) {
  return '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + icons[name] + '</svg>';
}
document.querySelectorAll('[data-icon]').forEach(el => { el.outerHTML = icon(el.dataset.icon); });

const types = {cut:'Potong',caption:'Kapsyen',camera:'Kamera',note:'Nota'};
const sampleNotes = [
  {id:'a',type:'cut', start:0, end:1.5, instruction:'Pendekkan permulaan klip.'},
  {id:'b',type:'caption', start:3, end:7, instruction:'Letak teks “Sambal udang” di kiri bawah.'},
  {id:'c',type:'camera', start:9, end:13, instruction:'Zoom perlahan ke arah udang.'}
];
let source = {name:'sambal-demo.mp4', key:'demo-v1', demo:true};
let notes = [], editing = null, rangeStart = null, currentURL = '', openAttempt = 0;
let thumbnailJob = null;
const round = value => Math.round(value * 1000) / 1000;
const duration = () => Number.isFinite(video.duration) ? video.duration : 0;
const ready = () => duration() > 0 && !video.error;
function time(seconds, precise = true) {
  const ms = Math.max(0, Math.round((seconds || 0) * 1000));
  const mins = String(Math.floor(ms / 60000)).padStart(2,'0');
  const secs = String(Math.floor(ms / 1000) % 60).padStart(2,'0');
  return mins + ':' + secs + (precise ? '.' + String(ms % 1000).padStart(3,'0') : '');
}
function message(value) { byId('message').textContent = value; }
function seek(value) {
  if (!ready()) return;
  video.currentTime = Math.max(0,Math.min(duration(),value));
  syncClock();
}
function syncClock() {
  const t = video.currentTime;
  byId('clock').value = time(t);
  byId('seek').value = t;
  byId('seek').setAttribute('aria-valuetext',time(t));
  byId('needle').style.left = 'calc(' + (duration() ? 100*t/duration() : 0) + '% - 1px)';
}
function syncControls() {
  for (const id of ['add','play','seek','speed','mute','full']) byId(id).disabled = !ready();
  byId('export').disabled = !ready() || !notes.length;
}
function loadNotes() {
  notes = source.demo ? sampleNotes.map(n => ({...n})) : [];
  byId('saveState').textContent = 'Video kekal pada peranti ini.';
  try {
    const saved = JSON.parse(localStorage.getItem('cutroom:' + source.key));
    if (Array.isArray(saved)) notes = saved.filter(n => n && Object.hasOwn(types,n.type) && typeof n.instruction === 'string' && Number.isFinite(n.start) && n.start >= 0 && n.start <= round(duration()) && (n.end === null || (Number.isFinite(n.end) && n.end > n.start && n.end <= round(duration()))));
  } catch { /* The editor also works when browser storage is unavailable. */ }
}
function saveNotes() {
  try {
    localStorage.setItem('cutroom:' + source.key, JSON.stringify(notes));
    byId('saveState').textContent = 'Arahan disimpan dalam pelayar ini.';
  } catch {
    byId('saveState').textContent = 'Storan pelayar tidak tersedia. Eksport JSON untuk simpan arahan.';
  }
  renderNotes();
}
function element(tag, className, content) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (content !== undefined) el.textContent = content;
  return el;
}
function renderNotes() {
  notes.sort((a,b) => a.start-b.start);
  const list = byId('notes'), marks = byId('marks');
  list.replaceChildren(); marks.replaceChildren();
  byId('count').textContent = notes.length;
  if (!notes.length) list.append(element('p','empty','Geser ke bahagian yang nak diedit, kemudian tambah arahan.'));
  for (const note of notes) {
    const row = element('article','noterow'), head = element('div','notehead');
    row.dataset.type = note.type;
    const label = time(note.start, note.start % 1 !== 0) + (note.end === null ? '' : ' – ' + time(note.end, note.end % 1 !== 0));
    const jump = element('button','timebtn',label);
    jump.title = note.end === null ? 'Pergi ke masa ini' : time(note.start) + ' – ' + time(note.end);
    jump.onclick = () => { video.pause(); seek(note.start); };
    head.append(jump,element('span','type',types[note.type]));
    const edit = element('button','iconbtn editbtn');
    edit.innerHTML = icon('pencil'); edit.setAttribute('aria-label','Ubah arahan ' + time(note.start));
    edit.onclick = () => openEditor(note);
    row.append(head,edit,element('p','',note.instruction)); list.append(row);
    if (duration()) {
      const mark = element('span','mark');
      mark.dataset.type = note.type;
      mark.style.left = Math.min(99.6,note.start*100/duration()) + '%';
      mark.style.width = ((note.end === null ? 0 : note.end-note.start)*100/duration()) + '%';
      marks.append(mark);
    }
  }
  syncControls();
}

function drawFilm() {
  thumbnailJob?.abort();
  const job = new AbortController();
  thumbnailJob = job;
  const film = byId('film'); film.replaceChildren();
  const cells = Array.from({length:12}, () => {
    const canvas = element('canvas');
    canvas.width=160; canvas.height=64; film.append(canvas);
    return canvas;
  });
  const probe = document.createElement('video');
  probe.muted=true; probe.preload='auto'; probe.playsInline=true;
  let index=0;
  function cleanup() {
    probe.onloadedmetadata=null; probe.onseeked=null; probe.onerror=null;
    probe.removeAttribute('src'); probe.load();
  }
  job.signal.addEventListener('abort',cleanup,{once:true});
  function next() {
    if (index === cells.length) { job.abort(); return; }
    probe.currentTime = Math.min(probe.duration * (index + .5)/cells.length, probe.duration-.00001);
  }
  probe.onloadedmetadata = next;
  probe.onseeked = () => {
    const ctx = cells[index].getContext('2d');
    const scale = Math.max(160/probe.videoWidth,64/probe.videoHeight);
    const w = probe.videoWidth*scale, h = probe.videoHeight*scale;
    ctx.drawImage(probe,(160-w)/2,(64-h)/2,w,h);
    index++; next();
  };
  probe.onerror = () => job.abort();
  probe.src = video.currentSrc || video.src;
}
function initSource() {
  if (!ready()) { syncControls(); return; }
  rangeStart=null;
  byId('seek').max=duration();
  byId('duration').textContent=time(duration());
  byId('dimensions').textContent=video.videoWidth + ' × ' + video.videoHeight;
  byId('filename').textContent=source.name;
  byId('demo').hidden=!source.demo;
  byId('screen').classList.toggle('is-demo',!!source.demo);
  byId('ruler').replaceChildren(...Array.from({length:6},(_,i)=>element('span','',time(duration()*i/5,duration()<5))));
  loadNotes(); renderNotes(); syncClock(); drawFilm();
}
video.addEventListener('loadedmetadata',initSource);
video.addEventListener('error',()=>{syncControls();message('Video ini tak dapat dimainkan. Cuba MP4 dengan codec H.264.');});
video.addEventListener('timeupdate',syncClock);
function updatePlay() {
  byId('play').innerHTML=icon(video.paused ? 'play' : 'pause');
  byId('play').setAttribute('aria-label',video.paused ? 'Main video' : 'Jeda video');
}
video.addEventListener('pause',updatePlay); video.addEventListener('play',updatePlay);
async function togglePlay() {
  if (!ready()) return;
  if (!video.paused) return video.pause();
  try { await video.play(); } catch { message('Video ini tak dapat dimainkan dalam pelayar ini.'); }
}
byId('play').onclick=togglePlay; video.onclick=togglePlay;
byId('seek').oninput=e=>seek(Number(e.target.value));
byId('speed').onclick=()=>{
  const speeds=[1,1.5,2,.5]; video.playbackRate=speeds[(speeds.indexOf(video.playbackRate)+1)%speeds.length];
};
video.onratechange=()=>{byId('speed').textContent=video.playbackRate+'×';};
byId('mute').onclick=()=>{video.muted=!video.muted;};
video.onvolumechange=()=>{
  byId('mute').innerHTML=icon(video.muted?'muted':'volume');
  byId('mute').setAttribute('aria-label',video.muted?'Hidupkan audio':'Senyapkan audio');
};
byId('full').onclick=async()=>{
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (byId('screen').requestFullscreen) await byId('screen').requestFullscreen();
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    else message('Skrin penuh tidak tersedia dalam pelayar ini.');
  } catch { message('Skrin penuh tidak tersedia dalam pelayar ini.'); }
};
byId('open').onclick=()=>byId('file').click();
byId('file').onchange=async e=>{
  const file=e.target.files[0]; e.target.value=''; if (!file) return;
  const attempt=++openAttempt, url=URL.createObjectURL(file);
  const probe=document.createElement('video'); probe.preload='metadata';
  try {
    await new Promise((resolve,reject)=>{
      probe.onloadedmetadata=resolve; probe.onerror=reject; probe.src=url;
    });
    if (attempt!==openAttempt || !probe.videoWidth || !Number.isFinite(probe.duration) || probe.duration<=0) throw Error();
    thumbnailJob?.abort(); video.pause();
    const previous=currentURL; currentURL=url;
    source={name:file.name, key:JSON.stringify([file.name,file.size,file.lastModified]),size:file.size};
    video.removeAttribute('poster'); video.src=url; syncControls(); message('');
    if (previous) URL.revokeObjectURL(previous);
  } catch {
    URL.revokeObjectURL(url);
    if (attempt===openAttempt) message('Gagal buka video. Cuba fail MP4 dengan codec H.264.');
  } finally {
    probe.onloadedmetadata=null; probe.onerror=null; probe.removeAttribute('src'); probe.load();
  }
};
function openEditor(note=null, start=video.currentTime, end=null) {
  if (!ready()) return;
  video.pause(); editing=note; message('');
  byId('formTitle').textContent=note?'Ubah arahan':'Tambah arahan';
  byId('remove').hidden=!note; byId('type').value=note?.type || 'note';
  byId('start').value=round(note?.start ?? start); byId('end').value=note?.end ?? end ?? '';
  byId('start').max=byId('end').max=round(duration());
  byId('instruction').value=note?.instruction || ''; byId('formError').textContent='';
  byId('editor').showModal(); byId('instruction').focus();
}
byId('add').onclick=()=>openEditor();
byId('form').onsubmit=e=>{
  e.preventDefault();
  const start=byId('start').valueAsNumber, end=byId('end').value===''?null:byId('end').valueAsNumber;
  const instruction=byId('instruction').value.trim();
  if (!instruction || (end!==null && end<=start)) {
    byId('formError').textContent=instruction?'Masa akhir mesti selepas masa mula.':'Tulis arahan dahulu.'; return;
  }
  const note={id:editing?.id ?? (Date.now().toString(36)+Math.random().toString(36).slice(2)),type:byId('type').value,start,end,instruction};
  if (editing) notes[notes.indexOf(editing)]=note; else notes.push(note);
  saveNotes(); byId('editor').close();
};
byId('remove').onclick=()=>{notes=notes.filter(n=>n!==editing);saveNotes();byId('editor').close();};
byId('keys').onclick=()=>byId('shortcuts').showModal();
document.querySelectorAll('[data-close]').forEach(b=>{b.onclick=()=>b.closest('dialog').close();});
document.addEventListener('keydown',e=>{
  if (e.altKey||e.ctrlKey||e.metaKey||document.querySelector('dialog[open]')||!ready()) return;
  if (e.target.closest('button,input,textarea,select') && (e.key===' ' || e.target.id!=='seek' && e.target.tagName!=='BUTTON')) return;
  switch(e.key.toLowerCase()) {
    case ' ': togglePlay(); break;
    case 'arrowright': seek(video.currentTime+1); break;
    case 'arrowleft': seek(video.currentTime-1); break;
    case 'm': openEditor(); break;
    case 'i': rangeStart=round(video.currentTime);message('Mula '+time(rangeStart)+' · Tekan O pada akhir julat.');break;
    case 'o':
      if (rangeStart===null || round(video.currentTime)<=rangeStart) message('Tekan I pada masa mula, kemudian gerak ke akhir julat.');
      else { openEditor(null,rangeStart,round(video.currentTime)); rangeStart=null; }
      break;
    default: return;
  }
  e.preventDefault();
});
byId('export').onclick=()=>{
  const payload={schema_version:1,time_unit:'seconds',time_reference:'original_source',source:{filename:source.name,duration_seconds:round(duration()),width:video.videoWidth,height:video.videoHeight},edits:notes.map(({type,start,end,instruction})=>({type,start,end,instruction}))};
  if (source.size!==undefined) payload.source.size_bytes=source.size;
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'}));
  const link=element('a');link.href=url;link.download=source.name.replace(/\.[^.]+$/,'')+'.edits.json';
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
  message('JSON dieksport. Beri fail JSON dan video asal kepada Claude Code atau Codex.');
};
syncControls();
async function openDemo() {
  const path = 'assets/sambal-demo.mp4';
  if (location.protocol === 'file:') { video.src = path; return; }
  // A blob keeps seeking available on static servers without byte-range support.
  try {
    const response = await fetch(path);
    if (!response.ok) throw Error();
    const clip = await response.blob();
    if (!source.demo) return;
    currentURL = URL.createObjectURL(clip);
    video.src = currentURL;
  } catch {
    if (source.demo) video.src = path;
  }
}
openDemo();
