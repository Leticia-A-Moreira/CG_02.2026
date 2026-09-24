// ==================================================
// CLASS - SCENE
// ==================================================

class Scene {

    constructor(gl, program) {
        this.renderer = new Renderer(gl, program);

        this.helicopterBody = new HelicopterBody();
        this.helicopterTopShaft = new HelicopterTopShaft();
        this.helicopterTail = new HelicopterTail();
        this.helicopterPropellers = new HelicopterPropellers();
        this.helicopterTailPropeller = new HelicopterTailPropeller();

        this.tx = 0.0;
        this.ty = 0.0;
        this.propAngle = 0.0;

        // W, A, S, D
        this.tiltX = 0.3;
        this.tiltY = -0.4;
        
        // Rotação (0 = Esquerda, Math.PI = Direita)
        this.facingRotation = 0.0;

        this.keys = {};
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            this.keys[e.key.toLowerCase()] = true; 
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    update() {
        // Movimentação principal e Direção da frente helicoptero
        if (this.keys['ArrowUp']) this.ty += 0.015;
        if (this.keys['ArrowDown']) this.ty -= 0.015;
        
        if (this.keys['ArrowLeft']) {
            this.tx -= 0.015;
            this.facingRotation = 0.0; 
        }
        if (this.keys['ArrowRight']) {
            this.tx += 0.015;
            this.facingRotation = Math.PI;
        }

        // Controle da angulação (Inclinando)
        if (this.keys['w']) this.tiltX -= 0.02;
        if (this.keys['s']) this.tiltX += 0.02;
        if (this.keys['a']) this.tiltY -= 0.02;
        if (this.keys['d']) this.tiltY += 0.02;

        this.propAngle += 0.25; 

        // ----------------------------------------------------
        // ORDEM CORRETA DE MATRIZES EM WEBGL
        // ----------------------------------------------------
        
        // Gira a frente
        let globalMatrix = m4.yRotation(this.facingRotation);
    
        globalMatrix = m4.xRotate(globalMatrix, this.tiltX);
        globalMatrix = m4.yRotate(globalMatrix, this.tiltY);
        
        // Mover helicóptero 
        globalMatrix = m4.translate(globalMatrix, this.tx, this.ty, 0.0);

        this.helicopterBody.update(globalMatrix);
        this.helicopterTopShaft.update(globalMatrix);
        this.helicopterTail.update(globalMatrix);

        // Atualiza Hélice Superior (Gira no Y local)
        let topPropMatrix = m4.yRotation(this.propAngle);
        topPropMatrix = m4.multiply(globalMatrix, topPropMatrix);
        this.helicopterPropellers.update(topPropMatrix);

        // Atualiza Hélice da Cauda (Compensa a posição, gira no Z local e devolve)
        let tailPropMatrix = m4.translation(-0.7, 0.0, -0.06);
        tailPropMatrix = m4.zRotate(tailPropMatrix, this.propAngle);
        tailPropMatrix = m4.translate(tailPropMatrix, 0.7, 0.0, 0.06);
        tailPropMatrix = m4.multiply(globalMatrix, tailPropMatrix);
        this.helicopterTailPropeller.update(tailPropMatrix);
    }

    draw() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(program);

        this.helicopterBody.draw(this.renderer);
        this.helicopterTopShaft.draw(this.renderer);
        this.helicopterTail.draw(this.renderer);
        this.helicopterPropellers.draw(this.renderer);
        this.helicopterTailPropeller.draw(this.renderer);
    }

    execute() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.execute());
    }

    init() {
        requestAnimationFrame(() => this.execute());
    }
}
