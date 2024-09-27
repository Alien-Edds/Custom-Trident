export enum RiptideEnvironment{
    Any = "any",
    Water = "water",
    OnFire = "onFire"
}

export interface Riptide{
    environment: RiptideEnvironment
    velocity: number,
    sound?: {
        ids: [string, string, string],
        volume: number
    }
}

export interface TridentProjectile{
    /**
     * The projectile identifier.
     */
    entityID: string,
    thrownVelocity: number,
    returnSpeed: number,
    returnSound?: {
        id: string,
        volume: number,
        pitch: number
    },
    thrownSound?: {
        id: string,
        volume: number,
        pitch: number
    }
}

export interface Trident{
    /**
     * The item identifier.
     */
    itemID: string,
    /**
     * Parameter for controlling the projectile.
     */
    projectile?: TridentProjectile,
    /**
     * Parameter for controlling riptide.
     */
    riptide?: Riptide
}

export interface TridentItem{
    itemID: string,
    nameTag?: string,
    durabilityDamage?: number,
    enchantments?: {id: string, lvl: number}[]
}