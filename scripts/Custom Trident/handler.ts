import { Block, EntityEquippableComponent, EntityInventoryComponent, EntityProjectileComponent, EquipmentSlot, GameMode, ItemDurabilityComponent, ItemEnchantableComponent, MinecraftDimensionTypes, Player, system, world } from "@minecraft/server";
import { CustomTridents, waitTicks } from "./data";
import { TridentManager } from "./manager";
import { TridentItem } from "./interfaces";
import { Weather } from "./weather";

Weather.initialize();

world.afterEvents.itemReleaseUse.subscribe((data) => {
    const { source, useDuration } = data
    if (!data.itemStack) return
    const mainhand = (source.getComponent(EntityEquippableComponent.componentId) as EntityEquippableComponent).getEquipmentSlot(EquipmentSlot.Mainhand)
    if (!mainhand) return
    const item = mainhand.getItem()
    if (item?.typeId != data.itemStack.typeId) return
    const tridentData = CustomTridents.find((f) => f.itemID == item.typeId)
    if (!tridentData) return
    if (-useDuration + 19999980 < 10) return
    const enchComp = item.getComponent(ItemEnchantableComponent.componentId) as ItemEnchantableComponent | undefined
    if (tridentData.riptide && (tridentData.riptide.needsEnchant === false || enchComp?.hasEnchantment("riptide"))) {
        TridentManager.riptide(tridentData, enchComp, source)
        return
    }
    const durComp = item.getComponent(ItemDurabilityComponent.componentId) as ItemDurabilityComponent | undefined
    if (!tridentData.projectile || durComp?.damage == durComp?.maxDurability) return
    const projectileData = tridentData.projectile
    const headLoc = source.getHeadLocation()
    const projectile = source.dimension.spawnEntity(projectileData.entityID, { x: headLoc.x, y: 100, z: headLoc.z })
    projectile.teleport(headLoc)
    projectile.setDynamicProperty("item", JSON.stringify(TridentManager.getTridentItem(item)))
    if (source.getGameMode() != GameMode.creative) mainhand.setItem()
    projectile.setDynamicProperty("ownerID", source.id)
    const projectileComp = projectile.getComponent(EntityProjectileComponent.componentId) as EntityProjectileComponent
    if (enchComp?.getEnchantments()[0]) projectile.setProperty('custom_trident:enchanted', true)
    if (!projectileComp) return
    projectileComp.owner = source
    const viewDir = source.getViewDirection()
    projectileComp.shoot({ x: viewDir.x * projectileData.thrownVelocity, y: viewDir.y * projectileData.thrownVelocity, z: viewDir.z * projectileData.thrownVelocity })
    const sound = projectileData.thrownSound
    if (!sound) return
    source.dimension.playSound(sound.id, source.location, { volume: sound.volume, pitch: sound.pitch })

})

world.afterEvents.projectileHitBlock.subscribe((data) => {
    const { projectile } = data


        if (!projectile || !projectile.isValid()) return
        let itemData = projectile.getDynamicProperty("item") as string | undefined | TridentItem
        if (!itemData) return
        itemData = JSON.parse(itemData as string) as TridentItem
        if (!itemData.enchantments) return
        const loyalty = itemData.enchantments.find((f) => f.id == "enchant.loyalty")
        const channeling = itemData.enchantments.find((f) => f.id == "enchant.channeling" )
        if (loyalty) system.runTimeout(() => {if (projectile && projectile.isValid()) projectile.triggerEvent("custom_trident:returning")})
        const block = data.getBlockHit().block
        if (channeling && block.typeId === "minecraft:lightning_rod" && data.dimension.id == MinecraftDimensionTypes.overworld && Weather.currentWeather == "Thunder" && block) {
            const center = block.center()
            let topMostBlock: Block | undefined = undefined
            try {topMostBlock = data.dimension.getTopmostBlock(center)} catch {}
            if (topMostBlock && topMostBlock.location.y > center.y) return
            const entity = data.dimension.spawnEntity("minecraft:lightning_bolt", {x: center.x, y: 100, z: center.z})
            entity.teleport({x: center.x - 0.5, y: center.y + 0.5, z: center.z - 0.5})
        } 
})

