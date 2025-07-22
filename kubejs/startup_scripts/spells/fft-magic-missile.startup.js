// Configuration variables
const delayBetweenMissiles = 2.5;
const spreadFactor = 0.15;
const baseDamage = 2.0;
const speed = 1.0;
const spellPowerMultiplier = 1.5;
const homingDelay = 1;
const targetingRange = 32.0;

StartupEvents.registry('irons_spellbooks:spells', event => {
    event.create('fft_magic_missile')
        .setManaCostPerLevel(2)
        .setBaseSpellPower(12)
        .setSpellPowerPerLevel(1)
        .setCastTime(0)
        .setBaseManaCost(10)
        .setCooldownSeconds(3)
        .setCastType('instant')
        .setSchool('irons_spellbooks:ender')
        .setMinRarity('common')
        .setMaxLevel(9)
        .setAllowLooting(true)
        .canBeCraftedBy(player => true)
        .needsLearning(false)
        .onCast(ctx => global.magicMissile(ctx))
        .setUniqueInfo((spellLevel, caster) => {
            let spellPowerAttribute = Java.loadClass('io.redspace.ironsspellbooks.api.registry.AttributeRegistry').SPELL_POWER.get();
            let finalDamage = baseDamage + (caster.getAttributeValue(spellPowerAttribute) * spellPowerMultiplier);
            return [
                Component.of(`Damage: ${finalDamage.toFixed(1)} per missile`).darkGreen(),
                Component.of(`Missiles: ${spellLevel + 2}`).darkGreen()
            ];
        });
});


// Helper function to create missile projectile
const createMissileProjectile = (ctx) => {
    let EntityRegistry = Java.loadClass('io.redspace.ironsspellbooks.registries.EntityRegistry');
    let missileType = EntityRegistry.MAGIC_MISSILE_PROJECTILE.get();
    let missile = missileType.create(ctx.level);

    missile.setOwner(ctx.entity);
    // Spawn from chest height (about 1.2 blocks above feet)
    missile.setPos(ctx.entity.getX(), ctx.entity.getY() + 1.2, ctx.entity.getZ());

    // Calculate damage same as tooltip: base damage + spell power * 2
    let spellPowerAttribute = Java.loadClass('io.redspace.ironsspellbooks.api.registry.AttributeRegistry').SPELL_POWER.get();
    let finalDamage = baseDamage + (ctx.entity.getAttributeValue(spellPowerAttribute) * spellPowerMultiplier);
    missile.setDamage(finalDamage);

    return missile;
};

// Helper function to add glow effect for debugging targeting
const addTargetGlow = (entity) => {
    if (!entity || !entity.getX) return;

    try {
        // Add glowing effect for 1 second (20 ticks)
        let MobEffects = Java.loadClass('net.minecraft.world.effect.MobEffects');
        let MobEffectInstance = Java.loadClass('net.minecraft.world.effect.MobEffectInstance');

        let glowEffect = new MobEffectInstance(MobEffects.GLOWING, 20, 0, false, false);
        entity.addEffect(glowEffect);
    } catch (e) {
        // Fallback: just log the target
        console.log(`Target: ${entity.getDisplayName().getString()} at ${entity.getX().toFixed(1)}, ${entity.getY().toFixed(1)}, ${entity.getZ().toFixed(1)}`);
    }
};

// Helper function to register missile for homing
const registerMissileForHoming = (missile, target, arcParams) => {
    if (target) {
        try {
            if (!global.homingFFTMissiles) global.homingFFTMissiles = [];
            global.homingFFTMissiles.push({
                missile: missile,
                target: target,
                ticksAlive: 0,
                homingDelayRemaining: homingDelay,
                arcPhaseTicks: arcParams.arcPhaseTicks,
                arcType: arcParams.arcType,
                arcCurveVec: arcParams.arcCurveVec,
                arcStartVel: arcParams.arcStartVel,
                arcTick: 0
            });
            let targetName = target.getDisplayName ? target.getDisplayName().getString() :
                target.isPosition ? "position" : "target";
            console.log(`[STARTUP] Registered missile for homing toward ${targetName}`);
        } catch (e) {
            console.log(`[STARTUP] Failed to register missile for homing: ${e.message}`);
        }
    } else {
        console.log(`[STARTUP] No valid target to register for homing`);
    }
};

