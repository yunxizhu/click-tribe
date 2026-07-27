/**
 * 通用玩法数值（外置可改，无需重打 exe）
 *
 * craftOrderCooldownMs — 生产订单完成后的固定冷却（毫秒）
 */
window.GAMEPLAY_CONFIG = {
  craftOrderCooldownMs: 250,
};

if (typeof applyGameplayConfig === 'function') {
  applyGameplayConfig(window.GAMEPLAY_CONFIG);
}
