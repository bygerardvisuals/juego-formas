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
// El móvil enfoca el papel y busca las manchas negras (siluetas):
//   - la silueta más grande y con poca tinta es la CRUZ
//   - las demás siluetas son PIEZAS
// Cada pieza está a la izquierda o a la derecha de la cruz, y arriba o abajo:
// así se sabe en qué casilla está. Su forma se sabe mirando cuánto llena
// la caja que la envuelve:
//   la mitad = triángulo     tres cuartos = círculo     toda = cuadrado
//
// Si la forma es la que la casilla espera, la casilla se pone verde.
// Con las cuatro bien, toda la pantalla se pone verde.
//
// DOCUMENTACIÓN OFICIAL
//   p5.js, todo ............... https://p5js.org/reference/
//   p5.js, cámara ............. https://p5js.org/reference/p5/createCapture/
//   p5.js, leer píxeles ....... https://p5js.org/reference/p5/loadPixels/
//   p5.js, escribir texto ..... https://p5js.org/reference/p5/text/
//   OpenCV.js, tutoriales ..... https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html
//   OpenCV.js, cómo cargarlo .. https://docs.opencv.org/4.x/d0/d84/tutorial_js_usage.html
//   OpenCV.js, imágenes ....... https://docs.opencv.org/4.x/de/d06/tutorial_js_basic_ops.html
//   OpenCV.js, gris y umbral .. https://docs.opencv.org/4.x/d2/df0/tutorial_js_table_of_contents_imgproc.html
//   OpenCV.js, siluetas ....... https://docs.opencv.org/4.x/d5/daa/tutorial_js_contours_begin.html
//   OpenCV.js, área y cajas ... https://docs.opencv.org/4.x/dc/dcf/tutorial_js_contour_features.html
// =====================================================================


// ---------------------------------------------------------------------
// 1. NÚMEROS QUE PUEDES CAMBIAR
// ---------------------------------------------------------------------

// MODO PRUEBA: en cada casilla enseña la forma que ESPERA y el relleno que mide.
// true = se ve siempre.  false = solo se ve mientras tocas la pantalla.
let modoPrueba = true;

// Una mancha más pequeña que esto es suciedad y se ignora.
let areaMinima = 1000;

// Cuánto llena cada forma la caja más justa que la envuelve (de 0 a 100):
//   un triángulo llena la mitad (50), un círculo tres cuartos (78), un cuadrado toda (100)
// En modo prueba se ve el número de cada pieza ("relleno").
let desdeCirculo = 65;     // menos que esto: triángulo
let desdeCuadrado = 88;    // más que esto: cuadrado


// ---------------------------------------------------------------------
// 2. COSAS QUE EL JUEGO RECUERDA
// ---------------------------------------------------------------------

let captura;
let formasPosibles = ["triángulo", "cuadrado", "círculo"];
let formasSecretas = ["", "", "", ""];
let formasVistas = ["ninguna", "ninguna", "ninguna", "ninguna"];
let rellenoVisto = [0, 0, 0, 0];