world.afterEvents.projectileHitEntity.subscribe((data) => {
    const { projectile } = data
    if (!projectile || !projectile.isValid()) return
    let itemData = projectile.getDynamicProperty("item") as string | undefined | TridentItem
    if (!itemData) return
    itemData = JSON.parse(itemData as string) as TridentItem
    if (TridentManager.reduceDurability(itemData) && itemData.durabilityDamage !== undefined) {
        itemData.durabilityDamage += 1
        projectile.setDynamicProperty("item", JSON.stringify(itemData))
    }
    if (!itemData.enchantments) return
    const hitEntity = data.getEntityHit().entity
    const loyalty = itemData.enchantments.find((f) => f.id == "enchant.loyalty")
    const channeling = itemData.enchantments.find((f) => f.id == "enchant.channeling")
    if (loyalty) system.runTimeout(() => { if (projectile && projectile.isValid()) projectile.triggerEvent("custom_trident:returning") }, waitTicks)
    if (channeling && data.dimension.id == MinecraftDimensionTypes.overworld && Weather.currentWeather == "Thunder" && hitEntity) {
        let topMostBlock: Block | undefined
        try { topMostBlock = hitEntity.dimension.getTopmostBlock(hitEntity.location) } catch { }
        if (topMostBlock && topMostBlock.location.y > hitEntity.location.y) return
        const entity = data.dimension.spawnEntity("minecraft:lightning_bolt", { x: hitEntity.location.x, y: 100, z: hitEntity.location.z })
        entity.teleport(hitEntity.location)
    }

})

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        if (!player || !player.isValid()) continue
        const { x, y, z } = player.location
        const tridents = player.dimension.getEntities({ location: { x: x, y: y + 1, z: z }, maxDistance: 2, excludeTypes: ["minecraft:player", "minecraft:item", "minecraft:zombie", "minecraft:skeleton", "minecraft:chicken"] })
        const inv = player.getComponent(EntityInventoryComponent.componentId) as EntityInventoryComponent
        if (!inv.container || inv.container.emptySlotsCount == 0) continue
        const container = inv.container
        for (let i = 0; i < tridents.length; i++) {
            if (!tridents[i] || !tridents[i].isValid()) continue
            if (container.emptySlotsCount <= 0) continue
            const found = CustomTridents.find((f) => f.projectile?.entityID == tridents[i].typeId)
            if (!found) continue
            const tridentEntity = tridents[i]
            if (!TridentManager.canPickUp(tridentEntity)) continue
            const ownerID = tridentEntity.getDynamicProperty("ownerID") as string | undefined
            if (!ownerID) continue
            if (ownerID != player.id) continue
            const itemData = tridentEntity.getDynamicProperty("item") as string | undefined
            if (!itemData) continue
            const gameMode = player.getGameMode()
            if (gameMode != GameMode.creative && gameMode != GameMode.spectator) {
                const item = TridentManager.getItem(JSON.parse(itemData) as TridentItem)
                container.addItem(item)
            }
            player.dimension.playSound("random.pop", tridentEntity.location, { pitch: 1 + Math.random(), volume: 0.5 })
            tridentEntity.remove()
        }
    }
}, 5)

system.afterEvents.scriptEventReceive.subscribe((data) => {
    if (data.id != "custom_trident:trident_return" && data.id != "custom_trident:trident_tick") return
    const tridentEntity = data.sourceEntity
    if (!tridentEntity || !tridentEntity.isValid()) return
    const tridentData = CustomTridents.find((f) => f.projectile?.entityID == tridentEntity.typeId)
    if (!tridentData) return
    if (data.id == "custom_trident:trident_return") {

        let itemData = tridentEntity.getDynamicProperty("item") as string | undefined | TridentItem
        if (!itemData) return
        itemData = JSON.parse(itemData as string) as TridentItem
        if (!itemData.enchantments) return
        const loyalty = itemData.enchantments.find((f) => f.id == "enchant.loyalty")
        if (!loyalty) return
        const ownerID = tridentEntity.getDynamicProperty("ownerID") as string | undefined
        if (!ownerID) return
        const owner = TridentManager.getOwner(ownerID)
        if (!owner) return
        if (!tridentEntity || !tridentEntity.isValid() || !owner || !owner.isValid()) return
        const loc = tridentEntity.location
        let velocity = tridentData.projectile?.returnSpeed
        if (velocity === undefined) velocity = 1
        if (!loyalty) return
        velocity *= 1 + (loyalty.lvl * 0.25)
        const ownerLoc = owner.location
        tridentEntity.teleport(loc, { facingLocation: { x: ownerLoc.x, y: ownerLoc.y + 1, z: ownerLoc.z } })
        const viewDir = tridentEntity.getViewDirection()
        tridentEntity.teleport({ x: loc.x + viewDir.x + (viewDir.x * velocity), y: loc.y + viewDir.y + (viewDir.y * velocity), z: loc.z + (viewDir.z * velocity) })
        {
            if (tridentEntity.getDynamicProperty("returning")) return

            tridentEntity.setDynamicProperty("returning", true)
            if (tridentData.projectile?.onReturn) tridentData.projectile.onReturn(tridentEntity, tridentEntity.dimension, owner, loyalty.lvl)
            if (tridentData.projectile?.returnSound) {
                const sound = tridentData.projectile.returnSound
                if (owner.typeId == "minecraft:player") (owner as Player).playSound(sound.id, { volume: sound.volume, pitch: sound.pitch })
            }
        }

    } else if (tridentEntity.location.y < -64) {
        tridentEntity.runCommand("scriptevent custom_trident:trident_return")
    }
    return

})