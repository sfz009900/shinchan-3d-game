// ============ 粒子系统 ============
class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(position, color, count = 10) {
        for (let i = 0; i < count; i++) {
            const geometry = new THREE.SphereGeometry(0.1, 8, 8);
            const material = new THREE.MeshBasicMaterial({ color, transparent: true });
            const particle = new THREE.Mesh(geometry, material);

            particle.position.copy(position);
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                Math.random() * 0.3 + 0.1,
                (Math.random() - 0.5) * 0.3
            );
            particle.life = 1.0;
            particle.decay = 0.02 + Math.random() * 0.02;

            GameState.scene.add(particle);
            this.particles.push(particle);
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.position.add(p.velocity);
            p.velocity.y -= 0.01;
            p.life -= p.decay;
            p.material.opacity = p.life;
            p.scale.setScalar(p.life);

            if (p.life <= 0) {
                GameState.scene.remove(p);
                this.particles.splice(i, 1);
            }
        }
    }
}

const particleSystem = new ParticleSystem();

