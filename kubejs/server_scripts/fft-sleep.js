// FFT Sleep Script - Switches between epicfight and vanilla stance based on sleep state
// When player sleeps: switch to vanilla stance (mining mode)
// When player starts moving again: switch back to epicfight stance (combat mode)

/**
 * Handles player laying down in bed
 * Switches to vanilla mode and records bed position
 */
function handleBedLayDown(player, server, bedBlock) {
    // Switch to vanilla mode
    server.runCommandSilent(`/epicfight mode vanilla ${player.username}`)
    
    // Store BED position instead of player position
    player.persistentData.putBoolean('fft_in_vanilla_mode', true)
    player.persistentData.putDouble('fft_bed_x', bedBlock.x)
    player.persistentData.putDouble('fft_bed_y', bedBlock.y)
    player.persistentData.putDouble('fft_bed_z', bedBlock.z)
    
    console.log(`[FFT-Sleep] ${player.username} laid down - switched to vanilla stance`)
}

/**
 * Handles player movement after using bed
 * Switches back to epicfight mode when player moves away from bed
 */
function handlePlayerMovement(player, server) {
    // Get stored bed position
    let bedX = player.persistentData.getDouble('fft_bed_x')
    let bedY = player.persistentData.getDouble('fft_bed_y')
    let bedZ = player.persistentData.getDouble('fft_bed_z')
    
    // Calculate distance from bed
    let distance = Math.sqrt(
        Math.pow(player.x - bedX, 2) + 
        Math.pow(player.y - bedY, 2) + 
        Math.pow(player.z - bedZ, 2)
    )
    
    // If player moved more than 1.5 blocks away from bed, switch back to epicfight
    if (distance > 1.5) {
        server.runCommandSilent(`/epicfight mode epicfight ${player.username}`)
        player.persistentData.putBoolean('fft_in_vanilla_mode', false)
        
        console.log(`[FFT-Sleep] ${player.username} moved away from bed (${distance.toFixed(2)} blocks) - switched back to epicfight stance`)
    }
}

// Event: Player right-clicks bed
BlockEvents.rightClicked(event => {
    let player = event.player
    let block = event.block
    
    // Check if it's a bed block
    if (block.id.toString().includes('bed')) {
        handleBedLayDown(player, event.server, block)
    }
})

// Event: Player tick (movement detection)
PlayerEvents.tick(event => {
    let player = event.player
    
    // Only check movement if player is in vanilla mode
    if (player.persistentData.getBoolean('fft_in_vanilla_mode')) {
        handlePlayerMovement(player, event.server)
    }
})
