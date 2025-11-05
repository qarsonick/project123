// game.js — надежная версия с прелоадом и фолбэком
(() => {
  const canvas = document.querySelector('.canvas');
  const ctx = canvas.getContext('2d');

  const startBtn = document.querySelector('.start-game-btn');
  const resultScreen = document.querySelector('.result');
  const scoreDisplay = document.querySelector('.score');

  // если какие-то селекторы не найдены — логируем
  if (!canvas) console.error('Canvas .canvas не найден в DOM');
  if (!startBtn) console.warn('Кнопка .start-game-btn не найдена — игра можно запустить автозапуском');

  // ----- resize canvas правильно (учет CSS размеров и DPR) -----
  function resizeCanvas() {
    // используем клиентские размеры, чтобы соответствовать CSS
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // упрощённый масштаб для рисования в CSS px
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // ----- утилиты прелоада -----
  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ img, ok: true });
      img.onerror = () => {
        console.error('Не удалось загрузить изображение:', src);
        resolve({ img: null, ok: false, src });
      };
      img.src = src;
    });
  }
  function loadAudio(src) {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.oncanplaythrough = () => resolve({ audio, ok: true });
      audio.onerror = () => {
        console.warn('Не удалось загрузить аудио:', src);
        resolve({ audio: null, ok: false, src });
      };
      audio.src = src;
      // Не обязательно ждать окончания загрузки коротких эффектов
    });
  }

  // ----- перечислим ресурсы (пути можно править) -----
  const resources = {
    images: {
      playerIdle: 'img/playerSpriteIdle.png',
      playerShoot: 'img/playerSpriteShoot.png',
      playerReload: 'img/playerSpriteReload.png',
      zombieWalk: 'img/zombieSpritewalk.png',
      projectile: 'img/projectile.png',
      // фон опционален — если нет, фон будет чёрный
      grass: 'img/grass.jpg'
    },
    audios: {
      background: 'audio/backgroundSound.mp3',
      shoot: 'audio/shot-and-reload.mp3',
      kill: 'audio/killed_zombie.mp3',
      boom: 'audio/boom.mp3'
    }
  };

  // ----- глобальные игровые переменные -----
  let player, bullets, enemies, particles;
  let animationId = null;
  let score = 0;
  let preloaded = { images: {}, audios: {} };
  let imagesOk = true;

  // ----- классы (аналогично прежде) -----
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
        stand: { image: imgs.playerIdle, cropW: 313, h: 207 },
        shoot: { image: imgs.playerShoot, cropW: 312, h: 206 },
        reload: { image: imgs.playerReload, cropW: 322, h: 217 }
      };
      this.current = this.sprite.stand;
    }
    draw() {
      const m = mid();
      ctx.save();
      ctx.translate(m.x - 15, m.y);
      ctx.rotate(this.rotation);
      ctx.translate(-(m.x - 15), -m.y);

      // если изображение доступно — рисуем спрайт, иначе — фолбэк (круг)
      if (this.current.image && this.current.image.complete) {
        const cropW = this.current.cropW;
        ctx.drawImage(
          this.current.image,
          cropW * (this.frame % 16),
          0,
          cropW,
          this.current.h,
          this.position.x,
          this.position.y,
          this.width,
          this.height
        );
      } else {
        // фолбэк: белый круг игрока
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(m.x, m.y, 20, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    update() {
      this.frame = (this.frame + 1) % 32;
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

  class Bullet {
    constructor(pos, vel, rot, img) {
      this.image = img;
      this.position = { ...pos };
      this.velocity = { ...vel };
      this.rotation = rot;
      this.width = 12;
      this.height = 3;
    }
    draw() {
      if (this.image && this.image.complete) {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.rotation);
        ctx.drawImage(this.image, 0, 0, 30, 8, -this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
      } else {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(this.position.x - 3, this.position.y - 2, 6, 4);
      }
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
    }
    draw() {
      if (this.image && this.image.complete) {
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
      } else {
        // фолбэк — красный прямоугольник
        ctx.fillStyle = 'red';
        ctx.fillRect(this.position.x, this.position.y, 30, 30);
      }
    }
    update() {
      this.frame = (this.frame + 1) % 32;
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
      this.draw();
    }
  }

  // частицы — простой круг
  const friction = 0.98;
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
      this.velocity.x *= friction;
      this.velocity.y *= friction;
      this.x += this.velocity.x;
      this.y += this.velocity.y;
      this.alpha -= 0.01;
      this.draw();
    }
  }

  // ----- прелоад ресурсов -----
  async function preloadAll() {
    const imgEntries = Object.entries(resources.images);
    const audEntries = Object.entries(resources.audios);

    const imgPromises = imgEntries.map(([key, src]) => loadImage(src).then(res => ({ key, res })));
    const audPromises = audEntries.map(([key, src]) => loadAudio(src).then(res => ({ key, res })));

    const imgResults = await Promise.all(imgPromises);
    imgResults.forEach(({ key, res }) => {
      preloaded.images[key] = res.ok ? res.img : null;
      if (!res.ok) imagesOk = false;
    });

    const audResults = await Promise.all(audPromises);
    audResults.forEach(({ key, res }) => {
      preloaded.audios[key] = res.ok ? res.audio : null;
    });

    // лог результата прелоада
    console.info('Прелоад завершён. imagesOk=', imagesOk);
  }

  // ----- инициализация игры -----
  function initGame() {
    resizeCanvas();
    player = new Player(preloaded.images);
    bullets = [];
    enemies = [];
    particles = [];
    score = 0;
    if (scoreDisplay) scoreDisplay.textContent = score;
    if (resultScreen) resultScreen.style.display = 'none';
  }

  // ----- спавн врагов -----
  let spawnInterval = null;
  function spawnEnemies() {
    spawnInterval = setInterval(() => {
      const position = { x: 0, y: 0 };
      if (Math.random() < 0.5) {
        position.x = Math.random() < 0.5 ? -256 : canvas.clientWidth + 85;
        position.y = Math.random() * canvas.clientHeight;
      } else {
        position.x = Math.random() * canvas.clientWidth;
        position.y = Math.random() < 0.5 ? -256 : canvas.clientHeight + 50;
      }
      const angle = Math.atan2(player.position.y - position.y, player.position.x - position.x);
      const velocity = { x: Math.cos(angle) * 0.6, y: Math.sin(angle) * 0.6 };
      enemies.push(new Enemy(position, velocity, angle, preloaded.images.zombieWalk));
    }, 1000);
  }

  // ----- основная анимация -----
  function animate() {
    animationId = requestAnimationFrame(animate);

    // фон: если есть grass — рисуем как паттерн (необходимо, чтобы было загружено)
    if (preloaded.images.grass && preloaded.images.grass.complete) {
      // делаем плитку/растяжение — тут упрощённо: drawImage на полный canvas
      ctx.drawImage(preloaded.images.grass, 0, 0, canvas.clientWidth, canvas.clientHeight);
      // затем затемняем
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    } else {
      // если нет — просто черный фон
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
      if (b.position.x > canvas.clientWidth + 50 || b.position.y > canvas.clientHeight + 50 ||
          b.position.x < -50 || b.position.y < -50) {
        bullets.splice(i, 1);
      }
    });

    enemies.forEach((enemy, eIndex) => {
      enemy.update();

      const m = mid();
      const enemyCenterX = enemy.position.x + (enemy.width - enemy.height);
      const enemyCenterY = enemy.position.y + enemy.height / 2;
      const distToPlayer = Math.hypot(m.x - enemyCenterX, m.y - enemyCenterY);
      if (distToPlayer < 40) {
        if (animationId) cancelAnimationFrame(animationId);
        if (spawnInterval) clearInterval(spawnInterval);
        if (resultScreen) {
          resultScreen.style.display = 'flex';
        } else {
          console.log('Game over — result screen not found in DOM');
        }
      }

      bullets.forEach((bullet, bIndex) => {
        const dist = Math.hypot(bullet.position.x - enemy.position.x, bullet.position.y - enemy.position.y);
        if (dist < 30) {
          // частицы
          for (let i = 0; i < 12; i++) {
            particles.push(new Particle(
              bullet.position.x,
              bullet.position.y,
              Math.random() * 3,
              'red',
              { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 }
            ));
          }
          if (preloaded.audios.kill) { preloaded.audios.kill.currentTime = 0; preloaded.audios.kill.play().catch(()=>{}); }
          enemies.splice(eIndex, 1);
          bullets.splice(bIndex, 1);
          score += 100;
          if (scoreDisplay) scoreDisplay.textContent = score;
        }
      });
    });
  }

  // ----- обработчики ввода -----
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
    bullets.push(new Bullet(position, velocity, angle, preloaded.images.projectile));
    player.shootAnim();
    if (preloaded.audios.shoot) { preloaded.audios.shoot.currentTime = 0; preloaded.audios.shoot.play().catch(()=>{}); }
  });

  window.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + canvas.clientWidth / 2;
    const cy = rect.top + canvas.clientHeight / 2;
    const angle = Math.atan2(event.clientY - cy, event.clientX - cx);
    if (player) player.rotation = angle;
  });

  // старт и прелоад
  async function setupAndBind() {
    await preloadAll();

    // если кнопка есть — запуск по ней, иначе стартим сразу
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        initGame();
        animate();
        spawnEnemies();
        if (preloaded.audios.background) {
          preloaded.audios.background.loop = true;
          preloaded.audios.background.volume = 0.08;
          preloaded.audios.background.play().catch(()=>{});
        }
      });
    } else {
      // автозапуск если нет кнопки
      initGame();
      animate();
      spawnEnemies();
    }
  }

  // запустить конфигурацию
  setupAndBind().catch(err => console.error('Ошибка setup:', err));

  // ----- небольшая вспомогательная команда разработчику -----
  // Если хочешь принудительно увидеть тест (без картинок) — вызови window.__GAME_TEST()
  window.__GAME_TEST = function() {
    initGame();
    // заменим ресурсы на null, чтобы сработал фолбэк
    Object.keys(preloaded.images).forEach(k => preloaded.images[k] = null);
    animate();
    spawnEnemies();
  };

})();
