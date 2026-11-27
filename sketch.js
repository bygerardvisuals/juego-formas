// =====================================================================
// JUEGO DE FORMAS  -  p5.js + OpenCV.js
//
// IDEA: la cámara mira cada casilla y CUENTA cuántos puntos negros hay.
//   pocos puntos negros      -> casilla vacía
//   algunos                  -> triángulo (la pieza más pequeña)
//   más                      -> círculo
//   muchos                   -> cuadrado  (la pieza más grande)
// Para que funcione, las tres piezas tienen que medir lo mismo de ancho.
//
// DOCUMENTACIÓN OFICIAL
//   p5.js, todo ............... https://p5js.org/reference/
//   p5.js, cámara ............. https://p5js.org/reference/p5/createCapture/
//   p5.js, leer píxeles ....... https://p5js.org/reference/p5/loadPixels/
//   OpenCV.js, tutoriales ..... https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html
//   OpenCV.js, cómo cargarlo .. https://docs.opencv.org/4.x/d0/d84/tutorial_js_usage.html
//   OpenCV.js, imágenes ....... https://docs.opencv.org/4.x/de/d06/tutorial_js_basic_ops.html
//   OpenCV.js, gris y umbral .. https://docs.opencv.org/4.x/d2/df0/tutorial_js_table_of_contents_imgproc.html
// =====================================================================


// ---------------------------------------------------------------------
// 1. NÚMEROS QUE PUEDES CAMBIAR
// ---------------------------------------------------------------------

// true = ver la cámara y los números.  false = jugar.
let modoPrueba = true;

// Lo más oscuro que este número (de 0 a 255) cuenta como punto negro.
let umbral = 80;

// Cuántos puntos negros hacen falta para cada forma.
// Pon modoPrueba = true, coloca cada pieza y mira qué número sale.
let desdeTriangulo = 1500;    // menos que esto: casilla vacía
let desdeCirculo = 5000;
let desdeCuadrado = 7200;
let demasiado = 10000;        // más que esto: no es una pieza (una mano, una sombra)

// Gris de una casilla apagada (0 = negro, 255 = blanco).
// No puede ser negro del todo o la cámara no vería las piezas.
let brilloCasillaApagada = 60;

// Dónde se DIBUJA cada casilla (casilla 1, 2, 3 y 4)
let casillaX = [20, 660, 20, 660];
let casillaY = [20, 20, 380, 380];
let casillaAncho = 600;
let casillaAlto = 320;

// Dónde VE la cámara cada casilla (casilla 1, 2, 3 y 4)
let zonaX = [100, 340, 100, 340];
let zonaY = [40, 40, 260, 260];
let zonaAncho = 200;
let zonaAlto = 180;


// ---------------------------------------------------------------------
// 2. COSAS QUE EL JUEGO RECUERDA
// ---------------------------------------------------------------------

let captura;
let formasPosibles = ["triángulo", "cuadrado", "círculo"];
let formasSecretas = ["", "", "", ""];
let formasVistas = ["ninguna", "ninguna", "ninguna", "ninguna"];
let puntosNegros = [0, 0, 0, 0];


// ---------------------------------------------------------------------
// 3. AL EMPEZAR (una sola vez)
// ---------------------------------------------------------------------

function setup() {
  createCanvas(1280, 720);
  textSize(16);

  // Encender la cámara de atrás del móvil (o la del ordenador)
  captura = createCapture({ audio: false, video: { facingMode: "environment" } });
  captura.size(640, 480);
  captura.hide();

  // Elegir las cuatro formas secretas al azar
  formasSecretas[0] = random(formasPosibles);
  formasSecretas[1] = random(formasPosibles);
  formasSecretas[2] = random(formasPosibles);
  formasSecretas[3] = random(formasPosibles);
}


// ---------------------------------------------------------------------
// 4. TODO EL RATO (muchas veces por segundo)
// ---------------------------------------------------------------------

function draw() {

  // Esperar a que OpenCV.js esté listo
  if (!cv.Mat) {
    return;
  }

  // ---- PASO 1: hacer una foto con la cámara ----
  captura.loadPixels();

  if (captura.pixels.length > 0) {

    // Dar la foto a OpenCV
    let foto = cv.matFromArray(480, 640, cv.CV_8UC4, captura.pixels);

    // Pasarla a grises
    cv.cvtColor(foto, foto, cv.COLOR_RGBA2GRAY);

    // Lo oscuro (las piezas) se vuelve blanco y todo lo demás negro
    cv.threshold(foto, foto, umbral, 255, cv.THRESH_BINARY_INV);

    // ---- PASO 2: mirar las cuatro casillas ----
    for (let i = 0; i < 4; i++) {

      // Recortar el trozo de foto de esta casilla
      let recorte = foto.roi(new cv.Rect(zonaX[i], zonaY[i], zonaAncho, zonaAlto));

      // Contar los puntos de la pieza
      puntosNegros[i] = cv.countNonZero(recorte);

      // Decidir qué forma es según cuántos puntos hay
      formasVistas[i] = "ninguna";
      if (puntosNegros[i] > desdeTriangulo) { formasVistas[i] = "triángulo"; }
      if (puntosNegros[i] > desdeCirculo)   { formasVistas[i] = "círculo"; }
      if (puntosNegros[i] > desdeCuadrado)  { formasVistas[i] = "cuadrado"; }
      if (puntosNegros[i] > demasiado)      { formasVistas[i] = "ninguna"; }

      // OpenCV no limpia solo: hay que borrar lo que ya no se usa
      recorte.delete();
    }

    foto.delete();
  }

  // ---- PASO 3: contar aciertos ----
  let aciertos = 0;
  for (let i = 0; i < 4; i++) {
    if (formasVistas[i] == formasSecretas[i]) {
      aciertos = aciertos + 1;
    }
  }

  // ---- PASO 4: dibujar ----
  noStroke();

  if (aciertos == 4) {
    // ¡Victoria! Todo verde
    background(0, 255, 0);
  } else {
    background(0);
    for (let i = 0; i < 4; i++) {
      if (formasVistas[i] == formasSecretas[i]) {
        fill(0, 255, 0);               // acierto: verde
      } else {
        fill(brilloCasillaApagada);    // vacía o equivocada: oscura
      }
      rect(casillaX[i], casillaY[i], casillaAncho, casillaAlto);
    }
  }

  // ---- PASO 5: modo prueba ----
  if (modoPrueba) {
    image(captura, 0, 0);

    for (let i = 0; i < 4; i++) {
      // Marco amarillo de la zona
      noFill();
      stroke(255, 255, 0);
      rect(zonaX[i], zonaY[i], zonaAncho, zonaAlto);

      // Números y formas
      noStroke();
      fill(255, 255, 0);
      text("puntos negros: " + puntosNegros[i], zonaX[i] + 5, zonaY[i] + 20);
      text("veo: " + formasVistas[i], zonaX[i] + 5, zonaY[i] + 40);
      text("secreta: " + formasSecretas[i], zonaX[i] + 5, zonaY[i] + 60);
    }

    // Dónde está el dedo o el ratón, para ajustar zonaX y zonaY
    text("x: " + mouseX + "  y: " + mouseY, 10, 500);
  }
}
