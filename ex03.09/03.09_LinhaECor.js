const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

if (!gl) throw new Error("WebGL 2 não é suportado.");

const canvasCoordinates = document.getElementById("canvasCoordinates");
const webglCoordinates = document.getElementById("webglCoordinates");
const colorBox = document.getElementById("colorBox");


// ESTADOS DA APLICAÇÃO
let clicks = []; // Armazena os dois cliques
let currentPixelPoints = [ {x: 300, y: 300}, {x: 300, y: 300} ]; // Ponto inicial (0,0) no WebGL
let currentColor = [0.0, 0.0, 1.0]; // Cor inicial deve ser azul

let vertices = new Float32Array([0.0, 0.0]);
let colors = new Float32Array([0.0, 0.0, 1.0]);

// Buffers e Shaders
const verticesBuffer = gl.createBuffer();
const colorsBuffer = gl.createBuffer();

const vertexShaderSource = `#version 300 es
in vec2 aPosition;
in vec3 aColor;
out vec3 vColor;
void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    gl_PointSize = 3.0; // Ponto pequeno para formar uma reta contínua
    vColor = aColor;
}`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
in vec3 vColor;
out vec4 outColor;
void main() {
    outColor = vec4(vColor, 1.0);
}`;

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
gl.useProgram(program);

const positionLocation = gl.getAttribLocation(program, "aPosition");
const colorLocation = gl.getAttribLocation(program, "aColor");


// ALGORITMO DE BRESENHAM
function applyBresenham(x0, y0, x1, y1) {
    const pts = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;

    // pixels inteiros
    while (true) {
        // Conversão do sistema Canvas para GPU em cada iteração
        const webglX = (x0 / canvas.width) * 2 - 1;
        const webglY = -((y0 / canvas.height) * 2 - 1);
        pts.push(webglX, webglY);

        if (x0 === x1 && y0 === y1) break;

        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx)  { err += dx; y0 += sy; }
    }
    return pts;
}
// ATUALIZAÇÃO E DESENHO 
function updateGeometry() {
    // Calcula os pontos da reta usando as coordenadas físicas em pixels
    const ptsArray = applyBresenham(
        currentPixelPoints[0].x, currentPixelPoints[0].y, 
        currentPixelPoints[1].x, currentPixelPoints[1].y
    );
    
    vertices = new Float32Array(ptsArray);
    
    const colArray = [];
    for (let i = 0; i < vertices.length / 2; i++) {
        colArray.push(...currentColor);
    }
    colors = new Float32Array(colArray);

    drawScene();
}

function drawScene() {
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, vertices.length / 2); // Plota pontos ao invés de GL_LINES
}

// Dois cliques formar a reta
canvas.addEventListener("mousedown", (e) => {
    clicks.push({ x: e.offsetX, y: e.offsetY });
    
    // Mostra coordenadas atuais no HTML
    const webglX = (e.offsetX / canvas.width) * 2 - 1;
    const webglY = -((e.offsetY / canvas.height) * 2 - 1);
    canvasCoordinates.textContent = `Canvas: (${e.offsetX}, ${e.offsetY})`;
    webglCoordinates.textContent = `WebGL: (${webglX.toFixed(3)}, ${webglY.toFixed(3)})`;

    if (clicks.length === 2) {
        currentPixelPoints = [...clicks];
        updateGeometry();
        clicks = []; // Reseta para a próxima reta
    }
});

// Mudança de Cor no teclado
window.addEventListener("keydown", (e) => {
    const palette = {
        '0': { color: [1.0, 1.0, 1.0], name: 'white' },
        '1': { color: [1.0, 0.0, 0.0], name: 'red' },
        '2': { color: [0.0, 1.0, 0.0], name: 'green' },
        '3': { color: [0.0, 0.0, 1.0], name: 'blue' },
        '4': { color: [1.0, 1.0, 0.0], name: 'yellow' },
        '5': { color: [1.0, 0.0, 1.0], name: 'magenta' },
        '6': { color: [0.0, 1.0, 1.0], name: 'cyan' },
        '7': { color: [1.0, 0.5, 0.0], name: 'orange' },
        '8': { color: [0.5, 0.0, 1.0], name: 'purple' },
        '9': { color: [1.0, 0.4, 0.7], name: 'pink' }
    };

    if (palette[e.key]) {
        currentColor = palette[e.key].color;
        colorBox.style.backgroundColor = palette[e.key].name;
        updateGeometry(); // Atualiza a cor da reta existente na tela
    }
});

// Inicialização: Traça a primeira reta (0,0) até (0,0) 
updateGeometry();