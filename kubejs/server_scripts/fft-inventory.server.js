ServerEvents.tick(event => {
    if (event.server.tickCount % 5 === 0) {
        let backpackTypes = [
            'usefulbackpacks:backpack_small',
            'usefulbackpacks:backpack_medium',
            'usefulbackpacks:backpack_large'
        ]

        for (let backpack of backpackTypes) {
            let withBackpackCommand = `execute if entity @a[curios={item:{id:"${backpack}"},slot:["back"]}] run inventory_slots set_available @p 36`
            event.server.runCommandSilent(withBackpackCommand)
        }

        let noBackpackCommand = `execute if entity @a[curios=!{item:{id:"usefulbackpacks:backpack_small"},slot:["back"]}] if entity @a[curios=!{item:{id:"usefulbackpacks:backpack_medium"},slot:["back"]}] if entity @a[curios=!{item:{id:"usefulbackpacks:backpack_large"},slot:["back"]}] run inventory_slots set_available @p 9`
        event.server.runCommandSilent(noBackpackCommand)
    }
})