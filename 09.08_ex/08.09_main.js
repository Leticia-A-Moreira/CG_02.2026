const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
    throw new Error("WebGL 2 não é suportado.");
}


// VERTICES E CORES
function verticesBarra(){
    return new Float32Array([
        -0.05,  0.2,
        -0.05, -0.2,
         0.05,  0.2,
         0.05,  0.2,
        -0.05, -0.2,
         0.05, -0.2
    ]);
}

function verticesBola(){
    let vertices = [];
    let numSegments = 30;
    let radius = 0.05;

    for (let i = 0; i < numSegments; i++) {
        let theta1 = (i / numSegments) * 2 * Math.PI;
        let theta2 = ((i + 1) / numSegments) * 2 * Math.PI;

        vertices.push(0, 0);
        vertices.push(radius * Math.cos(theta1), radius * Math.sin(theta1));
        vertices.push(radius * Math.cos(theta2), radius * Math.sin(theta2));
    }
    return new Float32Array(vertices);
}

let verticesBarraDireita = verticesBarra();
let corBarraDireita = new Float32Array([0.0, 0.0, 1.0]);

let verticesBarraEsquerda = verticesBarra();
let corBarraEsquerda = new Float32Array([0.0, 1.0, 0.0]);

let verticesBolaCentro = verticesBola();
let corBolaCentro = new Float32Array([1.0, 0.0, 0.0]);


// ESTADOS DA ANIMAÇÃO E CONTROLE
let tyBE = 0.0;
let tyBD = 0.0;
let txBola = 0.0;
let tyBola = 0.0;
let txBola_offset = 0.012;
let tyBola_offset = 0.008;

let MbarraEsquerda = m3.translation(-0.9, tyBE);
let MbarraDireita = m3.translation(0.9, tyBD);
let MbolaCentro = m3.identity();

// Teclas
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key] = true; });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });



// ESTADOS DA ANIMAÇÃO E CONTROLE
let pontosEsq = 0;
let pontosDir = 0;
const placarEsq = document.getElementById("pontosEsquerda");
const placarDir = document.getElementById("pontosDireita");


// CONFIGURAÇÃO DO WEBGL (SHADERS E BUFFERS)
const verticesBuffer = gl.createBuffer();

const vertexShaderSource = `#version 300 es
in vec2 aPosition;
uniform mat3 u_transform;

void main() {
    vec3 position = u_transform * vec3(aPosition, 1.0);
    gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
uniform vec3 uColor;
out vec4 outColor;
void main() {
    outColor = vec4(uColor, 1.0);
}`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

const positionLocation = gl.getAttribLocation(program, "aPosition");
const colorLocation = gl.getUniformLocation(program, "uColor");
const transformLocation = gl.getUniformLocation(program, "u_transform");


// LOOP PRINCIPAL
function atualizaAnimacao(){
    // Movimentação Raquete Esquerda (W / S)
    if (keys['w'] || keys['W']) tyBE += 0.02;
    if (keys['s'] || keys['S']) tyBE -= 0.02;
    if (tyBE > 0.8) tyBE = 0.8;
    if (tyBE < -0.8) tyBE = -0.8;

    // Movimentação Raquete Direita (Setas)
    if (keys['ArrowUp']) tyBD += 0.02;
    if (keys['ArrowDown']) tyBD -= 0.02;
    if (tyBD > 0.8) tyBD = 0.8;
    if (tyBD < -0.8) tyBD = -0.8;

    // Movimentação Bolinha
    txBola += txBola_offset;
    tyBola += tyBola_offset;

    // Colisão Chão e Teto
    if (tyBola + 0.05 >= 1.0 || tyBola - 0.05 <= -1.0) {
        tyBola_offset = -tyBola_offset;
    }

    // Colisão Raquete Esquerda
    if (txBola - 0.05 <= -0.85 && txBola + 0.05 >= -0.95 && tyBola <= tyBE + 0.2 && tyBola >= tyBE - 0.2) {
        txBola_offset = Math.abs(txBola_offset) * 1.05; // Fica 5% mais rápida
        tyBola_offset *= 1.05;
    }

    // Colisão Raquete Direita
    if (txBola + 0.05 >= 0.85 && txBola - 0.05 <= 0.95 && tyBola <= tyBD + 0.2 && tyBola >= tyBD - 0.2) {
        txBola_offset = -Math.abs(txBola_offset) * 1.05; // Fica 5% mais rápida
        tyBola_offset *= 1.05;
    }

    // Sistema de Pontuação
    if (txBola > 1.0) {
        pontosEsq++;
        placarEsq.textContent = pontosEsq; 
        txBola = 0.0; tyBola = 0.0;
        
        // Volta para a velocidade original
        txBola_offset = -0.012; 
        tyBola_offset = 0.008;
    } else if (txBola < -1.0) {
        pontosDir++;
        placarDir.textContent = pontosDir; 
        txBola = 0.0; tyBola = 0.0;
        
        // Volta para a velocidade original
        txBola_offset = 0.012; 
        tyBola_offset = 0.008;
    }

    // Aplica Transformações
    MbarraEsquerda = m3.translation(-0.9, tyBE);
    MbarraDireita = m3.translation(0.9, tyBD);
    MbolaCentro = m3.translation(txBola, tyBola);
}

const numComponents = 2;

function drawScene(){
    atualizaAnimacao();
    
    gl.clearColor(0.1, 0.1, 0.1, 0.0);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    
    drawBarraEsquerda();
    drawBarraDireita();
    drawBolaCentro();
    
    requestAnimationFrame(drawScene);
}

function bindAndDraw(verticesArray, colorArray, transformMatrix) {
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verticesArray, gl.STATIC_DRAW);
    
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    gl.uniform3fv(colorLocation, colorArray);
    gl.uniformMatrix3fv(transformLocation, false, transformMatrix);
    
    gl.drawArrays(gl.TRIANGLES, 0, verticesArray.length / numComponents);
}

function drawBarraEsquerda() { bindAndDraw(verticesBarraEsquerda, corBarraEsquerda, MbarraEsquerda); }
function drawBarraDireita() { bindAndDraw(verticesBarraDireita, corBarraDireita, MbarraDireita); }
function drawBolaCentro() { bindAndDraw(verticesBolaCentro, corBolaCentro, MbolaCentro); }

drawScene();
