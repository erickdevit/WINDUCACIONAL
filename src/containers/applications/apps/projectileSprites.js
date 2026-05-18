import shipBulletSprite from "./assets/typingSpace/ship_Bullrt_sprite.png";

export const PROJECTILE_SPRITES = {
  shipBlueBullet: {
    label: "Projétil azul da nave",
    src: shipBulletSprite,
    width: 80,
    height: 80,
    renderWidth: 42,
    renderHeight: 42,
    muzzleOffsetX: 21,
  },
};

export const DEFAULT_PLAYER_PROJECTILE = "shipBlueBullet";

export const getProjectileSprite = (spriteId = DEFAULT_PLAYER_PROJECTILE) =>
  PROJECTILE_SPRITES[spriteId] || PROJECTILE_SPRITES[DEFAULT_PLAYER_PROJECTILE];
