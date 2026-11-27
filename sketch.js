// =====================================================================
// JUEGO DE FORMAS  -  p5.js + OpenCV.js
//
// EL TABLERO ES UN PAPEL BLANCO CON UNA CRUZ NEGRA DIBUJADA.
// La cruz parte el papel en cuatro casillas:
//
//        1 | 2
//       ---+---
//        3 | 4
//
// El móvil enfoca el papel, busca la cruz y escribe en cada casilla
// la forma que ve. Si es la forma secreta, la casilla se pone verde.
// Con las cuatro bien, toda la pantalla se pone verde.
//
// CÓMO RECONOCE LAS FORMAS: cuenta los puntos negros de cada casilla.
//   pocos -> vacía    algunos -> triángulo    más -> círculo    muchos -> cuadrado
// Por eso las tres piezas tienen que medir lo mismo de ancho.
//
// DOCUMENTACIÓN OFICIAL
//   p5.js, todo ............... https://p5js.org/reference/
//   p5.js, cámara ............. https://p5js.org/reference/p5/createCapture/
//   p5.js, leer píxeles ....... https://p5js.org/reference/p5/loadPixels/
//   p5.js, escribir texto ..... https://p5js.org/reference/p5/text/
//   OpenCV.js, tutoriales ..... https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html
//   OpenCV.js, cómo cargarlo .. https://docs.opencv.org/4.x/d0/d84/tutorial_js_usage.html
//   OpenCV.js, imágenes ....... https://docs.opencv.org/4.x/de/d06/tutorial_js_basic_ops.html
//   OpenCV.js, gris, umbral, borrar formas finas y desenfocar (índice)
//                               https://docs.opencv.org/4.x/d2/df0/tutorial_js_table_of_contents_imgproc.html
// =====================================================================


// ---------------------------------------------------------------------
// 1. NÚMEROS QUE PUEDES CAMBIAR
// ---------------------------------------------------------------------

// MODO PRUEBA: en cada casilla enseña la forma que ESPERA y los puntos negros.
// true = se ve siempre.  false = solo se ve mientras tocas la pantalla.
let modoPrueba = true;

// Lo más oscuro que este número (de 0 a 255) cuenta como punto negro.
let umbral = 80;

// Cuánta "fuerza" tiene que tener el cruce de las dos rayas (de 0 a 255).
// En modo prueba se ve el número arriba. Si no encuentra la cruz, bájalo.
let cruzMinima = 20;

// Tamaño de cada casilla y cuánto se separa de la cruz (en puntos de cámara)
let zonaTamano = 150;
let margen = 20;

// Cuántos puntos negros hacen falta para cada forma.
// Pon modoPrueba = true, coloca cada pieza y mira qué número sale.
let desdeTriangulo = 1500;    // menos que esto: casilla vacía
let desdeCirculo = 5000;
let desdeCuadrado = 7200;
let demasiado = 10000;        // más que esto: no es una pieza (una mano, una sombra)


// ---------------------------------------------------------------------
// 2. COSAS QUE EL JUEGO RECUERDA
// ---------------------------------------------------------------------

let captura;
let formasPosibles = ["triángulo", "cuadrado", "círculo"];
let formasSecretas = ["", "", "", ""];
let formasVistas = ["ninguna", "ninguna", "ninguna", "ninguna"];
let puntosNegros = [0, 0, 0, 0];

let hayCruz = false;
let fuerzaCruz = 0;
let cruzX = 0;
let cruzY = 0;
let zonaX = [0, 0, 0, 0];
let zonaY = [0, 0, 0, 0];


// ---------------------------------------------------------------------
// 3. AL EMPEZAR (una sola vez)
// ---------------------------------------------------------------------

