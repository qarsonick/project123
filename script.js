(() => {
  const canvas = document.querySelector('.canvas');
  const ctx = canvas.getContext('2d');

  const startBtn = document.querySelector('.start-game-btn');
  const resultScreen = document.querySelector('.result');
  const scoreDisplay = document.querySelector('.score');

  // Масштабування
  function resizeCanvas() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Завантаження зображень
  function loadImage(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.error('Не вдалося завантажити:', src);
        resolve(null);
      };
      img.src = src;
    });
  }

  // Ресурси
  const images = {
    playerIdle: 'photos/playerSpriteIdle.png',
    playerShoot: 'photos/playerSpriteShoot.png',
    playerReload: 'photos/playerSpriteReload.png',
    zombieWalk: 'photos/zombieSpritewalk.png',
    projectile: 'photos/projectile.png',
    grass: 'photos/grass.jpg'
  };

  let player, bullets, enemies, particles;
  let animationId = null;
  let score = 0;
  let loaded = {};

  const mid = () => ({ x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 });

  class Player {
    constructor(imgs) {
      const m = mid();
      this.width = 100;
      this.height = 100;
      this.position = { x: m.x - 50, y: m.y - 50 };
      this.rotation = 0;
      this.frame = 0;
      this.sprite = {
        stand: imgs.playerIdle,
        shoot: imgs.playerShoot,
        reload: imgs.playerReload
      };
      this.current = this.sprite.stand;
    }
    draw() {
      const m = mid();
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(this.rotation);
      ctx.translate(-m.x, -m.y);

      if (this.current) {
        ctx.drawImage(this.current, this.position.x, this.position.y, this.width, this.height);
      } else {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(m.x, m.y, 20, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    update() { this.draw(); }
    shootAnim() {
      this.current = this.sprite.shoot;
      setTimeout(() => {
        this.current = this.sprite.reload;
        setTimeout(() => {
          this.current = this.sprite.stand;
        }, 500);
      }, 200);
    }
  }

  class Bullet {
    constructor(pos, vel, rot, img) {
      this.image = img;
      this.position = { ...pos };
      this.velocity = { ...vel };
      this.rotation = rot;
    }
    update() {
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
      if (this.image)
        ctx.drawImage(this.image, this.position.x, this.position.y, 12, 4);
      else {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(this.position.x, this.position.y, 6, 3);
      }
    }
  }

  class Enemy {
    constructor(pos, vel, rot, img) {
      this.image = img;
      this.position = { ...pos };
      this.velocity = { ...vel };
      this.rotation = rot;
      this.width = 80;
      this.height = 80;
    }
    update() {
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
      ctx.save();
      ctx.translate(this.position.x + this.width / 2, this.position.y + this.height / 2);
      ctx.rotate(this.rotation);
      if (this.image)
        ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
      else {
        ctx.fillStyle = 'red';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      }
      ctx.restore();
    }
  }

  async function preload() {
    for (const [k, path] of Object.entries(images))
      loaded[k] = await loadImage(path);
  }

  function initGame() {
    resizeCanvas();
    player = new Player(loaded);
    bullets = [];
    enemies = [];
    particles = [];
    score = 0;
    scoreDisplay.textContent = score;
    resultScreen.style.display = 'none';
  }

  function spawnEnemies() {
    setInterval(() => {
      const side = Math.random() < 0.5 ? 'x' : 'y';
      const pos = { x: 0, y: 0 };
      if (side === 'x') {
        pos.x = Math.random() < 0.5 ? -80 : canvas.clientWidth + 80;
        pos.y = Math.random() * canvas.clientHeight;
      } else {
        pos.x = Math.random() * canvas.clientWidth;
        pos.y = Math.random() < 0.5 ? -80 : canvas.clientHeight + 80;
      }
      const angle = Math.atan2(mid().y - pos.y, mid().x - pos.x);
      const vel = { x: Math.cos(angle) * 0.8, y: Math.sin(angle) * 0.8 };
      enemies.push(new Enemy(pos, vel, angle, loaded.zombieWalk));
    }, 1200);
  }

  function animate() {
    animationId = requestAnimationFrame(animate);
    if (loaded.grass)
      ctx.drawImage(loaded.grass, 0, 0, canvas.clientWidth, canvas.clientHeight);
    else {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    }

    player.update();
    bullets.forEach(b => b.update());
    enemies.forEach((e, ei) => {
      e.update();
      bullets.forEach((b, bi) => {
        const dist = Math.hypot(b.position.x - e.position.x, b.position.y - e.position.y);
        if (dist < 30) {
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
    const position = {
      x: cx - rect.left + 40 * Math.cos(angle),
      y: cy - rect.top + 40 * Math.sin(angle)
    };
    bullets.push(new Bullet(position, velocity, angle, loaded.projectile));
    player.shootAnim();
  });

  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + canvas.clientWidth / 2;
    const cy = rect.top + canvas.clientHeight / 2;
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
    if (player) player.rotation = angle;
  });

  preload().then(() => {
    startBtn.addEventListener('click', () => {
      canvas.style.display = 'block';
      initGame();
      animate();
      spawnEnemies();
    });
  });
})();
