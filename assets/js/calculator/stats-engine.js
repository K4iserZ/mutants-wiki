/* Motor independiente de stats, ataques, habilidades y skins. */
(function () {
  const STAR_VALUES = { basic: 0, bronze: 10, silver: 30, gold: 75, platinum: 100 };
  const RESTRICTED_TYPES = ['CAPTAINPEACE', 'SEASONAL', 'GAMES', 'GACHA', 'ZODIAC', 'VIDEOGAME', 'COMMUNITY'];

  function extractNumber(value) {
    const match = String(value ?? '').trim().match(/^[+-]?(\d+)/);
    return match ? Number.parseInt(match[1], 10) : 0;
  }

  function normalizeAbilityType(value = '') {
    const parts = String(value).trim().toLowerCase().replace(/^ability_/, '').replace(/^add/, '').replace(/_plus$/i, '').split('_').filter(Boolean);
    const family = /^\d+$/.test(parts[0]) ? (parts[1] || parts[0]) : parts[0];
    return family === 'regen' ? 'regenerate' : family;
  }

  function formatOrbTypeLabel(value = '') {
    const type = String(value).trim().toLowerCase().replace(/^special_/, '').replace(/^add/, '').replace(/_/g, ' ');
    const key = type.replace(/ /g, '_');
    const labels = window.MGG_CONFIG?.assets?.icons?.mappings?.orbTypeLabels || {};
    return labels[key] || (type ? type.replace(/\b\w/g, character => character.toUpperCase()) : 'Orb type');
  }

  function parseUnlockAttackEvents(value) {
    return String(value || '').split(';').filter(Boolean).map(part => {
      const [attack, level, gene] = part.split(':');
      return { attack: attack?.trim() || '', level: Number.parseInt(level, 10) || 0, gene: gene === 'neutre' ? 'n' : (gene || 'n') };
    }).sort((a, b) => a.level - b.level);
  }

  function getAttackEvolutionState(mutant, level, attackType) {
    const events = parseUnlockAttackEvents(mutant.unlockattack);
    const unlocked = events.filter(event => event.level <= level);
    const baseKey = String(attackType);
    const upgradeKey = `${attackType}p`;
    const selectedKey = unlocked.some(event => event.attack === upgradeKey)
      ? upgradeKey
      : (unlocked.some(event => event.attack === baseKey) ? baseKey : null);
    if (!selectedKey) return { unlocked: false, selectedKey: null, value: null, gene: '', event: null };

    const event = unlocked.slice().reverse().find(item => item.attack === selectedKey) || null;
    const valueField = { 1: 'atk1', 2: 'atk2', '1p': 'atk1p', '2p': 'atk2p' }[selectedKey];
    return {
      unlocked: true,
      selectedKey,
      value: extractNumber(mutant[valueField]),
      gene: event?.gene || 'n',
      event
    };
  }

  function getDeclaredAttackState(mutant, attackKey) {
    const event = parseUnlockAttackEvents(mutant.unlockattack).slice().reverse().find(item => item.attack === attackKey);
    return { gene: event?.gene || '', value: extractNumber(mutant[{ 1: 'atk1', 2: 'atk2', '1p': 'atk1p', '2p': 'atk2p' }[attackKey]]) };
  }

  function parseAbilities(value) {
    const result = {};
    String(value || '').split(';').filter(Boolean).forEach(entry => {
      const [number, ability] = entry.split(':');
      if (number && ability) {
        const normalized = normalizeAbilityType(ability);
        result[number] = normalized.split(' ').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
      }
    });
    return result;
  }

  function getSkinOptions(mutant) {
    const type = String(mutant.type || '').toUpperCase();
    const restricted = RESTRICTED_TYPES.some(item => type.includes(item));
    const options = [{ key: 'basic', label: 'Basic', starValue: STAR_VALUES.basic }];
    if (!restricted) {
      ['bronze', 'silver', 'gold', 'platinum'].forEach(key => options.push({ key, label: key[0].toUpperCase() + key.slice(1), starValue: STAR_VALUES[key] }));
    }
    const gachaSkins = mutant.gachaSkins || window.MGG_GACHA_CONFIG?.[mutant.specimen] || [];
    gachaSkins.forEach(skin => options.push({
      key: `gacha_${skin.gachaId}`,
      label: skin.gachaId[0].toUpperCase() + skin.gachaId.slice(1),
      starValue: STAR_VALUES[skin.starKey] ?? 0,
      bonusGacha: Number(skin.bonus) || 0,
      imageSuffix: skin.gachaId
    }));
    return options;
  }

  function getOrbValue(entry) { return Number(entry?.value ?? entry?.orb?.value ?? 0) || 0; }
  function orbType(entry) {
    const category = String(entry?.category || '').toLowerCase();
    if (category.startsWith('basic_')) return category.slice(6);
    if (category.startsWith('special_')) return category.slice(8).replace(/^add/, '');
    const type = String(entry?.type || entry?.orb?.type || category).replace(/^special_/, '').toLowerCase();
    return type.replace(/^add/, '');
  }
  function orbMultiplier(orbs, type) { return 1 + orbs.filter(orb => orb.kind === 'basic' && orbType(orb) === type).reduce((sum, orb) => sum + getOrbValue(orb), 0) / 100; }

  function getAllowedBasicOrbTypes(specialType = '', baseAbilityType = '') {
    const baseTypes = ['attack', 'critical', 'life'];
    const normalizedBaseAbilityType = normalizeAbilityType(baseAbilityType);
    if (normalizedBaseAbilityType) baseTypes.push(normalizedBaseAbilityType);
    const rules = { addretaliate: ['retaliate'], addshield: ['shield'], addslash: ['slash'], addstrengthen: ['strengthen'], addweaken: ['weaken'], addregenerate: ['regenerate'], speed: [] };
    const normalizedSpecialType = String(specialType || '').toLowerCase().replace(/^special_/, '');
    const key = normalizedSpecialType.startsWith('add') ? normalizedSpecialType : `add${normalizedSpecialType}`;
    return [...new Set([...baseTypes, ...(rules[key] || [])])];
  }

  function applyOrbEffectsToStats(stats = {}, selectedOrbs = [], context = {}) {
    const special = selectedOrbs.find(orb => orb.kind === 'special');
    const specialType = orbType(special);
    const attackMultiplier = 1 + selectedOrbs.filter(orb => orb.kind === 'basic' && ['attack', 'critical'].includes(orbType(orb))).reduce((sum, orb) => sum + getOrbValue(orb), 0) / 100;
    const lifeMultiplier = orbMultiplier(selectedOrbs, 'life');
    const next = { ...stats, atk1F: Math.round((stats.atk1F || 0) * attackMultiplier), atk2F: Math.round((stats.atk2F || 0) * attackMultiplier), lifeF: Math.round((stats.lifeF || 0) * lifeMultiplier) };
    if (specialType === 'speed') {
      next.addedAbilityName = '';
      next.addedAbilityValue = 0;
      next.atk1AddedAbilityF = 0;
      next.atk2AddedAbilityF = 0;
      next.atk1BaseAbilityF = Math.round((stats.atk1AbilityF || 0) * attackMultiplier);
      next.atk2BaseAbilityF = Math.round((stats.atk2AbilityF || 0) * attackMultiplier);
      next.atk1TotalAbilityF = next.atk1BaseAbilityF;
      next.atk2TotalAbilityF = next.atk2BaseAbilityF;
      next.atk1AbilityF = next.atk1BaseAbilityF;
      next.atk2AbilityF = next.atk2BaseAbilityF;
      next.speedF = Number((Number(stats.speedF) * (1 + getOrbValue(special) / 100)).toFixed(2));
      return next;
    }
    const abilityTypes = ['regenerate', 'retaliate', 'shield', 'slash', 'strengthen', 'weaken'];
    const baseAbilityType = normalizeAbilityType(context.baseAbilityType);
    const baseBonus = selectedOrbs.filter(orb => orb.kind === 'basic' && orbType(orb) === baseAbilityType).reduce((sum, orb) => sum + getOrbValue(orb), 0);
    const addedBonus = selectedOrbs.filter(orb => orb.kind === 'basic' && abilityTypes.includes(orbType(orb)) && orbType(orb) === specialType).reduce((sum, orb) => sum + getOrbValue(orb), 0) + (specialType && specialType !== 'speed' ? getOrbValue(special) : 0);
    const baseAtk1Ability = Math.round((stats.atk1AbilityF || 0) * attackMultiplier) + Math.round((next.atk1F / 100) * baseBonus);
    const baseAtk2Ability = Math.round((stats.atk2AbilityF || 0) * attackMultiplier) + Math.round((next.atk2F / 100) * baseBonus);
    next.atk1BaseAbilityF = baseAtk1Ability;
    next.atk2BaseAbilityF = baseAtk2Ability;
    next.atk1AddedAbilityF = Math.round((next.atk1F / 100) * addedBonus);
    next.atk2AddedAbilityF = Math.round((next.atk2F / 100) * addedBonus);
    next.atk1TotalAbilityF = next.atk1BaseAbilityF + next.atk1AddedAbilityF;
    next.atk2TotalAbilityF = next.atk2BaseAbilityF + next.atk2AddedAbilityF;
    next.atk1AbilityF = next.atk1TotalAbilityF;
    next.atk2AbilityF = next.atk2TotalAbilityF;
    next.addedAbilityName = specialType && specialType !== 'speed' ? specialType[0].toUpperCase() + specialType.slice(1) : '';
    next.addedAbilityValue = addedBonus;
    if (specialType === 'speed') next.speedF = Number((Number(stats.speedF) * (1 + getOrbValue(special) / 100)).toFixed(2));
    return next;
  }

  function calculate(mutant, fameLevel = 1, skin = 'basic', bonusGacha = 0) {
    const normalizedFame = Math.max(1, Number.parseInt(fameLevel, 10) || 1);
    const skinOption = getSkinOptions(mutant).find(option => option.key === skin);
    const starValue = skinOption?.starValue ?? STAR_VALUES[skin] ?? 0;
    bonusGacha = skinOption?.bonusGacha ?? bonusGacha;
    const level = 100 + 10 * (normalizedFame - 1);
    const bonusStar = 100 + starValue;
    const attack1 = getAttackEvolutionState(mutant, normalizedFame, 1);
    const attack2 = getAttackEvolutionState(mutant, normalizedFame, 2);
    const life = Number(mutant.life) || 0;
    const speed = Number(mutant.speed) || 0;
    const appliesTo = mutant.appliesTo || 'both';
    const abilityPct1 = Number(mutant.abilityPct1) || 0;
    const abilityPct2 = Number(mutant.abilityPct2) || 0;
    const scale = (value) => Math.round(Math.abs(((value * (bonusGacha / 100) + value) * bonusStar * level * 100) / 1000000));
    const atk1F = attack1.value === null ? 0 : scale(attack1.value);
    const atk2F = attack2.value === null ? 0 : scale(attack2.value);
    const abilityNames = parseAbilities(mutant.abilities);
    const ability1 = Math.round(Math.abs((atk1F / 100) * abilityPct2));
    const ability2 = appliesTo === 'both' ? Math.round(Math.abs((atk2F / 100) * abilityPct2)) : 0;

    return {
      specimen: mutant.specimen,
      name: mutant.name,
      type: mutant.type,
      fameLevel: normalizedFame,
      level,
      lifeF: Math.round((life * (bonusStar - bonusGacha) * level * 100) / 1000000),
      speedF: speed > 0 ? (10 / (speed / 100)).toFixed(2) : 'No information',
      atk1F,
      atk2F,
      atk1AbilityF: ability1,
      atk2AbilityF: ability2,
      ability1Name: abilityNames['1'] || 'No information',
      ability2Name: appliesTo === 'both' ? (abilityNames['2'] || 'No information') : '',
      ability1Pct: abilityPct1,
      ability2Pct: abilityPct2,
      appliesTo,
      attack1State: attack1,
      attack2State: attack2,
      attack1Name: mutant.attack1p_name || 'No information',
      attack2Name: mutant.attack2p_name || 'No information'
    };
  }

  window.MGG_STATS = { STAR_VALUES, calculate, getSkinOptions, getAllowedBasicOrbTypes, applyOrbEffectsToStats, parseUnlockAttackEvents, getAttackEvolutionState, getDeclaredAttackState, normalizeAbilityType, formatOrbTypeLabel };
}());
