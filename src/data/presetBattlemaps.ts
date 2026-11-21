const tutorialDungeonPrisonImg = '/assets/maps/tutorial_dungeon_prison.jpg';
const forestRuinsImg = '/assets/maps/forest_ruins_map_1788900106491.jpg';
const subterraneanMazeImg = '/assets/maps/subterranean_maze_map_1788900151367.jpg';
const skeletonCryptImg = '/assets/maps/skeleton_crypt_map_1788900167836.jpg';
const lavapitImg = '/assets/maps/lavapit_map_1788900183173.jpg';

export interface PresetBattlemap {
  id: string;
  name: string;
  url: string;
  type: string;
  desc: string;
  thumbnailUrl?: string;
  isCustomUploaded?: boolean;
  mapWidth?: number;
  mapHeight?: number;
  gridSize?: number;
  gridCols?: number;
  gridRows?: number;
  arenaTitle?: string;
}

export const PRESET_BATTLEMAPS: PresetBattlemap[] = [
  {
    id: 'tutorial-dungeon-prison',
    name: 'The Ironbound Cellblock (Tutorial)',
    url: tutorialDungeonPrisonImg,
    thumbnailUrl: tutorialDungeonPrisonImg,
    type: 'Dungeon / Cellblock',
    desc: 'Subterranean stone prison cellblock with 12 iron-barred cells, descending wooden stairs, and a glowing crimson brazier altar — ideal for walls, doors, and room zones',
    mapWidth: 1024,
    mapHeight: 576,
    gridSize: 45,
    gridCols: 22,
    gridRows: 13
  },
  {
    id: 'forest-ruins',
    name: 'Forest Ruins',
    url: forestRuinsImg,
    thumbnailUrl: forestRuinsImg,
    type: 'Wilderness / Ruins',
    desc: 'Ancient moss-covered stone shrine with glowing green druidic runes, overgrown tree roots, and mystical forest clearing',
    mapWidth: 1376,
    mapHeight: 768,
    gridSize: 60,
    gridCols: 23,
    gridRows: 13
  },
  {
    id: 'subterranean-maze',
    name: 'Subterranean Maze',
    url: subterraneanMazeImg,
    thumbnailUrl: subterraneanMazeImg,
    type: 'Subterranean / Sewers',
    desc: 'Flooded ancient temple ruins, submerged stone columns, wooden bridges, and a brick sewer labyrinth',
    mapWidth: 1264,
    mapHeight: 848,
    gridSize: 60,
    gridCols: 21,
    gridRows: 14
  },
  {
    id: 'skeleton-crypt',
    name: 'Skeleton Crypt',
    url: skeletonCryptImg,
    thumbnailUrl: skeletonCryptImg,
    type: 'Crypt / Catacombs',
    desc: 'Octagonal catacomb sanctuary with stacked skull pillars, ornate central sarcophagus, and skeletal remains',
    mapWidth: 1264,
    mapHeight: 848,
    gridSize: 60,
    gridCols: 21,
    gridRows: 14
  },
  {
    id: 'lavapit',
    name: 'Lavapit',
    url: lavapitImg,
    thumbnailUrl: lavapitImg,
    type: 'Cavern / Boss',
    desc: 'Active volcanic magma caverns with boiling lava streams and a slumbering red dragon atop a hoard of gold',
    mapWidth: 1376,
    mapHeight: 768,
    gridSize: 60,
    gridCols: 23,
    gridRows: 13
  }
];
