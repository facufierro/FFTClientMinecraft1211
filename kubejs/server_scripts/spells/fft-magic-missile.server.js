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
                        let tgt = missile.target;
                        let isEntityTarget = tgt && tgt.getX && typeof tgt.getX === 'function';
                        let isPositionTarget = tgt && tgt.x !== undefined && !isEntityTarget;
                        let targetType = isEntityTarget ? 'entity' : isPositionTarget ? 'position' : 'unknown';
                        console.log(`[SERVER TICK] Firing delayed missile ${missile.index} with target type: ${targetType}`);
                        if (isPositionTarget) {
                            console.log(`[SERVER TICK] Position target: x=${tgt.x}, y=${tgt.y}, z=${tgt.z}`);
                        }
                        // Use the shared missile creation function with target and behavior flags, including missileAngle for arc/spread
                        global.createFFTMissile(
                            missile.ctx,
                            missile.target,
                            missile.entityTarget,
                            missile.useSpread,
                            missile.enableHoming,
                            missile.missileIndex,
                            missile.missileAngle // Pass the angle for arc phase
                        );
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

        // Handle homing missiles (with arc phase)
        if (localHomingMissiles.length > 0) {
            console.log(`[SERVER TICK] Processing ${localHomingMissiles.length} homing missiles`);
            for (let i = localHomingMissiles.length - 1; i >= 0; i--) {
                let homingData = localHomingMissiles[i];
                homingData.ticksAlive++;

                // Remove old or invalid missiles
                if (homingData.ticksAlive > 600) {
                    console.log(`[SERVER TICK] Removing old homing missile ${i} (${homingData.ticksAlive} ticks)`);
                    localHomingMissiles.splice(i, 1);
                    continue;
                }
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

                // Arc phase: blend velocity for first arcPhaseTicks
                // S-curve logic for position targets
                // Use previously declared targetToUse, isEntityTarget, isPositionTarget
                if (isPositionTarget) {
                    // Initialize S-curve state if not present
                    if (!homingData.sArcState) {
                        homingData.sArcState = {
                            tick: 0,
                            phase: 1, // 1 = outward, -1 = inward
                            arcPhaseTicks: homingData.arcPhaseTicks || 12,
                            arcCurveVec: homingData.arcCurveVec || { x: 0, y: 0, z: 0 },
                            arcStartVel: homingData.arcStartVel || { x: 0, y: 0, z: 0 }
                        };
                    }
                    let sArc = homingData.sArcState;
                    sArc.tick++;
                    let missile = homingData.missile;
                    let progress = sArc.tick / sArc.arcPhaseTicks;
                    let arcFactor = Math.sin(Math.PI * progress) * 0.8 * sArc.phase; // alternate direction
                    let startVel = sArc.arcStartVel;
                    let curve = sArc.arcCurveVec;
                    let blendedX = startVel.x + curve.x * arcFactor;
                    let blendedY = startVel.y + curve.y * arcFactor;
                    let blendedZ = startVel.z + curve.z * arcFactor;
                    // Move along the straight line to the target
                    let missileX = missile.getX();
                    let missileY = missile.getY();
                    let missileZ = missile.getZ();
                    let dx = targetToUse.x - missileX;
                    let dy = targetToUse.y - missileY;
                    let dz = targetToUse.z - missileZ;
                    let dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                    if (dist > 0) {
                        dx /= dist;
                        dy /= dist;
                        dz /= dist;
                    }
                    // Project blended velocity onto the straight path
                    let speed = Math.sqrt(blendedX*blendedX + blendedY*blendedY + blendedZ*blendedZ);
                    blendedX = dx * speed + curve.x * arcFactor;
                    blendedY = dy * speed + curve.y * arcFactor;
                    blendedZ = dz * speed + curve.z * arcFactor;
                    let Vec3 = Java.loadClass('net.minecraft.world.phys.Vec3');
                    missile.setDeltaMovement(new Vec3(blendedX, blendedY, blendedZ));
                    // When arc phase ends, flip direction and reset tick
                    if (sArc.tick >= sArc.arcPhaseTicks) {
                        sArc.phase *= -1;
                        sArc.tick = 0;
                    }
                    continue;
                }
                // ...existing code for entity targets and other logic...

                // Check if target is valid - handle both entity and position targets
                let targetToUse = homingData.target;
                let isEntityTarget = targetToUse && targetToUse.getX && typeof targetToUse.getX === 'function';
                let isPositionTarget = targetToUse && targetToUse.x !== undefined && !isEntityTarget;

                if (isEntityTarget) {
                    try {
                        if (!targetToUse.isAlive()) {
                            console.log(`[SERVER TICK] Removing missile ${i} with dead entity target`);
                            localHomingMissiles.splice(i, 1);
                            continue;
                        }
                    } catch (e) {
                        console.log(`[SERVER TICK] Removing missile ${i} with invalid entity target: ${e.message}`);
                        localHomingMissiles.splice(i, 1);
                        continue;
                    }
                } else if (isPositionTarget) {
                    try {
                        let missileX = homingData.missile.getX();
                        let missileY = homingData.missile.getY();
                        let missileZ = homingData.missile.getZ();
                        let dx = targetToUse.x - missileX;
                        let dy = targetToUse.y - missileY;
                        let dz = targetToUse.z - missileZ;
                        let distanceToTarget = Math.sqrt(dx*dx + dy*dy + dz*dz);
                        if (distanceToTarget < 3.0) {
                            // Missile reached center, stop homing but let it continue straight
                            if (!homingData.straightMode) {
                                homingData.straightMode = true;
                                console.log(`[SERVER TICK] Missile ${i} reached imaginary target, switching to straight mode`);
                            }
                        }
                    } catch (e) {
                        console.log(`[SERVER TICK] Error checking distance to position target: ${e.message}`);
                        localHomingMissiles.splice(i, 1);
                        continue;
                    }
                } else {
                    console.log(`[SERVER TICK] Removing missile ${i} with invalid target type`);
                    localHomingMissiles.splice(i, 1);
                    continue;
                }

                // Handle homing delay - don't start homing until delay is over
                if (homingData.homingDelayRemaining !== undefined && homingData.homingDelayRemaining > 0) {
                    homingData.homingDelayRemaining--;
                    console.log(`[SERVER TICK] Missile ${i} homing delayed: ${homingData.homingDelayRemaining} ticks remaining`);
                    continue; // Skip homing update while delay is active
                }

                // Update homing every tick for better responsiveness
                try {
                    if (!homingData.straightMode) {
                        let targetName = isEntityTarget ? targetToUse.getDisplayName().getString() : 
                            isPositionTarget ? `position (${targetToUse.x.toFixed(1)}, ${targetToUse.y.toFixed(1)}, ${targetToUse.z.toFixed(1)})` : 
                            "unknown";
                        console.log(`[SERVER TICK] Updating homing for missile ${i} toward ${targetName}`);
                        updateHomingMissile(homingData);
                    } else {
                        // In straight mode, do not update velocity, just let missile continue
                        console.log(`[SERVER TICK] Missile ${i} is in straight mode, not updating velocity`);
                    }
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
    
    // Check if missile is valid
    if (!missile || !missile.isAlive()) {
        console.log("[SERVER HOMING] Invalid missile, skipping");
        return;
    }
    
    // Handle different target types
    let targetX, targetY, targetZ;
    let isEntityTarget = target && target.getX && typeof target.getX === 'function';
    
    if (isEntityTarget) {
        // Entity target
        if (!target.isAlive()) {
            console.log("[SERVER HOMING] Target entity dead, skipping");
            return;
        }
        targetX = target.getX();
        targetY = target.getEyeY ? target.getEyeY() : target.getY();
        targetZ = target.getZ();
    } else if (target && target.x !== undefined) {
        // Position target (imaginary target)
        targetX = target.x;
        targetY = target.y;
        targetZ = target.z;
    } else {
        console.log("[SERVER HOMING] Invalid target, skipping");
        return;
    }
    
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
    
    console.log("[SERVER HOMING] Missile velocity updated");
}

console.log("[SERVER INIT] FFT Magic Missile server script loaded successfully");
