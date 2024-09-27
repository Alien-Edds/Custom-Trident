import { EntityEquippableComponent, EntityInventoryComponent, EntityProjectileComponent, EquipmentSlot, GameMode, ItemDurabilityComponent, ItemEnchantableComponent, system, world } from "@minecraft/server";
import { CustomTridents } from "./data";
import { TridentManager } from "./manager";
world.afterEvents.itemReleaseUse.subscribe((data) => {
    const { source, useDuration } = data;
    if (!data.itemStack)
        return;
    const mainhand = source.getComponent(EntityEquippableComponent.componentId).getEquipmentSlot(EquipmentSlot.Mainhand);
    if (!mainhand)
        return;
    const item = mainhand.getItem();
    if (item?.typeId != data.itemStack.typeId)
        return;
    const tridentData = CustomTridents.find((f) => f.itemID == item.typeId);
    if (!tridentData)
        return;
    if (-useDuration + 19999980 < 13)
        return;
    const enchComp = item.getComponent(ItemEnchantableComponent.componentId);
    if (tridentData.riptide && enchComp?.hasEnchantment("riptide")) {
        const level = enchComp.getEnchantment("riptide")?.level;
        if (level === undefined)
            return;
        const riptide = tridentData.riptide;
        if (TridentManager.isInEnvironment(riptide.environment, source)) {
            const viewDir = source.getViewDirection();
            source.applyKnockback(viewDir.x, viewDir.z, (((Math.abs(viewDir.x) + Math.abs(viewDir.z)) * 1.5) * (riptide.velocity + ((riptide.velocity / 6) * level))), viewDir.y * (riptide.velocity + ((riptide.velocity / 6) * level)));
            if (riptide.sound) {
                source.dimension.playSound(riptide.sound.ids[level - 1], source.location);
            }
            return;
        }
        return;
    }
    const durComp = item.getComponent(ItemDurabilityComponent.componentId);
    if (!tridentData.projectile || durComp?.damage == durComp?.maxDurability)
        return;
    const projectileData = tridentData.projectile;
    const headLoc = source.getHeadLocation();
    const projectile = source.dimension.spawnEntity(projectileData.entityID, { x: headLoc.x, y: 100, z: headLoc.z });
    projectile.teleport(headLoc);
    projectile.setDynamicProperty("item", JSON.stringify(TridentManager.getTridentItem(item)));
    if (source.getGameMode() != GameMode.creative)
        mainhand.setItem();
    projectile.setDynamicProperty("ownerID", source.id);
    const projectileComp = projectile.getComponent(EntityProjectileComponent.componentId);
    if (!projectileComp)
        return;
    projectileComp.owner = source;
    const viewDir = source.getViewDirection();
    projectileComp.shoot({ x: viewDir.x * projectileData.thrownVelocity, y: viewDir.y * projectileData.thrownVelocity, z: viewDir.z * projectileData.thrownVelocity });
    const sound = projectileData.thrownSound;
    if (!sound)
        return;
    source.dimension.playSound(sound.id, source.location, { volume: sound.volume, pitch: sound.pitch });
});
world.afterEvents.projectileHitBlock.subscribe((data) => {
    const { projectile } = data;
    if (!projectile || !projectile.isValid())
        return;
    projectile.runCommand("scriptevent custom_trident:trident_return");
});
world.afterEvents.projectileHitEntity.subscribe((data) => {
    const { projectile } = data;
    if (!projectile || !projectile.isValid())
        return;
    projectile.runCommand("scriptevent custom_trident:trident_return");
    let itemData = projectile.getDynamicProperty("item");
    if (!itemData)
        return;
    itemData = JSON.parse(itemData);
    if (itemData.durabilityDamage === undefined)
        return;
    if (!TridentManager.reduceDurability(itemData))
        return;
    itemData.durabilityDamage += 1;
    projectile.setDynamicProperty("item", JSON.stringify(itemData));
});
system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        if (!player || !player.isValid())
            continue;
        const { x, y, z } = player.location;
        const tridents = player.dimension.getEntities({ location: { x: x, y: y + 1, z: z }, maxDistance: 2 });
        const inv = player.getComponent(EntityInventoryComponent.componentId);
        if (!inv.container || inv.container.emptySlotsCount == 0)
            continue;
        const container = inv.container;
        for (let i = 0; i < tridents.length; i++) {
            if (!tridents[i] || !tridents[i].isValid())
                continue;
            if (container.emptySlotsCount <= 0)
                continue;
            const found = CustomTridents.find((f) => f.projectile?.entityID == tridents[i].typeId);
            if (!found)
                continue;
            const tridentEntity = tridents[i];
            if (!TridentManager.canPickUp(tridentEntity))
                continue;
            const ownerID = tridentEntity.getDynamicProperty("ownerID");
            if (!ownerID)
                continue;
            if (ownerID != player.id)
                continue;
            const itemData = tridentEntity.getDynamicProperty("item");
            if (!itemData)
                continue;
            const gameMode = player.getGameMode();
            if (gameMode != GameMode.creative && gameMode != GameMode.spectator) {
                const item = TridentManager.getItem(JSON.parse(itemData));
                container.addItem(item);
            }
            player.dimension.playSound("random.pop", tridentEntity.location, { pitch: 1 + Math.random(), volume: 0.5 });
            tridentEntity.remove();
        }
    }
}, 10);
system.afterEvents.scriptEventReceive.subscribe((data) => {
    if (data.id != "custom_trident:trident_return" && data.id != "custom_trident:trident_tick")
        return;
    const tridentEntity = data.sourceEntity;
    if (!tridentEntity || !tridentEntity.isValid())
        return;
    const tridentData = CustomTridents.find((f) => f.projectile?.entityID == tridentEntity.typeId);
    if (!tridentData)
        return;
    if (data.id == "custom_trident:trident_return") {
        if (tridentEntity.getDynamicProperty("returning"))
            return;
        const comp = tridentEntity.getComponent(EntityProjectileComponent.componentId);
        let itemData = tridentEntity.getDynamicProperty("item");
        if (!itemData)
            return;
        itemData = JSON.parse(itemData);
        const loyalty = itemData.enchantments?.find((f) => f.id == "loyalty");
        if (!loyalty)
            return;
        const ownerID = tridentEntity.getDynamicProperty("ownerID");
        if (!ownerID)
            return;
        const owner = TridentManager.getOwner(ownerID);
        if (!owner)
            return;
        tridentEntity.setDynamicProperty("returning", true);
        if (tridentData.projectile?.returnSound) {
            const sound = tridentData.projectile.returnSound;
            if (owner.typeId == "minecraft:player")
                owner.playSound(sound.id, { volume: sound.volume, pitch: sound.pitch });
        }
        function tick() {
            if (!tridentEntity || !tridentEntity.isValid() || !owner || !owner.isValid())
                return;
            const viewDir = tridentEntity.getViewDirection();
            const loc = tridentEntity.location;
            let velocity = tridentData?.projectile?.returnSpeed;
            if (velocity === undefined)
                velocity = 1;
            if (!loyalty)
                return;
            velocity *= 1 + (loyalty.lvl * 0.25);
            const ownerLoc = owner.location;
            tridentEntity.teleport({ x: loc.x + viewDir.x, y: loc.y + viewDir.y, z: loc.z + (viewDir.z * (velocity ? velocity : 1)) }, { facingLocation: { x: ownerLoc.x, y: ownerLoc.y + 1, z: ownerLoc.z } });
            system.runTimeout(() => {
                tick();
            }, 2);
        }
        tick();
    }
    else if (tridentEntity.location.y < -64) {
        tridentEntity.runCommand("scriptevent custom_trident:trident_return");
    }
});
