# 🔢 Reconocedor de Dígitos Manuscritos — CNN con TensorFlow.js

Aplicación web que **reconoce números escritos a mano (0–9)** usando una **Red
Neuronal Convolucional (CNN)** que se ejecuta **100 % en el navegador** con
TensorFlow.js. Además de predecir, incluye un **visualizador interactivo de la
arquitectura** para mostrar de forma transparente cómo funciona la red.

> Proyecto académico · Duoc UC · "Implementación de Red Neuronal Convolucional".

---

## ✨ Características

- **Dibujo a mano alzada** en un lienzo, con mouse o pantalla táctil.
- **Predicción en vivo:** mientras dibujas se actualizan en tiempo real el dígito
  predicho, su nivel de confianza y las **10 probabilidades** (una por dígito).
- **Preprocesamiento estilo MNIST:** el trazo se recorta, se escala y se centra
  por su centro de masa en una imagen de 28×28, igual que los datos de
  entrenamiento (mejora bastante la precisión).
- **Vista de la entrada real:** muestra la imagen de 28×28 que "ve" la red.
- **Visualizador de arquitectura interactivo** (estilo *TensorFlow Playground*):
  - Reacciona **en vivo** a tu dibujo: muestra tu imagen en la entrada y resalta
    el dígito que la red predice con sus probabilidades reales.
  - **Modo de ejemplo**: elige un dígito (0–9) y pulsa *Ejecutar* para ver el
    recorrido animado por la red, con opción de *repetir* en bucle.
  - **Popups por capa**: haz clic en cualquier capa para leer qué hace y cómo
    funciona específicamente en este modelo.
- **Diseño responsive**: se adapta a celular, tablet y escritorio.

---

## 🧠 ¿Cómo funciona la predicción?

1. **Dibujas** un número. El trazo se captura en blanco sobre negro, igual que
   las imágenes del dataset MNIST.
2. **Preprocesamiento:** se detecta el dígito, se recorta, se escala a ~20 px y
   se centra por su centro de masa dentro de un lienzo de **28×28**.
3. **Red convolucional:** la imagen pasa por 3 bloques `Conv2D + MaxPooling` que
   detectan desde bordes simples hasta formas complejas.
4. **Capas densas:** los datos se aplanan (1152 valores) y pasan por una capa
   `Dense` de 512 neuronas.
5. **Softmax:** la capa final de 10 neuronas entrega **10 probabilidades que
   suman 100 %** (una por dígito).
6. **Decisión:** se elige el dígito con mayor probabilidad. Eso es la predicción.

---

## 🏗️ Arquitectura del modelo

| # | Capa            | Detalle                    | Salida       |
|---|-----------------|----------------------------|--------------|
| 1 | Input           | imagen en escala de grises | 28×28×1      |
| 2 | Conv2D          | 32 filtros 3×3 · ReLU      | 28×28×32     |
| 3 | MaxPooling2D    | 2×2                        | 14×14×32     |
| 4 | Conv2D          | 64 filtros 3×3 · ReLU      | 14×14×64     |
| 5 | MaxPooling2D    | 2×2                        | 7×7×64       |
| 6 | Conv2D          | 128 filtros 3×3 · ReLU     | 7×7×128      |
| 7 | MaxPooling2D    | 2×2                        | 3×3×128      |
| 8 | Flatten         | aplanar                    | 1152         |
| 9 | Dense           | 512 · ReLU                 | 512          |
| 10| Dense (salida)  | 10 · Softmax               | 10           |

El modelo **ya está entrenado**: `model.json` describe la arquitectura y
`group1-shard1of1.bin` contiene los pesos aprendidos.

---

## 🛠️ Construido con

- **HTML5, CSS3 y JavaScript (vanilla)** — sin frameworks ni paso de build.
- **[TensorFlow.js](https://www.tensorflow.org/js) 4.x** (vía CDN) — carga el
  modelo y ejecuta la inferencia en el navegador.
- **SVG** — para el visualizador interactivo de la arquitectura.
- **Google Fonts** — *Sora* e *IBM Plex Sans/Mono*.

El modelo fue entrenado aparte con **Python (Kedro)** — esa es la mitad de
*ciencia de datos* del proyecto y no es necesaria para ejecutar la web (ver
`requerimients.txt`).

---

## 📁 Estructura del proyecto

```
reconocedor-digitos/
├── index.html               # Página principal (UI + visualizador de arquitectura)
├── css/
│   └── styles.css           # Estilos, responsive y detalles visuales
├── js/
│   └── app.js               # Dibujo, preprocesamiento y predicción en vivo
├── model/
│   ├── model.json           # Arquitectura del modelo
│   └── group1-shard1of1.bin # Pesos entrenados (~2.7 MB)
├── assets/
│   ├── Logo_Duoc.png
│   └── Logo_Duoc.svg
└── README.md
```

---

## ▶️ Cómo ejecutarlo

El modelo se carga con `fetch`, y los navegadores **bloquean** esa carga cuando
el archivo se abre directamente (`file://`). Por eso hay que servir el proyecto
por **HTTP** desde un servidor local. Elige una opción:

**Opción A — Python (lo más simple):**
```bash
cd reconocedor-digitos
python -m http.server 8000
# luego abre http://localhost:8000
```

**Opción B — VS Code:** instala la extensión *Live Server*, clic derecho en
`index.html` → *Open with Live Server*.

**Opción C — Node:** `npx serve` dentro de la carpeta.

> ⚠️ Si abres `index.html` con doble clic verás "Error al cargar el modelo":
> es porque no se está sirviendo por HTTP.

---

## 📝 Notas

- Se necesita conexión a internet para cargar TensorFlow.js desde el CDN.
- Funciona en navegadores modernos (Chrome, Edge, Firefox, Safari) y en móviles.
- En el visualizador de arquitectura, el patrón de color de las cajas y el peso
  de los cables son **ilustrativos**; las capas y las formas (28×28×1,
  14×14×32, …) son las **reales** del modelo, y la predicción siempre es real.
- La predicción en vivo está limitada a ~20 veces por segundo para mantenerla
  fluida (parámetro `LIVE_MS` en `js/app.js`).

---

## 🎓 Créditos

- Modelo entrenado con el dataset **MNIST** de dígitos manuscritos.
- Visualizador inspirado en **TensorFlow Playground**.
- Desarrollado para **Duoc UC**.