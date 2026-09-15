const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
    throw new Error("WebGL 2 não é suportado.");
}

// 1. FUNÇÕES GERADORAS
let verticesJS = [];
let coresJS = [];
let indicesJS = [];
let currentIndex = 0;

function desenharRetangulo(x, y, largura, altura, r, g, b) {
    const left = x - largura / 2, right = x + largura / 2;
    const top = y + altura / 2, bottom = y - altura / 2;

    verticesJS.push(left, top, left, bottom, right, bottom, right, top);
    coresJS.push(r, g, b, r, g, b, r, g, b, r, g, b);
    indicesJS.push(
        currentIndex, currentIndex + 1, currentIndex + 2,
        currentIndex, currentIndex + 2, currentIndex + 3
    );
    currentIndex += 4;
}

function extrairPeca(funcaoDesenho) {
    verticesJS = []; coresJS = []; indicesJS = []; currentIndex = 0;
    funcaoDesenho();
    return {
        vertices: new Float32Array(verticesJS),
        colors: new Float32Array(coresJS),
        indices: new Uint16Array(indicesJS),
        count: indicesJS.length
    };
}

const cinza = [0.55, 0.55, 0.55];
const preto = [0.0, 0.0, 0.0];
const vermelho = [0.6, 0.0, 0.0];

// Criando as 5 peças independentes
const pecaCorpo = extrairPeca(() => {
    desenharRetangulo(0.0, 0.5, 0.5, 0.4, ...cinza);      // Cabeça
    desenharRetangulo(0.0, 0.2, 0.1, 0.2, ...cinza);      // Pescoço
    desenharRetangulo(0.0, -0.1, 0.6, 0.4, ...cinza);     // Tronco
    desenharRetangulo(-0.12, 0.55, 0.1, 0.06, ...preto);  // Olho Esq
    desenharRetangulo(0.12, 0.55, 0.1, 0.06, ...preto);   // Olho Dir
    desenharRetangulo(0.0, 0.4, 0.16, 0.04, ...preto);    // Boca Centro
    desenharRetangulo(-0.11, 0.43, 0.06, 0.04, ...preto); // Boca Esq
    desenharRetangulo(0.11, 0.43, 0.06, 0.04, ...preto);  // Boca Dir
    desenharRetangulo(-0.15, 0.0, 0.12, 0.04, ...vermelho);   // Botão 1
    desenharRetangulo(-0.15, -0.08, 0.12, 0.04, ...vermelho); // Botão 2
    desenharRetangulo(-0.15, -0.16, 0.12, 0.04, ...vermelho); // Botão 3
});

const pecaBracoEsq = extrairPeca(() => desenharRetangulo(-0.35, -0.1, 0.15, 0.15, ...cinza));
const pecaBracoDir = extrairPeca(() => desenharRetangulo(0.35, -0.1, 0.15, 0.15, ...cinza));
const pecaPernaEsq = extrairPeca(() => desenharRetangulo(-0.15, -0.4, 0.2, 0.2, ...cinza));
const pecaPernaDir = extrairPeca(() => desenharRetangulo(0.15, -0.4, 0.2, 0.2, ...cinza));



// 2. SHADERS E WEBGL SETUP
const vertexShaderSource = `#version 300 es
in vec2 aPosition;
in vec3 aColor;
uniform mat3 u_transform;
out vec3 vColor;
void main() {
    // Aplica a matriz de animação nos vértices!
    vec3 position = u_transform * vec3(aPosition, 1.0);
    gl_Position = vec4(position.xy, 0.0, 1.0);
    vColor = aColor;
}`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
in vec3 vColor;
out vec4 outColor;
void main() { outColor = vec4(vColor, 1.0); }`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}

const program = gl.createProgram();
gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vertexShaderSource));
gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource));
gl.linkProgram(program);

const positionLocation = gl.getAttribLocation(program, "aPosition");
const colorLocation = gl.getAttribLocation(program, "aColor");
const transformLocation = gl.getUniformLocation(program, "u_transform");

// 3. FUNÇÃO DE DESENHO
// Como temos 5 peças, criamos buffers genéricos que são reaproveitados
const verticesBuffer = gl.createBuffer();
const colorsBuffer = gl.createBuffer();
const indicesBuffer = gl.createBuffer();

function drawPart(peca, matrizTransformacao) {
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, peca.vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, peca.colors, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, peca.indices, gl.STATIC_DRAW);

    // Envia a matriz específica desta peça para a GPU
    gl.uniformMatrix3fv(transformLocation, false, matrizTransformacao);

    gl.drawElements(gl.TRIANGLES, peca.count, gl.UNSIGNED_SHORT, 0);
}

// 4. ANIMAÇÃO
let txRobo = 0.0, dirRoboX = 0.005; 
let tyRobo = 0.0, dirRoboY = 0.003;

let tyBraco = 0.0, dirBraco = 0.02;
let tyPerna = 0.0, dirPerna = 0.015;

function atualizaAnimacao() {
    // Robô inteiro desliza no eixo X
    txRobo += dirRoboX; 
    if (txRobo > 0.4 || txRobo < -0.4) dirRoboX *= -1;

    // Robô inteiro desliza no eixo Y
    tyRobo += dirRoboY;
    if (tyRobo > 0.3 || tyRobo < -0.3) dirRoboY *= -1;

    // Braços mexem
    tyBraco += dirBraco; 
    if (tyBraco > 0.15 || tyBraco < -0.15) dirBraco *= -1;

    // Pernas mexem
    tyPerna += dirPerna; 
    if (tyPerna > 0.1 || tyPerna < -0.1) dirPerna *= -1;
}

function drawScene() {
    atualizaAnimacao();

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);

    // MATRIZ PAI: Move todo mundo junto para os lados
    let matrizRobo = m3.translation(txRobo, tyRobo); 
    drawPart(pecaCorpo, matrizRobo);

    // MATRIZES FILHAS: Movem com o robô (X) + Movem sozinhas (Y)
    // Braços
    let mBracoEsq = m3.translate(matrizRobo, 0, tyBraco);
    drawPart(pecaBracoEsq, mBracoEsq);

    let mBracoDir = m3.translate(matrizRobo, 0, -tyBraco);
    drawPart(pecaBracoDir, mBracoDir);

    // Pernas
    let mPernaEsq = m3.translate(matrizRobo, 0, -tyPerna);
    drawPart(pecaPernaEsq, mPernaEsq);

    let mPernaDir = m3.translate(matrizRobo, 0, tyPerna);
    drawPart(pecaPernaDir, mPernaDir);

    requestAnimationFrame(drawScene);
}

drawScene();