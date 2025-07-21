StartupEvents.registry('irons_spellbooks:spells', event => {
    event.create('fft_magic_missile')
        .setManaCostPerLevel(2)
        .setBaseSpellPower(12)
        .setCastTime(0)
        .setBaseManaCost(10)
        .setCooldownSeconds(3)
        .setCastType('instant')
        .setSchool('irons_spellbooks:evocation')
        .setMinRarity('common')
        .setMaxLevel(9)
        .setAllowLooting(true)
        .canBeCraftedBy(player => true)
        .needsLearning(false)
        .onCast(ctx => global.magicMissile(ctx))
    // .setUniqueInfo((spellLevel, caster) => {
    //     return [
    //         Component.of(`Missiles: ${spellLevel + 2}`).gold(),
    //         Component.of(`Damage: ${4 + spellLevel * 2} per missile`).red()
    //     ]
    // })
});

global.magicMissile = (ctx) => {
    console.log('Casting Magic Missile');

}