// FFT Magic Missile succession handler - processes delayed missile firing and homing

console.log("[SERVER INIT] FFT Magic Missile server script loading...");

// Use a different approach to avoid global assignment issues
let localHomingMissiles = [];
let localPendingMissiles = [];

ServerEvents.tick(event => {
    try {
        // Sync with global arrays if they exist
        if (global.pendingFFTMissiles && global.pendingFFTMissiles.length > 0) {
            console.log(`[SERVER TICK] Found ${global.pendingFFTMissiles.length} pending missiles in global`);
            // Move from global to local to avoid modification issues
            for (let missile of global.pendingFFTMissiles) {
                localPendingMissiles.push(missile);
            }
            global.pendingFFTMissiles.length = 0; // Clear global array
        }
        
        if (global.homingFFTMissiles && global.homingFFTMissiles.length > 0) {
            console.log(`[SERVER TICK] Found ${global.homingFFTMissiles.length} homing missiles in global`);
            // Move from global to local to avoid modification issues
            for (let missile of global.homingFFTMissiles) {
                localHomingMissiles.push(missile);
            }
            global.homingFFTMissiles.length = 0; // Clear global array
        }

        // Handle pending missile launches
        if (localPendingMissiles.length > 0) {
            console.log(`[SERVER TICK] Processing ${localPendingMissiles.length} pending missiles`);
            // Process each pending missile
            for (let i = localPendingMissiles.length - 1; i >= 0; i--) {
                let missile = localPendingMissiles[i];
                
                console.log(`[SERVER TICK] Missile ${missile.index}: ${missile.ticksRemaining} ticks remaining`);
                
                // Decrease remaining ticks
                missile.ticksRemaining--;
                
                // If ready to fire
                if (missile.ticksRemaining <= 0) {
                    try {
                        console.log(`[SERVER TICK] Firing delayed missile ${missile.index}`);
                        // Use the shared missile creation function with target
                        global.createFFTMissile(missile.ctx, missile.index, missile.target, missile.entityTarget);
                        console.log(`[SERVER TICK] Successfully fired delayed missile ${missile.index}`);
                    } catch (e) {
                        console.error(`[SERVER TICK] Error firing delayed missile ${missile.index}:`, e);
                    }
                    
                    // Remove this missile from pending list
                    localPendingMissiles.splice(i, 1);
                    console.log(`[SERVER TICK] Removed missile ${missile.index} from pending list`);
                }
            }
        }

        // Handle homing missiles
        if (localHomingMissiles.length > 0) {
            console.log(`[SERVER TICK] Processing ${localHomingMissiles.length} homing missiles`);
            for (let i = localHomingMissiles.length - 1; i >= 0; i--) {
                let homingData = localHomingMissiles[i];
                homingData.ticksAlive++;
                
                console.log(`[SERVER TICK] Homing missile ${i}: ${homingData.ticksAlive} ticks alive`);
                
                // Remove old or invalid missiles (increased timeout for longer range)
                if (homingData.ticksAlive > 600) { // 30 seconds instead of 10
                    console.log(`[SERVER TICK] Removing old homing missile ${i} (${homingData.ticksAlive} ticks)`);
                    localHomingMissiles.splice(i, 1);
                    continue;
                }
                
                // Check if missile entity is valid
                try {
                    if (!homingData.missile || !homingData.missile.isAlive()) {
                        console.log(`[SERVER TICK] Removing dead missile ${i}`);
                        localHomingMissiles.splice(i, 1);
                        continue;
                    }
                } catch (e) {
                    console.log(`[SERVER TICK] Removing invalid missile ${i}: ${e.message}`);
                    localHomingMissiles.splice(i, 1);
                    continue;
                }
                
                // Check if target entity is valid - DON'T search for glowing targets until homing delay is over
                let targetToUse = homingData.target;
                
                // Check if target entity is valid  
                try {
                    if (!targetToUse || !targetToUse.isAlive()) {
                        console.log(`[SERVER TICK] Removing missile ${i} with dead target`);
                        localHomingMissiles.splice(i, 1);
                        continue;
                    }
                } catch (e) {
                    console.log(`[SERVER TICK] Removing missile ${i} with invalid target: ${e.message}`);
                    localHomingMissiles.splice(i, 1);
                    continue;
                }
                
                // Handle homing delay - don't start homing until delay is over
                if (homingData.homingDelayRemaining !== undefined && homingData.homingDelayRemaining > 0) {
                    homingData.homingDelayRemaining--;
                    console.log(`[SERVER TICK] Missile ${i} homing delayed: ${homingData.homingDelayRemaining} ticks remaining`);
                    continue; // Skip homing update while delay is active
                }
                
                // ONLY after homing delay is over, try to find a glowing target
                try {
                    let MobEffects = Java.loadClass('net.minecraft.world.effect.MobEffects');
                    let nearbyEntities = homingData.missile.getLevel().getEntitiesOfClass(
                        Java.loadClass('net.minecraft.world.entity.LivingEntity'),
                        homingData.missile.getBoundingBox().inflate(32.0)
                    );
                    
                    for (let entity of nearbyEntities) {
                        if (entity.hasEffect(MobEffects.GLOWING)) {
                            console.log(`[SERVER TICK] Found glowing target for missile ${i}, switching to it`);
                            targetToUse = entity;
                            homingData.target = entity; // Update the stored target
                            break;
                        }
                    }
                } catch (e) {
                    console.log(`[SERVER TICK] Error searching for glowing targets: ${e.message}`);
                }
                
                // Update homing every tick for better responsiveness
                try {
                    console.log(`[SERVER TICK] Updating homing for missile ${i} toward ${targetToUse.getDisplayName().getString()}`);
                    updateHomingMissile(homingData);
                } catch (e) {
                    console.error(`[SERVER TICK] Error updating homing missile ${i}:`, e);
                    localHomingMissiles.splice(i, 1);
                }
            }
        }
    } catch (e) {
        console.error("[SERVER TICK] Error in missile tick handler:", e);
    }
});

