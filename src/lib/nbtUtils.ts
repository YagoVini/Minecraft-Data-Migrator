import * as nbt from 'prismarine-nbt';
import { Buffer } from 'buffer';
import { gzip } from 'zlib';

export interface PlayerData {
  uuid: string;
  name: string;
  inventory: any[];
  armor: any[];
  offhand: any | null;
  enderItems: any[];
  xpLevel: number;
  xpP: number;
  xpTotal: number;
  foodLevel: number;
  health: number;
  modTags: string[];
  raw: any;
}

const VANILLA_TAGS = [
  'Inventory', 'EnderItems', 'XpLevel', 'XpP', 'XpTotal', 'XpSeed', 'foodLevel', 
  'foodExhaustionLevel', 'foodSaturationLevel', 'foodTickCount', 'Health', 
  'Attributes', 'UUID', 'UUIDMost', 'UUIDLeast', 'Dimension', 'Pos', 'Rotation', 
  'Motion', 'OnGround', 'FallDistance', 'Fire', 'Air', 'DeathTime', 'HurtTime', 
  'Invulnerable', 'PortalCooldown', 'Abilities', 'recipeBook', 'seenRecipes', 
  'Score', 'DataVersion', 'SleepTimer', 'SpawnX', 'SpawnY', 'SpawnZ', 
  'SpawnForced', 'SelectedItemSlot', 'SelectedItem', 'ActiveEffects', 'playerGameType'
];

export async function parseNBT(file: File): Promise<PlayerData> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const { parsed } = await nbt.parse(buffer);
  
  const data = parsed.value;
  const uuidStr = getUUIDString(data);
  let name = 'Desconhecido';
  
  try {
    const res = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuidStr.replace(/-/g, '')}`);
    if (res.ok) {
      const profile = await res.json();
      name = profile.name;
    }
  } catch (e) {
    console.warn('Could not fetch name for UUID:', uuidStr);
  }

  const modTags = Object.keys(data).filter(key => !VANILLA_TAGS.includes(key));
  
  // Map inventory to correct slots
  const rawInv = data.Inventory?.value;
  const mappedInv = new Array(36).fill(null);
  const armor = new Array(4).fill(null); // 0: Boots, 1: Leggings, 2: Chest, 3: Helm
  let offhand = null;
  
  if (Array.isArray(rawInv)) {
    rawInv.forEach(item => {
      const slot = item.Slot?.value;
      if (slot >= 0 && slot <= 35) {
        mappedInv[slot] = item;
      } else if (slot >= 100 && slot <= 103) {
        armor[slot - 100] = item;
      } else if (slot === -106) {
        offhand = item;
      }
    });
  }

  const enderItems = Array.isArray(data.EnderItems?.value) ? data.EnderItems.value : [];

  return {
    uuid: uuidStr,
    name: name,
    inventory: mappedInv,
    armor: armor,
    offhand: offhand,
    enderItems: enderItems,
    xpLevel: (data.XpLevel?.value || 0) as number,
    xpP: (data.XpP?.value || 0) as number,
    xpTotal: (data.XpTotal?.value || 0) as number,
    foodLevel: (data.foodLevel?.value || 0) as number,
    health: (data.Health?.value || 0) as number,
    modTags: modTags,
    raw: parsed
  };
}

function getUUIDString(data: any): string {
  try {
    if (data.UUID) {
      const ints = data.UUID.value;
      const buffer = Buffer.alloc(16);
      for (let i = 0; i < 4; i++) {
        buffer.writeInt32BE(ints[i], i * 4);
      }
      const hex = buffer.toString('hex');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    } else if (data.UUIDMost && data.UUIDLeast) {
      const most = BigInt(data.UUIDMost.value);
      const least = BigInt(data.UUIDLeast.value);
      const buffer = Buffer.alloc(16);
      buffer.writeBigInt64BE(most, 0);
      buffer.writeBigInt64BE(least, 8);
      const hex = buffer.toString('hex');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  } catch (e) {
    console.error('Error parsing UUID:', e);
  }
  return '00000000-0000-0000-0000-000000000000';
}

export interface TransferOptions {
  inventory: boolean;
  enderItems: boolean;
  xp: boolean;
  stats: boolean;
  uuid: boolean;
  mods: boolean; 
}

export async function transferData(donor: PlayerData, target: PlayerData, options: TransferOptions): Promise<Buffer> {
  // Deep clone using the library itself to preserve all NBT types (TypedArrays, etc)
  const tempBuffer = nbt.writeUncompressed(target.raw);
  const { parsed: result } = await nbt.parse(tempBuffer);
  
  const donorData = donor.raw.value;
  const targetData = result.value;

  if (options.inventory) {
    if (donorData.Inventory) {
      targetData.Inventory = donorData.Inventory;
    }
  }

  if (options.enderItems) {
    if (donorData.EnderItems) {
      targetData.EnderItems = donorData.EnderItems;
    }
  }

  if (options.xp) {
    ['XpLevel', 'XpP', 'XpTotal', 'XpSeed'].forEach(tag => {
      if (donorData[tag]) targetData[tag] = donorData[tag];
    });
  }

  if (options.stats) {
    ['foodLevel', 'foodExhaustionLevel', 'foodSaturationLevel', 'foodTickCount', 'Health', 'Attributes'].forEach(tag => {
      if (donorData[tag]) targetData[tag] = donorData[tag];
    });
  }

  if (options.mods) {
    donor.modTags.forEach(tag => {
      if (donorData[tag]) {
        targetData[tag] = donorData[tag];
      }
    });
  }

  if (options.uuid) {
    if (donorData.UUID) targetData.UUID = donorData.UUID;
    if (donorData.UUIDMost) {
      targetData.UUIDMost = donorData.UUIDMost;
      targetData.UUIDLeast = donorData.UUIDLeast;
    }
  }

  // Use gzip compression for the output buffer, as standard playerdata is compressed
  const uncompressedBuffer = nbt.writeUncompressed(result);
  return new Promise((resolve, reject) => {
    gzip(uncompressedBuffer, (err, compressed) => {
      if (err) reject(err);
      else resolve(compressed);
    });
  });
}
