export class ExplorationViolation extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExplorationViolation'
  }
}