function updateHomingMissile(homingData) {
    console.log("[SERVER HOMING] Updating missile homing...");
    
    let missile = homingData.missile;
    let target = homingData.target;
    
    if (!missile || !target || !missile.isAlive() || !target.isAlive()) {
        console.log("[SERVER HOMING] Invalid missile or target, skipping");
        return;
    }
    
    // Calculate direction to target
    let targetX = target.getX ? target.getX() : target.x;
    let targetY = target.getEyeY ? target.getEyeY() : (target.y || target.getY());
    let targetZ = target.getZ ? target.getZ() : target.z;
    
    let missileX = missile.getX();
    let missileY = missile.getY();
    let missileZ = missile.getZ();
    
    console.log(`[SERVER HOMING] Missile at: ${missileX}, ${missileY}, ${missileZ}`);
    console.log(`[SERVER HOMING] Target at: ${targetX}, ${targetY}, ${targetZ}`);
    
    let dx = targetX - missileX;
    let dy = targetY - missileY;
    let dz = targetZ - missileZ;
    let distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    console.log(`[SERVER HOMING] Distance to target: ${distance}`);
    
    // Don't adjust if very close to avoid jittering
    if (distance < 1.5) {
        console.log("[SERVER HOMING] Too close to target, skipping adjustment");
        return;
    }
    
    // Normalize direction
    if (distance > 0) {
        dx /= distance;
        dy /= distance;
        dz /= distance;
    }
    
    // Get current velocity
    let currentVel = missile.getDeltaMovement();
    let currentSpeed = Math.sqrt(currentVel.x*currentVel.x + currentVel.y*currentVel.y + currentVel.z*currentVel.z);
    
    console.log(`[SERVER HOMING] Current velocity: ${currentVel.x}, ${currentVel.y}, ${currentVel.z}`);
    console.log(`[SERVER HOMING] Current speed: ${currentSpeed}`);
    
    // Apply stronger homing based on distance - closer targets get stronger homing
    let homingStrength = Math.min(0.8, 0.3 + (10.0 / Math.max(distance, 1.0)) * 0.5);
    console.log(`[SERVER HOMING] Homing strength: ${homingStrength} (based on distance ${distance})`);
    
    // Blend current direction with target direction
    let newX = currentVel.x * (1 - homingStrength) + dx * homingStrength;
    let newY = currentVel.y * (1 - homingStrength) + dy * homingStrength;
    let newZ = currentVel.z * (1 - homingStrength) + dz * homingStrength;
    
    // Normalize and maintain speed
    let newLen = Math.sqrt(newX*newX + newY*newY + newZ*newZ);
    if (newLen > 0) {
        newX = (newX / newLen) * currentSpeed;
        newY = (newY / newLen) * currentSpeed;
        newZ = (newZ / newLen) * currentSpeed;
    }
    
    console.log(`[SERVER HOMING] New velocity: ${newX}, ${newY}, ${newZ}`);
    
    // Update missile velocity
    let Vec3 = Java.loadClass('net.minecraft.world.phys.Vec3');
    missile.setDeltaMovement(new Vec3(newX, newY, newZ));
    
    // Also try to update the missile's position more directly for better tracking
    try {
        // Get the look direction towards target for additional accuracy
        let yaw = Math.atan2(-dx, dz);
        let pitch = Math.atan2(-dy, Math.sqrt(dx*dx + dz*dz));
        
        // Convert to degrees
        yaw = yaw * 180.0 / Math.PI;
        pitch = pitch * 180.0 / Math.PI;
        
        console.log(`[SERVER HOMING] Setting missile rotation: yaw=${yaw}, pitch=${pitch}`);
        
        // Try different rotation methods - Iron's Spells missiles might use different method names
        try {
            missile.setYRot(yaw);
            missile.setXRot(pitch);
        } catch (e1) {
            try {
                missile.yRot = yaw;
                missile.xRot = pitch;
            } catch (e2) {
                // Rotation setting failed, but that's okay - velocity updates are more important
                console.log(`[SERVER HOMING] Could not set missile rotation (this is normal): ${e1.message}`);
            }
        }
    } catch (e) {
        console.log(`[SERVER HOMING] Error in rotation calculation: ${e.message}`);
    }
    
    console.log("[SERVER HOMING] Missile velocity updated");
}

console.log("[SERVER INIT] FFT Magic Missile server script loaded successfully");
