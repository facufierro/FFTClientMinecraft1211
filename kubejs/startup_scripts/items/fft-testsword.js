StartupEvents.registry('item', event => {
  event.create('test_sword', 'sword')
    .tier('iron')
    .attackDamageBaseline(3.0)
    .speedBaseline(-2.4)
    .maxDamage(250)
    .displayName('Test Sword')
    .texture('minecraft:item/iron_sword')
})