// Helper function to find nearby entity for homing
const findNearbyEntityForHoming = (missile, ctx) => {
    try {
        let nearbyEntities = ctx.level.getEntitiesOfClass(
            Java.loadClass('net.minecraft.world.entity.LivingEntity'),
            missile.getBoundingBox().inflate(16.0)
        );

        let closestEntity = null;
        let closestDistance = 999;

        for (let entity of nearbyEntities) {
            if (entity.is(ctx.entity)) continue;
            let dx = entity.getX() - missile.getX();
            let dy = entity.getY() - missile.getY();
            let dz = entity.getZ() - missile.getZ();
            let distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestEntity = entity;
            }
        }

        if (closestEntity && closestDistance < 12.0) {
            registerMissileForHoming(missile, closestEntity);
        }
    } catch (e) { }
};


// Core function to create and fire a single missile
global.createFFTMissile = (ctx, target, entityTarget, useSpread, enableHoming, missileIndex, missileAngle) => {
    // Create missile projectile
    let missile = createMissileProjectile(ctx);

    // For delayed missiles, only look for the original target if homing was enabled
    if (enableHoming && (!entityTarget || !entityTarget.getX)) {
        try {
            let MobEffects = Java.loadClass('net.minecraft.world.effect.MobEffects');
            let nearbyEntities = ctx.level.getEntitiesOfClass(
                Java.loadClass('net.minecraft.world.entity.LivingEntity'),
                ctx.entity.getBoundingBox().inflate(32.0)
            );
            for (let entity of nearbyEntities) {
                if (entity.hasEffect(MobEffects.GLOWING)) {
                    console.log(`[STARTUP] Found glowing target for delayed missile: ${entity.getDisplayName().getString()}`);
                    entityTarget = entity;
                    target = entity;
                    break;
                }
            }
        } catch (e) {
            console.log(`[STARTUP] Error searching for glowing target: ${e.message}`);
        }
    }

    // Calculate direction towards target
    let targetX, targetY, targetZ;
    if (target && target.getX) {
        targetX = target.getX();
        targetY = target.getEyeY();
        targetZ = target.getZ();
    } else if (target && target.x !== undefined) {
        targetX = target.x;
        targetY = target.y;
        targetZ = target.z;
    } else {
        let lookAngle = ctx.entity.getLookAngle();
        targetX = ctx.entity.getX() + lookAngle.x * targetingRange;
        targetY = ctx.entity.getEyeY() + lookAngle.y * targetingRange;
        targetZ = ctx.entity.getZ() + lookAngle.z * targetingRange;
    }

    // Calculate direction vector
    let deltaX = targetX - ctx.entity.getX();
    let deltaY = targetY - ctx.entity.getEyeY();
    let deltaZ = targetZ - ctx.entity.getZ();

    // Normalize direction
    let length = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
    let dirX = deltaX, dirY = deltaY, dirZ = deltaZ;
    if (length > 0) {
        dirX /= length;
        dirY /= length;
        dirZ /= length;
    }

    // Arc logic: robust circular spread using two perpendicular vectors
    let arcPhaseTicks = 12;
    let arcStrength = 0.055;
    let arcCurveVec = { x: 0, y: 0, z: 0 };

    // Calculate missileCount from ctx.spellLevel
    let missileCount = 2 + (ctx.spellLevel || 0);

    // Find two perpendicular vectors to direction
    let dir = { x: dirX, y: dirY, z: dirZ };
    let perp1, perp2;
    if (Math.abs(dir.x) < 0.0001 && Math.abs(dir.z) < 0.0001) {
        // If aiming straight up/down, use X axis
        perp1 = { x: 1, y: 0, z: 0 };
    } else {
        // Cross with Y axis
        perp1 = {
            x: -dir.z,
            y: 0,
            z: dir.x
        };
        let len = Math.sqrt(perp1.x * perp1.x + perp1.z * perp1.z);
        perp1.x /= len;
        perp1.z /= len;
    }
    // perp2 = cross(dir, perp1)
    perp2 = {
        x: dir.y * perp1.z - dir.z * perp1.y,
        y: dir.z * perp1.x - dir.x * perp1.z,
        z: dir.x * perp1.y - dir.y * perp1.x
    };
    let perp2Len = Math.sqrt(perp2.x * perp2.x + perp2.y * perp2.y + perp2.z * perp2.z);
    if (perp2Len > 0.0001) {
        perp2.x /= perp2Len;
        perp2.y /= perp2Len;
        perp2.z /= perp2Len;
    } else {
        perp2 = { x: 0, y: 1, z: 0 };
    }

    // Use provided angle for this missile
    let angle = missileAngle !== undefined ? missileAngle : Math.random() * 2 * Math.PI;
    arcCurveVec = {
        x: (perp1.x * Math.cos(angle) + perp2.x * Math.sin(angle)) * arcStrength,
        y: (perp1.y * Math.cos(angle) + perp2.y * Math.sin(angle)) * arcStrength,
        z: (perp1.z * Math.cos(angle) + perp2.z * Math.sin(angle)) * arcStrength
    };

    // Apply arc BEFORE normalization
    let arcX = dirX + arcCurveVec.x;
    let arcY = dirY + arcCurveVec.y;
    let arcZ = dirZ + arcCurveVec.z;
    let arcLen = Math.sqrt(arcX * arcX + arcY * arcY + arcZ * arcZ);
    if (arcLen > 0) {
        arcX /= arcLen;
        arcY /= arcLen;
        arcZ /= arcLen;
    }

    // Store starting velocity for arc phase
    let arcStartVel = { x: arcX * speed, y: arcY * speed, z: arcZ * speed };

    // Shoot missile with initial velocity
    let Vec3 = Java.loadClass('net.minecraft.world.phys.Vec3');
    let direction = new Vec3(arcStartVel.x, arcStartVel.y, arcStartVel.z);
    missile.shoot(direction);

    // Try Iron's Spells native targeting
    try {
        if (target && target.getX) {
            missile.setTarget(target);
        }
    } catch (e) { }

    ctx.level.addFreshEntity(missile);

    // Register for homing (with arc phase params)
    if (enableHoming) {
        let homingTarget = entityTarget || target;
        console.log(`[STARTUP] Registering missile for homing`);
        registerMissileForHoming(missile, homingTarget, {
            arcPhaseTicks: arcPhaseTicks,
            arcCurveVec: arcCurveVec,
            arcStartVel: arcStartVel
        });
    } else {
        console.log(`[STARTUP] No homing - disabled`);
    }
};

