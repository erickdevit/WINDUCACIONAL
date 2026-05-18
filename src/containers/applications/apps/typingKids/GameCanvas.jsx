import React, { useEffect, useRef } from "react";

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 360;
const PLAYER_X = 138;
const PLAYER_SIZE = 30;
const GRAVITY = 0.55;
const JUMP_FORCE = -10.8;

const THEMES = [
  {
    sky: "#7dd3fc",
    back: "#bae6fd",
    far: "#38bdf8",
    ground: "#16a34a",
    groundTop: "#bbf7d0",
    player: "#2563eb",
    accent: "#f59e0b",
    danger: "#ef4444",
    shadow: "#14532d",
  },
  {
    sky: "#fde68a",
    back: "#fef3c7",
    far: "#fbbf24",
    ground: "#22c55e",
    groundTop: "#dcfce7",
    player: "#7c3aed",
    accent: "#06b6d4",
    danger: "#dc2626",
    shadow: "#166534",
  },
  {
    sky: "#c4b5fd",
    back: "#ede9fe",
    far: "#8b5cf6",
    ground: "#0ea5e9",
    groundTop: "#cffafe",
    player: "#f97316",
    accent: "#84cc16",
    danger: "#e11d48",
    shadow: "#075985",
  },
  {
    sky: "#fecdd3",
    back: "#fff1f2",
    far: "#fb7185",
    ground: "#a855f7",
    groundTop: "#f3e8ff",
    player: "#0f766e",
    accent: "#facc15",
    danger: "#be123c",
    shadow: "#581c87",
  },
  {
    sky: "#bbf7d0",
    back: "#ecfdf5",
    far: "#34d399",
    ground: "#475569",
    groundTop: "#e2e8f0",
    player: "#ea580c",
    accent: "#0ea5e9",
    danger: "#7f1d1d",
    shadow: "#1e293b",
  },
  {
    sky: "#bfdbfe",
    back: "#eff6ff",
    far: "#60a5fa",
    ground: "#ca8a04",
    groundTop: "#fef3c7",
    player: "#db2777",
    accent: "#22c55e",
    danger: "#991b1b",
    shadow: "#713f12",
  },
];

const OBSTACLE_TYPES = [
  "spike",
  "barrier",
  "saw",
  "slime",
  "laser",
  "pitMarker",
];

const makePlatform = (x, width, y, theme, index) => ({
  x,
  y,
  width,
  height: CANVAS_HEIGHT - y,
  color: theme.ground,
  topColor: theme.groundTop,
  hasObstacle: index > 0 && index % 2 === 0,
  obstacleType: OBSTACLE_TYPES[index % OBSTACLE_TYPES.length],
});

const createInitialState = (theme) => {
  const platforms = [];
  let x = -80;
  let y = 300;

  for (let i = 0; i < 8; i += 1) {
    const width = i === 0 ? 420 : 190 + ((i * 37) % 110);
    platforms.push(makePlatform(x, width, y, theme, i));
    x += width + 70 + ((i * 23) % 50);
    y = 282 + ((i * 31) % 3) * 14;
  }

  return {
    platforms,
    nextPlatformIndex: platforms.length,
    playerY: platforms[0].y - PLAYER_SIZE,
    velocityY: 0,
    isJumping: false,
    camera: 0,
    particles: [],
    lastMistakeFlag: false,
    lastLives: null,
    hitFlash: 0,
    deadFall: false,
    finishGlow: 0,
    jumpHint: 0,
  };
};

const addParticles = (state, x, y, color, amount, power = 5) => {
  for (let i = 0; i < amount; i += 1) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * power,
      vy: -Math.random() * power,
      size: 2 + Math.random() * 4,
      life: 1,
      color,
    });
  }
};

const jump = (state, force = JUMP_FORCE) => {
  if (state.isJumping) return;
  state.velocityY = force;
  state.isJumping = true;
  state.jumpHint = 18;
};

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  ctx.fill();
};

const drawHeart = (ctx, x, y, size, color, alpha = 1) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.32);
  ctx.bezierCurveTo(x, y, x - size * 0.5, y, x - size * 0.5, y + size * 0.32);
  ctx.bezierCurveTo(
    x - size * 0.5,
    y + size * 0.62,
    x,
    y + size * 0.82,
    x,
    y + size
  );
  ctx.bezierCurveTo(
    x,
    y + size * 0.82,
    x + size * 0.5,
    y + size * 0.62,
    x + size * 0.5,
    y + size * 0.32
  );
  ctx.bezierCurveTo(x + size * 0.5, y, x, y, x, y + size * 0.32);
  ctx.fill();
  ctx.restore();
};

