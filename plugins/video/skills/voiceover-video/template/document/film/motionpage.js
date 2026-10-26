/* A 16:9 MOTION SCENE in a part (references/motion-scenes.md): its frames, rendered with alpha by scripts/motionscene.mjs
   into media/mp-<name>/f0001.png… (+ meta.json: n, cues on the scene's clock), drawn full frame over
   the screen's paper, outside its camera (no push), from t0 on. Its sounds join the film's (F.sfx).
   F.motionPage(s, name, { t0 }) → the canvas. */
(() => {
  const FPS = 30;
  F.motionPage = (s, name, o = {}) => {
    const t0 = F.when(o.t0 ?? s.t0, `the motion scene « ${name} »`);
    const x = new XMLHttpRequest(); x.open('GET', `media/mp-${name}/meta.json`, false); x.send();
    if (x.status !== 200) throw new Error(`motion scene « ${name} »: media/mp-${name}/meta.json is missing (scripts/motionscene.mjs <run> ${name} --variant …)`);
    const meta = JSON.parse(x.responseText), n = meta.n;
    for (const c of meta.cues || []) F.sfx(t0 + c.t, c.name, c.gain ?? -20, { key: true });
    const cv = F.el('canvas', 'mp-scene lazy', s.tw); cv.width = 1920; cv.height = 1080;
    cv.style.cssText = 'position:absolute;left:0;top:0;width:1920px;height:1080px;pointer-events:none;z-index:5';
    const ctx = cv.getContext('2d');
    let cur = -1;
    F.LAZY.push((T, pend) => {
      if (T < s.t0 - 0.6 || T > s.t1 + 0.6) return;
      const k = Math.max(1, Math.min(n, Math.floor((T - t0) * FPS + 1e-3) + 1));
      if (T < t0) { if (cur !== 0) { cur = 0; ctx.clearRect(0, 0, 1920, 1080); } return; }
      if (k === cur) return;
      cur = k;
      const fr = new Image(); fr.src = `media/mp-${name}/f${String(k).padStart(4, '0')}.png`;
      pend.push(fr.decode().then(() => { if (cur === k) { ctx.clearRect(0, 0, 1920, 1080); ctx.drawImage(fr, 0, 0); } }).catch(() => {}));
    });
    return cv;
  };
})();