// Main spell function
global.magicMissile = (ctx) => {
    let missileCount = 2 + ctx.spellLevel;

    // Get target via raycast - try both with and without fluids
    let target = null;
    let entityTarget = null;
    let isTargetingEntity = false;

    console.log(`[STARTUP] Starting entity detection...`);

    // First priority: Manual entity search with precision targeting
    console.log(`[STARTUP] Starting precision entity search...`);
    try {
        let nearbyEntities = ctx.level.getEntitiesOfClass(
            Java.loadClass('net.minecraft.world.entity.LivingEntity'),
            ctx.entity.getBoundingBox().inflate(targetingRange)
        );

        console.log(`[STARTUP] Found ${nearbyEntities.length} nearby entities`);

        let lookAngle = ctx.entity.getLookAngle();
        let bestEntity = null;
        let bestDot = -1;

        for (let entity of nearbyEntities) {
            if (entity.is(ctx.entity)) continue;

            // Calculate direction to entity
            let dx = entity.getX() - ctx.entity.getX();
            let dy = entity.getEyeY() - ctx.entity.getEyeY();
            let dz = entity.getZ() - ctx.entity.getZ();
            let distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (distance > targetingRange) continue;

            // Normalize direction
            dx /= distance;
            dy /= distance;
            dz /= distance;

            // Calculate dot product with look direction
            let dot = lookAngle.x * dx + lookAngle.y * dy + lookAngle.z * dz;

            console.log(`[STARTUP] Entity ${entity.getDisplayName().getString()}: distance=${distance.toFixed(1)}, dot=${dot.toFixed(3)}`);

            // Check if we're looking at this entity (within 5 degree cone for precision)
            if (dot > 0.996 && dot > bestDot) { // cos(5°) ≈ 0.996
                bestEntity = entity;
                bestDot = dot;
            }
        }

        if (bestEntity) {
            console.log(`[STARTUP] Found target entity: ${bestEntity.getDisplayName().getString()}`);
            entityTarget = bestEntity;
            target = bestEntity;
            isTargetingEntity = true;
            addTargetGlow(entityTarget);
        }
    } catch (e) {
        console.log(`[STARTUP] Entity search error: ${e.message}`);
    }

    // Second priority: If no entity found, try raycast for blocks
    if (!target) {
        console.log(`[STARTUP] No entity target, checking for blocks...`);
        try {
            raycastResult = ctx.entity.pick(targetingRange, 0.0, true);
            console.log(`[STARTUP] Raycast result: ${raycastResult ? raycastResult.getType().name() : 'null'}`);

            if (raycastResult && raycastResult.getType().name() === "BLOCK") {
                let blockLocation = raycastResult.getLocation();
                target = { x: blockLocation.x, y: blockLocation.y, z: blockLocation.z, isPosition: true };
                console.log(`[STARTUP] Targeting block at: ${blockLocation.x}, ${blockLocation.y}, ${blockLocation.z}`);
            }
        } catch (e) {
            console.log(`[STARTUP] Raycast error: ${e.message}`);
        }
    }

    // Fallback if no target found - create fallback position at half distance
    if (!target) {
        let lookAngle = ctx.entity.getLookAngle();

        // Create fallback position at half the max range to create arc
        let fallbackDistance = targetingRange / 2; // Half distance for arc
        target = {
            x: ctx.entity.getX() + lookAngle.x * fallbackDistance,
            y: ctx.entity.getEyeY() + lookAngle.y * fallbackDistance,
            z: ctx.entity.getZ() + lookAngle.z * fallbackDistance,
            isPosition: true
        };
        console.log(`[STARTUP] No target found, creating fallback position at half distance (${fallbackDistance} blocks)`);
    }

    // Determine behavior based on whether we're targeting an entity
    let useSpread = false;  // Never use spread - let homing handle all trajectories
    let enableHoming = true; // Always enable homing

    console.log(`[STARTUP] useSpread: ${useSpread}, enableHoming: ${enableHoming}`);

    // Generate unique random angles for this cast
    let angles = [];
    for (let i = 0; i < missileCount; i++) {
        angles.push((2 * Math.PI * i) / missileCount);
    }
    // Shuffle angles
    for (let i = angles.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [angles[i], angles[j]] = [angles[j], angles[i]];
    }

    // Fire first missile immediately
    global.createFFTMissile(ctx, target, entityTarget, useSpread, enableHoming, 0, angles[0]);

    // Queue remaining missiles
    if (missileCount > 1) {
        try {
            if (!global.pendingFFTMissiles || !Array.isArray(global.pendingFFTMissiles)) global.pendingFFTMissiles = [];

            for (let i = 1; i < missileCount; i++) {
                let delayTicks = i * delayBetweenMissiles;
                global.pendingFFTMissiles.push({
                    index: i,
                    ticksRemaining: delayTicks,
                    ctx: ctx,
                    target: target,
                    entityTarget: entityTarget,
                    useSpread: useSpread,
                    enableHoming: enableHoming,
                    missileIndex: i,
                    missileAngle: angles[i]
                });
            }
        } catch (e) { }
    }
};
