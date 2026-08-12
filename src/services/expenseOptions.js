/**
 * Opciones fijas de los gastos: tamaños de cuenta y categorías sugeridas.
 *
 * Son las mismas que ofrece la aplicación de escritorio (el `<select id="expenseFormAccountSize">`
 * de dashboard.html y `EXPENSE_CATEGORY_SUGGESTIONS` de renderer.js). Viven aquí porque la
 * versión móvil las necesita como datos, y `scripts/build-mobile.js` comprueba en cada
 * generación que siguen coincidiendo con las del ordenador: si se añade un tamaño en la app y
 * se olvida este archivo, la generación falla en vez de publicar un móvil con menos opciones.
 *
 * Las categorías son solo sugerencias (se puede escribir cualquier cosa); los tamaños sí son
 * una lista cerrada, igual que en el ordenador.
 */

const ACCOUNT_SIZES = ['10K', '25K', '50K', '100K', '150K'];

const CATEGORY_SUGGESTIONS = ['Suscripción', 'Evaluación', 'Reset', 'Comisión externa', 'Otro'];

module.exports = { ACCOUNT_SIZES, CATEGORY_SUGGESTIONS };
