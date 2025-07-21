// Generic slab to block recipe generator for KubeJS (shaped: two slabs side by side)
ServerEvents.recipes(event => {
  Ingredient.of('#minecraft:slabs').stacks.forEach(slab => {
    let slabId = slab.id;
    if (!slabId.endsWith('_slab')) return;

    // Remove '_slab' to get the base
    let base = slabId.slice(0, -5);

    // 1. Try _planks
    let planksId = base + '_planks';
    if (Item.exists(planksId)) {
      event.shaped(planksId, [
        'AA',
      ], {
        A: slabId
      });
      return;
    }

    // 2. Try plural (add 's')
    let pluralBlockId = base.endsWith('s') ? base : base + 's';
    if (Item.exists(pluralBlockId)) {
      event.shaped(pluralBlockId, [
        'AA',
      ], {
        A: slabId
      });
      return;
    }

    // 3. Try base as-is
    if (Item.exists(base)) {
      event.shaped(base, [
        'AA',
      ], {
        A: slabId
      });
    }
  });
});