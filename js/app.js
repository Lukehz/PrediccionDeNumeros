"use strict";

/* =========================================================
   Reconocedor de dígitos — lógica de la aplicación
   - Dibujo nativo (mouse + touch)
   - Preprocesamiento estilo MNIST (recorte + escala + centro de masa)
   - Predicción EN VIVO mientras se dibuja (throttle ~20 fps)
   ========================================================= */

let modelo = null;
let drawing = false;
let hasInk  = false;
let lastX = 0, lastY = 0;

// control del modo "en vivo"
let predicting = false;   // evita predicciones solapadas
let dirty = false;        // hay cambios sin predecir
let lastLive = 0;         // marca de tiempo de la última predicción
let rafId = null;
const LIVE_MS = 50;       // intervalo mínimo entre predicciones en vivo

const $ = (id) => document.getElementById(id);

const board = $("board");
const ctx   = board.getContext("2d");
const prev  = $("preview28");
const pctx  = prev.getContext("2d");
const W = board.width, H = board.height;
const btnPred = $("btnPred"), btnClear = $("btnClear");

/* ---------- Lienzo: trazo blanco sobre fondo negro (como MNIST) ---------- */
function resetBoard(){
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#fff";
  hasInk = false;
}
resetBoard();

function pos(e){
  const r = board.getBoundingClientRect();
  const p = e.touches ? e.touches[0] : e;
  return {
    x: (p.clientX - r.left) * (W / r.width),
    y: (p.clientY - r.top)  * (H / r.height)
  };
}

/* ---------- Bucle de predicción en vivo ---------- */
function scheduleLive(){
  if (rafId) return;
  const tick = (t) => {
    rafId = null;
    if (modelo && hasInk && dirty && !predicting && (t - lastLive) >= LIVE_MS){
      lastLive = t;
      dirty = false;
      predecir();          // asíncrona, no bloquea
    }
    if (drawing || dirty) rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}

/* ---------- Dibujo ---------- */
function start(e){
  e.preventDefault();
  drawing = true;
  const { x, y } = pos(e);
  lastX = x; lastY = y;
  ctx.lineWidth = +$("brush").value;
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fill();
  hasInk = true; dirty = true;
  scheduleLive();
}
function move(e){
  if (!drawing) return;
  e.preventDefault();
  const { x, y } = pos(e);
  ctx.lineWidth = +$("brush").value;
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);
  ctx.stroke();
  lastX = x; lastY = y;
  dirty = true;            // marca que hay algo nuevo que predecir
  scheduleLive();
}
function end(){
  if (!drawing) return;
  drawing = false;
  dirty = true;            // fuerza una última predicción "limpia"
  scheduleLive();
}

board.addEventListener("mousedown", start);
board.addEventListener("mousemove", move);
window.addEventListener("mouseup", end);
board.addEventListener("touchstart", start, { passive: false });
board.addEventListener("touchmove",  move,  { passive: false });
board.addEventListener("touchend",   end);

btnClear.addEventListener("click", () => {
  resetBoard();
  dirty = false; predicting = false;
  pctx.clearRect(0, 0, 28, 28);
  $("big").textContent = "–";
  $("big").classList.add("empty");
  $("conf").textContent = "Esperando un trazo…";
  renderProbs(new Array(10).fill(0), -1);
  window.dispatchEvent(new CustomEvent("cnn-clear"));
});
btnPred.addEventListener("click", () => { if (modelo && hasInk) predecir(); });