function setup() {
  createCanvas(640, 480);

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

  // Enseñar lo que ve la cámara
  image(captura, 0, 0);

  // ---- PASO 1: hacer una foto con la cámara ----
  captura.loadPixels();

  if (captura.pixels.length > 0) {

    // Dar la foto a OpenCV y pasarla a grises
    let foto = cv.matFromArray(480, 640, cv.CV_8UC4, captura.pixels);
    cv.cvtColor(foto, foto, cv.COLOR_RGBA2GRAY);

    // Lo oscuro (rayas y piezas) se vuelve blanco y el papel negro
    cv.threshold(foto, foto, umbral, 255, cv.THRESH_BINARY_INV);

    // ---- PASO 2: separar las piezas de las rayas ----
    // "piezas" = la foto sin las cosas finas (se borran las rayas de la cruz)
    let piezas = new cv.Mat();
    let pincel = cv.Mat.ones(21, 21, cv.CV_8U);
    cv.morphologyEx(foto, piezas, cv.MORPH_OPEN, pincel);

    // "rayas" = la foto menos las piezas (solo queda la cruz)
    let rayas = new cv.Mat();
    cv.subtract(foto, piezas, rayas);

    // ---- PASO 3: buscar el centro de la cruz ----
    // Al desenfocar las rayas, el punto más brillante es donde se cruzan
    cv.blur(rayas, rayas, new cv.Size(41, 41));
    let cruce = cv.minMaxLoc(rayas);
    fuerzaCruz = cruce.maxVal;
    cruzX = cruce.maxLoc.x;
    cruzY = cruce.maxLoc.y;

    // Las cuatro casillas se colocan alrededor de la cruz
    let izquierda = cruzX - margen - zonaTamano;
    let derecha = cruzX + margen;
    let arriba = cruzY - margen - zonaTamano;
    let abajo = cruzY + margen;
    zonaX = [izquierda, derecha, izquierda, derecha];
    zonaY = [arriba, arriba, abajo, abajo];

    // Hay cruz si el cruce es fuerte y las cuatro casillas caben en la foto
    hayCruz = false;
    if (fuerzaCruz > cruzMinima) {
      if (izquierda > 0 && arriba > 0 && derecha + zonaTamano < 640 && abajo + zonaTamano < 480) {
        hayCruz = true;
      }
    }

    // ---- PASO 4: mirar las cuatro casillas ----
    for (let i = 0; i < 4; i++) {
      formasVistas[i] = "ninguna";
      puntosNegros[i] = 0;

      if (hayCruz) {
        // Recortar el trozo de esta casilla y contar los puntos de la pieza
        let recorte = piezas.roi(new cv.Rect(zonaX[i], zonaY[i], zonaTamano, zonaTamano));
        puntosNegros[i] = cv.countNonZero(recorte);
        recorte.delete();

        // Decidir qué forma es según cuántos puntos hay
        if (puntosNegros[i] > desdeTriangulo) { formasVistas[i] = "triángulo"; }
        if (puntosNegros[i] > desdeCirculo)   { formasVistas[i] = "círculo"; }
        if (puntosNegros[i] > desdeCuadrado)  { formasVistas[i] = "cuadrado"; }
        if (puntosNegros[i] > demasiado)      { formasVistas[i] = "ninguna"; }
      }
    }

    // OpenCV no limpia solo: hay que borrar lo que ya no se usa
    foto.delete();
    piezas.delete();
    pincel.delete();
    rayas.delete();
  }

  // ---- PASO 5: contar aciertos ----
  let aciertos = 0;
  for (let i = 0; i < 4; i++) {
    if (formasVistas[i] == formasSecretas[i]) {
      aciertos = aciertos + 1;
    }
  }

  // ---- PASO 6: pintar el verde y escribir los textos ----
  textSize(22);

  // El modo prueba se ve si modoPrueba es true
  // o mientras tocas la pantalla con el dedo
  let verPrueba = false;
  if (modoPrueba) { verPrueba = true; }
  if (mouseIsPressed) { verPrueba = true; }

  if (hayCruz == false) {
    stroke(0);
    strokeWeight(4);
    fill(255);
    text("Enfoca la cruz", 240, 240);
  }

  if (hayCruz) {
    for (let i = 0; i < 4; i++) {

      // Casilla correcta: cuadrado verde transparente encima
      if (formasVistas[i] == formasSecretas[i]) {
        noStroke();
        fill(0, 255, 0, 120);
        rect(zonaX[i], zonaY[i], zonaTamano, zonaTamano);
      }

      // La forma que ve, en letras blancas con borde negro
      stroke(0);
      strokeWeight(4);
      fill(255);
      text("veo: " + formasVistas[i], zonaX[i] + 5, zonaY[i] + 30);

      // En modo prueba, también la forma que espera y los puntos negros
      if (verPrueba) {
        fill(255, 255, 0);
        text("espera: " + formasSecretas[i], zonaX[i] + 5, zonaY[i] + 60);
        text("puntos: " + puntosNegros[i], zonaX[i] + 5, zonaY[i] + 90);
      }
    }
  }

  if (verPrueba) {
    stroke(0);
    strokeWeight(4);
    fill(255, 255, 0);
    text("fuerza de la cruz: " + fuerzaCruz, 10, 470);
  }

  // ¡Victoria! Toda la pantalla verde
  if (aciertos == 4) {
    noStroke();
    fill(0, 255, 0, 150);
    rect(0, 0, 640, 480);
  }
}