export const GameCanvas = ({
  momentum,
  mistakeJustAdded,
  finished,
  passed,
  levelIndex,
  combo,
  score,
  wpm,
  lives,
  maxErrors,
  sessionId,
}) => {
  const canvasRef = useRef(null);
  const propsRef = useRef({});

  useEffect(() => {
    propsRef.current = {
      momentum,
      mistakeJustAdded,
      finished,
      passed,
      combo,
      score,
      wpm,
      lives,
      maxErrors,
    };
  }, [
    combo,
    finished,
    lives,
    maxErrors,
    mistakeJustAdded,
    momentum,
    passed,
    score,
    wpm,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    const theme = THEMES[levelIndex % THEMES.length];
    const state = createInitialState(theme);
    let animationFrameId;
    let lastFrame = performance.now();

    const appendPlatformIfNeeded = () => {
      const last = state.platforms[state.platforms.length - 1];
      if (last.x + last.width > CANVAS_WIDTH + 220) return;

      const index = state.nextPlatformIndex;
      const width = 180 + ((index * 41) % 140);
      const gap = 66 + Math.min(55, levelIndex * 6) + ((index * 17) % 36);
      const y = 194 + ((index * 29) % 4) * 12;

      state.platforms.push(
        makePlatform(last.x + last.width + gap, width, y + 88, theme, index)
      );
      state.nextPlatformIndex += 1;
    };

    const render = (now) => {
      const delta = Math.min(32, now - lastFrame) / 16.67;
      lastFrame = now;

      const live = propsRef.current;
      const speed = live.finished
        ? 0
        : 2.4 +
          (live.momentum || 0) * 0.055 +
          Math.min(1.8, (live.combo || 0) / 18);
      const playerMidX = PLAYER_X + PLAYER_SIZE / 2;
      const lostAllLives = live.lives <= 0;

      if (state.lastLives == null) state.lastLives = live.lives;

      if (live.mistakeJustAdded && !state.lastMistakeFlag) {
        state.hitFlash = 18;
        state.velocityY = Math.max(state.velocityY, -4);
        addParticles(
          state,
          PLAYER_X + PLAYER_SIZE,
          state.playerY + 12,
          theme.danger,
          18,
          8
        );
      }
      state.lastMistakeFlag = live.mistakeJustAdded;

      if (lostAllLives && !state.deadFall) {
        state.deadFall = true;
        state.velocityY = -5;
        addParticles(
          state,
          PLAYER_X + PLAYER_SIZE / 2,
          state.playerY + PLAYER_SIZE / 2,
          theme.danger,
          26,
          10
        );
      }
      state.lastLives = live.lives;

      if (!live.finished && !state.deadFall) {
        state.camera += speed * delta;
        state.platforms.forEach((platform) => {
          platform.x -= speed * delta;
        });
        state.platforms = state.platforms.filter(
          (platform) => platform.x + platform.width > -160
        );
        appendPlatformIfNeeded();
      }

      const activePlatform = state.platforms.find(
        (platform) =>
          playerMidX >= platform.x && playerMidX <= platform.x + platform.width
      );
      const nextPlatform = state.platforms.find(
        (platform) => platform.x > playerMidX
      );
      const platformAhead = activePlatform
        ? activePlatform.x + activePlatform.width - playerMidX
        : Number.POSITIVE_INFINITY;
      const obstacleAhead = activePlatform?.hasObstacle
        ? activePlatform.x + activePlatform.width * 0.64 - playerMidX
        : Number.POSITIVE_INFINITY;
      const needsJump =
        (platformAhead > 0 && platformAhead < 86) ||
        (obstacleAhead > 0 && obstacleAhead < 94);
      const canJump = (live.combo || 0) >= 2 || (live.momentum || 0) >= 18;

      if (
        !live.finished &&
        !live.mistakeJustAdded &&
        !state.deadFall &&
        needsJump &&
        canJump
      ) {
        jump(state, JUMP_FORCE - Math.min(2.2, (live.momentum || 0) / 45));
      }

      state.velocityY += GRAVITY * delta;
      state.playerY += state.velocityY * delta;

      const playerBottom = state.playerY + PLAYER_SIZE;

      if (
        !state.deadFall &&
        activePlatform &&
        playerBottom <= activePlatform.y + 18 &&
        state.velocityY >= 0
      ) {
        state.playerY = activePlatform.y - PLAYER_SIZE;
        state.velocityY = 0;
        state.isJumping = false;
      } else if (
        !activePlatform &&
        state.playerY > CANVAS_HEIGHT + 30 &&
        !lostAllLives
      ) {
        state.playerY = nextPlatform ? nextPlatform.y - PLAYER_SIZE : 178;
        state.velocityY = 0;
        state.isJumping = false;
        state.hitFlash = 12;
      }

      state.finishGlow =
        live.finished && live.passed ? Math.min(1, state.finishGlow + 0.04) : 0;
      state.hitFlash = Math.max(0, state.hitFlash - 1);
      state.jumpHint = Math.max(0, state.jumpHint - 1);

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      sky.addColorStop(0, theme.sky);
      sky.addColorStop(1, theme.back);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = "rgba(255,255,255,0.75)";
      for (let i = 0; i < 5; i += 1) {
        const x = ((i * 220 - state.camera * 0.25) % 1120) - 120;
        drawRoundedRect(ctx, x, 72 + (i % 2) * 34, 92, 22, 11);
        drawRoundedRect(ctx, x + 30, 60 + (i % 2) * 34, 72, 26, 13);
      }

      ctx.fillStyle = theme.far;
      ctx.globalAlpha = 0.26;
      for (let i = 0; i < 7; i += 1) {
        const x = ((i * 180 - state.camera * 0.12) % 1180) - 160;
        ctx.beginPath();
        ctx.moveTo(x, 270);
        ctx.lineTo(x + 92, 140 + (i % 3) * 16);
        ctx.lineTo(x + 190, 270);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      state.platforms.forEach((platform) => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        ctx.fillStyle = platform.topColor;
        ctx.fillRect(platform.x, platform.y, platform.width, 12);

        ctx.strokeStyle = theme.shadow;
        ctx.lineWidth = 2;
        for (
          let x = platform.x + 18;
          x < platform.x + platform.width;
          x += 36
        ) {
          ctx.beginPath();
          ctx.moveTo(x, platform.y + 22);
          ctx.lineTo(x - 14, platform.y + 42);
          ctx.stroke();
        }

        if (platform.hasObstacle) {
          const obstacleX = platform.x + platform.width * 0.64;
          ctx.fillStyle = theme.danger;
          ctx.shadowBlur = 8;
          ctx.shadowColor = theme.danger;
          if (platform.obstacleType === "barrier") {
            drawRoundedRect(ctx, obstacleX, platform.y - 44, 26, 44, 5);
            ctx.fillStyle = "rgba(255,255,255,0.86)";
            ctx.fillRect(obstacleX + 6, platform.y - 34, 14, 5);
          } else if (platform.obstacleType === "saw") {
            ctx.beginPath();
            for (let i = 0; i < 14; i += 1) {
              const angle = (Math.PI * 2 * i) / 14 + state.camera * 0.04;
              const radius = i % 2 === 0 ? 20 : 11;
              const px = obstacleX + 16 + Math.cos(angle) * radius;
              const py = platform.y - 18 + Math.sin(angle) * radius;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.82)";
            ctx.beginPath();
            ctx.arc(obstacleX + 16, platform.y - 18, 6, 0, Math.PI * 2);
            ctx.fill();
          } else if (platform.obstacleType === "slime") {
            drawRoundedRect(ctx, obstacleX, platform.y - 18, 46, 18, 9);
            ctx.fillStyle = "rgba(255,255,255,0.8)";
            ctx.fillRect(obstacleX + 10, platform.y - 12, 6, 4);
            ctx.fillRect(obstacleX + 28, platform.y - 12, 6, 4);
          } else if (platform.obstacleType === "laser") {
            drawRoundedRect(ctx, obstacleX, platform.y - 62, 16, 62, 5);
            ctx.fillStyle = "rgba(255,255,255,0.86)";
            ctx.fillRect(obstacleX + 4, platform.y - 55, 8, 46);
          } else if (platform.obstacleType === "pitMarker") {
            ctx.fillStyle = "rgba(15,23,42,0.62)";
            drawRoundedRect(ctx, obstacleX - 8, platform.y - 10, 54, 10, 5);
            ctx.fillStyle = theme.danger;
            ctx.fillRect(obstacleX + 4, platform.y - 24, 6, 18);
            ctx.fillRect(obstacleX + 22, platform.y - 24, 6, 18);
          } else {
            ctx.beginPath();
            ctx.moveTo(obstacleX, platform.y);
            ctx.lineTo(obstacleX + 15, platform.y - 38);
            ctx.lineTo(obstacleX + 30, platform.y);
            ctx.closePath();
            ctx.fill();
          }
          ctx.shadowBlur = 0;
        }
      });

      const hudItems = [
        { label: "Score", value: live.score || 0, color: theme.accent },
        { label: "PPM", value: live.wpm || 0, color: theme.player },
      ];

      hudItems.forEach((item, index) => {
        const x = 24 + index * 156;
        ctx.fillStyle = "rgba(15, 23, 42, 0.62)";
        drawRoundedRect(ctx, x, 18, 134, 50, 14);
        ctx.fillStyle = "rgba(255,255,255,0.72)";
        ctx.font = "800 10px system-ui, sans-serif";
        ctx.fillText(item.label.toUpperCase(), x + 14, 36);
        ctx.fillStyle = item.color;
        ctx.font = "900 23px system-ui, sans-serif";
        ctx.fillText(String(item.value), x + 14, 59);
      });

      const livesX = 492;
      ctx.fillStyle = "rgba(15, 23, 42, 0.62)";
      drawRoundedRect(ctx, livesX, 18, 248, 50, 14);
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.font = "800 10px system-ui, sans-serif";
      ctx.fillText("VIDAS", livesX + 14, 36);
      for (let i = 0; i < Math.min(live.maxErrors || 7, 10); i += 1) {
        drawHeart(
          ctx,
          livesX + 27 + i * 20,
          42,
          13,
          i < live.lives ? "#ef4444" : "#ffffff",
          i < live.lives ? 1 : 0.28
        );
      }

      state.particles.forEach((particle, index) => {
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.vy += 0.24 * delta;
        particle.life -= 0.035 * delta;
        if (particle.life <= 0) {
          state.particles.splice(index, 1);
          return;
        }
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        ctx.globalAlpha = 1;
      });

      if (state.jumpHint > 0) {
        addParticles(
          state,
          PLAYER_X + 6,
          state.playerY + PLAYER_SIZE,
          theme.accent,
          1,
          3
        );
      }

      const playerColor =
        state.deadFall || (live.finished && !live.passed)
          ? "#475569"
          : theme.player;
      ctx.save();
      ctx.translate(
        PLAYER_X + PLAYER_SIZE / 2,
        state.playerY + PLAYER_SIZE / 2
      );
      if (state.isJumping && !state.deadFall) {
        ctx.rotate(((state.camera % 24) * Math.PI) / 48);
      }
      if (state.hitFlash > 0) {
        ctx.rotate(-0.22);
      }

      ctx.shadowBlur = state.hitFlash > 0 ? 0 : 14;
      ctx.shadowColor = playerColor;
      ctx.fillStyle = playerColor;
      drawRoundedRect(
        ctx,
        -PLAYER_SIZE / 2,
        -PLAYER_SIZE / 2,
        PLAYER_SIZE,
        PLAYER_SIZE,
        8
      );

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-8, -6, 5, 5);
      ctx.fillRect(4, -6, 5, 5);
      ctx.fillStyle = state.hitFlash > 0 ? theme.danger : "#111827";
      ctx.fillRect(-7, -5, 2, 2);
      ctx.fillRect(5, -5, 2, 2);
      ctx.fillRect(-6, 6, 13, 3);
      ctx.restore();

      if (live.finished) {
        ctx.fillStyle = live.passed
          ? "rgba(34,197,94,0.9)"
          : "rgba(239,68,68,0.9)";
        drawRoundedRect(ctx, CANVAS_WIDTH / 2 - 150, 130, 300, 54, 16);
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 24px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          live.passed ? "Portal liberado" : "Caiu no desafio",
          CANVAS_WIDTH / 2,
          164
        );
        ctx.textAlign = "left";

        if (state.finishGlow) {
          ctx.strokeStyle = `rgba(255,255,255,${state.finishGlow})`;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(
            CANVAS_WIDTH - 92,
            178,
            34 + state.finishGlow * 18,
            0,
            Math.PI * 2
          );
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [levelIndex, sessionId]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="typingKidsGameCanvas"
    />
  );
};
