// KubeJS Server Script - Recipe for kubejs:fftbackpack
// Pattern:
// I = Iron Ingot (top middle)
// L = Leather (U shape)
// C = Chest (center)

ServerEvents.recipes(event => {
	event.shaped('kubejs:fftbackpack', [
		'LIL',
		'LCL',
		'LLL'
	], {
		I: 'minecraft:iron_ingot',
		L: 'minecraft:leather',
		C: 'minecraft:chest'
	});
	console.log('Added recipe for kubejs:fftbackpack');
});
