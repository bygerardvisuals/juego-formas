// =====================================================================
// JUEGO DE FORMAS  -  p5.js + OpenCV.js
//
// DOCUMENTACIÓN OFICIAL
// p5.js (dibujo y cámara)
//   Referencia completa ....... https://p5js.org/reference/
//   Cámara: createCapture ..... https://p5js.org/reference/p5/createCapture/
//   Objeto de la cámara ....... https://p5js.org/reference/p5/p5.MediaElement/
//   Leer píxeles: loadPixels .. https://p5js.org/reference/p5/loadPixels/
// OpenCV.js (detección)
//   Todos los tutoriales ...... https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html
//   Cargar OpenCV.js .......... https://docs.opencv.org/4.x/d0/d84/tutorial_js_usage.html
//   Imágenes (Mat, roi) ....... https://docs.opencv.org/4.x/de/d06/tutorial_js_basic_ops.html
//   Gris y umbral (índice) .... https://docs.opencv.org/4.x/d2/df0/tutorial_js_table_of_contents_imgproc.html
//   Buscar contornos .......... https://docs.opencv.org/4.x/d5/daa/tutorial_js_contours_begin.html
//   Área y esquinas ........... https://docs.opencv.org/4.x/dc/dcf/tutorial_js_contour_features.html
// =====================================================================


// ---------------------------------------------------------------------
// 1. NÚMEROS QUE PUEDES CAMBIAR
// ---------------------------------------------------------------------

// Pon true para ver la cámara y lo que detecta. Pon false para jugar.
let modoPrueba = true;

// Lo más oscuro que este número (de 0 a 255) es "pieza".
// Si no ve las piezas, súbelo. Si ve sombras, bájalo.
let umbral = 80;

// Tamaño de una pieza vista por la cámara, en píxeles.
// Más pequeño que areaMinima = suciedad, se ignora.
// Más grande que areaMaxima = no es una pieza, se ignora.
let areaMinima = 1500;
let areaMaxima = 20000;

// Cuánto se "redondea" la silueta antes de contar sus esquinas.
// Si un círculo sale como cuadrado, bájalo.
// Si un cuadrado sale como círculo, súbelo.
let tolerancia = 10;

// Gris de una casilla apagada (0 = negro, 255 = blanco).
// No puede ser negro del todo: la cámara ve las piezas negras gracias
// a la luz del proyector que hay detrás. Si no las ve, súbelo.
let brilloCasillaApagada = 60;

// Dónde se DIBUJA cada casilla en la proyección (píxeles de pantalla).
// Estos números son para un proyector de 1280 x 720.
let casillasPantalla = [
  { x: 20,  y: 20,  ancho: 600, alto: 320 },   // casilla 1
  { x: 660, y: 20,  ancho: 600, alto: 320 },   // casilla 2
  { x: 20,  y: 380, ancho: 600, alto: 320 },   // casilla 3
  { x: 660, y: 380, ancho: 600, alto: 320 }    // casilla 4
];

// Dónde VE la cámara cada casilla (píxeles de cámara, de 640 x 480).
// Cada zona tiene que quedar un poco por dentro de su casilla.
let zonasCamara = [
  { x: 100, y: 40,  ancho: 200, alto: 180 },   // casilla 1
  { x: 340, y: 40,  ancho: 200, alto: 180 },   // casilla 2
  { x: 100, y: 260, ancho: 200, alto: 180 },   // casilla 3
  { x: 340, y: 260, ancho: 200, alto: 180 }    // casilla 4
];


// ---------------------------------------------------------------------
// 2. COSAS QUE EL JUEGO RECUERDA
// ---------------------------------------------------------------------

let captura;                                            // la cámara
let formasPosibles = ["triángulo", "cuadrado", "círculo"];
let formasObjetivo = [];                                // la forma secreta de cada casilla
let formasDetectadas = ["ninguna", "ninguna", "ninguna", "ninguna"];


// ---------------------------------------------------------------------
// 3. AL EMPEZAR (se ejecuta una sola vez)
//    https://p5js.org/reference/p5/setup/
// ---------------------------------------------------------------------

function setup() {
  createCanvas(1280, 720);
  textSize(16);

  // Encender la cámara
  // https://p5js.org/reference/p5/createCapture/
  // "environment" = la cámara de atrás del móvil.
  // En un ordenador se usa la cámara que haya.
  captura = createCapture({ audio: false, video: { facingMode: "environment" } });
  captura.size(640, 480);
  captura.hide();

  // Elegir una forma secreta al azar para cada casilla
  // https://p5js.org/reference/p5/random/
  for (let i = 0; i < 4; i++) {
    formasObjetivo[i] = random(formasPosibles);
  }
}


// ---------------------------------------------------------------------
// 4. TODO EL RATO (se repite muchas veces por segundo)
//    https://p5js.org/reference/p5/draw/
// ---------------------------------------------------------------------

