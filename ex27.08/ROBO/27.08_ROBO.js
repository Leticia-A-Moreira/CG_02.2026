const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
    throw new Error("WebGL 2 não é suportado.");
}

// --------------------------------------------------
// 1. VÉRTICES, CORES E ÍNDICES (Gerador do Robô)
// --------------------------------------------------

const verticesJS = [];
const coresJS = [];
const indicesJS = [];
let currentIndex = 0;

// Função para desenhar retângulos
function desenharRetangulo(x, y, largura, altura, r, g, b) {
    const left = x - largura / 2;
    const right = x + largura / 2;
    const top = y + altura / 2;
    const bottom = y - altura / 2;

    // Adiciona os 4 cantos do retângulo
    verticesJS.push(
        left, top,      // Topo-Esquerda
        left, bottom,   // Base-Esquerda
        right, bottom,  // Base-Direita
        right, top      // Topo-Direita
    );

    // Adiciona a mesma cor para os 4 cantos
    coresJS.push(
        r, g, b, 
        r, g, b, 
        r, g, b, 
        r, g, b
    );

    // Liga os pontos formando 2 triângulos
    indicesJS.push(
        currentIndex, currentIndex + 1, currentIndex + 2,
        currentIndex, currentIndex + 2, currentIndex + 3
    );

    currentIndex += 4;
}

// ==========================================
// PEÇAS DO ROBÔ
// ==========================================

// Cores
const cinza = [0.55, 0.55, 0.55];
const preto = [0.0, 0.0, 0.0];
const vermelho = [0.6, 0.0, 0.0]; // botões

// Corpo (Centro X, Centro Y, Largura, Altura, R, G, B)
desenharRetangulo(0.0, 0.5, 0.5, 0.4, ...cinza);      // Cabeça
desenharRetangulo(0.0, 0.2, 0.1, 0.2, ...cinza);      // Pescoço
desenharRetangulo(0.0, -0.1, 0.6, 0.4, ...cinza);     // Tronco
desenharRetangulo(-0.15, -0.4, 0.2, 0.2, ...cinza);   // Perna Esquerda
desenharRetangulo(0.15, -0.4, 0.2, 0.2, ...cinza);    // Perna Direita
desenharRetangulo(-0.35, -0.1, 0.15, 0.15, ...cinza); // Braço Esquerdo
desenharRetangulo(0.35, -0.1, 0.15, 0.15, ...cinza);  // Braço Direito

// Rosto
desenharRetangulo(-0.12, 0.55, 0.1, 0.06, ...preto);  // Olho Esquerdo
desenharRetangulo(0.12, 0.55, 0.1, 0.06, ...preto);   // Olho Direito

// Boca
desenharRetangulo(0.0, 0.4, 0.16, 0.04, ...preto);    // Centro da boca
desenharRetangulo(-0.11, 0.43, 0.06, 0.04, ...preto); // Canto Esquerdo
desenharRetangulo(0.11, 0.43, 0.06, 0.04, ...preto);  // Canto Direito

// Botões
desenharRetangulo(-0.15, 0.0, 0.12, 0.04, ...vermelho); 
desenharRetangulo(-0.15, -0.08, 0.12, 0.04, ...vermelho); 
desenharRetangulo(-0.15, -0.16, 0.12, 0.04, ...vermelho); 

// Converte para os Arrays que o WebGL entende
const vertices = new Float32Array(verticesJS);
const colors = new Float32Array(coresJS);
const indices = new Uint16Array(indicesJS);

// --------------------------------------------------
// 2. BUFFERS
// --------------------------------------------------

const verticesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

const colorsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

const indicesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

// --------------------------------------------------
// 3. VERTEX SHADER
// --------------------------------------------------

const vertexShaderSource = `#version 300 es
in vec2 aPosition;
in vec3 aColor;
out vec3 vColor;
void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    vColor = aColor;
}
`;

// --------------------------------------------------
// 4. FRAGMENT SHADER
// --------------------------------------------------

const fragmentShaderSource = `#version 300 es
precision mediump float;
in vec3 vColor;
out vec4 outColor;
void main() {
    outColor = vec4(vColor, 1.0);
}
`;

// --------------------------------------------------
// 5. COMPILAR SHADERS
// --------------------------------------------------

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(error);
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

// --------------------------------------------------
// 6. CRIAR PROGRAMA
// --------------------------------------------------

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
}

// --------------------------------------------------
// 7. LOCAL DOS ATRIBUTOS
// --------------------------------------------------

const positionLocation = gl.getAttribLocation(program, "aPosition");
const colorLocation = gl.getAttribLocation(program, "aColor");

// --------------------------------------------------
// 8. CONFIGURAR ATRIBUTOS
// --------------------------------------------------

gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
gl.enableVertexAttribArray(colorLocation);
gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

// --------------------------------------------------
// 9. LIMPAR TELA
// --------------------------------------------------

gl.clearColor(1.0, 1.0, 1.0, 1.0); // Fundo branco
gl.clear(gl.COLOR_BUFFER_BIT);

// --------------------------------------------------
// 10. DESENHAR
// --------------------------------------------------

gl.useProgram(program);
gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);