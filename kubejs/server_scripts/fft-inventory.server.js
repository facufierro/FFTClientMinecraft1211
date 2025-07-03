const BACKPACK = 'backpacks:backpack';
const CURIO_SLOT = 'back';
const INTERVAL = 5; // in ticks

ServerEvents.tick(event => {
    if (event.server.tickCount % INTERVAL === 0) {
        let withoutBackpackCommand = `execute if entity @p[curios=!{item:{id:"${BACKPACK}"},slot:["${CURIO_SLOT}"]}] run inventory_slots set_unlocked @p 0`;
        event.server.runCommandSilent(withoutBackpackCommand)
        let withBackpackCommand = `execute if entity @p[curios={item:{id:"${BACKPACK}"},slot:["${CURIO_SLOT}"]}] run inventory_slots set_unlocked @p 27`;
        event.server.runCommandSilent(withBackpackCommand)
    }
})