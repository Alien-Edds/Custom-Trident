import { RiptideEnvironment, Trident } from "./interfaces";

export const CustomTridents: Trident[] = [
    {
        itemID: "custom_trident:my_trident",
        projectile: {
            entityID: "custom_trident:my_thrown_trident",
            thrownVelocity: 3,
            returnSpeed: 1,
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
            sound: {
                //in order from level 1 to level 3
                ids: ["item.trident.riptide_1", "item.trident.riptide_2", "item.trident.riptide_3"],
                volume: 1
            }
        }
    }
]