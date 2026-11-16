import assert from 'node:assert/strict';
import { validateCommunityProductRules } from '../src/utils/prohibitedContent';
import { TREE_STAGE_INFO } from '../src/utils/formatters';

// 1. Verificar bloqueo de operaciones monetarias o compraventa
const moneyError = validateCommunityProductRules('Bicicleta usada', 'La vendo en $35.000 pesos');
assert.ok(moneyError && moneyError.includes('monetario'), 'Debe rechazar precios o compraventa');

// 2. Verificar bloqueo de elementos prohibidos (armas, medicamentos, drogas)
const weaponError = validateCommunityProductRules('Pistola de aire', 'En buen estado');
assert.ok(weaponError !== null, 'Debe rechazar armas');

const medsError = validateCommunityProductRules('Caja de antibiótico', 'Con receta médica');
assert.ok(medsError !== null, 'Debe rechazar medicamentos restringidos');

// 3. Verificar aceptación de publicaciones válidas
const validResult = validateCommunityProductRules(
  'Silla escolar de madera',
  'Silla firme en buen estado para estudiante de enseñanza básica en Castro.'
);
assert.equal(validResult, null, 'Debe permitir publicaciones comunitarias legítimas');

// 4. Verificar umbrales del Árbol Circular
assert.equal(TREE_STAGE_INFO.semilla.minOps, 0);
assert.equal(TREE_STAGE_INFO.brote.minOps, 1);
assert.equal(TREE_STAGE_INFO.arbol_joven.minOps, 3);
assert.equal(TREE_STAGE_INFO.arbol_desarrollado.minOps, 10);
assert.equal(TREE_STAGE_INFO.arbol_frutal.minOps, 25);

console.log('Pruebas de dominio PoliCircular superadas correctamente.');
