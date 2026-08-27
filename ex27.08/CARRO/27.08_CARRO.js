const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
    throw new Error("WebGL 2 não é suportado.");
}

// --------------------------------------------------
// 1. VÉRTICES, CORES E ÍNDICES (Gerador do Carro)
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

    verticesJS.push(
        left, top,      
        left, bottom,   
        right, bottom,  
        right, top      
    );

    coresJS.push(
        r, g, b, 
        r, g, b, 
        r, g, b, 
        r, g, b
    );

    indicesJS.push(
        currentIndex, currentIndex + 1, currentIndex + 2,
        currentIndex, currentIndex + 2, currentIndex + 3
    );

    currentIndex += 4;
}

// Função para desenhar rodas
function desenharCirculo(cx, cy, raio, r, g, b) {
    const numLados = 30;
    const centerIndex = currentIndex;

    // Ponto central
    verticesJS.push(cx, cy);
    coresJS.push(r, g, b);
    currentIndex++;

    // Bordas do círculo
    for (let i = 0; i <= numLados; i++) {
        const angulo = (i * 2 * Math.PI) / numLados;
        verticesJS.push(cx + raio * Math.cos(angulo), cy + raio * Math.sin(angulo));
        coresJS.push(r, g, b);

        if (i > 0) {
            indicesJS.push(centerIndex, currentIndex - 1, currentIndex);
        }
        currentIndex++;
    }
}

// ==========================================
// MONTANDO AS PEÇAS DO CARRO
// ==========================================

const cinzaEscuro = [0.55, 0.55, 0.55];
const cinzaClaro = [0.75, 0.75, 0.75];
const preto = [0.0, 0.0, 0.0];
const vermelho = [0.9, 0.1, 0.1];
const amarelo = [1.0, 0.9, 0.0];

// 1. Rodas (Ficam na camada de trás)
desenharCirculo(-0.25, -0.3, 0.14, ...preto); // Roda Esquerda
desenharCirculo(0.25, -0.3, 0.14, ...preto);  // Roda Direita

// 2. Cabine (Parte superior com contorno)
desenharRetangulo(-0.1, 0.2, 0.62, 0.32, ...preto);        // Contorno
desenharRetangulo(-0.1, 0.2, 0.6, 0.3, ...cinzaEscuro);    // Preenchimento

// 3. Janelas
desenharRetangulo(-0.25, 0.2, 0.26, 0.26, ...preto);       // Contorno Esq
desenharRetangulo(-0.25, 0.2, 0.24, 0.24, ...cinzaClaro);  // Vidro Esq

desenharRetangulo(0.05, 0.2, 0.26, 0.26, ...preto);        // Contorno Dir
desenharRetangulo(0.05, 0.2, 0.24, 0.24, ...cinzaClaro);   // Vidro Dir

// 4. Faróis
desenharRetangulo(-0.43, 0.0, 0.06, 0.12, ...preto);       // Contorno Traseiro
desenharRetangulo(-0.43, 0.0, 0.04, 0.10, ...vermelho);    // Farol Traseiro

desenharRetangulo(0.43, 0.0, 0.08, 0.14, ...preto);        // Contorno Dianteiro
desenharRetangulo(0.43, 0.0, 0.06, 0.12, ...amarelo);      // Farol Dianteiro

// 5. Corpo do Carro (Desenhado por último para sobrepor a cabine)
desenharRetangulo(0.0, -0.1, 0.82, 0.32, ...preto);        // Contorno
desenharRetangulo(0.0, -0.1, 0.8, 0.3, ...cinzaEscuro);    // Preenchimento


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

gl.clearColor(1.0, 1.0, 1.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

// --------------------------------------------------
// 10. DESENHAR
// --------------------------------------------------

gl.useProgram(program);
gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);