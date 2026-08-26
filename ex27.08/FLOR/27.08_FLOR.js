const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
    throw new Error("WebGL 2 não é suportado.");
}


// --------------------------------------------------
// 1. VERTICES, CORES E INDICES (Pétalas Intercaladas)
// --------------------------------------------------

const verticesJS = [];
const coresJS = [];
const indicesJS = [];
let currentIndex = 0; // Controla a numeração dos vértices

// Função para desenhar uma pétala no formato de losango (2 triângulos)
function criarPetala(angulo, raioPonta, raioLargura, abertura) {
    // calculado 4 pontos da pétala
    const centroX = 0.0;
    const centroY = 0.0;
    
    // ponta da pétala
    const pontaX = raioPonta * Math.cos(angulo);
    const pontaY = raioPonta * Math.sin(angulo);
    
    // lateral direita da pétala
    const dirX = raioLargura * Math.cos(angulo + abertura);
    const dirY = raioLargura * Math.sin(angulo + abertura);
    
    // lateral esquerda da pétala
    const esqX = raioLargura * Math.cos(angulo - abertura);
    const esqY = raioLargura * Math.sin(angulo - abertura);

    // Adicionamos 4 pontos na lista de vértices
    verticesJS.push(
        centroX, centroY, // Ponto 0: Centro
        dirX, dirY,       // Ponto 1: Direita
        pontaX, pontaY,   // Ponto 2: Ponta
        esqX, esqY        // Ponto 3: Esquerda
    );

    // cores (Ciano e Verde)
    coresJS.push(
        0.0, 1.0, 1.0, // Centro (Ciano)
        0.0, 0.5, 0.0, // Direita (Verde escuro)
        0.0, 1.0, 1.0, // Ponta (Ciano)
        0.0, 0.5, 0.0  // Esquerda (Verde escuro)
    );

    // "WebGL, ligue esses 4 pontos formando 2 triângulos"
    indicesJS.push(
        currentIndex, currentIndex + 1, currentIndex + 2, // Triângulo 1 (Metade direita)
        currentIndex, currentIndex + 2, currentIndex + 3  // Triângulo 2 (Metade esquerda)
    );
    
    currentIndex += 4; // Atualiza a contagem de vértices
}

// ==========================================
// A. CRIANDO AS 8 PÉTALAS GRANDES
// ==========================================
for (let i = 0; i < 8; i++) {
    // Math.PI / 4 radianos = 45 graus (0, 45, 90, 135...)
    const angulo = i * (Math.PI / 4); 
    criarPetala(angulo, 0.65, 0.25, Math.PI / 16);
}

// ==========================================
// B. CRIANDO AS 8 PÉTALAS PEQUENAS
// ==========================================
for (let i = 0; i < 8; i++) {
    // Somamos Math.PI / 8 (22.5 graus) para elas nascerem nos espaços vazios
    const angulo = (i * (Math.PI / 4)) + (Math.PI / 8); 
    criarPetala(angulo, 0.45, 0.18, Math.PI / 16);
}

// ==========================================
// C. CRIANDO O MIOLO
// ==========================================
const centerStartIndex = currentIndex;
const raioMiolo = 0.15;
const numLados = 40;

// Ponto do centro do miolo
verticesJS.push(0.0, 0.0);
coresJS.push(1.0, 0.5, 0.0); // Laranja/amarelo
currentIndex++;

// Bordas do miolo
for (let i = 0; i <= numLados; i++) {
    const anguloMiolo = (i * 2 * Math.PI) / numLados;
    verticesJS.push(raioMiolo * Math.cos(anguloMiolo), raioMiolo * Math.sin(anguloMiolo));
    coresJS.push(1.0, 1.0, 0.0); // Amarelo na borda
    
    if (i > 0) {
        indicesJS.push(centerStartIndex, currentIndex - 1, currentIndex);
    }
    currentIndex++;
}

// ==========================================
// D. CONVERTENDO TUDO PARA O WEBGL
// ==========================================
const vertices = new Float32Array(verticesJS);
const colors = new Float32Array(coresJS);
const indices = new Uint16Array(indicesJS);


// --------------------------------------------------
// 2. BUFFERS
// --------------------------------------------------

const verticesBuffer = gl.createBuffer();

gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);

gl.bufferData(
    gl.ARRAY_BUFFER,
    vertices,
    gl.STATIC_DRAW
);

const colorsBuffer = gl.createBuffer();

gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);

gl.bufferData(
    gl.ARRAY_BUFFER,
    colors,
    gl.STATIC_DRAW
);

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


const vertexShader = createShader(
    gl,
    gl.VERTEX_SHADER,
    vertexShaderSource
);

const fragmentShader = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource
);


// --------------------------------------------------
// 6. CRIAR PROGRAMA
// --------------------------------------------------

const program = gl.createProgram();

gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);

gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {

    throw new Error(
        gl.getProgramInfoLog(program)
    );
}


// --------------------------------------------------
// 7. LOCAL DOS ATRIBUTOS
// --------------------------------------------------

const positionLocation =
    gl.getAttribLocation(
        program,
        "aPosition"
    );

const colorLocation =
    gl.getAttribLocation(
        program,
        "aColor"
    );


// --------------------------------------------------
// 8. CONFIGURAR ATRIBUTOS
// --------------------------------------------------

gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);

gl.enableVertexAttribArray(positionLocation);

gl.vertexAttribPointer(
    positionLocation,
    2,
    gl.FLOAT,
    false,
    0,
    0
);

gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);

gl.enableVertexAttribArray(colorLocation);

gl.vertexAttribPointer(
    colorLocation,
    3,
    gl.FLOAT,
    false,
    0,
    0
);

gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);

gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

// --------------------------------------------------
// 9. LIMPAR TELA
// --------------------------------------------------

gl.clearColor(0.1, 0.1, 0.1, 1.0);

gl.clear(gl.COLOR_BUFFER_BIT);


// --------------------------------------------------
// 10. DESENHAR
// --------------------------------------------------

gl.useProgram(program);

gl.drawElements(
    gl.TRIANGLES,
    indices.length,
    gl.UNSIGNED_SHORT,
    0
);