/* ---------- Preprocesamiento estilo MNIST ----------
   1) recorta al rectángulo que contiene el trazo (bounding box)
   2) escala el lado mayor a 20px conservando proporción
   3) centra el dígito en 28x28 según su CENTRO DE MASA
   Devuelve un tensor [1,28,28,1] normalizado 0..1
---------------------------------------------------------*/
function buildTensor(){
  const src = ctx.getImageData(0, 0, W, H).data;

  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++){
    for (let x = 0; x < W; x++){
      if (src[(y * W + x) * 4] > 20){
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;

  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const scale = 20 / Math.max(bw, bh);
  const dw = Math.max(1, Math.round(bw * scale));
  const dh = Math.max(1, Math.round(bh * scale));

  const t = document.createElement("canvas"); t.width = 28; t.height = 28;
  const tc = t.getContext("2d");
  tc.fillStyle = "#000"; tc.fillRect(0, 0, 28, 28);
  tc.imageSmoothingEnabled = true;
  tc.drawImage(board, minX, minY, bw, bh,
               Math.round((28 - dw) / 2), Math.round((28 - dh) / 2), dw, dh);

  let d = tc.getImageData(0, 0, 28, 28).data;
  let sum = 0, sx = 0, sy = 0;
  for (let y = 0; y < 28; y++) for (let x = 0; x < 28; x++){
    const v = d[(y * 28 + x) * 4]; sum += v; sx += v * x; sy += v * y;
  }
  let finalCtx = tc;
  if (sum > 0){
    const shiftX = Math.round(14 - sx / sum);
    const shiftY = Math.round(14 - sy / sum);
    if (shiftX || shiftY){
      const t2 = document.createElement("canvas"); t2.width = 28; t2.height = 28;
      const tc2 = t2.getContext("2d");
      tc2.fillStyle = "#000"; tc2.fillRect(0, 0, 28, 28);
      tc2.drawImage(t, shiftX, shiftY);
      d = tc2.getImageData(0, 0, 28, 28).data;
      finalCtx = tc2;
    }
  }
  // vista previa EN VIVO de lo que ve la red
  pctx.putImageData(finalCtx.getImageData(0, 0, 28, 28), 0, 0);

  const arr = new Float32Array(28 * 28);
  for (let i = 0; i < 28 * 28; i++) arr[i] = d[i * 4] / 255;
  return tf.tensor4d(arr, [1, 28, 28, 1]);
}

/* ---------- Predicción ---------- */
async function predecir(){
  if (!modelo || predicting) return;
  const t = buildTensor();
  if (!t) return;

  predicting = true;
  try {
    const out = tf.tidy(() => modelo.predict(t));
    const probs = Array.from(await out.data());
    out.dispose();

    const top = probs.indexOf(Math.max(...probs));
    $("big").textContent = top;
    $("big").classList.remove("empty");
    $("conf").innerHTML = "Confianza: <b>" + (probs[top] * 100).toFixed(1) + "%</b>";
    renderProbs(probs, top);

    // avisa al diagrama de arquitectura para que reaccione EN VIVO
    window.dispatchEvent(new CustomEvent("cnn-predict", { detail: { probs, top } }));

    if (!drawing) {  // log solo en la predicción final, para no llenar la consola
      console.log("Predicción:", top, "| probabilidades:",
        probs.map((p, i) => i + ": " + (p * 100).toFixed(2) + "%").join("  "));
    }
  } finally {
    t.dispose();
    predicting = false;
  }
}

/* ---------- Transparencia: barra + porcentaje por cada dígito ---------- */
function renderProbs(probs, top){
  const box = $("probs");
  box.innerHTML = "";
  for (let i = 0; i < 10; i++){
    const pct = (probs[i] || 0) * 100;
    const row = document.createElement("div");
    row.className = "prow" + (i === top ? " top" : "");
    row.innerHTML =
      '<div class="digit">' + i + '</div>' +
      '<div class="track"><div class="fill" style="width:' + pct.toFixed(1) + '%"></div></div>' +
      '<div class="pct">' + pct.toFixed(1) + '%</div>';
    box.appendChild(row);
  }
}
renderProbs(new Array(10).fill(0), -1);

/* ---------- Carga del modelo (con guarda y manejo de errores) ---------- */
(async () => {
  try {
    modelo = await tf.loadLayersModel("model/model.json");
    tf.tidy(() => modelo.predict(tf.zeros([1, 28, 28, 1])).dispose()); // warm-up
    $("dot").className = "dot ready";
    $("statusTxt").textContent = "Modelo listo";
    btnPred.disabled = false;
  } catch (err) {
    console.error(err);
    $("dot").className = "dot error";
    $("statusTxt").textContent = "Error al cargar el modelo — ¿estás sirviendo por HTTP?";
  }
})();