// priority 50
const BACKPACK = 'kubejs:fftbackpack';
const BACKPACK_SLOT = 'back';

function setInventorySlotsTo(n) {
    return `inventory_slots set_unlocked @s ${n}`;
}

ServerEvents.tick(event => {
    runCommandOnInterval(event, 5, isItemInCurioSlot(BACKPACK, BACKPACK_SLOT, true), setInventorySlotsTo(27));
    runCommandOnInterval(event, 5, isItemInCurioSlot(BACKPACK, BACKPACK_SLOT, false), setInventorySlotsTo(0));
})
