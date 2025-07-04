// KubeJS Server Script - Gravel to Flint Recipe
// This script adds a recipe to convert 3 gravel into 1 flint

ServerEvents.recipes(event => {
    // Add a shapeless recipe to convert 3 gravel into 1 flint
    event.shapeless(
        'minecraft:flint',  // Output: 1 flint
        [
            '3x minecraft:gravel' // Input: 3 gravel
        ]
    )
    
    console.log('Added 3 gravel to 1 flint recipe!')
})