const canvas = document.querySelector('.canvas');
const ctx = canvas.getContext('2d');

const startBtn = document.querySelector('.start-game-btn');
const resultScreen = document.querySelector('.result');
const scoreDisplay = document.querySelector('.score');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let player, bullets, enemies, particles;
let animationId, score;

const midX = canvas.width / 2;
const midY = canvas.height / 2;

function createImage(src) {
    const img = new Image();
    img.src = src;
    return img;
}

// ======== PLAYER =========
class Player {
    constructor() {
        this.width = 100;
        this.height = 100;
        this.position = { x: midX - this.width / 2, y: midY - this.height / 2 };
        this.rotation = 0;
        this.frame = 0;
        this.sprite = {
            stand: {
                image: createImage('img/playerSpriteIdle.png'),
                cropWidth: 313,
                height: 207
            },
            shoot: {
                image: createImage('img/playerSpriteShoot.png'),
                cropWidth: 312,
                height: 206
            },
            reload: {
                image: createImage('img/playerSpriteReload.png'),
                cropWidth: 322,
                height: 217
            }
        };
        this.current = this.sprite.stand;
    }

    draw() {
        ctx.save();
        ctx.translate(midX - 15, midY);
        ctx.rotate(this.rotation);
        ctx.translate(-midX + 15, -midY);
        ctx.drawImage(
            this.current.image,
            this.current.cropWidth * this.frame,
            0,
            this.current.cropWidth,
            this.current.height,
            this.position.x,
            this.position.y,
            this.width,
            this.height
        );
        ctx.restore();
    }

    update() {
        this.frame++;
        if (this.frame > 10) this.frame = 0;
        this.draw();
    }

    shootAnim() {
        this.current = this.sprite.shoot;
        this.frame = 0;
        setTimeout(() => {
            this.current = this.sprite.reload;
            this.frame = 0;
            setTimeout(() => {
                this.current = this.sprite.stand;
            }, 600);
        }, 300);
    }
}

// ======== BULLET =========
class Bullet {
    constructor(position, velocity, rotation) {
        this.image = createImage('img/projectile.png');
        this.position = position;
        this.velocity = velocity;
        this.rotation = rotation;
        this.width = 12;
        this.height = 3;
    }

    draw() {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.rotation);
        ctx.drawImage(this.image, 0, 0, 30, 8, -this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    }

    update() {
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.draw();
    }
}

// ======== ENEMY =========
class Enemy {
    constructor(position, velocity, rotation) {
        this.image = createImage('img/zombieSpritewalk.png');
        this.position = position;
        this.velocity = velocity;
        this.rotation = rotation;
        this.width = 85;
        this.height = 50;
        this.frame = 0;
    }

    draw() {
        ctx.save();
        ctx.translate(this.position.x + this.width / 2, this.position.y + this.height / 2);
        ctx.rotate(this.rotation);
        ctx.drawImage(
            this.image,
            (this.frame * 256) + 95,
            100,
            this.width,
            this.height,
            -this.width / 2,
            -this.height / 2,
            this.width,
            this.height
        );
        ctx.restore();
    }

    update() {
        this.frame = (this.frame + 1) % 32;
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.draw();
    }
}

// ======== PARTICLE =========
const friction = 0.98;
class Particle {
    constructor(x, y, radius, color, velocity) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
        this.alpha = 1;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }

    update() {
        this.velocity.x *= friction;
        this.velocity.y *= friction;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= 0.01;
        this.draw();
    }
}

// ======== INIT =========
function initGame() {
    player = new Player();
    bullets = [];
    enemies = [];
    particles = [];
    score = 0;
    scoreDisplay.textContent = score;
    resultScreen.style.display = 'none';
}

// ======== SPAWN ENEMIES =========
function spawnEnemies() {
    setInterval(() => {
        const position = { x: 0, y: 0 };
        if (Math.random() < 0.5) {
            position.x = Math.random() < 0.5 ? 0 - 256 : canvas.width + 85;
            position.y = Math.random() * canvas.height;
        } else {
            position.x = Math.random() * canvas.width;
            position.y = Math.random() < 0.5 ? 0 - 256 : canvas.height + 50;
        }
        const angle = Math.atan2(player.position.y - position.y, player.position.x - position.x);
        const velocity = { x: Math.cos(angle) * 0.8, y: Math.sin(angle) * 0.8 };
        enemies.push(new Enemy(position, velocity, angle));
    }, 1200);
}

// ======== ANIMATE =========
function animate() {
    animationId = requestAnimationFrame(animate);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    player.update();

    particles.forEach((particle, index) => {
        if (particle.alpha <= 0) particles.splice(index, 1);
        else particle.update();
    });

    bullets.forEach((bullet, index) => {
        bullet.update();
        if (
            bullet.position.x > canvas.width ||
            bullet.position.y > canvas.height ||
            bullet.position.x + bullet.width < 0 ||
            bullet.position.y + bullet.height < 0
        ) {
            bullets.splice(index, 1);
        }
    });

    enemies.forEach((enemy, eIndex) => {
        enemy.update();
        const dist = Math.hypot(midX - enemy.position.x, midY - enemy.position.y);
        if (dist < 40) {
            cancelAnimationFrame(animationId);
            resultScreen.style.display = 'flex';
        }

        bullets.forEach((bullet, bIndex) => {
            const dist = Math.hypot(bullet.position.x - enemy.position.x, bullet.position.y - enemy.position.y);
            if (dist < 30) {
                for (let i = 0; i < 15; i++) {
                    particles.push(
                        new Particle(
                            bullet.position.x,
                            bullet.position.y,
                            Math.random() * 3,
                            'red',
                            {
                                x: (Math.random() - 0.5) * 2,
                                y: (Math.random() - 0.5) * 2
                            }
                        )
                    );
                }
                score += 100;
                scoreDisplay.textContent = score;
                enemies.splice(eIndex, 1);
                bullets.splice(bIndex, 1);
            }
        });
    });
}

// ======== CONTROLS =========
canvas.addEventListener('click', e => {
    const angle = Math.atan2(e.clientY - midY, e.clientX - midX);
    const velocity = { x: Math.cos(angle) * 6, y: Math.sin(angle) * 6 };
    const position = { x: midX + 40 * Math.cos(angle), y: midY + 40 * Math.sin(angle) };
    bullets.push(new Bullet(position, velocity, angle));
    player.shootAnim();
});

window.addEventListener('mousemove', e => {
    const angle = Math.atan2(e.clientY - midY, e.clientX - midX);
    player.rotation = angle;
});

startBtn.addEventListener('click', () => {
    initGame();
    animate();
    spawnEnemies();
});
