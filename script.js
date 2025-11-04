const scoreElements = document.querySelectorAll(".score-num");
const startGame = document.querySelector(".start-game-btn");
const result = document.querySelector(".result");

const canvas = document.querySelector(".canvas");
const gameContainer = document.querySelector(".desktop-container");
const context = canvas.getContext("2d");

// =============================
// ⚙️ Настройка размеров canvas
// =============================
function resizeCanvas() {
    canvas.width = gameContainer.clientWidth;
    canvas.height = gameContainer.clientHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

let midX = canvas.width / 2;
let midY = canvas.height / 2;

// =============================
// 👤 Класс игрока
// =============================
class Player {
    constructor() {
        this.width = 100;
        this.height = 100;
        this.position = {
            x: midX - this.width / 2,
            y: midY - this.height / 2,
        };
        this.sprite = {
            stand: {
                spriteNum: 1,
                image: createImage("photos/playerSpriteIdle.png"),
                cropWidth: 313,
                height: 207,
            },
            move: {
                spriteNum: 2,
                image: createImage("photos/playerSpriteMove.png"),
                cropWidth: 313,
                height: 206,
            },
            reload: {
                spriteNum: 3,
                image: createImage("photos/playerSpriteReload.png"),
                cropWidth: 322,
                height: 217,
            },
            shoot: {
                spriteNum: 4,
                image: createImage("photos/playerSpriteShoot.png"),
                cropWidth: 312,
                height: 206,
            },
        };
        this.currentSpriteNum = 1;
        this.currentSprite = this.sprite.stand.image;
        this.currentCropWidth = this.sprite.stand.cropWidth;
        this.currentHeight = this.sprite.stand.height;
        this.frame = 0;
        this.rotation = 0;
    }

    draw() {
        context.save();
        context.translate(midX - 15, midY);
        context.rotate(this.rotation);
        context.translate(-midX + 15, -midY);
        context.drawImage(
            this.currentSprite,
            this.currentCropWidth * this.frame,
            0,
            this.currentCropWidth,
            this.currentHeight,
            this.position.x,
            this.position.y,
            this.width,
            this.height
        );
        context.restore();
    }

    update() {
        if (this.frame >= 0 && this.currentSpriteNum === this.sprite.shoot.spriteNum) {
            this.currentSpriteNum = this.sprite.reload.spriteNum;
            this.currentSprite = this.sprite.reload.image;
            this.currentCropWidth = this.sprite.reload.cropWidth;
            this.currentHeight = this.sprite.reload.height;
            this.frame = 0;
        } else if (this.frame >= 19) {
            if (this.currentSpriteNum === this.sprite.reload.spriteNum) {
                this.currentSpriteNum = this.sprite.stand.spriteNum;
                this.currentSprite = this.sprite.stand.image;
                this.currentCropWidth = this.sprite.stand.cropWidth;
                this.currentHeight = this.sprite.stand.height;
            }
            this.frame = 0;
        } else {
            this.frame++;
        }
        this.draw();
    }
}

// =============================
// 💥 Пули
// =============================
class Projectiles {
    constructor(position, velocity, rotation) {
        this.width = 12;
        this.height = 3;
        this.image = createImage("photos/пуля.png");
        this.position = position;
        this.velocity = velocity;
        this.rotation = rotation;
    }

    draw() {
        context.save();
        context.translate(this.position.x, this.position.y);
        context.rotate(this.rotation);
        context.drawImage(this.image, 0, 0, 30, 8, this.position.x, this.position.y, this.width, this.height);
        context.restore();
    }

    update() {
        this.draw();
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}

// =============================
// 🧟 Враги
// =============================
class Enemy {
    constructor(position, velocity, rotation) {
        this.image = createImage("photos/zombieSpritewalk.png");
        this.width = 85;
        this.height = 50;
        this.position = position;
        this.velocity = velocity;
        this.rotation = rotation;
        this.frame = 0;
    }

    draw() {
        this.radius = 15;
        this.cirX = this.position.x + (this.width - this.height);
        this.cirY = this.position.y + this.height / 2;

        context.save();
        context.translate(this.position.x + this.width / 2, this.position.y + this.height / 2);
        context.rotate(this.rotation);
        context.drawImage(
            this.image,
            (this.frame * 256) + 95,
            100,
            this.width,
            this.height,
            this.position.x,
            this.position.y,
            this.width,
            this.height
        );
        context.restore();
    }

    update() {
        if (this.frame >= 31) this.frame = 0;
        else setTimeout(() => this.frame++, 100);
        this.draw();
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}

// =============================
// 🔥 Частицы
// =============================
const friction = 0.98;
class Particle {
    constructor(x, y, radius, color, velocity) {
        this.position = { x, y };
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
        this.alpha = 1;
    }

    draw() {
        context.save();
        context.globalAlpha = this.alpha;
        context.fillStyle = this.color;
        context.beginPath();
        context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }

    update() {
        this.draw();
        this.velocity.x *= friction;
        this.velocity.y *= friction;
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.alpha -= 0.01;
    }
}

// =============================
// 🧩 Игровая логика
// =============================
let player = new Player();
let projectiles = [];
let enemies = [];
let particles = [];
let animateID;
let score = 0;

function createImage(path) {
    const img = new Image();
    img.src = path;
    return img;
}

// Спавн врагов
function spawnEnemies() {
    setInterval(() => {
        const position = { x: 0, y: 0 };
        if (Math.random() < 0.5) {
            position.x = Math.random() < 0.5 ? -256 : canvas.width + 85;
            position.y = Math.random() * canvas.height;
        } else {
            position.x = Math.random() * canvas.width;
            position.y = Math.random() < 0.5 ? -256 : canvas.height + 50;
        }

        const angle = Math.atan2(player.position.y - position.y, player.position.x - position.x);
        const velocity = { x: Math.cos(angle) * 0.5, y: Math.sin(angle) * 0.5 };
        enemies.push(new Enemy(position, velocity, angle));
    }, 1000);
}

function initGame() {
    resizeCanvas();
    midX = canvas.width / 2;
    midY = canvas.height / 2;

    player = new Player();
    projectiles = [];
    enemies = [];
    particles = [];
    score = 0;
    scoreElements.forEach(s => (s.innerHTML = score));

    animate();
    spawnEnemies();
}

// Анимация
function animate() {
    animateID = requestAnimationFrame(animate);
    context.fillStyle = "black";
    context.fillRect(0, 0, canvas.width, canvas.height);
    player.update();

    particles = particles.filter(p => p.alpha > 0);
    particles.forEach(p => p.update());
    projectiles.forEach((p, i) => {
        p.update();
        if (p.position.x > canvas.width || p.position.y > canvas.height || p.position.x < 0 || p.position.y < 0)
            projectiles.splice(i, 1);
    });
    enemies.forEach(e => e.update());

    enemies.forEach((enemy, enemyIndex) => {
        const dis = Math.hypot(midX - 10 - enemy.cirX, midY + 10 - enemy.cirY);
        if (dis - enemy.radius - 20 < 1) {
            cancelAnimationFrame(animateID);
            scoreElements[1].innerHTML = score;
            canvas.style.display = "none";
            result.style.display = "block";
        }

        projectiles.forEach((projectile, projectileIndex) => {
            const dis = Math.hypot(projectile.position.x + 2 - enemy.cirX, projectile.position.y + 2 - enemy.cirY);
            if (dis - enemy.radius - 6 < 1) {
                for (let i = 0; i < 15; i++) {
                    particles.push(
                        new Particle(
                            enemy.position.x + enemy.width / 2,
                            enemy.position.y + enemy.height / 2,
                            Math.random() * 3,
                            "red",
                            { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 }
                        )
                    );
                }
                enemies.splice(enemyIndex, 1);
                projectiles.splice(projectileIndex, 1);
                score += 100;
                scoreElements[0].innerHTML = score;
            }
        });
    });
}

// =============================
// 🎯 Управление
// =============================
canvas.addEventListener("click", (event) => {
    const angle = Math.atan2(event.clientY - midY, event.clientX - (midX - 15));
    const velocity = { x: Math.cos(angle) * 5, y: Math.sin(angle) * 5 };
    let position = { x: midX - 15, y: midY };
    position.x += 40 * Math.cos(angle) - 20 * Math.sin(angle);
    position.y += 40 * Math.sin(angle) + 20 * Math.cos(angle);
    projectiles.push(new Projectiles(position, velocity, angle));

    player.currentSpriteNum = player.sprite.shoot.spriteNum;
    player.currentSprite = player.sprite.shoot.image;
    player.currentCropWidth = player.sprite.shoot.cropWidth;
    player.currentHeight = player.sprite.shoot.height;
});

document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    if (score >= 5000) {
        score += enemies.length * 100 - 5000;
        scoreElements[0].innerHTML = score;
        enemies.forEach((enemy) => {
            for (let i = 0; i < 15; i++) {
                particles.push(
                    new Particle(
                        enemy.position.x + enemy.width / 2,
                        enemy.position.y + enemy.height / 2,
                        Math.random() * 3,
                        "red",
                        { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 }
                    )
                );
            }
        });
        enemies = [];
    }
});

window.addEventListener("mousemove", (event) => {
    const angle = Math.atan2(event.clientY - midY, event.clientX - (midX - 15));
    player.rotation = angle;
});

startGame.addEventListener("click", () => {
    result.style.display = "none";
    canvas.style.display = "block";
    initGame();
});
