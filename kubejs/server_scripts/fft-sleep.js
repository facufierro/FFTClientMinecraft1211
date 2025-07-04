function handleBedLayDown(player, server, bedBlock) {
    server.runCommandSilent(`/epicfight mode vanilla ${player.username}`)
    player.persistentData.putBoolean('fft_in_vanilla_mode', true)
    player.persistentData.putDouble('fft_bed_x', bedBlock.x)
    player.persistentData.putDouble('fft_bed_y', bedBlock.y)
    player.persistentData.putDouble('fft_bed_z', bedBlock.z)
    
    console.log(`[FFT-Sleep] ${player.username} laid down - switched to vanilla stance`)
}

function handlePlayerMovement(player, server) {
    let bedX = player.persistentData.getDouble('fft_bed_x')
    let bedY = player.persistentData.getDouble('fft_bed_y')
    let bedZ = player.persistentData.getDouble('fft_bed_z')

    let distance = Math.sqrt(
        Math.pow(player.x - bedX, 2) + 
        Math.pow(player.y - bedY, 2) + 
        Math.pow(player.z - bedZ, 2)
    )

    if (distance > 1.5) {
        server.runCommandSilent(`/epicfight mode epicfight ${player.username}`)
        player.persistentData.putBoolean('fft_in_vanilla_mode', false)
        
        console.log(`[FFT-Sleep] ${player.username} moved away from bed (${distance.toFixed(2)} blocks) - switched back to epicfight stance`)
    }
}

BlockEvents.rightClicked(event => {
    let player = event.player
    let block = event.block

    if (block.id.toString().includes('bed')) {
        handleBedLayDown(player, event.server, block)
    }
})

PlayerEvents.tick(event => {
    let player = event.player
    
    // Only check movement if player is in vanilla mode
    if (player.persistentData.getBoolean('fft_in_vanilla_mode')) {
        handlePlayerMovement(player, event.server)
    }
})
