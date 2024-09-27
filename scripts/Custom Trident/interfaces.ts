import { Dimension, Entity, Player } from "@minecraft/server"

export enum RiptideEnvironment{
    Any = "any",
    Water = "water",
    OnFire = "onFire"
}

export interface Riptide{
    environment: RiptideEnvironment
    velocity: number,
    sound?: {
        /**
         * @param ids In order from level 1 to 3
         */
        ids: [string, string, string],
        volume: number
    },
    onRiptide?: (player: Player, riptideLevel: number) => void
}

export interface TridentProjectile{
    /**
     * The projectile identifier.
     */
    entityID: string,
    thrownVelocity: number,
    onReturn?: (trident: Entity, dimension: Dimension, owner: Entity, loyaltyLevel: number) => void,
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