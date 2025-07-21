// Set max health to 3 hearts (6 health points) on first join and after death

// On first login, only if it's the player's first time
PlayerEvents.loggedIn(event => {
    let player = event.player;
    if (!player.persistentData.has("fft_maxhealth_set")) {
        player.maxHealth = 6;
        player.health = 6;
        player.persistentData.putBoolean("fft_maxhealth_set", true);
    }
});

// On respawn (after death)
PlayerEvents.respawned(event => {
    let player = event.player;
    player.maxHealth = 6;
    player.health = 6;
});