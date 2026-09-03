const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

if (!gl) throw new Error("WebGL 2 não é suportado.");

const canvasCoordinates = document.getElementById("canvasCoordinates");
const webglCoordinates = document.getElementById("webglCoordinates");
const colorBox = document.getElementById("colorBox");
const modoTexto = document.getElementById("modoTexto");

let mode = 'R'; // 'R' = Reta, 'T' = Triângulo
let clicks = []; 
let currentPixelPoints = []; 
let currentColor = [0.0, 0.0, 1.0]; // Iniciando com a cor azul

let vertices = new Float32Array([]);
let colors = new Float32Array([]);

// Buffers e Shaders
const verticesBuffer = gl.createBuffer();
const colorsBuffer = gl.createBuffer();

const vertexShaderSource = `#version 300 es
in vec2 aPosition;
in vec3 aColor;
out vec3 vColor;
void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    gl_PointSize = 3.0; 
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

    while (true) {
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

// DESENHO
function updateGeometry() {
    let ptsArray = [];

    // Desenha Reta ou Triângulo de acordo com o modo R ou T
    if (mode === 'R' && currentPixelPoints.length >= 2) {
        ptsArray = applyBresenham(
            currentPixelPoints[0].x, currentPixelPoints[0].y, 
            currentPixelPoints[1].x, currentPixelPoints[1].y
        );
    } else if (mode === 'T' && currentPixelPoints.length >= 3) {
        ptsArray = ptsArray.concat(applyBresenham(currentPixelPoints[0].x, currentPixelPoints[0].y, currentPixelPoints[1].x, currentPixelPoints[1].y));
        ptsArray = ptsArray.concat(applyBresenham(currentPixelPoints[1].x, currentPixelPoints[1].y, currentPixelPoints[2].x, currentPixelPoints[2].y));
        ptsArray = ptsArray.concat(applyBresenham(currentPixelPoints[2].x, currentPixelPoints[2].y, currentPixelPoints[0].x, currentPixelPoints[0].y));
    }

    if (ptsArray.length > 0) {
        vertices = new Float32Array(ptsArray);
        
        const colArray = [];
        for (let i = 0; i < vertices.length / 2; i++) {
            colArray.push(...currentColor);
        }
        colors = new Float32Array(colArray);

        drawScene();
    }
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
    gl.clear(gl.COLOR_BUFFER_BIT); // Apaga as figuras anteriores
    gl.drawArrays(gl.POINTS, 0, vertices.length / 2); // Usa gl.POINTS para traçar retas e triângulos
}



// INTERAÇÕES DO USUÁRIO
canvas.addEventListener("mousedown", (e) => {
    clicks.push({ x: Math.round(e.offsetX), y: Math.round(e.offsetY) });
    
    const webglX = (e.offsetX / canvas.width) * 2 - 1;
    const webglY = -((e.offsetY / canvas.height) * 2 - 1);
    canvasCoordinates.textContent = `Canvas: (${Math.round(e.offsetX)}, ${Math.round(e.offsetY)})`;
    webglCoordinates.textContent = `WebGL: (${webglX.toFixed(3)}, ${webglY.toFixed(3)})`;

    const requiredClicks = (mode === 'R') ? 2 : 3;

    if (clicks.length === requiredClicks) {
        currentPixelPoints = [...clicks];
        updateGeometry();
        clicks = []; 
    }
});

window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
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

    // Alternar modos com 'r' ou 't'
    if (key === 'r') {
        mode = 'R';
        modoTexto.textContent = "Reta";
        clicks = [];
    } else if (key === 't') {
        mode = 'T';
        modoTexto.textContent = "Triângulo";
        clicks = [];
    } else if (palette[key]) {
        currentColor = palette[key].color;
        colorBox.style.backgroundColor = palette[key].name;
        if (currentPixelPoints.length > 0) updateGeometry();
    }
});

// Reta azul em (0,0)
currentPixelPoints = [
    { x: Math.round(canvas.width / 2), y: Math.round(canvas.height / 2) },
    { x: Math.round(canvas.width / 2), y: Math.round(canvas.height / 2) }
];
updateGeometry();