let hayCruz = false;
let cruzX = 0;
let cruzY = 0;


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

  // ---- PASO 1: hacer una foto y buscar las siluetas negras ----
  captura.loadPixels();

  if (captura.pixels.length > 0) {

    // Dar la foto a OpenCV y pasarla a grises
    let foto = cv.matFromArray(480, 640, cv.CV_8UC4, captura.pixels);
    cv.cvtColor(foto, foto, cv.COLOR_RGBA2GRAY);

    // Separar tinta y papel. Cada punto se compara con los de su alrededor,
    // así funciona aunque el papel tenga sombras o poca luz.
    cv.adaptiveThreshold(foto, foto, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY_INV, 201, 25);

    // Buscar las siluetas
    let siluetas = new cv.MatVector();
    let jerarquia = new cv.Mat();
    cv.findContours(foto, siluetas, jerarquia, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    // ---- PASO 2: encontrar la cruz ----
    // Es la silueta con la caja más grande y con poca tinta dentro de su caja
    hayCruz = false;
    let numeroCruz = -1;
    let cajaMayor = 20000;

    for (let j = 0; j < siluetas.size(); j++) {
      let silueta = siluetas.get(j);
      let caja = cv.boundingRect(silueta);
      let tinta = cv.contourArea(silueta);
      let tamanoCaja = caja.width * caja.height;

      // Las siluetas que tocan el borde de la foto no valen
      let tocaBorde = false;
      if (caja.x < 2) { tocaBorde = true; }
      if (caja.y < 2) { tocaBorde = true; }
      if (caja.x + caja.width > 638) { tocaBorde = true; }
      if (caja.y + caja.height > 478) { tocaBorde = true; }

      if (tocaBorde == false && tamanoCaja > cajaMayor && tinta * 3 < tamanoCaja) {
        cajaMayor = tamanoCaja;
        numeroCruz = j;
        hayCruz = true;

        // El centro de la cruz
        let peso = cv.moments(silueta);
        cruzX = peso.m10 / peso.m00;
        cruzY = peso.m01 / peso.m00;
      }
      silueta.delete();
    }

    // ---- PASO 3: mirar las piezas ----
    formasVistas = ["ninguna", "ninguna", "ninguna", "ninguna"];
    rellenoVisto = [0, 0, 0, 0];

    for (let j = 0; j < siluetas.size(); j++) {
      let silueta = siluetas.get(j);
      let caja = cv.boundingRect(silueta);
      let tinta = cv.contourArea(silueta);

      let tocaBorde = false;
      if (caja.x < 2) { tocaBorde = true; }
      if (caja.y < 2) { tocaBorde = true; }
      if (caja.x + caja.width > 638) { tocaBorde = true; }
      if (caja.y + caja.height > 478) { tocaBorde = true; }

      if (hayCruz && j != numeroCruz && tocaBorde == false && tinta > areaMinima) {

        // ¿En qué casilla está? Se mira el centro de la pieza
        let centroX = caja.x + caja.width / 2;
        let centroY = caja.y + caja.height / 2;
        let casilla = 0;
        if (centroX > cruzX) { casilla = casilla + 1; }   // a la derecha
        if (centroY > cruzY) { casilla = casilla + 2; }   // abajo

        // ¿Qué forma es? Se mira cuánto llena la pieza su caja (de 0 a 100)
        let cajaJusta = cv.minAreaRect(silueta);
        let relleno = 100 * tinta / (cajaJusta.size.width * cajaJusta.size.height);

        rellenoVisto[casilla] = round(relleno);
        formasVistas[casilla] = "triángulo";
        if (relleno > desdeCirculo)  { formasVistas[casilla] = "círculo"; }
        if (relleno > desdeCuadrado) { formasVistas[casilla] = "cuadrado"; }
      }
      silueta.delete();
    }

    // OpenCV no limpia solo: hay que borrar lo que ya no se usa
    foto.delete();
    siluetas.delete();
    jerarquia.delete();
  }

  // ---- PASO 4: contar aciertos ----
  let aciertos = 0;
  for (let i = 0; i < 4; i++) {
    if (formasVistas[i] == formasSecretas[i]) {
      aciertos = aciertos + 1;
    }
  }

  // ---- PASO 5: pintar el verde y escribir los textos ----
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
    text("Enfoca la cruz entera", 210, 240);
  }

  if (hayCruz) {
    // Dónde empieza cada casilla y cuánto mide (casilla 1, 2, 3 y 4)
    let casillaX = [0, cruzX, 0, cruzX];
    let casillaY = [0, 0, cruzY, cruzY];
    let casillaAncho = [cruzX, 640 - cruzX, cruzX, 640 - cruzX];
    let casillaAlto = [cruzY, cruzY, 480 - cruzY, 480 - cruzY];

    // Dónde se escribe el texto de cada casilla
    let textoX = [cruzX - 190, cruzX + 20, cruzX - 190, cruzX + 20];
    let textoY = [cruzY - 90, cruzY - 90, cruzY + 40, cruzY + 40];

    for (let i = 0; i < 4; i++) {

      // Casilla correcta: verde transparente encima
      if (formasVistas[i] == formasSecretas[i]) {
        noStroke();
        fill(0, 255, 0, 120);
        rect(casillaX[i], casillaY[i], casillaAncho[i], casillaAlto[i]);
      }

      // La forma que ve, en letras blancas con borde negro
      stroke(0);
      strokeWeight(4);
      fill(255);
      text("veo: " + formasVistas[i], textoX[i], textoY[i]);

      // En modo prueba, también la forma que espera y el relleno
      if (verPrueba) {
        fill(255, 255, 0);
        text("espera: " + formasSecretas[i], textoX[i], textoY[i] + 28);
        text("relleno: " + rellenoVisto[i], textoX[i], textoY[i] + 56);
      }
    }
  }

  // ¡Victoria! Toda la pantalla verde
  if (aciertos == 4) {
    noStroke();
    fill(0, 255, 0, 150);
    rect(0, 0, 640, 480);
  }
}
