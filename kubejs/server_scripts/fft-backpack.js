// priority 50
const BACKPACK = 'usefulbackpacks:backpack_small';
const BACKPACK_SLOT = 'back';

function setInventorySlotsTo(n) {
    return `inventory_slots set_unlocked @p ${n}`;
}

ServerEvents.tick(event => {
    runCommandOnInterval(event, 5, isItemInCurioSlot(BACKPACK, BACKPACK_SLOT, false), setInventorySlotsTo(0));
    runCommandOnInterval(event, 5, isItemInCurioSlot(BACKPACK, BACKPACK_SLOT, true), setInventorySlotsTo(27));
})
