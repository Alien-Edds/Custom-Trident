import { world } from "@minecraft/server";
import { RiptideEnvironment, Trident } from "./interfaces";

export const waitTicks = 3

export const CustomTridents: Trident[] = [
    {
        itemID: "custom_trident:my_trident",
        projectile: {
            entityID: "custom_trident:my_thrown_trident",
            thrownVelocity: 3,
            returnSpeed: 1,
            onReturn: (trident, dimension, owner, level) => {
                world.sendMessage(`${owner.nameTag} is returning ${trident.typeId} with a level of ${level}`)
            },
            returnSound: {
                id: "item.trident.return",
                volume: 1,
                pitch: 1
            },
            thrownSound: {
                id: "item.trident.throw",
                volume: 1,
                pitch: 1
            }
        },
        riptide: {
            environment: RiptideEnvironment.Water,
            velocity: 2.40,
            onRiptide: (player, level) => {
                world.sendMessage(`${player.name} is riptiding with a level of ${level}`)
            },
            sound: {
                ids: ["item.trident.riptide_1", "item.trident.riptide_2", "item.trident.riptide_3"],
                volume: 1
            }
        }
    }
]