function draw() {

  // OpenCV.js tarda unos segundos en estar listo. Mientras, no hacemos nada.
  // https://docs.opencv.org/4.x/d0/d84/tutorial_js_usage.html
  if (!cv.Mat) {
    return;
  }

  // ---- PASO 1: mirar por la cámara ----
  // https://p5js.org/reference/p5/loadPixels/
  captura.loadPixels();

  if (captura.pixels.length > 0) {

    // Dar la foto de la cámara a OpenCV. Un "Mat" es una imagen de OpenCV.
    // https://docs.opencv.org/4.x/de/d06/tutorial_js_basic_ops.html
    let imagenCamara = cv.matFromArray(480, 640, cv.CV_8UC4, captura.pixels);

    // Convertirla a blanco y negro con grises (cvtColor)
    // y después a solo blanco o negro (threshold):
    // lo oscuro (las piezas) queda blanco y todo lo demás negro.
    // https://docs.opencv.org/4.x/d2/df0/tutorial_js_table_of_contents_imgproc.html
    let imagenGris = new cv.Mat();
    cv.cvtColor(imagenCamara, imagenGris, cv.COLOR_RGBA2GRAY);
    let imagenBinaria = new cv.Mat();
    cv.threshold(imagenGris, imagenBinaria, umbral, 255, cv.THRESH_BINARY_INV);

    // ---- PASO 2: mirar las cuatro casillas, una por una ----
    for (let i = 0; i < 4; i++) {

      // Recortar el trozo de foto de esta casilla
      let zona = zonasCamara[i];
      let recorte = imagenBinaria.roi(new cv.Rect(zona.x, zona.y, zona.ancho, zona.alto));

      // Buscar las siluetas que hay en el recorte
      // https://docs.opencv.org/4.x/d5/daa/tutorial_js_contours_begin.html
      let contornos = new cv.MatVector();
      let jerarquia = new cv.Mat();
      cv.findContours(recorte, contornos, jerarquia, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      // De momento, la casilla está vacía
      formasDetectadas[i] = "ninguna";

      // Mirar cada silueta
      for (let j = 0; j < contornos.size(); j++) {
        let contorno = contornos.get(j);

        // ¿Tiene tamaño de pieza?
        // https://docs.opencv.org/4.x/dc/dcf/tutorial_js_contour_features.html
        let area = cv.contourArea(contorno);
        if (area > areaMinima && area < areaMaxima) {

          // Contar las esquinas de la silueta
          let poligono = new cv.Mat();
          cv.approxPolyDP(contorno, poligono, tolerancia, true);
          let esquinas = poligono.rows;

          if (esquinas == 3) {
            formasDetectadas[i] = "triángulo";
          } else if (esquinas == 4) {
            formasDetectadas[i] = "cuadrado";
          } else {
            formasDetectadas[i] = "círculo";
          }

          poligono.delete();
        }
        contorno.delete();
      }

      // OpenCV no limpia solo: hay que borrar cada imagen al terminar
      recorte.delete();
      contornos.delete();
      jerarquia.delete();
    }

    imagenCamara.delete();
    imagenGris.delete();
    imagenBinaria.delete();
  }

  // ---- PASO 3: contar los aciertos ----
  let aciertos = 0;
  for (let i = 0; i < 4; i++) {
    if (formasDetectadas[i] == formasObjetivo[i]) {
      aciertos = aciertos + 1;
    }
  }

  // ---- PASO 4: dibujar ----
  noStroke();

  if (aciertos == 4) {
    // ¡Victoria! Todo verde
    background(0, 255, 0);
  } else {
    // Dibujar las cuatro casillas
    background(0);
    for (let i = 0; i < 4; i++) {
      if (formasDetectadas[i] == formasObjetivo[i]) {
        fill(0, 255, 0);               // acierto: verde
      } else {
        fill(brilloCasillaApagada);    // vacía o equivocada: oscura
      }
      let casilla = casillasPantalla[i];
      // https://p5js.org/reference/p5/rect/
      rect(casilla.x, casilla.y, casilla.ancho, casilla.alto);
    }
  }

  // ---- PASO 5: modo prueba (solo si modoPrueba es true) ----
  if (modoPrueba) {
    // Dibujar lo que ve la cámara
    // https://p5js.org/reference/p5/image/
    image(captura, 0, 0);

    for (let i = 0; i < 4; i++) {
      let zona = zonasCamara[i];

      // Marco amarillo de la zona
      noFill();
      stroke(255, 255, 0);
      rect(zona.x, zona.y, zona.ancho, zona.alto);

      // Qué ha detectado y cuál es la forma secreta
      noStroke();
      fill(255, 255, 0);
      text("Casilla " + (i + 1), zona.x + 5, zona.y + 20);
      text("veo: " + formasDetectadas[i], zona.x + 5, zona.y + 40);
      text("secreta: " + formasObjetivo[i], zona.x + 5, zona.y + 60);
    }

    // Posición del ratón, para saber qué números poner en zonasCamara
    text("ratón  x: " + mouseX + "  y: " + mouseY, 10, 500);
  }
}
