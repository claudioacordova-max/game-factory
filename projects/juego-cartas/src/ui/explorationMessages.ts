export function encounterVictoryMessage(enemyName: string, dungeonComplete: boolean): string {
  return dungeonComplete
    ? `Victoria contra ${enemyName}. La mazmorra ha terminado: has superado los tres encuentros.`
    : `Victoria contra ${enemyName}. El siguiente encuentro ya está disponible.`
}
