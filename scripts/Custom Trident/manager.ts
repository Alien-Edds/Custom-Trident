import { EnchantmentType, Entity, EntityOnFireComponent, ItemDurabilityComponent, ItemEnchantableComponent, ItemStack, Player, world } from "@minecraft/server";
import { RiptideEnvironment, TridentItem } from "./interfaces";

export class TridentManager{
    static getTridentItem(item: ItemStack): TridentItem {
        const tridentItem: TridentItem = {
            itemID: item.typeId
        }
        tridentItem.nameTag = item.nameTag
        const durComp = item.getComponent(ItemDurabilityComponent.componentId) as ItemDurabilityComponent | undefined
        if (durComp) tridentItem.durabilityDamage = durComp.damage
        const enchComp = item.getComponent(ItemEnchantableComponent.componentId) as ItemEnchantableComponent | undefined
        const enchants: {id: string, lvl: number}[] = []
        if (enchComp) for (const enchant of enchComp.getEnchantments()) enchants.push({id: enchant.type.id, lvl: enchant.level})
        if (enchants[0]) tridentItem.enchantments = enchants
        return tridentItem
    }
    static getItem(tridentItem: TridentItem): ItemStack {
        const item = new ItemStack(tridentItem.itemID)
        const durComp = item.getComponent(ItemDurabilityComponent.componentId) as ItemDurabilityComponent
        if (tridentItem.durabilityDamage) durComp.damage = tridentItem.durabilityDamage > durComp.maxDurability ? durComp.maxDurability : tridentItem.durabilityDamage
        const enchantComp = item.getComponent(ItemEnchantableComponent.componentId) as ItemEnchantableComponent
        item.nameTag = tridentItem.nameTag
        if (tridentItem.enchantments) for (const enchant of tridentItem.enchantments) enchantComp.addEnchantment({type: new EnchantmentType(enchant.id), level: enchant.lvl})
        return item
    }
    static isInEnvironment(environment: RiptideEnvironment, player: Player): boolean {
        switch (environment) {
            case RiptideEnvironment.Any :
                return true
                break
            case RiptideEnvironment.Water :
                if (player.isInWater) return true
                break
            case RiptideEnvironment.OnFire :
                if (player.getComponent(EntityOnFireComponent.componentId)) return true
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
}