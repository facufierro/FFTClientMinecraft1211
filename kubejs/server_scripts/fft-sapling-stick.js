// KubeJS Server Script - Sapling to Sticks Recipe
// This script adds a recipe to convert saplings into sticks

ServerEvents.recipes(event => {
    // Add shapeless recipes for each knife type
    const knives = [
        'farmersdelight:flint_knife',
        'farmersdelight:iron_knife',
        'farmersdelight:diamond_knife',
        'farmersdelight:netherite_knife',
        'farmersdelight:golden_knife'
    ]
    
    knives.forEach(knife => {
        event.shapeless(
            'minecraft:stick',  // Output: 1 stick
            [
                '#minecraft:saplings', // Input: any sapling
                knife // Specific knife type
            ]
        ).keepIngredient(knife) // Keep the knife in the crafting grid
    })

    console.log('Added sapling to sticks recipe with all knife types!')
})

// Handle the knife durability damage using a crafting event
ItemEvents.crafted(event => {
    // Check if this is our sapling to stick recipe
    if (event.item.id === 'minecraft:stick') {
        // Find any knife in the crafting inventory
        let knifeSlot = -1
        for (let i = 0; i < event.inventory.containerSize; i++) {
            let item = event.inventory.getStackInSlot(i)
            // Check for all knife types
            if (item.id === 'farmersdelight:flint_knife' ||
                item.id === 'farmersdelight:iron_knife' ||
                item.id === 'farmersdelight:diamond_knife' ||
                item.id === 'farmersdelight:netherite_knife' ||
                item.id === 'farmersdelight:golden_knife') {
                knifeSlot = i
                break
            }
        }

        if (knifeSlot !== -1) {
            // Damage the knife directly in the crafting grid
            let knife = event.inventory.getStackInSlot(knifeSlot)
            knife.setDamageValue(knife.getDamageValue() + 1)

            // Check if knife should break
            if (knife.getDamageValue() >= knife.getMaxDamage()) {
                event.inventory.setStackInSlot(knifeSlot, 'minecraft:air')
            }
        }
    }
})