// Configuration variables
const delayBetweenMissiles = 7.5;
const spreadFactor = 0.25;
const baseDamage = 2.0;
const spellPowerMultiplier = 1.5;
const homingDelay = 10;

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

            ]
        })
});


// Helper function to create missile projectile
const createMissileProjectile = (ctx) => {
    let EntityRegistry = Java.loadClass('io.redspace.ironsspellbooks.registries.EntityRegistry');
    let missileType = EntityRegistry.MAGIC_MISSILE_PROJECTILE.get();
    let missile = missileType.create(ctx.level);

    missile.setOwner(ctx.entity);
    missile.setPos(ctx.entity.getX(), ctx.entity.getEyeY(), ctx.entity.getZ());

    // Calculate damage same as tooltip: base damage + spell power * 2
    let spellPowerAttribute = Java.loadClass('io.redspace.ironsspellbooks.api.registry.AttributeRegistry').SPELL_POWER.get();
    let finalDamage = baseDamage + (ctx.entity.getAttributeValue(spellPowerAttribute) * spellPowerMultiplier);
    missile.setDamage(finalDamage);

    return missile;
};

// Helper function to register missile for homing
const registerMissileForHoming = (missile, entityTarget) => {
    if (entityTarget && entityTarget.getX) {
        try {
            if (!global.homingFFTMissiles) global.homingFFTMissiles = [];
            global.homingFFTMissiles.push({
                missile: missile,
                target: entityTarget,
                ticksAlive: 0,
                homingDelayRemaining: homingDelay
            });
        } catch (e) { }
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
global.createFFTMissile = (ctx, target, entityTarget) => {
    // Create missile projectile
    let missile = createMissileProjectile(ctx);

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
        targetX = ctx.entity.getX() + lookAngle.x * 32;
        targetY = ctx.entity.getEyeY() + lookAngle.y * 32;
        targetZ = ctx.entity.getZ() + lookAngle.z * 32;
    }

    // Calculate direction vector
    let deltaX = targetX - ctx.entity.getX();
    let deltaY = targetY - ctx.entity.getEyeY();
    let deltaZ = targetZ - ctx.entity.getZ();

    // Normalize
    let length = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
    if (length > 0) {
        deltaX /= length;
        deltaY /= length;
        deltaZ /= length;
    }

    // Add spread
    let spreadX = (Math.random() - 0.5) * spreadFactor;
    let spreadY = (Math.random() - 0.5) * spreadFactor;
    let spreadZ = (Math.random() - 0.5) * spreadFactor;

    let finalX = deltaX + spreadX;
    let finalY = deltaY + spreadY;
    let finalZ = deltaZ + spreadZ;

    // Shoot missile
    let Vec3 = Java.loadClass('net.minecraft.world.phys.Vec3');
    let direction = new Vec3(finalX * speed, finalY * speed, finalZ * speed);
    missile.shoot(direction);

    // Try Iron's Spells native targeting
    try {
        if (target && target.getX) {
            missile.setTarget(target);
        }
    } catch (e) { }

    ctx.level.addFreshEntity(missile);

    // Register for homing
    let homingTarget = entityTarget || (target && target.getX ? target : null);
    if (homingTarget && homingTarget.getX) {
        registerMissileForHoming(missile, homingTarget);
    } else {
        findNearbyEntityForHoming(missile, ctx);
    }
};

// Main spell function
global.magicMissile = (ctx) => {
    let missileCount = 2 + ctx.spellLevel;

    // Get target via raycast
    let target = null;
    let entityTarget = null;

    let raycastResult = ctx.entity.pick(32.0, 0.0, false);

    if (raycastResult && raycastResult.getType().name() === "ENTITY") {
        target = raycastResult.getEntity();
        entityTarget = target;
    } else if (raycastResult && raycastResult.getType().name() === "BLOCK") {
        let blockLocation = raycastResult.getLocation();
        target = { x: blockLocation.x, y: blockLocation.y, z: blockLocation.z, isPosition: true };
    } else {
        let lookAngle = ctx.entity.getLookAngle();
        target = {
            x: ctx.entity.getX() + lookAngle.x * 32,
            y: ctx.entity.getEyeY() + lookAngle.y * 32,
            z: ctx.entity.getZ() + lookAngle.z * 32,
            isPosition: true
        };
    }

    // ALWAYS search for entity targets for homing (like working version)
    if (!entityTarget) {
        try {
            let nearbyEntities = ctx.level.getEntitiesOfClass(
                Java.loadClass('net.minecraft.world.entity.LivingEntity'),
                ctx.entity.getBoundingBox().inflate(24.0)
            );

            let bestEntity = null;
            let bestScore = 999;
            let lookAngle = ctx.entity.getLookAngle();

            for (let entity of nearbyEntities) {
                if (entity.is(ctx.entity)) continue;

                let dx = entity.getX() - ctx.entity.getX();
                let dy = entity.getEyeY() - ctx.entity.getEyeY();
                let dz = entity.getZ() - ctx.entity.getZ();
                let entityDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (entityDistance > 24.0) continue;

                let len = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (len > 0) {
                    dx /= len;
                    dy /= len;
                    dz /= len;
                }

                let dotProduct = lookAngle.x * dx + lookAngle.y * dy + lookAngle.z * dz;
                let angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));

                if (angle > Math.PI / 2) continue;

                let score = (angle * 5.0 * 20.0) + (entityDistance * 0.5);
                if (score < bestScore && angle < Math.PI / 3) {
                    bestScore = score;
                    bestEntity = entity;
                }
            }

            if (bestEntity) {
                entityTarget = bestEntity;
            }
        } catch (e) { }
    }

    // Fire first missile immediately
    global.createFFTMissile(ctx, 0, target, entityTarget);

    // Queue remaining missiles
    if (missileCount > 1) {
        try {
            if (!global.pendingFFTMissiles) global.pendingFFTMissiles = [];

            for (let i = 1; i < missileCount; i++) {
                let delayTicks = i * delayBetweenMissiles;
                global.pendingFFTMissiles.push({
                    index: i,
                    ticksRemaining: delayTicks,
                    ctx: ctx,
                    target: target,
                    entityTarget: entityTarget
                });
            }
        } catch (e) { }
    }
};
