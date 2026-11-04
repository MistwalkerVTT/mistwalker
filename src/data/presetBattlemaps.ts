import forestRuinsImg from '../assets/images/forest_ruins_map_1788900106491.jpg';
import subterraneanMazeImg from '../assets/images/subterranean_maze_map_1788900151367.jpg';
import skeletonCryptImg from '../assets/images/skeleton_crypt_map_1788900167836.jpg';
import lavapitImg from '../assets/images/lavapit_map_1788900183173.jpg';

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
