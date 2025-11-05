const canvas = document.querySelector('.canvas');
const ctx = canvas.getContext('2d');

const startBtn = document.querySelector('.start-game-btn');
const resultScreen = document.querySelector('.result');
const scoreDisplay = document.querySelector('.score');

let player, bullets, enemies, particles;
let animationId, score;

// ---------- Налаштування полотна ----------
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ---------- Завантаження зображень ----------
const images = {
    playerIdle: new Image(),
    playerMove: new Image(),
    playerShoot: new Image(),
    zombieWalk: new Image(),
    zombieRun: new Image(),
    bullet: new Image()
};

images.playerIdle.src = 'img/playerSpriteIdle.png';
images.playerMove.src = 'img/playerSpriteMove.png';
images.playerShoot.src = 'img/playerSpriteShoot.png';
images.zombieWalk.src = 'img/zombieSpritewalk.png';
images.zombieRun.src = 'img/zombieSpriterun.png';
images.bullet.src = 'img/пуля.png';

// ---------- Класи ----------
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 80;
        this.height = 80;
        this.frame = 0;
        this.frameCount = 4;
        this.frameDelay = 8;
        this.frameTimer = 0;
        this.state = 'idle'; // 'idle' | 'move' | 'shoot'
    }

    update() {
        this.frameTimer++;
        if (this.frameTimer >= this.frameDelay) {
            this.frame = (this.frame + 1) % this.frameCount;
            this.frameTimer = 0;
        }
    }

    draw() {
        let img;
        if (this.state === 'shoot') img = images.playerShoot;
        else if (this.state === 'move') img = images.playerMove;
        else img = images.playerIdle;

        ctx.drawImage(
            img,
            this.frame * this.width,
            0,
            this.width,
            this.height,
            this.x - this.width / 2,
            this.y - this.height / 2,
            this.width,
            this.height
        );
    }
}

class Bullet {
    constructor(x, y, velocity) {
        this.x = x;
        this.y = y;
        this.velocity = velocity;
        this.radius = 5;
    }
    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.draw();
    }
    draw() {
        ctx.drawImage(images.bullet, this.x - 10, this.y - 10, 20, 20);
    }
}

class Enemy {
    constructor(x, y, speed) {
        this.x = x;
        this.y = y;
        this.width = 70;
        this.height = 70;
        this.speed = speed;
        this.frame = 0;
        this.frameCount = 6;
        this.frameDelay = 8;
        this.frameTimer = 0;
    }
    update(playerX, playerY) {
        const angle = Math.atan2(playerY - this.y, playerX - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;

        this.frameTimer++;
        if (this.frameTimer >= this.frameDelay) {
            this.frame = (this.frame + 1) % this.frameCount;
            this.frameTimer = 0;
        }
        this.draw();
    }
    draw() {
        ctx.drawImage(
            images.zombieRun,
            this.frame * this.width,
            0,
            this.width,
            this.height,
            this.x - this.width / 2,
            this.y - this.height / 2,
            this.width,
            this.height
        );
    }
}

class Particle {
    constructor(x, y, velocity) {
        this.x = x;
        this.y = y;
        this.radius = Math.random() * 3;
        this.velocity = velocity;
        this.alpha = 1;
    }
    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= 0.02;
        this.draw();
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.restore();
    }
}

// ---------- Ініціалізація ----------
function initGame() {
    player = new Player(canvas.width / 2, canvas.height / 2);
    bullets = [];
    enemies = [];
    particles = [];
    score = 0;
    scoreDisplay.textContent = score;
    resultScreen.style.display = 'none';
}

// ---------- Спавн ворогів ----------
function spawnEnemies() {
    setInterval(() => {
        const side = Math.random() < 0.5 ? 'horizontal' : 'vertical';
        let x, y;
        if (side === 'horizontal') {
            x = Math.random() < 0.5 ? 0 : canvas.width;
            y = Math.random() * canvas.height;
        } else {
            x = Math.random() * canvas.width;
            y = Math.random() < 0.5 ? 0 : canvas.height;
        }
        enemies.push(new Enemy(x, y, 1.5 + Math.random()));
    }, 1200);
}

// ---------- Анімація ----------
function animate() {
    animationId = requestAnimationFrame(animate);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    player.update();
    player.draw();

    particles.forEach((p, i) => {
        if (p.alpha <= 0) particles.splice(i, 1);
        else p.update();
    });

    bullets.forEach((b, i) => {
        b.update();
        if (
            b.x < 0 || b.x > canvas.width ||
            b.y < 0 || b.y > canvas.height
        ) bullets.splice(i, 1);
    });

    enemies.forEach((e, ei) => {
        e.update(player.x, player.y);
        const dist = Math.hypot(player.x - e.x, player.y - e.y);
        if (dist < 40) {
            cancelAnimationFrame(animationId);
            resultScreen.style.display = 'flex';
        }

        bullets.forEach((b, bi) => {
            const dist = Math.hypot(b.x - e.x, b.y - e.y);
            if (dist < 40) {
                for (let i = 0; i < 8; i++) {
                    particles.push(new Particle(b.x, b.y, {
                        x: (Math.random() - 0.5) * 4,
                        y: (Math.random() - 0.5) * 4
                    }));
                }
                score += 100;
                scoreDisplay.textContent = score;
                enemies.splice(ei, 1);
                bullets.splice(bi, 1);
            }
        });
    });
}

// ---------- Стрільба ----------
canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const angle = Math.atan2(y - player.y, x - player.x);
    const velocity = {
        x: Math.cos(angle) * 6,
        y: Math.sin(angle) * 6
    };
    player.state = 'shoot';
    setTimeout(() => player.state = 'idle', 200);
    bullets.push(new Bullet(player.x, player.y, velocity));
});

// ---------- Кнопка старту ----------
startBtn.addEventListener('click', () => {
    initGame();
    animate();
    spawnEnemies();
});
