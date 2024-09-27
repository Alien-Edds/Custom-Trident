import { EnchantmentType, EntityOnFireComponent, ItemDurabilityComponent, ItemEnchantableComponent, ItemStack, world } from "@minecraft/server";
import { RiptideEnvironment } from "./interfaces";
export class TridentManager {
    static getTridentItem(item) {
        const tridentItem = {
            itemID: item.typeId
        };
        tridentItem.nameTag = item.nameTag;
        const durComp = item.getComponent(ItemDurabilityComponent.componentId);
        if (durComp)
            tridentItem.durabilityDamage = durComp.damage;
        const enchComp = item.getComponent(ItemEnchantableComponent.componentId);
        const enchants = [];
        if (enchComp)
            for (const enchant of enchComp.getEnchantments())
                enchants.push({ id: enchant.type.id, lvl: enchant.level });
        if (enchants[0])
            tridentItem.enchantments = enchants;
        return tridentItem;
    }
    static getItem(tridentItem) {
        const item = new ItemStack(tridentItem.itemID);
        const durComp = item.getComponent(ItemDurabilityComponent.componentId);
        if (tridentItem.durabilityDamage)
            durComp.damage = tridentItem.durabilityDamage > durComp.maxDurability ? durComp.maxDurability : tridentItem.durabilityDamage;
        const enchantComp = item.getComponent(ItemEnchantableComponent.componentId);
        item.nameTag = tridentItem.nameTag;
        if (tridentItem.enchantments)
            for (const enchant of tridentItem.enchantments)
                enchantComp.addEnchantment({ type: new EnchantmentType(enchant.id), level: enchant.lvl });
        return item;
    }
    static isInEnvironment(environment, player) {
        switch (environment) {
            case RiptideEnvironment.Any:
                return true;
                break;
            case RiptideEnvironment.Water:
                if (player.isInWater)
                    return true;
                break;
            case RiptideEnvironment.OnFire:
                if (player.getComponent(EntityOnFireComponent.componentId))
                    return true;
                break;
        }
        return false;
    }
    static canPickUp(entity) {
        if (entity.getDynamicProperty("returning")) {
            return true;
        }
        else if (entity.isOnGround) {
            return true;
        }
        else
            return false;
    }
    static getOwner(ownerID) {
        return world.getEntity(ownerID);
    }
    static reduceDurability(tridentItem) {
        const unbreaking = tridentItem.enchantments?.find((f) => f.id == "unbreaking");
        if (!unbreaking)
            return true;
        const chance = 100 / (unbreaking.lvl + 1);
        const randomNum = Math.random() * 100;
        return randomNum >= (100 - chance);
    }
}
