// const SPELLBOOKS = [
//     'wizards:arcane_spell_book',
//     'wizards:fire_spell_book',
//     'wizards:ice_spell_book',
//     'archers:archer_spell_book',
//     'paladins:paladin_spell_book',
//     'paladins:priest_spell_book',
//     'rogues:rogue_spell_book',
//     'rogues:warrior_spell_book'
// ];

// function countSpellbooksInInventory(player) {
//     let count = 0;
//     for (let spellbook of SPELLBOOKS) {
//         count += player.inventory.count(spellbook);
//     }
//     return count;
// }

// // Block spellbook pickup from ground if already have 2
// ItemEvents.canPickUp(event => {
//     const player = event.player;
//     const itemId = event.item.id;

//     if (SPELLBOOKS.includes(itemId)) {
//         if (countSpellbooksInInventory(player) >= 1) {
//             event.cancel();
//             player.tell('You can only carry 1 spare spellbook at a time!');
//         }
//     }
// });

// // Block spellbooks from inventory transfers if would exceed 1
// PlayerEvents.inventoryChanged(event => {
//     const player = event.player;
//     const spellbookCount = countSpellbooksInInventory(player);

//     if (spellbookCount > 1) {
//         // Find and drop excess spellbooks
//         for (let spellbook of SPELLBOOKS) {
//             while (player.inventory.contains(spellbook) && countSpellbooksInInventory(player) > 1) {
//                 player.inventory.clear(spellbook);
//                 player.drop(spellbook, false);
//                 player.tell('You can only carry 1 spare spellbook at a time!');
//             }
//         }
//     }
// });