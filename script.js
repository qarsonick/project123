const startGame = document.querySelector(".start-game-btn");
const result = document.querySelector(".result");
const canvas = document.querySelector(".canvas");
const context = canvas.getContext("2d");

// --- 📏 Адаптивный размер canvas ---
let midX, midY;
function resizeCanvas() {
    canvas.width = window.innerWidth * 0.8;  // 80% ширины окна
    canvas.height = window.innerHeight * 0.7; // 70% высоты окна
    midX = canvas.width / 2;
    midY = canvas.height / 2;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// --- 👤 Игрок ---
class Player {
    constructor() {
        this.width = canvas.width * 0.08;
        this.height = this.width;
        this.position = { x: midX - this.width / 2, y: midY - this.height / 2 };
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

// --- 💥 Пули ---
class Projectile {
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

// --- 🧟 Враги ---
class Enemy {
    constructor(position, velocity, rotation) {
        this.image = createImage("photos/zombieSpritewalk.png");
        this.width = canvas.width * 0.06;
        this.height = this.width * 0.6;
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

// --- 💨 Частицы ---
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
        context.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
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

// --- ⚙️ Логика игры ---
let player = new Player();
let projectiles = [];
let enemies = [];
let particles = [];
let score = 0;

function createImage(path) {
    const img = new Image();
    img.src = path;
    return img;
}

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
    }, 1500);
}

function initGame() {
    player = new Player();
    projectiles = [];
    enemies = [];
    particles = [];
    score = 0;
    animate();
    spawnEnemies();
}

let animateID;
function animate() {
    animateID = requestAnimationFrame(animate);
    context.clearRect(0, 0, canvas.width, canvas.height);
    player.update();

    particles.forEach((p, i) => {
        if (p.alpha <= 0) particles.splice(i, 1);
        else p.update();
    });

    projectiles.forEach((p, i) => {
        p.update();
        if (p.position.x > canvas.width || p.position.y > canvas.height || p.position.x + p.width < 0 || p.position.y + p.height < 0)
            setTimeout(() => projectiles.splice(i, 1));
    });

    enemies.forEach((e, i) => {
        e.update();
        const dis = Math.hypot(midX - 10 - e.cirX, midY + 10 - e.cirY);
        if (dis - e.radius - 20 < 1) {
            cancelAnimationFrame(animateID);
            canvas.style.display = "none";
            result.classList.add("active");
        }

        projectiles.forEach((proj, j) => {
            const dis2 = Math.hypot(proj.position.x - e.cirX, proj.position.y - e.cirY);
            if (dis2 - e.radius - 6 < 1) {
                for (let i = 0; i < 15; i++)
                    particles.push(new Particle(e.position.x + e.width / 2, e.position.y + e.height / 2, Math.random() * 3, "red", {
                        x: (Math.random() - 0.5) * 2,
                        y: (Math.random() - 0.5) * 2,
                    }));
                enemies.splice(i, 1);
                projectiles.splice(j, 1);
                score += 100;
            }
        });
    });
}

// --- 🖱️ Управление ---
canvas.addEventListener("click", (event) => {
    const angle = Math.atan2(event.clientY - midY, event.clientX - (midX - 15));
    const velocity = { x: Math.cos(angle) * 5, y: Math.sin(angle) * 5 };
    const position = { x: midX - 15 + 40 * Math.cos(angle), y: midY + 40 * Math.sin(angle) };
    projectiles.push(new Projectile(position, velocity, angle));
    player.currentSpriteNum = player.sprite.shoot.spriteNum;
    player.currentSprite = player.sprite.shoot.image;
    player.currentCropWidth = player.sprite.shoot.cropWidth;
    player.currentHeight = player.sprite.shoot.height;
});

window.addEventListener("mousemove", (e) => {
    const angle = Math.atan2(e.clientY - midY, e.clientX - (midX - 15));
    player.rotation = angle;
});

startGame.addEventListener("click", () => {
    result.classList.remove("active");
    canvas.style.display = "block";
    initGame();
});
