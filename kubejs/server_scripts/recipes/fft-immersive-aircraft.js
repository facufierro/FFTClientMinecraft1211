


// Removes specific Immersive Aircraft recipes using Item.of for modded items
ServerEvents.recipes(event => {
  event.remove({ output: Item.of('immersive_aircraft:warship') })
  event.remove({ output: Item.of('immersive_aircraft:gyrodyne') })
  event.remove({ output: Item.of('immersive_aircraft:quadrocopter') })
  event.remove({ output: Item.of('immersive_aircraft:bamboo_hopper') })
  event.remove({ output: Item.of('immersive_aircraft:rotary_cannon') })
  event.remove({ output: Item.of('immersive_aircraft:bomb_bay') })

  // Remove the original immersive_aircraft:boiler recipe
  event.remove({ output: 'immersive_aircraft:boiler' })

  // Add new recipe for immersive_aircraft:boiler with custom pattern
  event.shaped('immersive_aircraft:boiler', [
    'CCC',
    'CBC',
    'CFC'
  ], {
    C: 'minecraft:copper_ingot',
    B: 'minecraft:blaze_powder',
    F: 'minecraft:furnace'
  })
})

RecipeViewerEvents.removeEntriesCompletely('item', event => {
  event.remove('immersive_aircraft:warship')
  event.remove('immersive_aircraft:gyrodyne')
  event.remove('immersive_aircraft:quadrocopter')
  event.remove('immersive_aircraft:bamboo_hopper')
  event.remove('immersive_aircraft:rotary_cannon')
  event.remove('immersive_aircraft:bomb_bay')
})