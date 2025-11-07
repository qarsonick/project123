(() => {
  const canvas = document.querySelector('.canvas');
  const ctx = canvas.getContext('2d');

  const startBtn = document.querySelector('.start-game-btn');
  const resultScreen = document.querySelector('.result');
  const scoreDisplay = document.querySelector('.score');

  function resizeCanvas() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const preloaded = {};
  const images = {
    grass: 'img/grass.jpg', // 🟢 твоя фотографія з травою
    player: 'img/player.png',
    enemy: 'img/zombie.png',
    bullet: 'img/bullet.png',
  };

  // Завантаження зображень
  for (let key in images) {
    const img = new Image();
    img.src = images[key];
    preloaded[key] = img;
  }

  // Центр екрана
  const mid = () => ({
    x: canvas.width / (window.devicePixelRatio || 1) / 2,
    y: canvas.height / (window.devicePixelRatio || 1) / 2,
  });

  class Player {
    constructor(x, y) {
      this.position = { x, y };
      this.image = preloaded.player;
      this.width = 70;
      this.height = 70;
    }

    draw() {
      ctx.drawImage(
        this.image,
        this.position.x - this.width / 2,
        this.position.y - this.height / 2,
        this.width,
        this.height
      );
    }

    update() {
      this.draw();
    }
  }

  class Enemy {
    constructor(x, y) {
      this.position = { x, y };
      this.image = preloaded.enemy;
      this.width = 70;
      this.height = 70;
      this.speed = 1.2;
    }

    draw() {
      ctx.drawImage(
        this.image,
        this.position.x,
        this.position.y,
        this.width,
        this.height
      );
    }

    update() {
      const dirX = mid().x - (this.position.x + this.width / 2);
      const dirY = mid().y - (this.position.y + this.height / 2);
      const len = Math.hypot(dirX, dirY);
      this.position.x += (dirX / len) * this.speed;
      this.position.y += (dirY / len) * this.speed;
      this.draw();
    }
  }

  class Bullet {
    constructor(x, y, angle) {
      this.position = { x, y };
      this.velocity = {
        x: Math.cos(angle) * 6,
        y: Math.sin(angle) * 6,
      };
      this.image = preloaded.bullet;
      this.width = 25;
      this.height = 25;
    }

    draw() {
      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      ctx.rotate(Math.atan2(this.velocity.y, this.velocity.x));
      ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
      ctx.restore();
    }

    update() {
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
      this.draw();
    }
  }

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
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    update() {
      this.draw();
      this.velocity.x *= 0.98;
      this.velocity.y *= 0.98;
      this.x += this.velocity.x;
      this.y += this.velocity.y;
      this.alpha -= 0.01;
    }
  }

  const player = new Player(mid().x, mid().y);
  const bullets = [];
  const enemies = [];
  const particles = [];
  let animationId;
  let spawnInterval;
  let score = 0;

  function spawnEnemies() {
    spawnInterval = setInterval(() => {
      const side = Math.floor(Math.random() * 4);
      let x, y;
      if (side === 0) {
        x = Math.random() * canvas.width;
        y = -60;
      } else if (side === 1) {
        x = canvas.width + 60;
        y = Math.random() * canvas.height;
      } else if (side === 2) {
        x = Math.random() * canvas.width;
        y = canvas.height + 60;
      } else {
        x = -60;
        y = Math.random() * canvas.height;
      }
      enemies.push(new Enemy(x, y));
    }, 1500);
  }

  canvas.addEventListener('click', (e) => {
    const angle = Math.atan2(e.clientY - mid().y, e.clientX - mid().x);
    bullets.push(new Bullet(mid().x, mid().y, angle));
  });

  function animate() {
    animationId = requestAnimationFrame(animate);

    if (preloaded.grass) {
      const img = preloaded.grass;

      // Масштабування для покриття екрану
      const scale = Math.max(
        canvas.width / img.width,
        canvas.height / img.height
      );

      const bgWidth = img.width * scale;
      const bgHeight = img.height * scale;
      const offsetX = (canvas.width - bgWidth) / 2;
      const offsetY = (canvas.height - bgHeight) / 2;

      ctx.drawImage(img, offsetX, offsetY, bgWidth, bgHeight);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    } else {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    }

    player.update();

    particles.forEach((p, i) => {
      if (p.alpha <= 0) particles.splice(i, 1);
      else p.update();
    });

    bullets.forEach((b, i) => {
      b.update();
      if (
        b.position.x > canvas.clientWidth + 50 ||
        b.position.y > canvas.clientHeight + 50 ||
        b.position.x < -50 ||
        b.position.y < -50
      )
        bullets.splice(i, 1);
    });

    enemies.forEach((enemy, ei) => {
      enemy.update();
      const dx = mid().x - (enemy.position.x + enemy.width / 2);
      const dy = mid().y - (enemy.position.y + enemy.height / 2);
      const dist = Math.hypot(dx, dy);
      if (dist < 40) {
        cancelAnimationFrame(animationId);
        clearInterval(spawnInterval);
        resultScreen.style.display = 'flex';
      }
      bullets.forEach((bullet, bi) => {
        const d = Math.hypot(
          bullet.position.x - enemy.position.x,
          bullet.position.y - enemy.position.y
        );
        if (d < 30) {
          for (let i = 0; i < 12; i++)
            particles.push(
              new Particle(
                bullet.position.x,
                bullet.position.y,
                Math.random() * 3,
                'red',
                {
                  x: (Math.random() - 0.5) * 2,
                  y: (Math.random() - 0.5) * 2,
                }
              )
            );
          enemies.splice(ei, 1);
          bullets.splice(bi, 1);
          score += 100;
          scoreDisplay.textContent = score;
        }
      });
    });
  }

  startBtn.addEventListener('click', () => {
    resultScreen.style.display = 'none';
    score = 0;
    scoreDisplay.textContent = score;
    enemies.length = 0;
    bullets.length = 0;
    particles.length = 0;
    animate();
    spawnEnemies();
  });
})();
