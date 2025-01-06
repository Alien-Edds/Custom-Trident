import { Block, Dimension, EnchantmentType, Entity, EntityEquippableComponent, EntityOnFireComponent, EquipmentSlot, ItemDurabilityComponent, ItemEnchantableComponent, ItemStack, MinecraftDimensionTypes, Player, system, Vector3, world } from "@minecraft/server";
import { RiptideEnvironment, Trident, TridentItem } from "./interfaces";

export class TridentManager {
    static getEquipmentSlot(player: Player, EquipmentSlot: EquipmentSlot) {
        return (player.getComponent(EntityEquippableComponent.componentId) as EntityEquippableComponent).getEquipmentSlot(EquipmentSlot)
    }
    static getKnockbackMultiplier(player: Player): number {
        let multiplier: number = 1.0
        const slots = [this.getEquipmentSlot(player, EquipmentSlot.Head), this.getEquipmentSlot(player, EquipmentSlot.Chest), this.getEquipmentSlot(player, EquipmentSlot.Legs), this.getEquipmentSlot(player, EquipmentSlot.Feet)]
        for (const slot of slots) {
            const item = slot.getItem()
            if (!item) continue
            if (!item.typeId.includes("netherite")) continue
            multiplier = multiplier + 0.168
        }
        return multiplier
    }
    static getTridentItem(item: ItemStack): TridentItem {
        const tridentItem: TridentItem = {
            itemID: item.typeId
        }
        tridentItem.nameTag = item.nameTag
        const durComp = item.getComponent(ItemDurabilityComponent.componentId) as ItemDurabilityComponent | undefined
        if (durComp) tridentItem.durabilityDamage = durComp.damage
        const enchComp = item.getComponent(ItemEnchantableComponent.componentId) as ItemEnchantableComponent | undefined
        const enchants: { id: string, lvl: number }[] = []
        if (enchComp) for (const enchant of enchComp.getEnchantments()) enchants.push({ id: `enchant.${enchant.type.id}`, lvl: enchant.level })
        if (enchants[0]) tridentItem.enchantments = enchants
        return tridentItem
    }

    static getItem(tridentItem: TridentItem): ItemStack {
        const item = new ItemStack(tridentItem.itemID)
        const durComp = item.getComponent(ItemDurabilityComponent.componentId) as ItemDurabilityComponent
        if (tridentItem.durabilityDamage) durComp.damage = tridentItem.durabilityDamage > durComp.maxDurability ? durComp.maxDurability : tridentItem.durabilityDamage
        const enchantComp = item.getComponent(ItemEnchantableComponent.componentId) as ItemEnchantableComponent
        item.nameTag = tridentItem.nameTag
        if (tridentItem.enchantments) for (const enchant of tridentItem.enchantments) enchantComp.addEnchantment({ type: new EnchantmentType(enchant.id.split(".")[1]), level: enchant.lvl })
        return item
    }

    static async isInEnvironment(environment: RiptideEnvironment, player: Player): Promise<boolean> {
        switch (environment) {
            case RiptideEnvironment.Any:
                return true
                break
            case RiptideEnvironment.Water:
                if (player.isInWater) return true
                if (await this.isInWaterOrRain(player.dimension, player.location)) return true
                break
            case RiptideEnvironment.OnFire:
                if (player.getComponent(EntityOnFireComponent.componentId)) return true
                let block: Block | undefined = undefined
                try { block = player.dimension.getBlock(player.location) } catch { }
                if (block?.isLiquid && !block.typeId.includes("water")) return true
                break
        }
        return false
    }

    static canPickUp(entity: Entity): boolean {
        if (entity.getDynamicProperty("returning")) {
            return true
        } else if (entity.isOnGround) {
            return true
        } else return false
    }

    static getOwner(ownerID: string): Entity | undefined {
        return world.getEntity(ownerID)
    }

    static reduceDurability(tridentItem: TridentItem): boolean {
        const unbreaking = tridentItem.enchantments?.find((f) => f.id == "unbreaking")
        if (!unbreaking) return true
        const chance = 100 / (unbreaking.lvl + 1)
        const randomNum = Math.random() * 100
        return randomNum >= (100 - chance)
    }

    static async isInWaterOrRain(dimension: Dimension, location: Vector3): Promise<boolean> {
        let inWaterOrRain: boolean = false
        const entity = dimension.spawnEntity("custom_trident:water_checker", {x: location.x, y: 100, z: location.z})
        entity.teleport(location)

        await new Promise((resolve) => {
            let interval = 20
            const event = system.afterEvents.scriptEventReceive.subscribe((data) => {
                if (!data.sourceEntity || data.id !== "custom_trident:in_water_or_rain") return
                if (data.sourceEntity.id !== entity.id) return
                if (data.message != "true" && data.message != "false") return
                if (data.message == "true") inWaterOrRain = true
                entity.remove()
                system.afterEvents.scriptEventReceive.unsubscribe(event)
                system.clearRun(runInterval)
                resolve(resolve)
            })
            const runInterval = system.runInterval(() => {
                interval--
                if (!(interval <= 0)) return
                system.afterEvents.scriptEventReceive.unsubscribe(event)
                system.clearRun(runInterval)
                resolve(resolve)
            })
        })
        return inWaterOrRain
    }

    static async riptide(tridentData: Trident, enchComp: ItemEnchantableComponent | undefined, source: Player) {
        if (!tridentData.riptide) return
        let riptideLevel: number | undefined = undefined
        const level = enchComp?.getEnchantment("riptide")?.level
        if (level === undefined) { riptideLevel = 1 } else riptideLevel = level
        const riptide = tridentData.riptide
        if (await TridentManager.isInEnvironment(riptide.environment, source)) {
            const viewDir = source.getViewDirection()
            const knockbackMultiplier = this.getKnockbackMultiplier(source)
            source.applyKnockback(viewDir.x, viewDir.z, (((Math.abs(viewDir.x) + Math.abs(viewDir.z)) * 1.75) * (riptide.velocity + ((riptide.velocity / 6) * riptideLevel))) * knockbackMultiplier, (viewDir.y * (riptide.velocity + ((riptide.velocity / 6) * riptideLevel))) * knockbackMultiplier)
            if (riptide.sound) {
                source.dimension.playSound(riptide.sound.ids[riptideLevel - 1 > 2 ? 2 : riptideLevel - 1], source.location)
            }
            if (riptide.onRiptide) riptide.onRiptide(source, riptideLevel)
            return
        }
    }
}