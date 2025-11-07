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
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => { console.warn('Не знайдено:', src); resolve(null); };
      img.src = src;
    });
  }

  const resources = {
    playerIdle: 'photos/playerSpriteIdle.png',
    playerShoot: 'photos/playerSpriteShoot.png',
    playerReload: 'photos/playerSpriteReload.png',
    zombieWalk: 'photos/zombieSpritewalk.png',
    projectile: 'photos/projectile.png',
    grass: 'photos/grass.jpg'
  };

  let player, bullets, enemies, particles;
  let preloaded = {};
  let score = 0;
  let animationId = null;
  let spawnInterval = null;

  const mid = () => ({ x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 });

  class Player {
    constructor(imgs) {
      const m = mid();
      this.width = 100;
      this.height = 100;
      this.position = { x: m.x - this.width / 2, y: m.y - this.height / 2 };
      this.rotation = 0;
      this.frame = 0;
      this.sprite = {
        stand: { image: imgs.playerIdle, cropWidth: 313, height: 207, frames: 1 },
        shoot: { image: imgs.playerShoot, cropWidth: 312, height: 206, frames: 2 },
        reload: { image: imgs.playerReload, cropWidth: 322, height: 217, frames: 2 }
      };
      this.currentSprite = this.sprite.stand;
    }

    draw() {
      const m = mid();
      ctx.save();
      ctx.translate(m.x - 15, m.y);
      ctx.rotate(this.rotation);
      ctx.translate(-(m.x - 15), -m.y);
      if (this.currentSprite.image) {
        ctx.drawImage(
          this.currentSprite.image,
          this.currentSprite.cropWidth * this.frame,
          0,
          this.currentSprite.cropWidth,
          this.currentSprite.height,
          this.position.x,
          this.position.y,
          this.width,
          this.height
        );
      } else {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(m.x, m.y, 20, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    update() {
      this.frame++;
      if (this.frame >= this.currentSprite.frames) this.frame = 0;
      this.draw();
    }

    shootAnim() {
      this.currentSprite = this.sprite.shoot;
      this.frame = 0;
      setTimeout(() => {
        this.currentSprite = this.sprite.reload;
        this.frame = 0;
        setTimeout(() => {
          this.currentSprite = this.sprite.stand;
          this.frame = 0;
        }, 500);
      }, 300);
    }
  }

  class Bullet {
    constructor(pos, vel, rot, img) {
      this.image = img;
      this.position = { ...pos };
      this.velocity = { ...vel };
      this.rotation = rot;
      this.width = 20;
      this.height = 6;
    }
    draw() {
      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      ctx.rotate(this.rotation);
      if (this.image) ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
      else { ctx.fillStyle = 'yellow'; ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height); }
      ctx.restore();
    }
    update() {
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
      this.draw();
    }
  }

  class Enemy {
    constructor(pos, vel, rot, img) {
      this.image = img;
      this.position = { ...pos };
      this.velocity = { ...vel };
      this.rotation = rot;
      this.width = 85;
      this.height = 50;
      this.frame = 0;
      this.framesCount = 32;
      this.cropXOffset = 95;
      this.cropYOffset = 100;
      this.frameWidth = 256;
      this.frameHeight = 256;
    }

    draw() {
      ctx.save();
      ctx.translate(this.position.x + this.width / 2, this.position.y + this.height / 2);
      ctx.rotate(this.rotation);
      ctx.translate(-this.position.x - this.width / 2, -this.position.y - this.height / 2);
      ctx.drawImage(
        this.image,
        this.frame * this.frameWidth + this.cropXOffset,
        this.cropYOffset,
        this.width,
        this.height,
        this.position.x,
        this.position.y,
        this.width,
        this.height
      );
      ctx.restore();
    }

    update() {
      this.frame = (this.frame + 1) % this.framesCount;
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
      this.draw();
    }
  }

  class Particle {
    constructor(x, y, r, color, vel) {
      this.x = x; this.y = y; this.radius = r; this.color = color; this.velocity = vel; this.alpha = 1;
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
      this.velocity.x *= 0.98;
      this.velocity.y *= 0.98;
      this.x += this.velocity.x;
      this.y += this.velocity.y;
      this.alpha -= 0.01;
      this.draw();
    }
  }

  async function preload() {
    for (const [key, src] of Object.entries(resources)) {
      preloaded[key] = await loadImage(src);
    }
  }

  function init() {
    resizeCanvas();
    player = new Player(preloaded);
    bullets = [];
    enemies = [];
    particles = [];
    score = 0;
    if (scoreDisplay) scoreDisplay.textContent = score;
    if (resultScreen) resultScreen.style.display = 'none';
  }

  function spawnEnemies() {
    spawnInterval = setInterval(() => {
      const pos = { x: Math.random() < 0.5 ? -256 : canvas.clientWidth + 85, y: Math.random() * canvas.clientHeight };
      const angle = Math.atan2(player.position.y - pos.y, player.position.x - pos.x);
      const velocity = { x: Math.cos(angle) * 0.6, y: Math.sin(angle) * 0.6 };
      enemies.push(new Enemy(pos, velocity, angle, preloaded.zombieWalk));
    }, 1000);
  }

  function animate() {
    animationId = requestAnimationFrame(animate);

    if (preloaded.grass) {
      ctx.drawImage(preloaded.grass, -canvas.width * 0.25, -canvas.height * 0.25, canvas.width * 1.5, canvas.height * 1.5);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    } else {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    }

    player.update();
    particles.forEach((p, i) => { if (p.alpha <= 0) particles.splice(i, 1); else p.update(); });
    bullets.forEach((b, i) => { b.update(); if (b.position.x > canvas.clientWidth + 50 || b.position.y > canvas.clientHeight + 50 || b.position.x < -50 || b.position.y < -50) bullets.splice(i, 1); });
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
        const d = Math.hypot(bullet.position.x - enemy.position.x, bullet.position.y - enemy.position.y);
        if (d < 30) {
          for (let i = 0; i < 12; i++)
            particles.push(new Particle(bullet.position.x, bullet.position.y, Math.random() * 3, 'red', { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 }));
          enemies.splice(ei, 1);
          bullets.splice(bi, 1);
          score += 100;
          scoreDisplay.textContent = score;
        }
      });
    });
  }

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + canvas.clientWidth / 2;
    const cy = rect.top + canvas.clientHeight / 2;
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
    const velocity = { x: Math.cos(angle) * 6, y: Math.sin(angle) * 6 };
    const position = { x: cx - rect.left + 40 * Math.cos(angle), y: cy - rect.top + 40 * Math.sin(angle) };
    bullets.push(new Bullet(position, velocity, angle, preloaded.projectile));
    player.shootAnim();
  });

  window.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + canvas.clientWidth / 2;
    const cy = rect.top + canvas.clientHeight / 2;
    player.rotation = Math.atan2(event.clientY - cy, event.clientX - cx);
  });

  async function setup() {
    await preload();
    if (startBtn) startBtn.addEventListener('click', () => { init(); animate(); spawnEnemies(); });
    else { init(); animate(); spawnEnemies(); }
  }

  setup();
})();  



можешь в этом коде изменить только размер пули
