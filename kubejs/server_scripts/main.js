// priority 100
function runCommandOnInterval(event, interval, condition, command) {
    if (event.server.tickCount % interval === 0) {
        if (condition) {
            event.server.runCommandSilent(`execute if entity @p${condition} run ${command}`);
        } else {
            event.server.runCommandSilent(`execute as @p ${command}`);
        }

    }
}
function isItemInInventory(itemId, param) {
    if (param) {
        return `[nbt={Inventory:[{id:"${itemId}"}]}]`;
    } else {
        return `[nbt={Inventory:[!{id:"${itemId}"}]}]`;
    }
}
function isItemInSlot(itemId, slot, param) {
    if (param) {
        return `[nbt={Inventory:[{Slot:${slot}b,id:"${itemId}"}]}]`;
    } else {
        return `[nbt={Inventory:[!{Slot:${slot}b,id:"${itemId}"}]}]`;
    }
}
function isItemInCurioSlot(itemId, slot, param) {
    if (param) {
        return `[curios={item:{id:"${itemId}"},slot:["${slot}"]}]`;
    } else {
        return `[curios=!{item:{id:"${itemId}"},slot:["${slot}"]}]`;
    }
}
