ServerEvents.tick(event => {
    if (event.server.tickCount % 5 === 0) {
        let withoutBackpackCommand = `execute if entity @p[curios=!{item:{id:"backpacks:backpack"},slot:["back"]}] run inventory_slots set_unlocked @p 0`;
        event.server.runCommandSilent(withoutBackpackCommand)
        let withBackpackCommand = `execute if entity @p[curios={item:{id:"backpacks:backpack"},slot:["back"]}] run inventory_slots set_unlocked @p 27`;
        event.server.runCommandSilent(withBackpackCommand)
    }
})