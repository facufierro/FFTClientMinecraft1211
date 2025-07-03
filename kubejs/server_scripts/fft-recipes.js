// KubeJS Server Script - Sapling to Sticks Recipe
// This script adds a recipe to convert saplings into sticks

ServerEvents.recipes(event => {
    // Add a shapeless recipe to convert any sapling into 1 stick using flint knife
    event.shapeless(
        'minecraft:stick',  // Output: 1 stick
        [
            '#minecraft:saplings', // Input: any sapling (using the saplings tag)
            'farmersdelight:flint_knife'
        ]
    ).keepIngredient('farmersdelight:flint_knife') // Keep the knife in the crafting grid

    console.log('Added sapling to sticks recipe with flint knife!')
})

// Handle the knife durability damage using a crafting event
ItemEvents.crafted(event => {
    // Check if this is our sapling to stick recipe
    if (event.item.id === 'minecraft:stick') {
        // Find the knife in the crafting inventory
        let knifeSlot = -1
        for (let i = 0; i < event.inventory.containerSize; i++) {
            let item = event.inventory.getStackInSlot(i)
            if (item.id === 'farmersdelight:flint_knife') {
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