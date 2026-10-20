import guildhouseMainLevelImg from '../assets/images/guildhouse_main_level.jpg';
import guildhouse2ndFloorImg from '../assets/images/guildhouse_2nd_floor.jpg';
import { Campaign, Scene, Chapter, SceneToken } from '../lib/firebase';
import { RoomAnnotation, WallSegment, ChapterPdfDigest } from '../types';

/**
 * Prebuilt Demo Campaign: "The Guild House - Main Level"
 * Adventure: Keys from the Golden Vault - Chapter: Masterpiece Imbroglio
 * Location: The Agile Hand Thieves' Guildhouse
 */

export const DEMO_GV_WALLS: WallSegment[] = [
  {
    "p2": {
      "x": 1417.76269034375,
      "y": 817.2748290000001
    },
    "id": "wall_1788911901083_k2ac",
    "wallType": "normal",
    "p1": {
      "y": 292.89277299999975,
      "x": 1419.53425134375
    }
  },
  {
    "id": "wall_1788911902501_ylsz",
    "p2": {
      "x": 1534.6857163437498,
      "y": 815.503268
    },
    "wallType": "normal",
    "p1": {
      "y": 817.2748290000001,
      "x": 1417.76269034375
    }
  },
  {
    "id": "wall_1788911908948_cglr",
    "doorState": "closed",
    "wallType": "door",
    "p2": {
      "x": 1651.6087423437498,
      "y": 811.960146
    },
    "p1": {
      "y": 815.503268,
      "x": 1534.6857163437498
    }
  },
  {
    "p2": {
      "x": 2264.5688483437502,
      "y": 817.2748290000001
    },
    "id": "wall_1788911920210_7ofm",
    "wallType": "normal",
    "p1": {
      "x": 1651.6087423437498,
      "y": 811.960146
    }
  },
  {
    "wallType": "normal",
    "p2": {
      "y": 868.6500980000001,
      "x": 2264.5688483437502
    },
    "id": "wall_1788911922722_ds38",
    "p1": {
      "y": 817.2748290000001,
      "x": 2264.5688483437502
    }
  },
  {
    "p1": {
      "x": 2264.5688483437502,
      "y": 868.6500980000001
    },
    "p2": {
      "y": 870.4216590000001,
      "x": 2386.8065573437502
    },
    "id": "wall_1788911925043_3b2t",
    "wallType": "normal"
  },
  {
    "p1": {
      "x": 1419.9945353437497,
      "y": 294.6550169999996
    },
    "id": "wall_1788911954907_gl0n",
    "p2": {
      "x": 1441.7745353437497,
      "y": 294.6550169999996
    },
    "wallType": "normal"
  },
  {
    "id": "wall_1788911960914_t9a5",
    "doorState": "closed",
    "wallType": "door",
    "p2": {
      "x": 1502.27453534375,
      "y": 295.8650169999996
    },
    "p1": {
      "y": 294.6550169999996,
      "x": 1441.7745353437497
    }
  },
  {
    "id": "wall_1788911965495_00ns",
    "p2": {
      "x": 1701.9245353437498,
      "y": 298.28501699999964
    },
    "p1": {
      "x": 1502.27453534375,
      "y": 295.8650169999996
    },
    "wallType": "normal"
  },
  {
    "wallType": "door",
    "id": "wall_1788911970147_ynu1",
    "doorState": "closed",
    "p2": {
      "y": 297.07501699999966,
      "x": 1773.3145353437499
    },
    "p1": {
      "y": 298.28501699999964,
      "x": 1701.9245353437498
    }
  },
  {
    "wallType": "normal",
    "id": "wall_1788911979210_es8z",
    "p2": {
      "x": 2265.78453534375,
      "y": 298.28501699999964
    },
    "p1": {
      "y": 297.07501699999966,
      "x": 1773.3145353437499
    }
  },
  {
    "p1": {
      "x": 2265.78453534375,
      "y": 298.28501699999964
    },
    "p2": {
      "y": 186.9650169999996,
      "x": 2265.78453534375
    },
    "id": "wall_1788911984752_sydw",
    "wallType": "normal"
  },
  {
    "p2": {
      "x": 2387.99453534375,
      "y": 185.75501699999958
    },
    "id": "wall_1788912020635_rcji",
    "p1": {
      "x": 2265.78453534375,
      "y": 186.9650169999996
    },
    "wallType": "normal"
  },
  {
    "p2": {
      "x": 2550.13453534375,
      "y": 185.75501699999958
    },
    "p1": {
      "x": 2387.99453534375,
      "y": 185.75501699999958
    },
    "wallType": "door",
    "doorState": "closed",
    "id": "wall_1788912025756_u4he"
  },
  {
    "id": "wall_1788912030187_kjvi",
    "p2": {
      "y": 188.17501699999957,
      "x": 2668.71453534375
    },
    "wallType": "normal",
    "p1": {
      "x": 2550.13453534375,
      "y": 185.75501699999958
    }
  },
  {
    "p1": {
      "y": 188.17501699999957,
      "x": 2668.71453534375
    },
    "wallType": "normal",
    "p2": {
      "y": 948.0550169999999,
      "x": 2672.34453534375
    },
    "id": "wall_1788912046529_g35b"
  },
  {
    "p1": {
      "x": 2672.34453534375,
      "y": 948.0550169999999
    },
    "wallType": "normal",
    "id": "wall_1788912061072_uy96",
    "p2": {
      "y": 1216.675017,
      "x": 2668.71453534375
    }
  },
  {
    "p2": {
      "x": 2266.99453534375,
      "y": 1209.415017
    },
    "wallType": "normal",
    "id": "wall_1788912063425_ydag",
    "p1": {
      "y": 1216.675017,
      "x": 2668.71453534375
    }
  },
  {
    "p2": {
      "y": 1035.1750169999998,
      "x": 2264.57453534375
    },
    "id": "wall_1788912068690_x8tk",
    "p1": {
      "x": 2266.99453534375,
      "y": 1209.415017
    },
    "wallType": "normal"
  },
  {
    "wallType": "normal",
    "p1": {
      "y": 1035.1750169999998,
      "x": 2264.57453534375
    },
    "id": "wall_1788912071480_0kv5",
    "p2": {
      "y": 1033.965017,
      "x": 2385.57453534375
    }
  },
  {
    "id": "wall_1788912088131_qnyv",
    "p2": {
      "x": 2266.9945353437497,
      "y": 359.9950169999997
    },
    "p1": {
      "y": 297.07501699999966,
      "x": 2264.57453534375
    },
    "wallType": "normal"
  },
  {
    "p1": {
      "x": 1776.9445353437497,
      "y": 297.07501699999966
    },
    "id": "wall_1788912106405_yd1b",
    "p2": {
      "x": 1775.7345353437497,
      "y": 350.31501699999967
    },
    "wallType": "normal"
  },
  {
    "p1": {
      "y": 350.31501699999967,
      "x": 1775.7345353437497
    },
    "p2": {
      "x": 1775.7345353437497,
      "y": 428.96501699999965
    },
    "wallType": "door",
    "doorState": "closed",
    "id": "wall_1788912112139_nx9n"
  },
  {
    "wallType": "normal",
    "p1": {
      "y": 428.96501699999965,
      "x": 1775.7345353437497
    },
    "id": "wall_1788912120332_yix4",
    "p2": {
      "y": 811.3250169999998,
      "x": 1779.3645353437498
    }
  },
  {
    "p1": {
      "y": 470.10501699999963,
      "x": 1774.52453534375
    },
    "wallType": "normal",
    "id": "wall_1788912129340_dq9o",
    "p2": {
      "y": 472.5250169999997,
      "x": 1682.5645353437499
    }
  },
  {
    "id": "wall_1788912140280_m17v",
    "doorState": "closed",
    "p1": {
      "y": 472.5250169999997,
      "x": 1682.5645353437499
    },
    "wallType": "door",
    "p2": {
      "x": 1599.0745353437496,
      "y": 472.5250169999997
    }
  },
  {
    "wallType": "normal",
    "p1": {
      "x": 1599.0745353437496,
      "y": 472.5250169999997
    },
    "id": "wall_1788912145769_wy04",
    "p2": {
      "y": 470.10501699999963,
      "x": 1417.5745353437496
    }
  },
  {
    "p1": {
      "x": 1532.5245353437497,
      "y": 470.10501699999963
    },
    "wallType": "normal",
    "id": "wall_1788912155484_w5bs",
    "p2": {
      "y": 361.20501699999966,
      "x": 1530.1045353437496
    }
  },
  {
    "wallType": "normal",
    "p1": {
      "x": 1530.1045353437496,
      "y": 361.20501699999966
    },
    "p2": {
      "x": 1694.6645353437498,
      "y": 364.83501699999965
    },
    "id": "wall_1788912159009_t8k5"
  },
  {
    "wallType": "normal",
    "id": "wall_1788912167873_k505",
    "p2": {
      "x": 1693.4545353437497,
      "y": 298.2850169999996
    },
    "p1": {
      "y": 364.83501699999965,
      "x": 1694.6645353437498
    }
  },
  {
    "wallType": "normal",
    "p1": {
      "x": 1105.3945353437496,
      "y": 1047.275017
    },
    "p2": {
      "x": 850.0845353437495,
      "y": 1209.4150169999998
    },
    "id": "wall_1788912187449_0e5t"
  },
  {
    "p2": {
      "x": 782.3245353437495,
      "y": 1088.4150169999998
    },
    "id": "wall_1788912190056_3oim",
    "p1": {
      "y": 1209.4150169999998,
      "x": 850.0845353437495
    },
    "wallType": "normal"
  },
  {
    "wallType": "door",
    "id": "wall_1788912194051_zr15",
    "p1": {
      "x": 782.3245353437495,
      "y": 1088.4150169999998
    },
    "doorState": "closed",
    "p2": {
      "y": 1025.4950169999997,
      "x": 749.6545353437494
    }
  },
  {
    "id": "wall_1788912201786_ntf7",
    "p2": {
      "y": 667.3350169999998,
      "x": 550.0045353437494
    },
    "wallType": "normal",
    "p1": {
      "x": 749.6545353437494,
      "y": 1025.4950169999997
    }
  },
  {
    "p1": {
      "y": 667.3350169999998,
      "x": 550.0045353437494
    },
    "wallType": "normal",
    "p2": {
      "y": 507.6150169999997,
      "x": 835.5645353437495
    },
    "id": "wall_1788912208469_zrg9"
  },
  {
    "id": "wall_1788912212404_3by9",
    "wallType": "door",
    "p1": {
      "x": 835.5645353437495,
      "y": 507.6150169999997
    },
    "doorState": "closed",
    "p2": {
      "x": 905.7445353437495,
      "y": 471.31501699999967
    }
  },
  {
    "p2": {
      "y": 359.9950169999997,
      "x": 1101.7645353437497
    },
    "id": "wall_1788912220065_6hop",
    "p1": {
      "x": 905.7445353437495,
      "y": 471.31501699999967
    },
    "wallType": "normal"
  },
  {
    "p2": {
      "y": 779.8650169999999,
      "x": 1343.7645353437497
    },
    "id": "wall_1788912222887_g1we",
    "p1": {
      "x": 1101.7645353437497,
      "y": 359.9950169999997
    },
    "wallType": "normal"
  },
  {
    "id": "wall_1788912225606_oj3a",
    "p2": {
      "x": 1168.3145353437496,
      "y": 880.2950169999998
    },
    "wallType": "normal",
    "p1": {
      "x": 1343.7645353437497,
      "y": 779.8650169999999
    }
  },
  {
    "p1": {
      "x": 1168.3145353437496,
      "y": 880.2950169999998
    },
    "wallType": "normal",
    "id": "wall_1788912230399_2u75",
    "p2": {
      "y": 972.2550169999998,
      "x": 1221.5545353437496
    }
  },
  {
    "doorState": "closed",
    "wallType": "door",
    "p2": {
      "y": 1044.8550169999999,
      "x": 1112.6545353437496
    },
    "p1": {
      "x": 1221.5545353437496,
      "y": 972.2550169999998
    },
    "id": "wall_1788912238388_vvr9"
  },
  {
    "p1": {
      "x": 1112.6545353437496,
      "y": 1044.8550169999999
    },
    "wallType": "normal",
    "p2": {
      "y": 990.4050169999999,
      "x": 1073.9345353437498
    },
    "id": "wall_1788912247530_5aes"
  },
  {
    "doorState": "closed",
    "wallType": "door",
    "id": "wall_1788912252528_rq23",
    "p1": {
      "x": 1073.9345353437498,
      "y": 990.4050169999999
    },
    "p2": {
      "x": 1036.4245353437495,
      "y": 923.8550169999999
    }
  },
  {
    "p1": {
      "x": 1036.4245353437495,
      "y": 923.8550169999999
    },
    "wallType": "normal",
    "id": "wall_1788912256112_lnvd",
    "p2": {
      "x": 882.7545353437496,
      "y": 651.6050169999997
    }
  },
  {
    "doorState": "closed",
    "wallType": "door",
    "id": "wall_1788912262221_dr85",
    "p1": {
      "y": 651.6050169999997,
      "x": 882.7545353437496
    },
    "p2": {
      "x": 848.8745353437496,
      "y": 593.5250169999997
    }
  },
  {
    "wallType": "normal",
    "p1": {
      "y": 593.5250169999997,
      "x": 848.8745353437496
    },
    "p2": {
      "x": 808.9445353437495,
      "y": 525.7650169999997
    },
    "id": "wall_1788912265831_0rf0"
  },
  {
    "p1": {
      "x": 671.0045353437495,
      "y": 876.6650169999998
    },
    "wallType": "normal",
    "id": "wall_1788912274034_1x1w",
    "p2": {
      "y": 735.0950169999999,
      "x": 923.8945353437496
    }
  },
  {
    "wallType": "normal",
    "id": "wall_1788912286512_9fio",
    "p2": {
      "x": 1094.5045353437495,
      "y": 758.0850169999998
    },
    "p1": {
      "y": 589.8950169999997,
      "x": 994.0745353437496
    }
  },
  {
    "p1": {
      "x": 1133.2245353437497,
      "y": 835.5250169999998
    },
    "wallType": "normal",
    "p2": {
      "x": 1174.3645353437496,
      "y": 887.5550169999998
    },
    "id": "wall_1788912293396_weei"
  },
  {
    "p1": {
      "x": 923.8945353437496,
      "y": 462.8450169999997
    },
    "id": "wall_1788912299012_b5pn",
    "p2": {
      "x": 960.1945353437495,
      "y": 518.5050169999997
    },
    "wallType": "normal"
  },
  {
    "wallType": "normal",
    "p2": {
      "y": 920.9582769999997,
      "x": 617.2781153437493
    },
    "id": "wall_1788912319758_zsf8",
    "p1": {
      "y": 974.1051069999999,
      "x": 712.2982053437493
    }
  },
  {
    "id": "wall_1788912321926_wtts",
    "p2": {
      "x": 520.6475153437492,
      "y": 935.4528669999997
    },
    "wallType": "normal",
    "p1": {
      "y": 920.9582769999997,
      "x": 617.2781153437493
    }
  },
  {
    "id": "wall_1788912322758_jn4z",
    "p2": {
      "x": 465.8901753437492,
      "y": 974.1051069999999
    },
    "wallType": "normal",
    "p1": {
      "x": 520.6475153437492,
      "y": 935.4528669999997
    }
  },
  {
    "wallType": "normal",
    "p1": {
      "x": 465.8901753437492,
      "y": 974.1051069999999
    },
    "p2": {
      "y": 1035.3044869999999,
      "x": 411.1328353437492
    },
    "id": "wall_1788912324223_g8fq"
  },
  {
    "p1": {
      "y": 1035.3044869999999,
      "x": 411.1328353437492
    },
    "p2": {
      "y": 1107.7774369999997,
      "x": 388.5856953437492
    },
    "id": "wall_1788912325314_gnkt",
    "wallType": "normal"
  },
  {
    "wallType": "normal",
    "id": "wall_1788912326041_nyhq",
    "p2": {
      "x": 403.0802853437492,
      "y": 1181.8608969999998
    },
    "p1": {
      "y": 1107.7774369999997,
      "x": 388.5856953437492
    }
  },
  {
    "id": "wall_1788912326811_myex",
    "wallType": "normal",
    "p2": {
      "y": 1226.9551769999998,
      "x": 425.6274253437492
    },
    "p1": {
      "x": 403.0802853437492,
      "y": 1181.8608969999998
    }
  },
  {
    "wallType": "normal",
    "p2": {
      "y": 1281.712517,
      "x": 470.72170534374925
    },
    "id": "wall_1788912327667_v8mj",
    "p1": {
      "x": 425.6274253437492,
      "y": 1226.9551769999998
    }
  },
  {
    "wallType": "normal",
    "p1": {
      "x": 470.72170534374925,
      "y": 1281.712517
    },
    "p2": {
      "y": 1318.754247,
      "x": 535.1421053437492
    },
    "id": "wall_1788912329132_ov0r"
  },
  {
    "id": "wall_1788912330058_isbh",
    "p2": {
      "y": 1320.364757,
      "x": 620.4991353437492
    },
    "wallType": "normal",
    "p1": {
      "y": 1318.754247,
      "x": 535.1421053437492
    }
  },
  {
    "id": "wall_1788912331107_nt12",
    "p2": {
      "x": 717.1297353437494,
      "y": 1299.428127
    },
    "wallType": "normal",
    "p1": {
      "x": 620.4991353437492,
      "y": 1320.364757
    }
  },
  {
    "wallType": "normal",
    "p1": {
      "y": 1299.428127,
      "x": 717.1297353437494
    },
    "id": "wall_1788912332100_ia0w",
    "p2": {
      "x": 781.5501353437494,
      "y": 1218.902627
    }
  },
  {
    "p1": {
      "x": 781.5501353437494,
      "y": 1218.902627
    },
    "id": "wall_1788912332924_5dvh",
    "p2": {
      "x": 802.4867653437493,
      "y": 1160.9242669999999
    },
    "wallType": "normal"
  },
  {
    "p2": {
      "y": 1120.6615169999998,
      "x": 797.6552353437494
    },
    "id": "wall_1788912334370_h9j2",
    "wallType": "normal",
    "p1": {
      "y": 1160.9242669999999,
      "x": 802.4867653437493
    }
  }
];

export const DEMO_GV_ROOM_ZONES: RoomAnnotation[] = [
  {
    "dmNotes": "The stalls contain ten riding horses.\n\nCart. The dung-filled cart is a fire hazard. If the cart is pushed against a wall and set ablaze, the fire quickly spreads to the loft and ignites the hay there. After 1 minute, the smoke and panic of the horses put the guildhouse on high alert.\n\nFire. The Agile Hand isn't equipped to stop a fire that starts in the barn. Such a fire takes 1 minute to spread throughout the structure. After that, the fire moves 5 feet westward each minute until the whole east building is engulfed. After 5 minutes, the building collapses, and the stairs to the basement are buried in flaming debris. The west building is spared.\n\nLadders. A wooden ladder in each corner stall ascends to a trapdoor that leads to the hayloft (area G2b). The trapdoors are unlocked.",
    "sceneId": "scene_1788902673803_yz0d",
    "id": "zone_1792021979825_5rivw",
    "pdfSection": "The Guild House - Main Level",
    "roomName": "Livery Stables",
    "label": "g2a - Livery Stables",
    "color": "#f59e0b",
    "boxedText": "Ten horse stables and a hayloft line the walls of this barn, which has an open doorway at each end. Flies swarm around a full dung cart that exudes a horrible stench.",
    "polygonPoints": [
      76.95351750823257,
      14.466017398948082,
      77.11198173477824,
      81.43437748695655,
      87.33292434697584,
      80.77296158485275,
      87.49138857352153,
      16.450265105259447
    ],
    "hiddenMonsterNames": [],
    "bounds": {
      "x": 76.95351750823257,
      "y": 14.466017398948082,
      "height": 66.96836008800847,
      "width": 10.537871065288968
    },
    "roomNumber": "g2a",
    "monsters": [
      "10x Riding Horse"
    ],
    "campaignId": "camp-mtouse1g"
  },
  {
    "dmNotes": "The hayloft is 10 feet above the stables and consists of a 5-foot-wide wooden walkway that runs the perimeter of the building. Broad, square loading doors open in the north and south walls, each fitted with block-and-tackle rigs for hoisting hay bales and other supplies into the loft. Hay bales and burlap sacks stuffed with feed grains take up most of the space. A few pitchforks, ropes, and feed buckets lie scattered about the bales.\n\nStable Hand. A young stable hand named Needly Pitts (neutral, human commoner) lazes in the loft, supposedly guarding against horse thieves. He has nodded off but wakes if characters disturb the horses, make too much noise in the barn, or start a fire. In the event of trouble, Needly bangs a metal pail and yells for the stablemaster (see area G16), who takes 1 minute to arrive.",
    "sceneId": "scene_1788902673803_yz0d",
    "id": "zone_1792021979825_g2bloft",
    "pdfSection": "The Guild House - Main Level",
    "roomName": "Hayloft",
    "label": "g2b - Hayloft",
    "color": "#f59e0b",
    "boxedText": "",
    "polygonPoints": [
      76.95351750823257,
      14.466017398948082,
      77.11198173477824,
      32.5,
      87.49138857352153,
      32.5,
      87.49138857352153,
      14.466017398948082
    ],
    "hiddenMonsterNames": [],
    "bounds": {
      "x": 76.95351750823257,
      "y": 14.466017398948082,
      "height": 18.033982601051918,
      "width": 10.537871065288968
    },
    "roomNumber": "g2b",
    "monsters": [
      "1x Commoner (Needly Pitts)"
    ],
    "campaignId": "camp-mtouse1g"
  },
  {
    "dmNotes": "The door at the top of the stairs is unlocked and opens into area G14.\n\nJaymont the Sinner. The figure on the steps is Jaymont the Sinner, a doppelganger disguised as a drunken guest. Only Guildmaster Dusk knows Jaymont's true nature. The doppelganger pretends to be asleep, but a character can discern that it's awake with a successful DC 15 Wisdom (Insight) check. Jaymont doesn't start fights it knows it can't win and allows intruders to pass by. When the intruders are gone, Jaymont taps three times on the staircase wall to alert Gwish in area G21, then slinks away to alert Guildmaster Dusk in area G26.\n\nMaster Key. Jaymont carries a master key that unlocks all doors in the guildhouse complex.",
    "sceneId": "scene_1788902673803_yz0d",
    "id": "zone_1792022019803_g3stair",
    "pdfSection": "The Guild House - Main Level",
    "roomName": "Staircase",
    "label": "g3 - Staircase",
    "color": "#f59e0b",
    "boxedText": "Halfway up this flight of stairs is a sleeping figure wrapped in a wool blanket. A door is situated at the top of the stairs.",
    "polygonPoints": [
      54.5,
      51.5,
      60.0,
      51.5,
      60.0,
      59.0,
      54.5,
      59.0
    ],
    "hiddenMonsterNames": [],
    "bounds": {
      "x": 54.5,
      "y": 51.5,
      "height": 7.5,
      "width": 5.5
    },
    "roomNumber": "g3",
    "monsters": [
      "1x Doppelganger (Jaymont the Sinner)"
    ],
    "campaignId": "camp-mtouse1g"
  },
  {
    "dmNotes": "The shop has two access points: the stables to the east and a door to the west that leads to area G7.\n\nTreasure. Characters can assemble one set of leatherworker's tools from the tools stored here.",
    "sceneId": "scene_1788902673803_yz0d",
    "roomNumber": "g4",
    "monsters": [],
    "campaignId": "camp-mtouse1g",
    "label": "g4 - Cartwright's Workshop",
    "color": "#f59e0b",
    "hiddenMonsterNames": [],
    "id": "zone_1792021989421_hb652",
    "pdfSection": "The Guild House - Main Level",
    "bounds": {
      "y": 23.064424126297318,
      "width": 14.73717306875001,
      "height": 32.07867125203368,
      "x": 60.31477372093414
    },
    "polygonPoints": [
      74.89348256313846,
      23.064424126297318,
      75.05194678968415,
      54.64703345175317,
      60.31477372093414,
      55.143095378331,
      60.47323794747985,
      23.725840028401105
    ],
    "roomName": "Cartwright's Workshop",
    "boxedText": "Three carts occupy this room. Pegs and hooks on the inner walls bear ropes, tackle, leather harnesses, wheels, and leatherworking tools. Shoved into a corner is a crate filled with horseshoes. Nearby, shelves hold smaller boxes filled with buckles, nails, cotter pins, and miscellaneous hardware."
  },
  {
    "boxedText": "A wooden countertop divides the room. Signboards display services and fees for stabling and room rentals. Two keys hang from hooks on the east wall above the counter. A third hook is bare.",
    "polygonPoints": [
      58.88859568202286,
      34.96991036416549,
      48.11302827691532,
      34.3084944620617,
      48.27149250346102,
      56.300573207012626,
      59.284756248387104,
      55.639157304908835
    ],
    "campaignId": "camp-mtouse1g",
    "roomName": "Livery Office",
    "roomNumber": "g5",
    "bounds": {
      "height": 21.992078744950923,
      "y": 34.3084944620617,
      "x": 48.11302827691532,
      "width": 11.171727971471782
    },
    "sceneId": "scene_1788902673803_yz0d",
    "dmNotes": "When the office is staffed, a visitor can secure an upstairs bed for 5 cp per night (5 sp for a private room). Accommodations can also be made in the stables for a traveler's mount at a cost of 1 sp per night.\n\nCoin Box. Tucked behind the counter is a wooden coin box with a copper clasp. A character who inspects the coin box before opening it notices a row of tiny pinholes in the lid. The coin box contains 15 cp and 11 sp, as well as a spider.\n\nKeys. The two keys hanging on the wall unlock the doors to areas G17 and G18, respectively.\n\nSecret Door. A secret door in the office's back wall leads to area G6.",
    "monsters": [
      "1x Spider"
    ],
    "id": "zone_1792021998827_xawwx",
    "hiddenMonsterNames": [],
    "label": "g5 - Livery Office",
    "color": "#f59e0b",
    "pdfSection": "The Guild House - Main Level"
  },
  {
    "monsters": [],
    "id": "zone_1792022009875_4nkup",
    "color": "#f59e0b",
    "label": "g7 - Service Entrance",
    "pdfSection": "The Guild House - Main Level",
    "boxedText": "Hanging on the walls of this small, muddy room are several riding cloaks, bits and harnesses, oil lanterns, and coils of rope.",
    "polygonPoints": [
      58.80936356875001,
      22.733716175245426,
      57.46241764311157,
      22.40300822419353,
      57.38318552983871,
      27.528981465497882,
      52.5500266201949,
      27.03291953892004,
      52.2330981671035,
      31.8281848291725,
      59.284756248387104,
      32.15889278022439
    ],
    "roomName": "Service Entrance",
    "dmNotes": "Guild members store their riding gear here. A search of the room yields nothing of great value.",
    "sceneId": "scene_1788902673803_yz0d",
    "bounds": {
      "height": 9.75588455603086,
      "width": 7.051658081283605,
      "x": 52.2330981671035,
      "y": 22.40300822419353
    },
    "campaignId": "camp-mtouse1g",
    "hiddenMonsterNames": [],
    "roomNumber": "g7"
  },
  {
    "monsters": [],
    "roomNumber": "g6",
    "boxedText": "A wooden staircase in the northeast corner of this empty, boarded-up room leads to the basement.",
    "sceneId": "scene_1788902673803_yz0d",
    "dmNotes": "The stairs descend 15 feet to area G28.",
    "label": "g6 - Basement Staircase",
    "color": "#f59e0b",
    "id": "zone_1792022019803_k2wff",
    "campaignId": "camp-mtouse1g",
    "hiddenMonsterNames": [],
    "roomName": "Basement Staircase",
    "pdfSection": "The Guild House - Main Level",
    "bounds": {
      "height": 10.086592507082756,
      "x": 48.35072461673387,
      "width": 7.606282874193553,
      "y": 21.90694629761569
    },
    "polygonPoints": [
      50.886152241465055,
      31.993538804698446,
      48.35072461673387,
      31.497476878120604,
      48.35072461673387,
      22.237654248667585,
      55.957007490927424,
      21.90694629761569,
      55.957007490927424,
      24.88331785708273,
      50.72768801491936,
      24.221901954978943
    ]
  },
  {
    "roomNumber": "g8",
    "id": "zone_1792022028575_0en18",
    "roomName": "Courtyard",
    "sceneId": "scene_1788902673803_yz0d",
    "dmNotes": "The well is 30 feet deep and has fresh water filling its bottom 5 feet. The well's winch and rope are sturdy enough to bear 250 pounds of weight.",
    "campaignId": "camp-mtouse1g",
    "polygonPoints": [
      45.02297585927419,
      20.41876051788217,
      41.37829864872312,
      23.89119400392705,
      42.24985189472446,
      37.94628192363253,
      46.29068967163978,
      39.765175654417945,
      46.29068967163978,
      26.536857612342203
    ],
    "monsters": [],
    "pdfSection": "The Guild House - Main Level",
    "boxedText": "A cobblestone courtyard is wedged between the two main buildings of the guildhouse. Situated in the middle of the yard is a stone well rigged with a simple bucket winch.",
    "label": "g8 - Courtyard",
    "color": "#f59e0b",
    "bounds": {
      "width": 4.912391022916665,
      "y": 20.41876051788217,
      "x": 41.37829864872312,
      "height": 19.346415136535775
    },
    "hiddenMonsterNames": []
  },
  {
    "roomName": "Conference Room",
    "pdfSection": "The Guild House - Main Level",
    "id": "zone_1792022038513_xp3dq",
    "bounds": {
      "height": 32.40937920308558,
      "width": 11.726352764381737,
      "x": 32.34583773561827,
      "y": 27.363627489971936
    },
    "hiddenMonsterNames": [],
    "campaignId": "camp-mtouse1g",
    "boxedText": "This room contains several unmatched chairs situated around a long oak table scarred with knife marks. On the table sits a half-eaten cheese wheel, four clay wine jugs, and some wine-stained flagons.",
    "polygonPoints": [
      44.072190500000005,
      54.31632550070127,
      39.080567363810474,
      59.77300669305752,
      32.34583773561827,
      32.32424675575034,
      37.25822875853494,
      27.363627489971936
    ],
    "roomNumber": "g9",
    "sceneId": "scene_1788902673803_yz0d",
    "dmNotes": "Guildmaster Dusk holds meetings here.",
    "monsters": [],
    "color": "#f59e0b",
    "label": "g9 - Conference Room"
  },
  {
    "boxedText": "A long, well-trafficked hall runs the width of the house. A staircase along the west wall leads to the second floor.",
    "monsters": [],
    "dmNotes": "Visitors who try to enter this hall through the north door must contend with a trap.\n\nBack-Door Trap. The northernmost door has a \"No Trespassers!\" sign hanging on the outside of it and is nailed shut on the inside (a fact not discernable from the outside). As an action, a character can try to force open the door using brute strength, doing so with a successful DC 13 Strength (Athletics) check. Breaking down the door puts the guildhouse on high alert unless a silence spell or similar magic is used to muffle the noise.\n\nA character who searches the door for traps can make a DC 12 Wisdom (Perception) check. If the check is successful, the character notices that the doorknob is loose and attached to a vial of poison gas hidden in the door itself. As an action, a character can try to disable the trap using thieves' tools, doing so with a successful DC 15 Dexterity check.\n\nUnless the trap is disabled, tugging or turning the knob causes the vial in the door to break, releasing a cloud of poisonous gas that fills a 10-foot-radius sphere centered on the door. The trap also triggers if the door is forced open. Each creature in the trap's area must make a DC 14 Constitution saving throw. On a failed save, the creature takes 16 (3d10) poison damage and is poisoned for 1 minute; on a successful save, the creature takes half as much damage and isn't poisoned. The trap can be triggered only once.\n\nEntering the Hall. Use the following boxed text to describe the hallway:\n\nA long, well-trafficked hall runs the width of the house. A staircase along the west wall leads to the second floor.\n\nThe stairs climb 15 feet to area G23.",
    "sceneId": "scene_1788902673803_yz0d",
    "pdfSection": "The Guild House - Main Level",
    "id": "zone_1792022050604_mr7bl",
    "label": "g10 - Main Hall",
    "color": "#f59e0b",
    "roomName": "Main Hall",
    "roomNumber": "g10",
    "bounds": {
      "x": 28.304999958702943,
      "height": 36.21252064018236,
      "width": 11.567888537836026,
      "y": 34.47384843758765
    },
    "hiddenMonsterNames": [],
    "polygonPoints": [
      39.87288849653897,
      67.54464354277701,
      37.49592509835349,
      70.68636907777001,
      28.304999958702943,
      38.276989874684425,
      30.919659696706976,
      34.47384843758765
    ],
    "campaignId": "camp-mtouse1g"
  },
  {
    "roomNumber": "g1",
    "monsters": [],
    "polygonPoints": [
      48.82611729637097,
      61.26119247279104,
      46.369921784912634,
      55.80451128043479,
      40.34828117617607,
      62.08796235042077,
      42.6460124610887,
      71.18243100434785
    ],
    "color": "#f59e0b",
    "label": "g1 - Front Porch",
    "sceneId": "scene_1788902673803_yz0d",
    "dmNotes": "Any character who approaches the porch in plain view is spotted by the bandit on the south balcony (area G22), who calls out, \"Hey, you, get lost! Can't you read the signs?\" If this warning is ignored, the lookout shouts the same thing again, putting the guildhouse on high alert, then shoots a crossbow bolt into the ground near the character's feet as a final warning.\n\nDrop Box. The staircase in front of the double door to area G10 has a loose plank near the top. This plank conceals a drop box where visitors stash black-market goods, fenced items, and guild tributes. Any character who lifts the plank sees a dusty satchel in the drop box. The satchel contains 25 sp and a piece of parchment that transfers ownership of two horses to Guildmaster Dusk.",
    "bounds": {
      "width": 8.477836120194894,
      "height": 15.37791972391306,
      "x": 40.34828117617607,
      "y": 55.80451128043479
    },
    "campaignId": "camp-mtouse1g",
    "boxedText": "Nailed to this lengthy porch are short planks that bear the words \"Private Property. No Trespassing!\" in Common. A lookout is stationed on a second-floor balcony above the western end of the porch.",
    "roomName": "Front Porch",
    "pdfSection": "The Guild House - Main Level",
    "id": "zone_1792022067958_b9eqe",
    "hiddenMonsterNames": []
  },
  {
    "campaignId": "camp-mtouse1g",
    "monsters": [
      "3x Thug",
      "1x Gladiator"
    ],
    "sceneId": "scene_1788902673803_yz0d",
    "dmNotes": "The four guild members have been drinking and playing card games. The motley crew consists of three thugs and one gladiator. The thugs are poisoned and unconscious, while the gladiator is merely poisoned and spoiling for a fight. The unconscious condition ends on a thug who is wounded, knocked out of their chair, or splashed with a pint or more of liquid.\n\nBlue Chair. The blue chair in the south corner covers a secret trapdoor in the stone floor. A character who examines the floor near the chair can make a DC 10 Wisdom (Perception) check, finding the trapdoor on a success. Pulling open the trapdoor reveals a wooden ladder that descends 15 feet to area G37.\n\nTreasure. The coins on the table amount to 65 cp, 35 sp, and 11 gp.",
    "hiddenMonsterNames": [],
    "bounds": {
      "y": 52.9934936964937,
      "x": 23.234144709240574,
      "height": 30.59048547230016,
      "width": 13.469459256384418
    },
    "boxedText": "This room contains a fireplace, a tattered couch, and several upholstered chairs, one of which is bright blue. Playing cards and coins lie scattered across a table. Slumped around the table are four drunken guild members clutching empty mugs and reeking of ale.",
    "polygonPoints": [
      30.76119547016128,
      52.9934936964937,
      23.234144709240574,
      61.922608374894814,
      28.62192841179434,
      83.58397916879386,
      36.70360396562499,
      72.33990883302947
    ],
    "id": "zone_1792022079006_0nah8",
    "roomNumber": "g12",
    "roomName": "Parlor",
    "color": "#f59e0b",
    "label": "g12 - Parlor",
    "pdfSection": "The Guild House - Main Level"
  },
  {
    "pdfSection": "The Guild House - Main Level",
    "id": "zone_1792022089501_4ejj2",
    "monsters": [],
    "bounds": {
      "y": 38.60769782573632,
      "x": 19.510235385416642,
      "width": 10.934031631653234,
      "height": 21.496016818373093
    },
    "boxedText": "A cooking hearth occupies one corner of this kitchen, and nets holding dried sausages, cheese, peppers, and garlic hang from the rafters. Other items found here include a butcher's block, a table for preparing meals, a pail of potatoes, a few cast-iron pots, a sack of flour, a tin filled with cooking utensils, a block of salt, and a knife with a cutting board.",
    "roomName": "Kitchen",
    "dmNotes": "The kitchen contains nothing of great value.",
    "sceneId": "scene_1788902673803_yz0d",
    "roomNumber": "g11",
    "campaignId": "camp-mtouse1g",
    "hiddenMonsterNames": [],
    "color": "#f59e0b",
    "label": "g11 - Kitchen",
    "polygonPoints": [
      30.444267017069876,
      50.843892014656376,
      26.72035769324595,
      38.60769782573632,
      19.510235385416642,
      47.206104553085545,
      22.758752029603478,
      60.10371464410941
    ]
  },
  {
    "id": "zone_1792022099222_eivgp",
    "polygonPoints": [
      24.739554861424715,
      76.63911219670409,
      21.807966670329282,
      68.5367673959327,
      17.846361006686806,
      69.19818329803648,
      14.677076475772827,
      75.6469883435484,
      15.073237042137075,
      81.93043941353439,
      17.846361006686806,
      87.38712060589063,
      20.144092291599442,
      89.53672228772795,
      24.343394295060467,
      87.55247458141659,
      25.45264388088036,
      81.2690235114306
    ],
    "boxedText": "A lit fireplace warms this mostly empty tower chamber. A wooden staircase hugs the west wall.",
    "bounds": {
      "height": 20.999954891795255,
      "width": 10.775567405107532,
      "y": 68.5367673959327,
      "x": 14.677076475772827
    },
    "pdfSection": "The Guild House - Main Level",
    "roomName": "Tower Rotunda",
    "hiddenMonsterNames": [],
    "campaignId": "camp-mtouse1g",
    "roomNumber": "g13",
    "monsters": [
      "1x Thug"
    ],
    "dmNotes": "A thug sits near the bottom of the stairs, engrossed in a saucy novella. If this guard detects intruders, he tries to run up the stairs to wake Guildmaster Dusk in area G26.",
    "sceneId": "scene_1788902673803_yz0d",
    "label": "g13 - Tower Rotunda",
    "color": "#f59e0b"
  },
  {
    "pdfSection": "Guild House - 2nd Floor",
    "roomName": "Dusk's Quarters",
    "hiddenMonsterNames": [],
    "color": "#f59e0b",
    "label": "up to g26 - Dusk's Quarters",
    "id": "zone_1792022134558_d3smr",
    "bounds": {
      "width": 4.42923359617884,
      "height": 14.52568533405234,
      "y": 69.14080546852898,
      "x": 13.039348694423012
    },
    "monsters": [
      "1x Assassin (Guildmaster Dusk)",
      "1x Noble (Dartinal Livereth)"
    ],
    "polygonPoints": [
      17.46858229060185,
      70.90149459992926,
      15.464881378044756,
      69.14080546852898,
      13.039348694423012,
      79.26476797408061,
      15.781255206343245,
      83.66649080258132
    ],
    "roomNumber": "up to g26",
    "boxedText": "This circular room contains a canopied bed with a leather trunk at the foot of it and a fireplace. Wooden staircases hug the walls—one leading up, the other down. The scent of tobacco hangs in the air.",
    "campaignId": "camp-mtouse1g",
    "sceneId": "scene_1788902673803_yz0d",
    "dmNotes": "Unless she has been lured elsewhere, Guildmaster Dusk (lawful evil, half-elf assassin) is asleep in bed with her lover, a politically influential noble named Dartinal Livereth (lawful evil, human noble). Neither is wearing armor, but they keep their weapons within reach.\n\nIf the guildhouse is on high alert, Dusk leaves the room to find out what's happening. Meanwhile, Dartinal smokes a pipe in bed and waits for Dusk to return.\n\nFireplace. Resting on the fireplace mantel are a wedge of soap, a brush, a clay pipe, and an ivory tobacco jar carved in the shape of a skull. Buried in the ashes of the hearth is a spare shortsword covered with soot.\n\nLeather Trunk. This trunk holds a spare, loaded light crossbow under some linens, bedding, and neatly folded outfits.\n\nMaster Key. Guildmaster Dusk keeps a master key on a nightstand next to her bed, and she takes it with her when she leaves the room. The key unlocks all doors in the guildhouse complex."
  }
];

export const DEMO_GV_TOKENS: SceneToken[] = [
  {
    "category": "character",
    "y": 1300,
    "id": "7ujhlk",
    "visionEnabled": true,
    "size": 1,
    "visionRadius": 60,
    "isMonster": false,
    "x": 1400,
    "avatarUrl": "https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Varrak.png/:/rs=w:1440,h:1440",
    "isPlayer": true,
    "name": "Varrak",
    "characterId": "char_varrak",
    "ddbCharacterId": 146614740,
    "hp": 59,
    "maxHp": 59,
    "currentHp": 59,
    "ac": 17
  },
  {
    "size": 1,
    "id": "92b0i8",
    "y": 1250,
    "avatarUrl": "https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Brannoc.png/:/rs=w:1440,h:1440",
    "visionEnabled": true,
    "name": "Brannoc",
    "isMonster": false,
    "isPlayer": true,
    "category": "character",
    "x": 1500,
    "visionRadius": 60,
    "characterId": "char_brannoc",
    "hp": 44,
    "maxHp": 44,
    "currentHp": 44,
    "ac": 18
  },
  {
    "x": 1550,
    "visionRadius": 60,
    "id": "6almej",
    "isPlayer": true,
    "size": 1,
    "category": "character",
    "isMonster": false,
    "avatarUrl": "https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Noctua.png/:/rs=w:1440,h:1440",
    "visionEnabled": true,
    "name": "Noctua Shadowclaw",
    "characterId": "char_noctua",
    "ddbCharacterId": 147334187,
    "y": 1300,
    "hp": 39,
    "maxHp": 39,
    "currentHp": 39,
    "ac": 14
  },
  {
    "name": "Aggie",
    "category": "character",
    "avatarUrl": "https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Aggie.png/:/rs=w:1440,h:1440",
    "isMonster": false,
    "x": 1500,
    "visionRadius": 60,
    "size": 1,
    "id": "f8a7v",
    "visionEnabled": true,
    "isPlayer": true,
    "characterId": "char_aggie",
    "ddbCharacterId": 158502126,
    "y": 1300,
    "hp": 42,
    "maxHp": 42,
    "currentHp": 42,
    "ac": 16
  },
  {
    "category": "character",
    "x": 1450,
    "isMonster": false,
    "avatarUrl": "https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Rowan.png/:/rs=w:1440,h:1440",
    "id": "fmzvlo",
    "visionEnabled": true,
    "size": 1,
    "visionRadius": 60,
    "y": 1300,
    "name": "Rowan",
    "isPlayer": true,
    "characterId": "char_rowan",
    "ddbCharacterId": 146533824,
    "hp": 38,
    "maxHp": 38,
    "currentHp": 38,
    "ac": 14
  },
  {
    "id": "token_jaymont_sinner",
    "name": "Jaymont the Sinner",
    "avatarUrl": "/uploads/file-1792077381663-439615846.png",
    "x": 1680,
    "y": 780,
    "hp": 52,
    "ac": 14,
    "size": 1,
    "isMonster": true,
    "category": "monster"
  },
  {
    "id": "token_thug_g12_1",
    "name": "Thug",
    "avatarUrl": "/uploads/file-1792077380953-585139729.png",
    "x": 860,
    "y": 920,
    "hp": 32,
    "ac": 11,
    "size": 1,
    "isMonster": true,
    "category": "monster"
  },
  {
    "id": "token_thug_g12_2",
    "name": "Thug",
    "avatarUrl": "/uploads/file-1792077380953-585139729.png",
    "x": 920,
    "y": 920,
    "hp": 32,
    "ac": 11,
    "size": 1,
    "isMonster": true,
    "category": "monster"
  },
  {
    "id": "token_thug_g12_3",
    "name": "Thug",
    "avatarUrl": "/uploads/file-1792077380953-585139729.png",
    "x": 860,
    "y": 980,
    "hp": 32,
    "ac": 11,
    "size": 1,
    "isMonster": true,
    "category": "monster"
  },
  {
    "id": "token_gladiator_g12",
    "name": "Gladiator",
    "avatarUrl": "/uploads/file-1792077381663-439615846.png",
    "x": 930,
    "y": 980,
    "hp": 112,
    "ac": 16,
    "size": 1,
    "isMonster": true,
    "category": "monster"
  },
  {
    "id": "token_thug_g13",
    "name": "Thug",
    "avatarUrl": "/uploads/file-1792077380953-585139729.png",
    "x": 600,
    "y": 1120,
    "hp": 32,
    "ac": 11,
    "size": 1,
    "isMonster": true,
    "category": "monster"
  },
  {
    "id": "token_needly_pitts",
    "name": "Commoner (Needly Pitts)",
    "avatarUrl": "/uploads/file-1792077381663-439615846.png",
    "x": 2450,
    "y": 320,
    "hp": 4,
    "ac": 10,
    "size": 1,
    "isMonster": true,
    "category": "monster"
  },
  {
    "id": "token_horse_g2a_1",
    "name": "Riding Horse",
    "avatarUrl": "/uploads/file-1792077383356-748374669.png",
    "x": 2360,
    "y": 460,
    "hp": 13,
    "ac": 10,
    "size": 2,
    "isMonster": true,
    "category": "monster"
  },
  {
    "id": "token_horse_g2a_2",
    "name": "Riding Horse",
    "avatarUrl": "/uploads/file-1792077383356-748374669.png",
    "x": 2540,
    "y": 460,
    "hp": 13,
    "ac": 10,
    "size": 2,
    "isMonster": true,
    "category": "monster"
  },
  {
    "id": "token_horse_g2a_3",
    "name": "Riding Horse",
    "avatarUrl": "/uploads/file-1792077383356-748374669.png",
    "x": 2360,
    "y": 650,
    "hp": 13,
    "ac": 10,
    "size": 2,
    "isMonster": true,
    "category": "monster"
  },
  {
    "id": "token_horse_g2a_4",
    "name": "Riding Horse",
    "avatarUrl": "/uploads/file-1792077383356-748374669.png",
    "x": 2540,
    "y": 650,
    "hp": 13,
    "ac": 10,
    "size": 2,
    "isMonster": true,
    "category": "monster"
  },
  {
    "id": "token_spider_g5",
    "name": "Spider",
    "avatarUrl": "/uploads/file-1792077381663-439615846.png",
    "x": 1600,
    "y": 640,
    "hp": 1,
    "ac": 12,
    "size": 1,
    "isMonster": true,
    "category": "monster"
  }
];

export const DEMO_GV_PDF_DIGEST: ChapterPdfDigest = {
  "rooms": [
    {
      "roomName": "Front Porch",
      "monsters": [],
      "roomNumber": "G1",
      "treasure": [
        "Dusty satchel containing 25 sp and a parchment transferring ownership of two horses to Guildmaster Dusk"
      ],
      "boxedText": "Nailed to this lengthy porch are short planks that bear the words \"Private Property. No Trespassing!\" in Common. A lookout is stationed on a second-floor balcony above the western end of the porch.",
      "sceneTitle": "The Guild House - Main Level",
      "dmNotes": "Any character who approaches the porch in plain view is spotted by the bandit on the south balcony (area G22), who calls out, \"Hey, you, get lost! Can't you read the signs?\" If this warning is ignored, the lookout shouts the same thing again, putting the guildhouse on high alert, then shoots a crossbow bolt into the ground near the character's feet as a final warning.\n\nDrop Box. The staircase in front of the double door to area G10 has a loose plank near the top. This plank conceals a drop box where visitors stash black-market goods, fenced items, and guild tributes. Any character who lifts the plank sees a dusty satchel in the drop box. The satchel contains 25 sp and a piece of parchment that transfers ownership of two horses to Guildmaster Dusk."
    },
    {
      "monsters": [
        "10x Riding Horse"
      ],
      "roomName": "Livery Stables",
      "boxedText": "Ten horse stables and a hayloft line the walls of this barn, which has an open doorway at each end. Flies swarm around a full dung cart that exudes a horrible stench.",
      "roomNumber": "G2a",
      "treasure": [],
      "sceneTitle": "The Guild House - Main Level",
      "dmNotes": "The stalls contain ten riding horses.\n\nCart. The dung-filled cart is a fire hazard. If the cart is pushed against a wall and set ablaze, the fire quickly spreads to the loft and ignites the hay there. After 1 minute, the smoke and panic of the horses put the guildhouse on high alert.\n\nFire. The Agile Hand isn't equipped to stop a fire that starts in the barn. Such a fire takes 1 minute to spread throughout the structure. After that, the fire moves 5 feet westward each minute until the whole east building is engulfed. After 5 minutes, the building collapses, and the stairs to the basement are buried in flaming debris. The west building is spared.\n\nLadders. A wooden ladder in each corner stall ascends to a trapdoor that leads to the hayloft (area G2b). The trapdoors are unlocked."
    },
    {
      "roomName": "Hayloft",
      "monsters": [
        "1x Commoner (Needly Pitts)"
      ],
      "dmNotes": "The hayloft is 10 feet above the stables and consists of a 5-foot-wide wooden walkway that runs the perimeter of the building. Broad, square loading doors open in the north and south walls, each fitted with block-and-tackle rigs for hoisting hay bales and other supplies into the loft. Hay bales and burlap sacks stuffed with feed grains take up most of the space. A few pitchforks, ropes, and feed buckets lie scattered about the bales.\n\nStable Hand. A young stable hand named Needly Pitts (neutral, human commoner) lazes in the loft, supposedly guarding against horse thieves. He has nodded off but wakes if characters disturb the horses, make too much noise in the barn, or start a fire. In the event of trouble, Needly bangs a metal pail and yells for the stablemaster (see area G16), who takes 1 minute to arrive.",
      "roomNumber": "G2b",
      "boxedText": "",
      "sceneTitle": "The Guild House - Main Level",
      "treasure": []
    },
    {
      "dmNotes": "The door at the top of the stairs is unlocked and opens into area G14.\n\nJaymont the Sinner. The figure on the steps is Jaymont the Sinner, a doppelganger disguised as a drunken guest. Only Guildmaster Dusk knows Jaymont's true nature. The doppelganger pretends to be asleep, but a character can discern that it's awake with a successful DC 15 Wisdom (Insight) check. Jaymont doesn't start fights it knows it can't win and allows intruders to pass by. When the intruders are gone, Jaymont taps three times on the staircase wall to alert Gwish in area G21, then slinks away to alert Guildmaster Dusk in area G26.\n\nMaster Key. Jaymont carries a master key that unlocks all doors in the guildhouse complex.",
      "roomNumber": "G3",
      "boxedText": "Halfway up this flight of stairs is a sleeping figure wrapped in a wool blanket. A door is situated at the top of the stairs.",
      "roomName": "Staircase",
      "monsters": [
        "1x Doppelganger (Jaymont the Sinner)"
      ],
      "treasure": [
        "Master key (unlocks all doors in the guildhouse complex)"
      ],
      "sceneTitle": "The Guild House - Main Level"
    },
    {
      "monsters": [],
      "roomName": "Cartwright's Workshop",
      "sceneTitle": "The Guild House - Main Level",
      "boxedText": "Three carts occupy this room. Pegs and hooks on the inner walls bear ropes, tackle, leather harnesses, wheels, and leatherworking tools. Shoved into a corner is a crate filled with horseshoes. Nearby, shelves hold smaller boxes filled with buckles, nails, cotter pins, and miscellaneous hardware.",
      "dmNotes": "The shop has two access points: the stables to the east and a door to the west that leads to area G7.\n\nTreasure. Characters can assemble one set of leatherworker's tools from the tools stored here.",
      "roomNumber": "G4",
      "treasure": [
        "One set of leatherworker's tools"
      ]
    },
    {
      "boxedText": "A wooden countertop divides the room. Signboards display services and fees for stabling and room rentals. Two keys hang from hooks on the east wall above the counter. A third hook is bare.",
      "roomNumber": "G5",
      "roomName": "Livery Office",
      "monsters": [
        "1x Spider"
      ],
      "dmNotes": "When the office is staffed, a visitor can secure an upstairs bed for 5 cp per night (5 sp for a private room). Accommodations can also be made in the stables for a traveler's mount at a cost of 1 sp per night.\n\nCoin Box. Tucked behind the counter is a wooden coin box with a copper clasp. A character who inspects the coin box before opening it notices a row of tiny pinholes in the lid. The coin box contains 15 cp and 11 sp, as well as a spider.\n\nKeys. The two keys hanging on the wall unlock the doors to areas G17 and G18, respectively.\n\nSecret Door. A secret door in the office's back wall leads to area G6.",
      "treasure": [
        "Wooden coin box containing 15 cp and 11 sp",
        "Two keys (unlock doors to areas G17 and G18)"
      ],
      "sceneTitle": "The Guild House - Main Level"
    },
    {
      "dmNotes": "The stairs descend 15 feet to area G28.",
      "roomName": "Basement Staircase",
      "monsters": [],
      "roomNumber": "G6",
      "boxedText": "A wooden staircase in the northeast corner of this empty, boarded-up room leads to the basement.",
      "sceneTitle": "The Guild House - Main Level",
      "treasure": []
    },
    {
      "roomNumber": "G7",
      "treasure": [],
      "boxedText": "Hanging on the walls of this small, muddy room are several riding cloaks, bits and harnesses, oil lanterns, and coils of rope.",
      "roomName": "Service Entrance",
      "monsters": [],
      "dmNotes": "Guild members store their riding gear here. A search of the room yields nothing of great value.",
      "sceneTitle": "The Guild House - Main Level"
    },
    {
      "roomNumber": "G8",
      "monsters": [],
      "roomName": "Courtyard",
      "treasure": [],
      "boxedText": "A cobblestone courtyard is wedged between the two main buildings of the guildhouse. Situated in the middle of the yard is a stone well rigged with a simple bucket winch.",
      "dmNotes": "The well is 30 feet deep and has fresh water filling its bottom 5 feet. The well's winch and rope are sturdy enough to bear 250 pounds of weight.",
      "sceneTitle": "The Guild House - Main Level"
    },
    {
      "boxedText": "This room contains several unmatched chairs situated around a long oak table scarred with knife marks. On the table sits a half-eaten cheese wheel, four clay wine jugs, and some wine-stained flagons.",
      "roomNumber": "G9",
      "dmNotes": "Guildmaster Dusk holds meetings here.",
      "treasure": [],
      "monsters": [],
      "roomName": "Conference Room",
      "sceneTitle": "The Guild House - Main Level"
    },
    {
      "roomName": "Main Hall",
      "monsters": [],
      "dmNotes": "Visitors who try to enter this hall through the north door must contend with a trap.\n\nBack-Door Trap. The northernmost door has a \"No Trespassers!\" sign hanging on the outside of it and is nailed shut on the inside (a fact not discernable from the outside). As an action, a character can try to force open the door using brute strength, doing so with a successful DC 13 Strength (Athletics) check. Breaking down the door puts the guildhouse on high alert unless a silence spell or similar magic is used to muffle the noise.\n\nA character who searches the door for traps can make a DC 12 Wisdom (Perception) check. If the check is successful, the character notices that the doorknob is loose and attached to a vial of poison gas hidden in the door itself. As an action, a character can try to disable the trap using thieves' tools, doing so with a successful DC 15 Dexterity check.\n\nUnless the trap is disabled, tugging or turning the knob causes the vial in the door to break, releasing a cloud of poisonous gas that fills a 10-foot-radius sphere centered on the door. The trap also triggers if the door is forced open. Each creature in the trap's area must make a DC 14 Constitution saving throw. On a failed save, the creature takes 16 (3d10) poison damage and is poisoned for 1 minute; on a successful save, the creature takes half as much damage and isn't poisoned. The trap can be triggered only once.\n\nEntering the Hall. Use the following boxed text to describe the hallway:\n\nA long, well-trafficked hall runs the width of the house. A staircase along the west wall leads to the second floor.\n\nThe stairs climb 15 feet to area G23.",
      "roomNumber": "G10",
      "sceneTitle": "The Guild House - Main Level",
      "boxedText": "A long, well-trafficked hall runs the width of the house. A staircase along the west wall leads to the second floor.",
      "treasure": []
    },
    {
      "sceneTitle": "The Guild House - Main Level",
      "roomName": "Kitchen",
      "monsters": [],
      "dmNotes": "The kitchen contains nothing of great value.",
      "treasure": [],
      "boxedText": "A cooking hearth occupies one corner of this kitchen, and nets holding dried sausages, cheese, peppers, and garlic hang from the rafters. Other items found here include a butcher's block, a table for preparing meals, a pail of potatoes, a few cast-iron pots, a sack of flour, a tin filled with cooking utensils, a block of salt, and a knife with a cutting board.",
      "roomNumber": "G11"
    },
    {
      "sceneTitle": "The Guild House - Main Level",
      "dmNotes": "The four guild members have been drinking and playing card games. The motley crew consists of three thugs and one gladiator. The thugs are poisoned and unconscious, while the gladiator is merely poisoned and spoiling for a fight. The unconscious condition ends on a thug who is wounded, knocked out of their chair, or splashed with a pint or more of liquid.\n\nBlue Chair. The blue chair in the south corner covers a secret trapdoor in the stone floor. A character who examines the floor near the chair can make a DC 10 Wisdom (Perception) check, finding the trapdoor on a success. Pulling open the trapdoor reveals a wooden ladder that descends 15 feet to area G37.\n\nTreasure. The coins on the table amount to 65 cp, 35 sp, and 11 gp.",
      "treasure": [
        "Coins on table: 65 cp, 35 sp, 11 gp"
      ],
      "roomName": "Parlor",
      "monsters": [
        "3x Thug",
        "1x Gladiator"
      ],
      "roomNumber": "G12",
      "boxedText": "This room contains a fireplace, a tattered couch, and several upholstered chairs, one of which is bright blue. Playing cards and coins lie scattered across a table. Slumped around the table are four drunken guild members clutching empty mugs and reeking of ale."
    },
    {
      "roomNumber": "G13",
      "treasure": [],
      "boxedText": "A lit fireplace warms this mostly empty tower chamber. A wooden staircase hugs the west wall.",
      "dmNotes": "A thug sits near the bottom of the stairs, engrossed in a saucy novella. If this guard detects intruders, he tries to run up the stairs to wake Guildmaster Dusk in area G26.",
      "sceneTitle": "The Guild House - Main Level",
      "monsters": [
        "1x Thug"
      ],
      "roomName": "Tower Rotunda"
    },
    {
      "sceneTitle": "Guild House - 2nd Floor",
      "treasure": [],
      "dmNotes": "The north door leading to area G19 is locked; the other doors are unlocked.",
      "boxedText": "This rectangular room has a door on every wall. A plaque on the west door says, \"Private Rooms.\"",
      "monsters": [],
      "roomName": "Upstairs Foyer",
      "roomNumber": "G14"
    },
    {
      "sceneTitle": "Guild House - 2nd Floor",
      "roomName": "L-Shaped Hall",
      "monsters": [],
      "dmNotes": "Closets. The two small rooms to the north are closets behind unlocked doors. One stores a mop and broom, a few buckets, and a stack of copper chamber pots. The other has shelves holding linens, blankets, soap, and candles.",
      "boxedText": "Wooden doors line the walls of this L-shaped hallway.",
      "treasure": [],
      "roomNumber": "G15"
    },
    {
      "sceneTitle": "Guild House - 2nd Floor",
      "treasure": [
        "Coin pouch containing 5 gp, 13 sp, and 25 cp",
        "Set of keys to the stables",
        "Two keys (one unlocking area G16, the other unlocking area G7)"
      ],
      "dmNotes": "This room belongs to the stablemaster, Laris Drot (neutral, human commoner), who is a stout woman in her fifties. Laris carries two keys on her person: one unlocks the door to this room, and the other unlocks the doors to area G7.\n\nA wooden trunk at the foot of Laris's bed contains folded clothing and personal effects.\n\nTreasure. On a nightstand, next to a set of keys to the stables, is a coin pouch containing 5 gp, 13 sp, and 25 cp.\n\nDevelopment. If Laris is here when the stable hand in area G2b bangs his pail, Laris heads to the stables to find out what's going on. It takes her 1 minute to get there.",
      "roomName": "Stablemaster's Quarters",
      "monsters": [
        "1x Commoner (Laris Drot)"
      ],
      "roomNumber": "G16",
      "boxedText": ""
    },
    {
      "treasure": [],
      "sceneTitle": "Guild House - 2nd Floor",
      "dmNotes": "This room stinks of horse manure due to its proximity to the stables. It contains two neatly made beds, two empty footlockers, and a nightstand with an oil-filled lantern hanging above it. Beneath each bed is a copper chamber pot.",
      "boxedText": "",
      "roomName": "Small Common Room",
      "monsters": [],
      "roomNumber": "G17"
    },
    {
      "boxedText": "",
      "treasure": [
        "Lantern of revealing"
      ],
      "roomNumber": "G18",
      "dmNotes": "This room stinks of horse manure due to its proximity to the stables. It contains four neatly made beds, each with its own nightstand and empty footlocker. An oil-filled lantern rests atop each nightstand. Beneath each bed is a copper chamber pot.\n\nTreasure. One of the lanterns is a lantern of revealing. No one in the guild is aware the lantern is magical.",
      "sceneTitle": "Guild House - 2nd Floor",
      "roomName": "Large Common Room",
      "monsters": []
    },
    {
      "dmNotes": "A bandit stationed atop this balcony watches for trouble coming from the north and west. If she sees anything suspicious or threatening, she shouts loud enough to put the rest of the guildhouse on high alert. This bandit carries a key that unlocks the door to area G14.\n\nSpyglass. The spyglass attached to the balcony is missing one of its lenses and is nonfunctional.",
      "roomName": "North Balcony",
      "monsters": [
        "1x Bandit"
      ],
      "roomNumber": "G19",
      "sceneTitle": "Guild House - 2nd Floor",
      "boxedText": "A wooden railing encloses this balcony. Mounted on one corner of the railing is a copper spyglass.",
      "treasure": [
        "Key that unlocks the door to area G14"
      ]
    },
    {
      "roomNumber": "G20",
      "treasure": [
        "Key that unlocks the door to area G20"
      ],
      "boxedText": "This private room contains a bed, a nightstand, a footlocker, and a small fireplace. A small oil lamp, a pewter water pitcher, and two mugs rest on the nightstand. Sitting on the edge of the bed is a heavy man in a nightgown.",
      "monsters": [
        "1x Commoner (Thyval Horne)"
      ],
      "dmNotes": "A traveling merchant named Thyval Horne (neutral, human commoner) rents this room. On the nightstand rests a key that unlocks the door to this room. Beneath the bed is a copper chamber pot.\n\nRoleplaying Thyval. The merchant hasn't had a good night's sleep in days and quickly angers if disturbed. Characters who threaten Thyval or use magic to coerce him can pry the following information out of him:\n\n• Guildmaster Dusk is hosting an unscrupulous, well-connected noble named Dartinal Livereth. (Thyval suspects the two are lovers.)\n• Jaymont the Sinner, the guild's resident spy, is a master of disguise.\n• Thyval can't sleep because of the squawking birds in the room next door (area G21).",
      "roomName": "Private Room",
      "sceneTitle": "Guild House - 2nd Floor"
    },
    {
      "roomNumber": "G21",
      "dmNotes": "The man is an oni named Gwish. Guildmaster Dusk is the only other guild member who knows Gwish's true nature.\n\nGwish is reclusive and rarely interacts with the other guild members. The oni has three ravens that act as messengers, and it uses a ring of animal influence to speak with them. These ravens deliver secret messages to the guildmaster's spies abroad and receive similar messages from those spies.\n\nIf one or more characters interrupt the oni, it politely asks them to leave. If they refuse, it shoos away the ravens and attacks the characters. The oni's glaive leans in the northeast corner behind the door.\n\nGwish's Trunk. When the oni is hungry, it sneaks from the guildhouse and invisibly preys on the city, feeding primarily on anyone sleeping outside. The trunk at the foot of Gwish's bed is filled with gnawed bones mixed with small bundles of torn clothing.\n\nMaster Key. One of the deep pockets on Gwish's robe contains a master key that unlocks all doors in the guildhouse.\n\nRaven's Note. Gwish has received a note from one of Guildmaster Dusk's spies. The note is written in code on a slip of parchment, and only Guildmaster Dusk is authorized to read it. Gwish plans to deliver the message to Dusk once her guest leaves (see area G26).\n\nA comprehend languages spell can decipher the note, as can a character who succeeds on a DC 20 Intelligence (Investigation) check after studying the note for 1 minute. It reads, \"Constantori in danger. Cognoscenti retaliation imminent. Be on high alert.\"",
      "treasure": [
        "Ring of animal influence",
        "Glaive",
        "Master key (unlocks all doors in the guildhouse)",
        "Raven's coded note"
      ],
      "boxedText": "The room contains a large bed, a sturdy trunk, a wooden nightstand, and a darkened fireplace. The windows here aren't boarded, and the window in the west wall is open slightly. In the middle of the room, an old man in an oversized black robe carefully removes a strip of parchment coiled around the leg of a raven while muttering kind words to the bird. Two more ravens watch from the rafters.",
      "monsters": [
        "1x Oni (Gwish)",
        "3x Raven"
      ],
      "roomName": "Gwish's Room",
      "sceneTitle": "Guild House - 2nd Floor"
    },
    {
      "roomName": "South Balcony",
      "monsters": [
        "1x Bandit"
      ],
      "sceneTitle": "Guild House - 2nd Floor",
      "boxedText": "A wooden railing encloses this balcony. Mounted on one corner of the railing is a copper spyglass.",
      "dmNotes": "A bandit stationed atop this balcony watches for trouble coming from the south and east. If she sees anything suspicious or threatening, she shouts loud enough to put the rest of the guildhouse on high alert. This bandit carries keys that unlock the doors to areas G23, G24, and G25.\n\nSpyglass. The spyglass, which is damaged but functional, is worth 250 gp.",
      "roomNumber": "G22",
      "treasure": [
        "Keys to areas G23, G24, and G25",
        "Damaged but functional copper spyglass (worth 250 gp)"
      ]
    },
    {
      "treasure": [
        "Master key (unlocks all doors in the guildhouse complex)",
        "Six casks of exquisite elven wine (250 gp each)",
        "Wooden chest containing six poisoner's kits",
        "Wooden crate containing eight sets of thieves' tools",
        "Wooden crate containing two spyglasses (1,000 gp each)",
        "Dirty wooden coffin with corpse wearing copper holy symbol shaped like the sun (25 gp), sun-shaped death mask made of gold (250 gp), and necklace of prayer beads",
        "Crowbar",
        "Leather-bound ledger"
      ],
      "dmNotes": "Elix the Saint (lawful evil, human bandit captain; see the \"Elix the Saint\" section earlier in the adventure) works here during the day. Armed with a crowbar, he examines containers stolen by the Agile Hand. He then records their contents (and the estimated value of those contents) in a leather-bound ledger.\n\nMaster Key. Elix carries a master key that unlocks all doors in the guildhouse complex.\n\nTreasure. The following stolen goods are stored here:\n\n• Six casks of exquisite elven wine (250 gp each)\n• Wooden chest containing six poisoner's kits\n• Wooden crate containing eight sets of thieves' tools\n• Wooden crate containing two spyglasses (1,000 gp each) packed in beds of straw\n• Dirty wooden coffin containing the moldy corpse of a human priest wearing a copper holy symbol shaped like the sun (25 gp), a sun-shaped death mask made of gold (250 gp), and a necklace of prayer beads",
      "boxedText": "Deep scrapes crisscross the floor of this spacious room, and wood shavings scatter the perimeter. A string of oil lanterns dangles from the ceiling, suspended on block and tackle above several containers—mostly small casks and crates, although there's an earth-encrusted coffin here as well.",
      "sceneTitle": "Guild House - 2nd Floor",
      "roomNumber": "G23",
      "roomName": "Stolen Goods",
      "monsters": [
        "1x Bandit Captain (Elix the Saint, during day)"
      ]
    },
    {
      "dmNotes": "A bandit stands guard outside the door to Guildmaster Dusk's quarters (area G26). The bandit's job is to shout at the first sign of trouble, thus alerting the guildmaster.\n\nDesk. If the characters search the desk at night, they find a leather-bound ledger in an unlocked drawer, along with a writing quill and a jar of ink. The ledger provides an account of stolen goods acquired by the Agile Hand, but Constantori's Portrait is not among the items listed.",
      "sceneTitle": "Guild House - 2nd Floor",
      "monsters": [
        "1x Bandit"
      ],
      "roomName": "Elix's Office",
      "roomNumber": "G24",
      "treasure": [
        "Leather-bound ledger",
        "Writing quill and jar of ink"
      ],
      "boxedText": "This office contains a plain wooden desk, a simple chair, and a fireplace. A door in the south corner sports a plaque that says, \"Private! Enter at your own risk.\""
    },
    {
      "boxedText": "",
      "roomName": "Shared Bedroom",
      "monsters": [
        "2x Thug"
      ],
      "sceneTitle": "Guild House - 2nd Floor",
      "dmNotes": "Guild members take turns resting here. The room contains two beds, two nightstands, and two trunks (each one packed with linens). Tucked beneath each bed is a copper chamber pot. A hearth in the south corner keeps the room warm.\n\nSleeping Guards. Two thugs sleep in the beds. They wake if disturbed and spend their first action scrambling for their weapons.",
      "roomNumber": "G25",
      "treasure": []
    },
    {
      "treasure": [
        "Master key (unlocks all doors in the guildhouse complex)",
        "Ivory tobacco jar carved in the shape of a skull",
        "Spare shortsword covered with soot",
        "Spare loaded light crossbow"
      ],
      "boxedText": "This circular room contains a canopied bed with a leather trunk at the foot of it and a fireplace. Wooden staircases hug the walls—one leading up, the other down. The scent of tobacco hangs in the air.",
      "sceneTitle": "Guild House - 2nd Floor",
      "roomNumber": "G26",
      "dmNotes": "Unless she has been lured elsewhere, Guildmaster Dusk (lawful evil, half-elf assassin) is asleep in bed with her lover, a politically influential noble named Dartinal Livereth (lawful evil, human noble). Neither is wearing armor, but they keep their weapons within reach.\n\nIf the guildhouse is on high alert, Dusk leaves the room to find out what's happening. Meanwhile, Dartinal smokes a pipe in bed and waits for Dusk to return.\n\nFireplace. Resting on the fireplace mantel are a wedge of soap, a brush, a clay pipe, and an ivory tobacco jar carved in the shape of a skull. Buried in the ashes of the hearth is a spare shortsword covered with soot.\n\nLeather Trunk. This trunk holds a spare, loaded light crossbow under some linens, bedding, and neatly folded outfits.\n\nMaster Key. Guildmaster Dusk keeps a master key on a nightstand next to her bed, and she takes it with her when she leaves the room. The key unlocks all doors in the guildhouse complex.",
      "monsters": [
        "1x Assassin (Guildmaster Dusk)",
        "1x Noble (Dartinal Livereth)"
      ],
      "roomName": "Dusk's Quarters"
    },
    {
      "dmNotes": "This room is situated at the top of the tower and is off limits to everyone except Guildmaster Dusk, who comes here to reflect, doodle in her diary, and gaze upon her latest acquisition: Constantori's Portrait.\n\nCharacters who search the guildmaster's cluttered desk find sketches and descriptions of deadly mechanical traps, including a rough sketch of the trap in this room (see \"Trap\" below).\n\nConstantori's Portrait. The painting that hangs in the alcove is Constantori's Portrait (described at the end of the adventure). Guildmaster Dusk is attuned to the painting and has commanded it to defend itself against all creatures except her. As an action, a character can throw a sheet over the painting, making it unable to cast spells.\n\nThe Cognoscenti Esoterica was wrong about one thing: Guildmaster Dusk has no intention of selling the painting. By learning its secrets, she hopes to become as notorious and wealthy as the late Daiyani Grysthorn, the crime lord who commissioned the painting in the first place.\n\nTrap. Canisters of poisonous gas are hidden in the wall behind the painting. Removing the painting from its hooks without first disabling the trap causes the gas to spew from tiny holes previously concealed by the painting. Each creature in the room when the gas is released must make a DC 14 Constitution saving throw, taking 36 (8d8) poison damage on a failed save, or half as much damage on a successful one.\n\nA character who searches the alcove for traps spots the holes behind the painting with a successful DC 12 Wisdom (Perception) check. This check is made with advantage if the character saw the trap's sketch in Dusk's diary. Once the trap is detected, a character can spend 1 minute trying to disable it, either by plugging the holes or by placing counterweights on the hooks as someone else carefully lifts the painting. The character trying to disable the trap must make a DC 15 Dexterity (Sleight of Hand) check, disabling the trap on a success and triggering the trap on a failure.",
      "treasure": [
        "Constantori's Portrait",
        "Guildmaster Dusk's diary and trap sketches"
      ],
      "sceneTitle": "Guild House - 2nd Floor",
      "roomNumber": "G27",
      "monsters": [
        "1x Guardian Portrait (Constantori's Portrait)"
      ],
      "roomName": "Tower Peak",
      "boxedText": "This tower chamber is lit by a pewter chandelier suspended from beams that support a conical roof. A cluttered writing desk and a padded chair are positioned opposite the descending staircase. A gold-framed painting of a beautiful, well-dressed man hangs in a shallow alcove near the top of the stairs."
    },
    {
      "dmNotes": "This room lies at the bottom of a wooden staircase that climbs 15 feet to area G6. The cellar is unlit.\n\nThe crates, barrels, and trunks are all empty.\n\nSecret Door. A secret door in the south wall can't be opened from this side without magic (see area G33 for details). It leads to area G33.\n\nThieves' Test. The door leading to area G29 is unlocked and has the following note (handwritten in Common) tacked to it:\n\nHere are the rules. Look for keys and keyholes. Watch out for my pets. Follow the arrows, but don't let them hit you. Trust your ears, and remember: a little pressure can be a good thing. Get out alive. Remember, you wanted this. Good luck, grunt.—Dusk\n\nAreas G29–G33 contain challenges that are meant to test thieves who want to join the guild. The note is meant for those applicants, but characters would be wise to heed its advice:\n\n• \"Look for keys and keyholes\" and \"Watch out for my pets\" refer to challenges in area G29.\n• \"Follow the arrows, but don't let them hit you\" refers to the set-up in area G31.\n• \"Trust your ears\" and \"A little pressure can be a good thing\" speak to areas G32 and G33.",
      "treasure": [
        "Handwritten note from Dusk"
      ],
      "sceneTitle": "Guildhouse Basement",
      "boxedText": "This dank cellar reeks of soured wine. Wooden trunks line the south wall, and a chamber to the east contains stacks of barrels and crates.",
      "monsters": [],
      "roomNumber": "G28",
      "roomName": "Cellar"
    },
    {
      "roomName": "Murky Pool",
      "monsters": [
        "1x Swarm of Quippers"
      ],
      "roomNumber": "G29",
      "dmNotes": "The pool is 10 feet deep, and the murky water reduces underwater visibility to 0 feet. Characters can find the way to area G30 by exploring the pool:\n\nPool Floor. A nonmagical silver key rests on the floor of the pool. A character submerged in the pool can take an action to feel around its floor, finding the key with a successful DC 15 Intelligence (Investigation) check.\n\nPool Walls. The east wall of the pool has a tiny keyhole in the middle of it. A character submerged in the pool can take an action to search the pool's walls, finding the keyhole with a successful DC 15 Intelligence (Investigation) check.\n\nSecret Exit. If the pool's silver key is inserted into the pool's keyhole, a section of the pool's east wall retracts, revealing a 4-foot-high, 4-foot-wide, flooded tunnel containing a swarm of quippers. The swarm attacks the nearest prey. A character who swims to the far end of the tunnel and feels around for an exit finds an unlocked trapdoor in the ceiling that pops open to reveal a dry, T-shaped chamber (area G30) and a passageway leading south (area G31).\n\nLight Sources. Characters who don't have darkvision must find a way to keep their light sources dry, or else they could end up fumbling in the dark until their light sources dry out.",
      "sceneTitle": "Guildhouse Basement",
      "boxedText": "A ten-foot-square pool of murky water occupies most of this unlit room. A narrow ledge surrounds the pool, and a chalk-drawn arrow on the east wall points down.",
      "treasure": [
        "Nonmagical silver key"
      ]
    },
    {
      "roomName": "Trapdoor",
      "dmNotes": "This unlit, T-shaped area is empty except for a wooden trapdoor in the floor. A tunnel (area G31) leads south from here.\n\nTrapdoor. Below the trapdoor is a 4-foot-wide, 4-foot-high tunnel filled with murky water and a hungry swarm of quippers (see area G29 for details). Characters who follow this tunnel west come to a dead end unless they previously opened that end of tunnel in area G29.",
      "monsters": [
        "1x Swarm of Quippers"
      ],
      "boxedText": "",
      "sceneTitle": "Guildhouse Basement",
      "roomNumber": "G30",
      "treasure": []
    },
    {
      "sceneTitle": "Guildhouse Basement",
      "monsters": [
        "2x Skeleton",
        "8x Inanimate Skeleton dummies"
      ],
      "roomName": "Follow the Arrows",
      "treasure": [],
      "boxedText": "Chalk arrows drawn on the floor point toward the south end of this narrow corridor. Arrow slits are evenly spaced along the walls.",
      "dmNotes": "Characters who have darkvision or a light source can see the following:\n\nChalk arrows drawn on the floor point toward the south end of this narrow corridor. Arrow slits are evenly spaced along the walls.\n\nThe arrow slits are too narrow for a Small or larger character to squeeze or crawl through. Behind the arrow slits are two closed-off chambers—one to the west and one to the east. A character who has darkvision or a light source can peer through nearby arrow slits to see what each closed-off area contains: five freestanding human skeletons draped in cobwebs and clutching shortbows. Most of these skeletons are inanimate, propped-up dummies made to look threatening. Each one is a Medium object with AC 15, 4 hit points, and immunity to poison and psychic damage.\n\nOnly two skeletons are animated, and they guard the hallway's midpoint. When a character enters the square marked T on map 6.2, one animated skeleton uses its reaction (if available) to make a Shortbow attack, targeting that character. The character can make a DC 15 Dexterity (Acrobatics) check to tumble out of the way; if the check is successful, the skeleton has disadvantage on its attack roll.\n\nIf a character somehow gains access to one of the closed-off chambers, perhaps by shrinking to Tiny size or by assuming a gaseous form, the animated skeleton in that area stops guarding the hallway and instead attacks that character.\n\nSecret Door. A secret door at the south end of the hallway is unlocked and can be pushed open to reveal a tunnel leading to area G32.",
      "roomNumber": "G31"
    },
    {
      "sceneTitle": "Guildhouse Basement",
      "roomName": "Eastern Maze",
      "monsters": [],
      "boxedText": "Branches in the tunnel ahead suggest you're entering some sort of maze. You hear the sounds of heavy breathing coming from somewhere ahead.",
      "treasure": [],
      "dmNotes": "Characters who have darkvision or a light source can see the following:\n\nBranches in the tunnel ahead suggest you're entering some sort of maze. You hear the sounds of heavy breathing coming from somewhere ahead.\n\nPermanent minor illusion spells create the sounds of heavy breathing. These sounds originate in the two spaces marked T on map 6.2. Any character who succeeds on a DC 10 Wisdom (Perception) check can track the sounds to their points of origin. A character who enters one of these squares steps on a pressure plate that sinks 1 inch into the floor and remains in that position for 1 minute before resetting itself. A character who searches that section of floor before stepping on it must make a DC 13 Wisdom (Perception) check. If the check is successful, the character spots the pressure plate and can avoid it. If the characters depress the two pressure plates here along with the one in G33, the north secret door in area G33 swings open.",
      "roomNumber": "G32"
    },
    {
      "roomNumber": "G33",
      "treasure": [],
      "boxedText": "",
      "dmNotes": "This maze is like the one in area G32, right down to the heavy breathing. The square marked T on map 6.2 contains a hidden pressure plate on the floor identical to the ones in area G32.\n\nSecret Doors. This maze contains two secret doors, one to the north and the other to the west:\n\nNorth Secret Door. This secret door has three separate locks built into it. If all three pressure plates in the maze (the one in this area and the two in area G32) are in their sunken positions, the door unlocks and swings open on its own, revealing area G28 beyond. Otherwise, each of the door's three locks requires a separate knock spell or similar magic to bypass. The locks are hidden and can't be picked.\n\nWest Secret Door. This secret door is unlocked and pushes open to reveal area G34 beyond.",
      "sceneTitle": "Guildhouse Basement",
      "monsters": [],
      "roomName": "Western Maze"
    },
    {
      "dmNotes": "Characters who have darkvision or a light source can see the following:\n\nVertical iron bars stretch from floor to ceiling, dividing this room into six cells. The two southernmost cells have wooden barrels and trunks in them, while the cell in the northern corner contains a scruffy-looking prisoner.\n\nAll the cell doors are locked, and a secret door connects the cell block to area G33.\n\nG34a: Smugglers' Barrels. This cell contains four wooden barrels that have padded interiors and air tubes for breathing. The thieves use these barrels for smuggling people.\n\nG34b: Smugglers' Trunks. Three iron-bound trunks rest against the back wall of this cell. The chests have padded interiors and air tubes for breathing. Like the barrels in the adjoining cell, these trunks are used for smuggling people.\n\nG34c: Prison Cells. Each of these cells contains a wooden bench and a small drain hole in the floor.\n\nImprisoned in the northernmost cell is a thief named Dury Sneeth (neutral evil, human spy), who was caught taking a bribe from a member of the Velvet Glove, a rival thieves' guild. After he was rightly accused of spying for the Velvet Glove, Dury was locked up and interrogated. He found a dagger hidden behind one of the bricks in the wall of his cell, and he keeps it hidden on his person. He has no other weapons.\n\nGuildmaster Dusk is satisfied that Dury is guilty of betraying the Agile Hand, but she hasn't gotten around to punishing him yet and has, in fact, told Dury that she's willing to give him a second chance if he behaves himself from now on. Dury is not convinced Dusk has his best interests at heart and pleads for release.",
      "sceneTitle": "Guildhouse Basement",
      "boxedText": "Vertical iron bars stretch from floor to ceiling, dividing this room into six cells. The two southernmost cells have wooden barrels and trunks in them, while the cell in the northern corner contains a scruffy-looking prisoner.",
      "treasure": [
        "Hidden dagger"
      ],
      "roomNumber": "G34",
      "monsters": [
        "1x Spy (Dury Sneeth)"
      ],
      "roomName": "Cell Block"
    },
    {
      "boxedText": "Lining two walls of this room are four wooden crates and four wooden chests.",
      "roomNumber": "G35",
      "dmNotes": "The crates contain stolen weapons and ammunition: ten scimitars, twelve light crossbows, five heavy crossbows, and hundreds of crossbow bolts. The chests are filled with ordinary cutlery, candlesticks, plates, pitchers, and mugs.\n\nTreasure. One of the chests has a secret compartment, which a character searching the chest can find with a successful DC 13 Wisdom (Perception) check. The secret compartment contains six pieces of costume jewelry (5 gp each), a gold necklace with a black pearl pendant (750 gp), and a necklace of fireballs.",
      "monsters": [],
      "roomName": "Storage Room",
      "treasure": [
        "Ten scimitars",
        "Twelve light crossbows",
        "Five heavy crossbows",
        "Hundreds of crossbow bolts",
        "Ordinary cutlery, candlesticks, plates, pitchers, and mugs",
        "Six pieces of costume jewelry (5 gp each)",
        "Gold necklace with a black pearl pendant (750 gp)",
        "Necklace of fireballs"
      ],
      "sceneTitle": "Guildhouse Basement"
    },
    {
      "dmNotes": "The crate is a mimic that loves the taste of salted butter. To keep the mimic on friendly terms, Guildmaster Dusk brings it a fresh block of salted butter every few days. The mimic attacks any character who tries to steal the block of butter but otherwise prefers to be left alone. The mimic can carry on conversations in Common.\n\nSecret Door. Hidden in the room's south corner is a secret door that swings open into area G37.",
      "roomNumber": "G36",
      "treasure": [
        "Paper-wrapped block of salted butter"
      ],
      "sceneTitle": "Guildhouse Basement",
      "monsters": [
        "1x Mimic"
      ],
      "roomName": "Storage Room",
      "boxedText": "This room is mostly empty except for a small wooden crate shoved in a corner next to a paper-wrapped block of butter."
    },
    {
      "roomName": "Secret Tunnel",
      "monsters": [],
      "sceneTitle": "Guildhouse Basement",
      "dmNotes": "This tunnel has a secret door at one end and a 15-foot-tall ladder at the opposite end. The ladder climbs to a stone trapdoor in the ceiling that leads to area G12. A character at the top of the ladder can try to push open the trapdoor, doing so with a DC 15 Strength (Athletics) check; the check is made with disadvantage if the blue chair in area G12 is weighing down the trapdoor.",
      "boxedText": "",
      "roomNumber": "G37",
      "treasure": []
    }
  ],
  "pdfUrl": "/uploads/file-1792019950630-724148545.pdf",
  "chapterTitle": "Masterpiece Imbroglio",
  "digestedAt": 1792020133480,
  "pdfFilename": "dnd - keys from the golden vault - masterpiece imbroglio.pdf",
  "scenes": [
    {
      "keyNpcs": [
        "Adrisa Carimorte"
      ],
      "summary": "The characters arrive at a secluded, disused barn surrounded by dead corn to receive their mission briefing from Adrisa Carimorte of the Cognoscenti Esoterica, or via a Golden Vault music box mission dispatch.",
      "sceneId": "scene-mtov5yyi",
      "boxedText": "Rain begins to fall as your coach pulls up beside an open barn surrounded by fields of dead corn. A tall, well-dressed human woman emerges from the barn as you exit the coach. \"Thank you for coming,\" she says with a smile. \"I'm Adrisa Carimorte. My organization would like to hire you to retrieve a painting that was stolen from us by a thieves' guild. For the painting's safe return, I'm prepared to pay you two thousand gold pieces. Let's go inside to escape the rain, shall we? There's someone else I'd like you to meet.\"",
      "sceneTitle": "The Cognoscenti Barn",
      "trapsAndHazards": [
        "Magical wards thwart scrying on the barn's interior (temporarily deactivated by Adrisa)"
      ],
      "suggestedDmNotes": "Adrisa explains the theft of *Constantori's Portrait* and offers 2,000 gp upon its return. If using the Golden Vault patron, operatives receive a golden key delivered to open a music box.",
      "loot": [
        "Mission reward: 2,000 gp (or a rare magic item from the Golden Vault)"
      ],
      "roomNumbers": []
    },
    {
      "sceneTitle": "Barn Visit",
      "boxedText": "In the middle of the loft, tied to a wooden chair, is a scrawny human man with patchy facial hair. He is sweating profusely and chewing nervously on a cloth gag.",
      "sceneId": "scene_1788895047166_2p1d",
      "keyNpcs": [
        "Adrisa Carimorte",
        "Grinky Brithwort"
      ],
      "summary": "Inside the barn loft, the adventurers interrogate the captured Agile Hand lookout Grinky Brithwort to learn about the guildhouse layout, key figures, and defenses.",
      "trapsAndHazards": [],
      "suggestedDmNotes": "Grinky provides valuable intel regarding Guildmaster Dusk, Elix the Saint, master keys, and guards' habits, though his sketched map contains deliberate inaccuracies (the painting's location and the top level of the tower are omitted).",
      "loot": [
        "Grinky's sketched map (Map 6.1)"
      ],
      "roomNumbers": []
    },
    {
      "summary": "The ground floor of the Agile Hand guildhouse, containing the stables, hayloft, livery office, workshops, courtyard, main hall, kitchen, parlor, and lower rotunda.",
      "loot": [
        "Satchel with 25 sp and horse deed (G1 drop box)",
        "Leatherworker's tools (G4)",
        "Wooden coin box with 15 cp, 11 sp, and spider (G5)",
        "Keys to areas G17 and G18 (G5)",
        "65 cp, 35 sp, 11 gp (G12)",
        "Jaymont's master key (G3)"
      ],
      "keyNpcs": [
        "Needly Pitts",
        "Jaymont the Sinner",
        "Three Thugs",
        "One Gladiator",
        "One Thug (Rotunda)"
      ],
      "sceneId": "scene_1788902673803_yz0d",
      "suggestedDmNotes": "Creaky floorboards impose disadvantage on Stealth checks on upper floors. Lookouts on balconies (G19, G22) will alert the guildhouse if characters approach in plain view. A fire started in the stables spreads rapidly and destroys the east wing in 5 minutes.",
      "sceneTitle": "The Guild House - Main Level",
      "boxedText": "Nailed to this lengthy porch are short planks that bear the words \"Private Property. No Trespassing!\" in Common. A lookout is stationed on a second-floor balcony above the western end of the porch.",
      "trapsAndHazards": [
        "Back-door poison gas trap (area G10; DC 12 Perception, DC 15 Dexterity to disarm, DC 14 Con save or 16 poison damage)",
        "Dung cart fire hazard (area G2a)"
      ],
      "roomNumbers": [
        "G1",
        "G2a",
        "G2b",
        "G3",
        "G4",
        "G5",
        "G6",
        "G7",
        "G8",
        "G9",
        "G10",
        "G11",
        "G12",
        "G13"
      ]
    },
    {
      "roomNumbers": [
        "G14",
        "G15",
        "G16",
        "G17",
        "G18",
        "G19",
        "G20",
        "G21",
        "G22",
        "G23",
        "G24",
        "G25",
        "G26",
        "G27"
      ],
      "sceneId": "scene-muimqdr3",
      "loot": [
        "Coin pouch with 5 gp, 13 sp, 25 cp (G16)",
        "Lantern of revealing (G18)",
        "Damaged spyglass worth 250 gp (G22)",
        "Stolen goods: 6 casks elven wine (250 gp each), 6 poisoner's kits, 8 thieves' tools, 2 spyglasses (1,000 gp each), copper holy symbol (25 gp), gold death mask (250 gp), necklace of prayer beads (G23)",
        "Stolen goods ledger (G23, G24)",
        "Master keys (G21, G23, G26)",
        "Ivory skull tobacco jar, spare shortsword, loaded light crossbow (G26)",
        "Constantori's Portrait (G27)",
        "Dusk's diary and trap sketches (G27)"
      ],
      "suggestedDmNotes": "Floors creak throughout the upper level. Gwish maintains ravens in G21 with a coded letter. Elix catalogs goods in G23 during the day. Dusk rests with Dartinal in G26 unless on high alert.",
      "summary": "The upper level of the guildhouse, featuring guest quarters, common rooms, balconies, the loot processing room, offices, Dusk's private quarters, and the high tower peak.",
      "keyNpcs": [
        "Laris Drot",
        "Thyval Horne",
        "Gwish (Oni)",
        "Elix the Saint",
        "Dartinal Livereth",
        "Guildmaster Dusk",
        "Bandits (lookouts on G19, G22, and guard on G24)",
        "Two Thugs (sleeping in G25)"
      ],
      "sceneTitle": "Guild House - 2nd Floor",
      "boxedText": "This rectangular room has a door on every wall. A plaque on the west door says, \"Private Rooms.\"",
      "trapsAndHazards": [
        "Tower Peak poison gas trap behind the painting (area G27; DC 12 Perception, DC 15 Sleight of Hand, DC 14 Con save or 36 poison damage)",
        "Constantori's Portrait (Guardian Portrait spell attacks)"
      ]
    },
    {
      "sceneId": null,
      "boxedText": "This dank cellar reeks of soured wine. Wooden trunks line the south wall, and a chamber to the east contains stacks of barrels and crates.",
      "trapsAndHazards": [
        "Flooded tunnel with Swarm of Quippers (area G29, G30)",
        "Arrow slit animated skeleton snipers (area G31; DC 15 Acrobatics to dodge)",
        "Eastern and Western Mazes with illusion sounds and three-plate secret door puzzle (areas G32, G33; DC 13 Perception to spot plates)",
        "Mimic posing as a wooden crate (area G36)"
      ],
      "roomNumbers": [
        "G28",
        "G29",
        "G30",
        "G31",
        "G32",
        "G33",
        "G34",
        "G35",
        "G36",
        "G37"
      ],
      "loot": [
        "Silver key (G29)",
        "Hidden dagger (G34c)",
        "Crates of weapons and crossbow bolts (G35)",
        "Secret compartment in G35: 6 pieces costume jewelry (5 gp each), gold necklace with black pearl pendant (750 gp), necklace of fireballs",
        "Block of salted butter (G36)"
      ],
      "summary": "The underground initiation testing gauntlet, prison cells, secret smuggler escapes, and storage vaults.",
      "sceneTitle": "Guildhouse Basement",
      "keyNpcs": [
        "Dury Sneeth",
        "One Mimic"
      ],
      "suggestedDmNotes": "The cellar is completely unlit. Dusk's handwritten note in G28 provides clues to the initiates' trials. Depressing all three pressure plates in G32 and G33 opens the three-locked secret door back to G28."
    }
  ],
  "adventureTitle": "Keys from the Golden Vault",
  "digestSummary": "A group of scholars and sages known as the Cognoscenti Esoterica recently purchased *Constantori's Portrait*, a work reputed to depict one of the most beautiful courtier men who ever lived and rumored to possess occult properties. Before the sages could study its magical properties, a small team from the Agile Hand thieves' guild raided their vaults and stole it. Cognoscenti guards managed to capture a lookout named Grinky Brithwort, who traded information about the Agile Hand's guildhouse in exchange for his freedom. The Cognoscenti Esoterica, distrustful of local authorities, seeks skilled adventurers to infiltrate the guildhouse and recover the portrait.\n\nThe Agile Hand's headquarters is situated at the end of a winding cobblestone street parallel to a small river. It is led by Guildmaster Dusk, a cunning assassin who has attuned to the portrait and keeps it in her private chamber at the top of the guildhouse tower. Unknown to the Cognoscenti, Dusk does not plan to sell the masterpiece; instead, she aims to unlock its magical secrets to rival the legendary crime lord Daiyani Grysthorn. Infiltrating the guildhouse requires navigating boarded-up windows, alert lookouts on high balconies, disguised doppelgangers, an undercover oni spymaster, drunken enforcers, and a deadly trap-filled obstacle basement used to test initiates.\n\nCharacters can plan their heist by gathering intelligence from Grinky, observing or ambushing lieutenant Elix the Saint at the Tipsy Tankard to acquire a guild master key, or utilizing covert magic. Once inside, they must locate the portrait in the tower peak, disarm a lethal poison gas mechanism, handle the painting's innate defenses, and escape before Dusk, her task force, or city authorities bring the full weight of the guild down upon them."
};

export const DEMO_GV_SCENE: Scene = {
  sceneId: "scene_1788902673803_yz0d",
  sceneTitle: "The Guild House - Main Level",
  mapUrl: guildhouseMainLevelImg,
  mapThumbnailUrl: guildhouseMainLevelImg,
  mapWidth: 2976,
  mapHeight: 1426,
  dmNotes: "ADVENTURE: Masterpiece Imbroglio (Keys from the Golden Vault)\nMISSION: Infiltrate the Agile Hand thieves guildhouse and recover Constantori's sentient painting.",
  tokens: DEMO_GV_TOKENS,
  gridSize: 50,
  gridOpacity: 0.3,
  isFogVisible: true, // Fog of War enabled by default
  walls: DEMO_GV_WALLS,
  visionConfig: {
    enabled: true,
    explorationMemory: true,
    darknessOpacity: 0.85,
    dimVisionOpacity: 0.4,
    ambientLight: false,
    dmPreviewMode: true,
    showDoorBadges: true
  },
  roomAnnotations: DEMO_GV_ROOM_ZONES
};


export const DEMO_GV_WALLS_2ND_FLOOR: WallSegment[] = [
  {
    "wallType": "normal",
    "p2": {
      "y": 1053.19738589125,
      "x": 3207.2782397749033
    },
    "id": "wall_1792020249299_iuds",
    "p1": {
      "y": 1161.26260689125,
      "x": 3207.2782397749033
    }
  },
  {
    "p1": {
      "x": 3207.2782397749033,
      "y": 1053.19738589125
    },
    "id": "wall_1792020251262_8nke",
    "wallType": "normal",
    "p2": {
      "x": 3203.7351177749033,
      "y": 1164.80572889125
    }
  },
  {
    "wallType": "normal",
    "p2": {
      "y": 1157.71948489125,
      "x": 2829.9357467749032
    },
    "id": "wall_1792020252584_ufzt",
    "p1": {
      "y": 1164.80572889125,
      "x": 3203.7351177749033
    }
  },
  {
    "p2": {
      "x": 2833.4788687749033,
      "y": 1738.7914928912505
    },
    "wallType": "normal",
    "id": "wall_1792020253942_jvwd",
    "p1": {
      "y": 1157.71948489125,
      "x": 2829.9357467749032
    }
  },
  {
    "id": "wall_1792020255533_zyhz",
    "p1": {
      "x": 2833.4788687749033,
      "y": 1738.7914928912505
    },
    "p2": {
      "x": 3568.6766837749037,
      "y": 1735.2483708912505
    },
    "wallType": "normal"
  },
  {
    "p2": {
      "y": 946.9037258912498,
      "x": 3565.1335617749037
    },
    "p1": {
      "x": 3568.6766837749037,
      "y": 1735.2483708912505
    },
    "wallType": "normal",
    "id": "wall_1792020256769_nlkw"
  },
  {
    "p1": {
      "x": 3565.1335617749037,
      "y": 946.9037258912498
    },
    "id": "wall_1792020258384_edyh",
    "wallType": "normal",
    "p2": {
      "y": 1039.0248978912498,
      "x": 3570.4482447749037
    }
  },
  {
    "p2": {
      "x": 4011.5669337749046,
      "y": 1033.71021489125
    },
    "id": "wall_1792020260246_lpfp",
    "wallType": "normal",
    "p1": {
      "x": 3570.4482447749037,
      "y": 1039.0248978912498
    }
  },
  {
    "p1": {
      "x": 4011.5669337749046,
      "y": 1033.71021489125
    },
    "id": "wall_1792020262336_18qw",
    "p2": {
      "y": 1380.9361708912502,
      "x": 4004.4806897749045
    },
    "wallType": "normal"
  },
  {
    "doorState": "closed",
    "id": "wall_1792020279432_dkto",
    "p2": {
      "x": 4004.4806897749045,
      "y": 1535.0619778912503
    },
    "p1": {
      "x": 4004.4806897749045,
      "y": 1380.9361708912502
    },
    "wallType": "door"
  },
  {
    "wallType": "normal",
    "p2": {
      "y": 1729.9336878912504,
      "x": 4006.2522507749045
    },
    "id": "wall_1792020291747_l6rb",
    "p1": {
      "x": 3566.9051227749037,
      "y": 1728.1621268912504
    }
  },
  {
    "wallType": "normal",
    "p1": {
      "x": 4006.2522507749045,
      "y": 1729.9336878912504
    },
    "id": "wall_1792020292675_miku",
    "p2": {
      "y": 1540.3766608912504,
      "x": 4004.4806897749045
    }
  },
  {
    "p2": {
      "x": 4008.0238117749045,
      "y": 1738.7914928912505
    },
    "id": "wall_1792020293652_bly4",
    "wallType": "normal",
    "p1": {
      "y": 1540.3766608912504,
      "x": 4004.4806897749045
    }
  },
  {
    "wallType": "normal",
    "p2": {
      "y": 1731.7052488912504,
      "x": 4564.293965774905
    },
    "id": "wall_1792020297911_awcq",
    "p1": {
      "x": 4008.0238117749045,
      "y": 1738.7914928912505
    }
  },
  {
    "p2": {
      "y": 1044.3395808912499,
      "x": 4566.065526774905
    },
    "p1": {
      "x": 4564.293965774905,
      "y": 1731.7052488912504
    },
    "wallType": "normal",
    "id": "wall_1792020299153_qde9"
  },
  {
    "wallType": "normal",
    "id": "wall_1792020300919_cqlw",
    "p1": {
      "x": 4566.065526774905,
      "y": 1044.3395808912499
    },
    "p2": {
      "y": 1044.3395808912499,
      "x": 4117.860593774904
    }
  },
  {
    "p2": {
      "y": 1239.21129089125,
      "x": 4119.632154774905
    },
    "wallType": "normal",
    "id": "wall_1792020302886_h481",
    "p1": {
      "x": 4117.860593774904,
      "y": 1044.3395808912499
    }
  },
  {
    "wallType": "door",
    "p1": {
      "y": 1239.21129089125,
      "x": 4119.632154774905
    },
    "p2": {
      "y": 1372.07836589125,
      "x": 4119.632154774905
    },
    "doorState": "closed",
    "id": "wall_1792020305730_4z8d"
  },
  {
    "wallType": "normal",
    "p2": {
      "y": 1735.2483708912505,
      "x": 4124.946837774904
    },
    "id": "wall_1792020308913_u4tx",
    "p1": {
      "x": 4119.632154774905,
      "y": 1372.07836589125
    }
  },
  {
    "p1": {
      "x": 4569.608648774905,
      "y": 1053.19738589125
    },
    "wallType": "normal",
    "id": "wall_1792020314561_k8ub",
    "p2": {
      "x": 4564.293965774905,
      "y": 473.8969388912494
    }
  },
  {
    "wallType": "normal",
    "p1": {
      "y": 473.8969388912494,
      "x": 4564.293965774905
    },
    "id": "wall_1792020317073_gzwx",
    "p2": {
      "y": 466.81069489124945,
      "x": 5365.0395377749055
    }
  },
  {
    "p1": {
      "y": 466.81069489124945,
      "x": 5365.0395377749055
    },
    "wallType": "normal",
    "id": "wall_1792020319906_wl3j",
    "p2": {
      "y": 2539.5370648912512,
      "x": 5377.440464774905
    }
  },
  {
    "p2": {
      "x": 4562.522404774905,
      "y": 2541.3086258912513
    },
    "wallType": "normal",
    "p1": {
      "y": 2539.5370648912512,
      "x": 5377.440464774905
    },
    "id": "wall_1792020321401_asqg"
  },
  {
    "p1": {
      "y": 2541.3086258912513,
      "x": 4562.522404774905
    },
    "id": "wall_1792020322949_0ebm",
    "wallType": "normal",
    "p2": {
      "x": 4562.522404774905,
      "y": 1735.2483708912505
    }
  },
  {
    "p1": {
      "x": 4557.207721774905,
      "y": 688.2558198912496
    },
    "id": "wall_1792020328082_ft0r",
    "p2": {
      "y": 700.6567468912497,
      "x": 3669.6556607749044
    },
    "wallType": "normal"
  },
  {
    "p2": {
      "x": 3669.655660774904,
      "y": 824.6660168912497
    },
    "wallType": "normal",
    "p1": {
      "y": 700.6567468912497,
      "x": 3669.6556607749044
    },
    "id": "wall_1792020328970_2xz1"
  },
  {
    "p1": {
      "x": 4124.946837774904,
      "y": 904.3862618912498
    },
    "wallType": "door",
    "id": "wall_1792020354942_fk2w",
    "doorState": "closed",
    "p2": {
      "x": 4121.403715774904,
      "y": 1046.1111418912499
    }
  },
  {
    "p1": {
      "x": 3666.1125387749044,
      "y": 814.0366508912497
    },
    "id": "wall_1792020375502_a60t",
    "wallType": "normal",
    "p2": {
      "x": 3566.905122774904,
      "y": 808.7219678912497
    }
  },
  {
    "p2": {
      "y": 904.3862618912498,
      "x": 4126.718398774905
    },
    "p1": {
      "y": 695.3420638912496,
      "x": 4124.946837774904
    },
    "wallType": "normal",
    "id": "wall_1792020379655_l7x5"
  },
  {
    "wallType": "normal",
    "p2": {
      "y": 826.4375778912497,
      "x": 3308.257216774904
    },
    "id": "wall_1792020383409_4phv",
    "p1": {
      "y": 822.8944558912497,
      "x": 3428.723364774904
    }
  },
  {
    "p2": {
      "x": 3302.942533774904,
      "y": 675.8548928912496
    },
    "id": "wall_1792020384545_q35c",
    "p1": {
      "y": 826.4375778912497,
      "x": 3308.257216774904
    },
    "wallType": "normal"
  },
  {
    "p2": {
      "y": 674.0833318912496,
      "x": 3047.837749774904
    },
    "p1": {
      "x": 3302.942533774904,
      "y": 675.8548928912496
    },
    "id": "wall_1792020385864_w98o",
    "wallType": "normal"
  },
  {
    "p1": {
      "x": 3047.837749774904,
      "y": 674.0833318912496
    },
    "id": "wall_1792020387051_lizx",
    "p2": {
      "y": 674.0833318912496,
      "x": 2835.2504297749038
    },
    "wallType": "normal"
  },
  {
    "p2": {
      "x": 2828.1641857749037,
      "y": 1184.29289989125
    },
    "wallType": "normal",
    "p1": {
      "x": 2835.2504297749038,
      "y": 674.0833318912496
    },
    "id": "wall_1792020388095_gg5j"
  },
  {
    "p1": {
      "x": 3205.506678774904,
      "y": 675.8548928912496
    },
    "id": "wall_1792020392081_nzj1",
    "p2": {
      "x": 3205.506678774904,
      "y": 918.5587498912498
    },
    "wallType": "normal"
  },
  {
    "p2": {
      "x": 3201.9635567749037,
      "y": 1065.5983128912499
    },
    "doorState": "closed",
    "id": "wall_1792020397102_ugx7",
    "p1": {
      "y": 913.2440668912498,
      "x": 3207.278239774904
    },
    "wallType": "door"
  },
  {
    "p1": {
      "y": 819.3513338912497,
      "x": 3418.093998774904
    },
    "wallType": "door",
    "id": "wall_1792020399653_n5s1",
    "doorState": "closed",
    "p2": {
      "y": 812.2650898912497,
      "x": 3584.6207327749044
    }
  },
  {
    "p1": {
      "x": 3558.047317774904,
      "y": 968.1624578912498
    },
    "id": "wall_1792020402688_gljt",
    "doorState": "closed",
    "p2": {
      "y": 814.0366508912497,
      "x": 3558.047317774904
    },
    "wallType": "door"
  },
  {
    "p2": {
      "x": 2381.2772048722286,
      "y": 1875.8826309932847
    },
    "id": "wall_1792020435749_vfx5",
    "wallType": "normal",
    "p1": {
      "x": 2695.433885382001,
      "y": 1672.1986293440914
    }
  },
  {
    "id": "wall_1792020436510_mjtx",
    "p1": {
      "y": 1875.8826309932847,
      "x": 2381.2772048722286
    },
    "wallType": "normal",
    "p2": {
      "x": 2315.6840517987594,
      "y": 1772.3144945614915
    }
  },
  {
    "p2": {
      "y": 805.6785545314223,
      "x": 2229.377271438932
    },
    "p1": {
      "y": 1658.389544486519,
      "x": 2691.981614167608
    },
    "wallType": "normal",
    "id": "wall_1792020439280_2lhk"
  },
  {
    "p2": {
      "x": 1846.1751666412972,
      "y": 1026.623912252581
    },
    "id": "wall_1792020440373_y6yt",
    "wallType": "normal",
    "p1": {
      "x": 2229.377271438932,
      "y": 805.6785545314223
    }
  },
  {
    "p2": {
      "x": 1932.4819470011248,
      "y": 1154.3579471851258
    },
    "id": "wall_1792020441537_5uvm",
    "wallType": "normal",
    "p1": {
      "x": 1846.1751666412972,
      "y": 1026.623912252581
    }
  },
  {
    "wallType": "normal",
    "p2": {
      "y": 1713.6258839168088,
      "x": 2129.2614062215316
    },
    "id": "wall_1792020444872_27qj",
    "p1": {
      "y": 1382.2078473350707,
      "x": 1925.5774045723385
    }
  },
  {
    "p2": {
      "x": 1984.2660152170213,
      "y": 1786.1235794190638
    },
    "wallType": "normal",
    "p1": {
      "x": 2129.2614062215316,
      "y": 1713.6258839168088
    },
    "id": "wall_1792020445928_vhat"
  },
  {
    "p2": {
      "y": 2017.425750783402,
      "x": 2118.9045925783525
    },
    "wallType": "normal",
    "p1": {
      "x": 1984.2660152170213,
      "y": 1786.1235794190638
    },
    "id": "wall_1792020448107_hqzd"
  },
  {
    "wallType": "normal",
    "p2": {
      "y": 2117.541616000802,
      "x": 1949.7433030730904
    },
    "id": "wall_1792020449189_1rxg",
    "p1": {
      "x": 2118.9045925783525,
      "y": 2017.425750783402
    }
  },
  {
    "p1": {
      "x": 1752.9638438526833,
      "y": 2234.9188372901676
    },
    "id": "wall_1792020451859_9ht0",
    "p2": {
      "y": 2352.296058579533,
      "x": 1604.5161816337798
    },
    "wallType": "normal"
  },
  {
    "p1": {
      "x": 1604.5161816337798,
      "y": 2352.296058579533
    },
    "wallType": "normal",
    "id": "wall_1792020455036_priz",
    "p2": {
      "y": 2369.5574146514987,
      "x": 1611.420724062566
    }
  },
  {
    "id": "wall_1792020455419_gib2",
    "p1": {
      "y": 2369.5574146514987,
      "x": 1611.420724062566
    },
    "p2": {
      "y": 2459.3164662257195,
      "x": 1607.968452848173
    },
    "wallType": "normal"
  },
  {
    "wallType": "normal",
    "p2": {
      "x": 1110.841397975566,
      "y": 1454.705542837326
    },
    "p1": {
      "y": 2172.777955431092,
      "x": 1521.6616724883454
    },
    "id": "wall_1792020459870_apix"
  },
  {
    "id": "wall_1792020461733_pe9m",
    "p1": {
      "x": 1110.841397975566,
      "y": 1454.705542837326
    },
    "wallType": "normal",
    "p2": {
      "x": 1694.2752332080006,
      "y": 1109.4784213980154
    }
  },
  {
    "p1": {
      "x": 1625.2298089201386,
      "y": 1150.9056759707328
    },
    "id": "wall_1792020465334_lhie",
    "p2": {
      "x": 1714.9888604943592,
      "y": 1285.5442533320638
    },
    "wallType": "normal"
  },
  {
    "p2": {
      "x": 2001.5273712889868,
      "y": 1810.2894779198157
    },
    "wallType": "normal",
    "p1": {
      "y": 1423.6351019077879,
      "x": 1780.5820135678282
    },
    "id": "wall_1792020467740_s3ux"
  },
  {
    "p2": {
      "y": 1872.4303597788914,
      "x": 1349.0481117686902
    },
    "wallType": "normal",
    "p1": {
      "y": 1603.1532050562294,
      "x": 1856.5319802844765
    },
    "id": "wall_1792020470580_a8ig"
  },
  {
    "p2": {
      "y": 2550.4379560970046,
      "x": 1566.7262282554764
    },
    "wallType": "normal",
    "p1": {
      "x": 1606.9889782554765,
      "y": 2457.0283760970046
    },
    "id": "wall_1792020475290_ke4a"
  },
  {
    "p2": {
      "y": 2618.0793760970046,
      "x": 1524.8529682554765
    },
    "wallType": "normal",
    "p1": {
      "y": 2550.4379560970046,
      "x": 1566.7262282554764
    },
    "id": "wall_1792020475918_6sbz"
  },
  {
    "wallType": "normal",
    "p2": {
      "x": 1433.0538982554763,
      "y": 2703.4364060970047
    },
    "id": "wall_1792020476635_nm7i",
    "p1": {
      "x": 1524.8529682554765,
      "y": 2618.0793760970046
    }
  },
  {
    "p2": {
      "x": 1367.0229882554763,
      "y": 2748.530686097005
    },
    "id": "wall_1792020477127_vwh3",
    "wallType": "normal",
    "p1": {
      "x": 1433.0538982554763,
      "y": 2703.4364060970047
    }
  },
  {
    "id": "wall_1792020477492_9cic",
    "p1": {
      "x": 1367.0229882554763,
      "y": 2748.530686097005
    },
    "wallType": "normal",
    "p2": {
      "y": 2777.519866097005,
      "x": 1255.8977982554761
    }
  },
  {
    "wallType": "normal",
    "p1": {
      "y": 2777.519866097005,
      "x": 1255.8977982554761
    },
    "id": "wall_1792020477892_i39l",
    "p2": {
      "y": 2779.130376097005,
      "x": 1141.5515882554762
    }
  },
  {
    "p2": {
      "y": 2751.751706097005,
      "x": 1007.8792582554761
    },
    "wallType": "normal",
    "p1": {
      "y": 2779.130376097005,
      "x": 1141.5515882554762
    },
    "id": "wall_1792020478281_lejd"
  },
  {
    "id": "wall_1792020478688_fak2",
    "p1": {
      "y": 2751.751706097005,
      "x": 1007.8792582554761
    },
    "p2": {
      "x": 967.616508255476,
      "y": 2700.2153860970047
    },
    "wallType": "normal"
  },
  {
    "p1": {
      "x": 967.616508255476,
      "y": 2700.2153860970047
    },
    "id": "wall_1792020479142_4b4s",
    "wallType": "normal",
    "p2": {
      "x": 880.6489682554759,
      "y": 2626.131926097005
    }
  },
  {
    "id": "wall_1792020479539_bp6b",
    "p1": {
      "y": 2626.131926097005,
      "x": 880.6489682554759
    },
    "wallType": "normal",
    "p2": {
      "y": 2545.6064260970047,
      "x": 833.9441782554759
    }
  },
  {
    "id": "wall_1792020480426_x2uk",
    "p1": {
      "x": 833.9441782554759,
      "y": 2545.6064260970047
    },
    "wallType": "normal",
    "p2": {
      "y": 2402.2710360970045,
      "x": 779.1868382554759
    }
  },
  {
    "id": "wall_1792020481003_95j7",
    "p1": {
      "x": 779.1868382554759,
      "y": 2402.2710360970045
    },
    "wallType": "normal",
    "p2": {
      "y": 2287.9248260970044,
      "x": 787.2393882554759
    }
  },
  {
    "wallType": "normal",
    "p2": {
      "x": 827.5021382554759,
      "y": 2133.3158660970043
    },
    "id": "wall_1792020481643_owce",
    "p1": {
      "y": 2287.9248260970044,
      "x": 787.2393882554759
    }
  },
  {
    "wallType": "normal",
    "p2": {
      "y": 2036.6852660970044,
      "x": 935.406308255476
    },
    "id": "wall_1792020482304_kznz",
    "p1": {
      "x": 827.5021382554759,
      "y": 2133.3158660970043
    }
  },
  {
    "p2": {
      "y": 1948.1072160970043,
      "x": 1141.5515882554762
    },
    "id": "wall_1792020483329_15jy",
    "p1": {
      "y": 2036.6852660970044,
      "x": 935.406308255476
    },
    "wallType": "normal"
  },
  {
    "p1": {
      "x": 1141.5515882554762,
      "y": 1948.1072160970043
    },
    "id": "wall_1792020484161_uhh0",
    "wallType": "normal",
    "p2": {
      "y": 1941.6651760970042,
      "x": 1263.9503482554762
    }
  },
  {
    "p2": {
      "y": 1803.1613160970041,
      "x": 1313.8761582554762
    },
    "wallType": "normal",
    "p1": {
      "y": 1941.6651760970042,
      "x": 1263.9503482554762
    },
    "id": "wall_1792020486490_gme4"
  },
  {
    "wallType": "door",
    "p1": {
      "y": 2299.1983960970047,
      "x": 1586.0523482554768
    },
    "p2": {
      "y": 2147.8104560970046,
      "x": 1507.1373582554766
    },
    "doorState": "closed",
    "id": "wall_1792020498241_5qk8"
  },
  {
    "wallType": "normal",
    "p2": {
      "x": 1584.4418382554766,
      "y": 2300.8089060970046
    },
    "p1": {
      "x": 1608.5994882554767,
      "y": 2347.5136960970044
    },
    "id": "wall_1792020504315_h1gm"
  },
  {
    "p1": {
      "y": 2115.600256097004,
      "x": 1946.806588255477
    },
    "wallType": "door",
    "id": "wall_1792020513367_idwo",
    "doorState": "closed",
    "p2": {
      "y": 2236.3885060970047,
      "x": 1748.7138582554767
    }
  },
  {
    "wallType": "door",
    "doorState": "closed",
    "p1": {
      "y": 2014.1381260970043,
      "x": 2114.2996282554773
    },
    "p2": {
      "y": 1869.192226097004,
      "x": 2383.2547982554775
    },
    "id": "wall_1792020519143_ud3t"
  },
  {
    "id": "wall_1792020523380_iw7s",
    "p2": {
      "y": 1431.1335060970039,
      "x": 1785.7555882554768
    },
    "p1": {
      "x": 1714.8931482554767,
      "y": 1282.9665860970038
    },
    "wallType": "door",
    "doorState": "closed"
  },
  {
    "wallType": "door",
    "p1": {
      "y": 1107.4209960970036,
      "x": 1693.9565182554768
    },
    "p2": {
      "x": 1851.7864982554768,
      "y": 1025.2849860970036
    },
    "id": "wall_1792020526045_g3k9",
    "doorState": "closed"
  },
  {
    "wallType": "normal",
    "id": "wall_1792020539909_u991",
    "p1": {
      "x": 3292.970710759558,
      "y": 1926.7844212302246
    },
    "p2": {
      "x": 3127.489941805178,
      "y": 1978.1405219402045
    }
  },
  {
    "p1": {
      "x": 3127.489941805178,
      "y": 1978.1405219402045
    },
    "wallType": "normal",
    "id": "wall_1792020540618_ic7b",
    "p2": {
      "y": 2060.8809064173947,
      "x": 3047.602674034098
    }
  },
  {
    "id": "wall_1792020541095_euaq",
    "p1": {
      "x": 3047.602674034098,
      "y": 2060.8809064173947
    },
    "wallType": "normal",
    "p2": {
      "y": 2135.0619407762547,
      "x": 2993.3934566180083
    }
  },
  {
    "wallType": "normal",
    "p2": {
      "y": 2209.2429751351146,
      "x": 2962.009172850798
    },
    "id": "wall_1792020541468_cb2c",
    "p1": {
      "y": 2135.0619407762547,
      "x": 2993.3934566180083
    }
  },
  {
    "p2": {
      "y": 2331.926993497845,
      "x": 2922.065538965258
    },
    "wallType": "normal",
    "p1": {
      "y": 2209.2429751351146,
      "x": 2962.009172850798
    },
    "id": "wall_1792020542054_3qv7"
  },
  {
    "wallType": "normal",
    "p2": {
      "y": 2443.198545036135,
      "x": 2916.3593055530378
    },
    "id": "wall_1792020542605_no2j",
    "p1": {
      "x": 2922.065538965258,
      "y": 2331.926993497845
    }
  },
  {
    "p2": {
      "x": 2993.3934566180083,
      "y": 2597.2668471660754
    },
    "id": "wall_1792020543229_x8yi",
    "wallType": "normal",
    "p1": {
      "x": 2916.3593055530378,
      "y": 2443.198545036135
    }
  },
  {
    "p2": {
      "y": 2682.8603483493753,
      "x": 3061.868257564648
    },
    "p1": {
      "y": 2597.2668471660754,
      "x": 2993.3934566180083
    },
    "id": "wall_1792020543758_xyjj",
    "wallType": "normal"
  },
  {
    "wallType": "normal",
    "id": "wall_1792020544564_geen",
    "p1": {
      "y": 2682.8603483493753,
      "x": 3061.868257564648
    },
    "p2": {
      "y": 2794.1318998876654,
      "x": 3258.7333102862385
    }
  },
  {
    "p1": {
      "y": 2794.1318998876654,
      "x": 3258.7333102862385
    },
    "wallType": "normal",
    "id": "wall_1792020545207_1vzq",
    "p2": {
      "y": 2805.5443667121053,
      "x": 3535.4856307789087
    }
  },
  {
    "wallType": "normal",
    "p2": {
      "y": 2711.391515410475,
      "x": 3669.5821159660786
    },
    "id": "wall_1792020545996_za3y",
    "p1": {
      "y": 2805.5443667121053,
      "x": 3535.4856307789087
    }
  },
  {
    "id": "wall_1792020546581_gy1q",
    "p1": {
      "x": 3669.5821159660786,
      "y": 2711.391515410475
    },
    "wallType": "normal",
    "p2": {
      "y": 2594.4137304599653,
      "x": 3763.7349672677087
    }
  },
  {
    "p1": {
      "y": 2594.4137304599653,
      "x": 3763.7349672677087
    },
    "wallType": "normal",
    "id": "wall_1792020547419_3uzz",
    "p2": {
      "x": 3832.209768214349,
      "y": 2360.458160558945
    }
  },
  {
    "p1": {
      "x": 3832.209768214349,
      "y": 2360.458160558945
    },
    "id": "wall_1792020548385_i4z1",
    "p2": {
      "y": 2183.564924780125,
      "x": 3803.678601153249
    },
    "wallType": "normal"
  },
  {
    "id": "wall_1792020549128_booh",
    "p1": {
      "y": 2183.564924780125,
      "x": 3803.678601153249
    },
    "wallType": "normal",
    "p2": {
      "x": 3629.638482080539,
      "y": 2003.8185722951946
    }
  },
  {
    "p2": {
      "x": 3469.8639465383785,
      "y": 1921.0781878180044
    },
    "p1": {
      "x": 3629.638482080539,
      "y": 2003.8185722951946
    },
    "wallType": "normal",
    "id": "wall_1792020549739_srz6"
  },
  {
    "wallType": "normal",
    "id": "wall_1792020550835_0enh",
    "p1": {
      "x": 3469.8639465383785,
      "y": 1921.0781878180044
    },
    "p2": {
      "x": 3281.5582439351183,
      "y": 1926.7844212302246
    }
  },
  {
    "p2": {
      "y": 1159.1868152288573,
      "x": 3430.1120656492635
    },
    "id": "wall_1792020700016_pgxs",
    "wallType": "normal",
    "p1": {
      "x": 3341.9248220058635,
      "y": 1156.5930727687573
    }
  },
  {
    "wallType": "normal",
    "p2": {
      "x": 3430.1120656492635,
      "y": 1607.904260826158
    },
    "id": "wall_1792020701403_6945",
    "p1": {
      "x": 3430.1120656492635,
      "y": 1159.1868152288573
    }
  },
  {
    "wallType": "normal",
    "p2": {
      "x": 3572.7679009547637,
      "y": 1607.904260826158
    },
    "id": "wall_1792020703139_qtm7",
    "p1": {
      "x": 3430.1120656492635,
      "y": 1607.904260826158
    }
  },
  {
    "p1": {
      "x": 3339.3310795457633,
      "y": 1151.4055878485574
    },
    "wallType": "door",
    "id": "wall_1792020708469_3y4p",
    "doorState": "closed",
    "p2": {
      "x": 3201.8627291604635,
      "y": 1153.9993303086574
    }
  }
];

export const DEMO_GV_ROOM_ZONES_2ND_FLOOR: RoomAnnotation[] = [
  {
    "hiddenMonsterNames": [],
    "boxedText": "The room contains a large bed, a sturdy trunk, a wooden nightstand, and a darkened fireplace. The windows here aren't boarded, and the window in the west wall is open slightly. In the middle of the room, an old man in an oversized black robe carefully removes a strip of parchment coiled around the leg of a raven while muttering kind words to the bird. Two more ravens watch from the rafters.",
    "polygonPoints": [
      59.319568711534586,
      53.22928776982876,
      57.070361708217874,
      53.0212381591744,
      57.122668847829885,
      38.353740608042095,
      47.60276943844284,
      38.56179021869645,
      47.49815515921881,
      58.11845362020619,
      59.424182990758624,
      57.598329593570284
    ],
    "bounds": {
      "x": 47.49815515921881,
      "y": 38.353740608042095,
      "height": 19.764713012164094,
      "width": 11.926027831539812
    },
    "pdfSection": "Guild House - 2nd Floor",
    "campaignId": "camp-mtouse1g",
    "color": "#f59e0b",
    "monsters": [
      "1x Oni (Gwish)",
      "3x Raven"
    ],
    "roomName": "Gwish's Room",
    "sceneId": "scene-muimqdr3",
    "dmNotes": "The man is an oni named Gwish. Guildmaster Dusk is the only other guild member who knows Gwish's true nature.\n\nGwish is reclusive and rarely interacts with the other guild members. The oni has three ravens that act as messengers, and it uses a ring of animal influence to speak with them. These ravens deliver secret messages to the guildmaster's spies abroad and receive similar messages from those spies.\n\nIf one or more characters interrupt the oni, it politely asks them to leave. If they refuse, it shoos away the ravens and attacks the characters. The oni's glaive leans in the northeast corner behind the door.\n\nGwish's Trunk. When the oni is hungry, it sneaks from the guildhouse and invisibly preys on the city, feeding primarily on anyone sleeping outside. The trunk at the foot of Gwish's bed is filled with gnawed bones mixed with small bundles of torn clothing.\n\nMaster Key. One of the deep pockets on Gwish's robe contains a master key that unlocks all doors in the guildhouse.\n\nRaven's Note. Gwish has received a note from one of Guildmaster Dusk's spies. The note is written in code on a slip of parchment, and only Guildmaster Dusk is authorized to read it. Gwish plans to deliver the message to Dusk once her guest leaves (see area G26).\n\nA comprehend languages spell can decipher the note, as can a character who succeeds on a DC 20 Intelligence (Investigation) check after studying the note for 1 minute. It reads, \"Constantori in danger. Cognoscenti retaliation imminent. Be on high alert.\"",
    "roomNumber": "G21",
    "id": "zone_1792019892989_61fhc",
    "label": "G21 - Gwish's Room"
  },
  {
    "sceneId": "scene-muimqdr3",
    "label": "G20: Private Room",
    "bounds": {
      "height": 15.302822601849542,
      "x": 47.35554212010938,
      "width": 5.792691494223341,
      "y": 22.689159596637616
    },
    "hiddenMonsterNames": [],
    "updatedAt": 1792020583586,
    "roomNumber": "G20",
    "id": "zone_1792020583544_aqpqx",
    "boxedText": "This private room contains a bed, a nightstand, a footlocker, and a small fireplace. A small oil lamp, a pewter water pitcher, and two mugs rest on the nightstand. Sitting on the edge of the bed is a heavy man in a nightgown.",
    "campaignId": "camp-mtouse1g",
    "color": "#f59e0b",
    "dmNotes": "A traveling merchant named Thyval Horne (neutral, human commoner) rents this room. On the nightstand rests a key that unlocks the door to this room. Beneath the bed is a copper chamber pot.\n\nRoleplaying Thyval. The merchant hasn't had a good night's sleep in days and quickly angers if disturbed. Characters who threaten Thyval or use magic to coerce him can pry the following information out of him:\n\n• Guildmaster Dusk is hosting an unscrupulous, well-connected noble named Dartinal Livereth. (Thyval suspects the two are lovers.)\n• Jaymont the Sinner, the guild's resident spy, is a master of disguise.\n• Thyval can't sleep because of the squawking birds in the room next door (area G21).",
    "roomName": "Private Room",
    "monsters": [
      "3x Thug",
      "1x Gladiator"
    ],
    "pdfSection": "Guild House - 2nd Floor",
    "polygonPoints": [
      53.14823361433272,
      22.77513051013115,
      53.06177553232939,
      37.734069458006545,
      47.48522924311438,
      37.99198219848716,
      47.35554212010938,
      22.689159596637616
    ]
  },
  {
    "sceneId": "scene-muimqdr3",
    "roomNumber": "G19",
    "dmNotes": "A bandit stationed atop this balcony watches for trouble coming from the north and west. If she sees anything suspicious or threatening, she shouts loud enough to put the rest of the guildhouse on high alert. This bandit carries a key that unlocks the door to area G14.\n\nSpyglass. The spyglass attached to the balcony is missing one of its lenses and is nonfunctional.",
    "campaignId": "camp-mtouse1g",
    "boxedText": "A wooden railing encloses this balcony. Mounted on one corner of the railing is a copper spyglass.",
    "pdfSection": "Guild House - 2nd Floor",
    "hiddenMonsterNames": [],
    "label": "G19: North Balcony",
    "polygonPoints": [
      55.30968566441605,
      15.983428344141748,
      55.39614374641939,
      26.6438216173403,
      60.62685770762106,
      26.38590887685969,
      60.75654483062607,
      15.983428344141748
    ],
    "bounds": {
      "y": 15.983428344141748,
      "height": 10.660393273198553,
      "width": 5.446859166210018,
      "x": 55.30968566441605
    },
    "roomName": "North Balcony",
    "id": "zone_1792020609883_ni4n6",
    "monsters": [
      "1x Doppelganger (Jaymont the Sinner)"
    ],
    "color": "#f59e0b",
    "updatedAt": 1792020609915
  },
  {
    "boxedText": "Wooden doors line the walls of this L-shaped hallway.",
    "bounds": {
      "width": 8.602579159331668,
      "y": 23.720810558560053,
      "height": 10.57442235970501,
      "x": 59.76227688758773
    },
    "polygonPoints": [
      61.361751404649404,
      23.720810558560053,
      68.3648560469194,
      23.720810558560053,
      68.27839796491607,
      34.295232918265064,
      59.89196401059272,
      33.69343652381032,
      59.76227688758773,
      27.761443492756282,
      61.88049989666939,
      27.675472579262745
    ],
    "dmNotes": "Closets. The two small rooms to the north are closets behind unlocked doors. One stores a mop and broom, a few buckets, and a stack of copper chamber pots. The other has shelves holding linens, blankets, soap, and candles.",
    "sceneId": "scene-muimqdr3",
    "updatedAt": 1792020642586,
    "pdfSection": "Guild House - 2nd Floor",
    "campaignId": "camp-mtouse1g",
    "color": "#f59e0b",
    "id": "zone_1792020642548_0sebi",
    "roomNumber": "G15",
    "monsters": [],
    "roomName": "L-Shaped Hall",
    "label": "G15 - L-Shaped Hall",
    "hiddenMonsterNames": []
  },
  {
    "bounds": {
      "x": 59.6758188055844,
      "y": 34.89702931271983,
      "height": 22.0085538543454,
      "width": 6.873417519265004
    },
    "sceneId": "scene-muimqdr3",
    "campaignId": "camp-mtouse1g",
    "label": "G16: Stablemaster's Quarters",
    "roomName": "Stablemaster's Quarters",
    "roomNumber": "G16",
    "monsters": [
      "1x Spider"
    ],
    "color": "#f59e0b",
    "dmNotes": "This room belongs to the stablemaster, Laris Drot (neutral, human commoner), who is a stout woman in her fifties. Laris carries two keys on her person: one unlocks the door to this room, and the other unlocks the doors to area G7.\n\nA wooden trunk at the foot of Laris's bed contains folded clothing and personal effects.\n\nTreasure. On a nightstand, next to a set of keys to the stables, is a coin pouch containing 5 gp, 13 sp, and 25 cp.\n\nDevelopment. If Laris is here when the stable hand in area G2b bangs his pail, Laris heads to the stables to find out what's going on. It takes her 1 minute to get there.",
    "hiddenMonsterNames": [],
    "boxedText": "",
    "updatedAt": 1792020673169,
    "id": "zone_1792020673124_f5vux",
    "pdfSection": "Guild House - 2nd Floor",
    "polygonPoints": [
      66.5492363248494,
      34.89702931271983,
      59.8055059285894,
      35.154942053200436,
      59.6758188055844,
      56.90558316706523,
      66.2898620788394,
      56.64767042658462
    ]
  },
  {
    "dmNotes": "The north door leading to area G19 is locked; the other doors are unlocked.",
    "polygonPoints": [
      58.89769606755439,
      27.331588925288596,
      58.940925108556065,
      38.42183676595483,
      53.66698210635272,
      37.30421489053886,
      53.926356352362724,
      28.449210800704577
    ],
    "color": "#f59e0b",
    "boxedText": "This rectangular room has a door on every wall. A plaque on the west door says, \"Private Rooms.\"",
    "campaignId": "camp-mtouse1g",
    "label": "G14: Upstairs Foyer",
    "updatedAt": 1792020722515,
    "hiddenMonsterNames": [],
    "roomNumber": "G14",
    "sceneId": "scene-muimqdr3",
    "id": "zone_1792020722474_677oo",
    "monsters": [
      "1x Doppelganger (Jaymont the Sinner)"
    ],
    "roomName": "Upstairs Foyer",
    "pdfSection": "Guild House - 2nd Floor",
    "bounds": {
      "y": 27.331588925288596,
      "width": 5.273943002203346,
      "height": 11.090247840666233,
      "x": 53.66698210635272
    }
  },
  {
    "bounds": {
      "y": 35.364147011070614,
      "x": 68.97946117981671,
      "width": 6.602253534799999,
      "height": 21.023796117964878
    },
    "dmNotes": "This room stinks of horse manure due to its proximity to the stables. It contains four neatly made beds, each with its own nightstand and empty footlocker. An oil-filled lantern rests atop each nightstand. Beneath each bed is a copper chamber pot.\n\nTreasure. One of the lanterns is a lantern of revealing. No one in the guild is aware the lantern is magical.",
    "pdfSection": "Guild House - 2nd Floor",
    "sceneId": "scene-muimqdr3",
    "monsters": [],
    "roomName": "Large Common Room",
    "polygonPoints": [
      68.97946117981671,
      35.364147011070614,
      69.0973585643667,
      55.99716624951942,
      75.54241558643338,
      56.38794312903549,
      75.58171471461671,
      35.59861313878026
    ],
    "color": "#f59e0b",
    "hiddenMonsterNames": [],
    "campaignId": "camp-mtouse1g",
    "id": "zone_1792021804842_g2wmi",
    "roomNumber": "g18",
    "boxedText": "Nailed to this lengthy porch are short planks that bear the words \"Private Property. No Trespassing!\" in Common. A lookout is stationed on a second-floor balcony above the western end of the porch.",
    "label": "g18 - Large Common Room"
  },
  {
    "color": "#f59e0b",
    "pdfSection": "Guild House - 2nd Floor",
    "polygonPoints": [
      69.01876030800004,
      23.71899600149155,
      69.05805943618337,
      33.2539518616838,
      75.58171471461671,
      33.48841798939344,
      75.58171471461671,
      23.71899600149155
    ],
    "label": "g17 - Small Common Room",
    "monsters": [],
    "boxedText": "Nailed to this lengthy porch are short planks that bear the words \"Private Property. No Trespassing!\" in Common. A lookout is stationed on a second-floor balcony above the western end of the porch.",
    "roomNumber": "g17",
    "roomName": "Small Common Room",
    "id": "zone_1792021825663_una1r",
    "hiddenMonsterNames": [],
    "sceneId": "scene-muimqdr3",
    "campaignId": "camp-mtouse1g",
    "dmNotes": "This room stinks of horse manure due to its proximity to the stables. It contains two neatly made beds, two empty footlockers, and a nightstand with an oil-filled lantern hanging above it. Beneath each bed is a copper chamber pot.",
    "bounds": {
      "x": 69.01876030800004,
      "width": 6.562954406616669,
      "height": 9.76942198790189,
      "y": 23.71899600149155
    }
  },
  {
    "hiddenMonsterNames": [],
    "pdfSection": "The Guild House - Main Level",
    "boxedText": "",
    "color": "#f59e0b",
    "id": "zone_1792021841155_jnbyg",
    "monsters": [
      "1x Commoner (Needly Pitts)"
    ],
    "campaignId": "camp-mtouse1g",
    "polygonPoints": [
      88.86482004058337,
      82.80446018432222,
      76.52489379101671,
      82.88261556022543,
      76.7606885601167,
      17.310255177427905,
      88.62902527148339,
      17.38841055333112
    ],
    "dmNotes": "The hayloft is 10 feet above the stables and consists of a 5-foot-wide wooden walkway that runs the perimeter of the building. Broad, square loading doors open in the north and south walls, each fitted with block-and-tackle rigs for hoisting hay bales and other supplies into the loft. Hay bales and burlap sacks stuffed with feed grains take up most of the space. A few pitchforks, ropes, and feed buckets lie scattered about the bales.\n\nStable Hand. A young stable hand named Needly Pitts (neutral, human commoner) lazes in the loft, supposedly guarding against horse thieves. He has nodded off but wakes if characters disturb the horses, make too much noise in the barn, or start a fire. In the event of trouble, Needly bangs a metal pail and yells for the stablemaster (see area G16), who takes 1 minute to arrive.",
    "bounds": {
      "y": 17.310255177427905,
      "height": 65.57236038279753,
      "x": 76.52489379101671,
      "width": 12.339926249566659
    },
    "roomName": "Hayloft",
    "sceneId": "scene-muimqdr3",
    "label": "g2b - Hayloft",
    "roomNumber": "g2b"
  },
  {
    "label": "g23 - Stolen Goods",
    "updatedAt": 1792163888302,
    "pdfSection": "Guild House - 2nd Floor",
    "boxedText": "Deep scrapes crisscross the floor of this spacious room, and wood shavings scatter the perimeter. A string of oil lanterns dangles from the ceiling, suspended on block and tackle above several containers—mostly small casks and crates, although there's an earth-encrusted coffin here as well.",
    "id": "zone_1792021855996_xdbg2",
    "hiddenMonsterNames": [
      "Elix The Saint, During Day"
    ],
    "color": "#f59e0b",
    "sceneId": "scene-muimqdr3",
    "bounds": {
      "height": 31.965548744414995,
      "x": 31.330896380183344,
      "width": 12.850814915950007,
      "y": 28.0956970520716
    },
    "polygonPoints": [
      44.18171129613335,
      54.43405873145512,
      39.898106324150014,
      60.061245796486595,
      31.330896380183344,
      34.191816372522375,
      36.91137258221668,
      28.0956970520716
    ],
    "campaignId": "camp-mtouse1g",
    "roomName": "Stolen Goods",
    "monsters": [
      "1x Bandit Captain (Elix the Saint, during day)"
    ],
    "roomNumber": "g23",
    "dmNotes": "Elix the Saint (lawful evil, human bandit captain; see the \"Elix the Saint\" section earlier in the adventure) works here during the day. Armed with a crowbar, he examines containers stolen by the Agile Hand. He then records their contents (and the estimated value of those contents) in a leather-bound ledger.\n\nMaster Key. Elix carries a master key that unlocks all doors in the guildhouse complex.\n\nTreasure. The following stolen goods are stored here:\n\n• Six casks of exquisite elven wine (250 gp each)\n• Wooden chest containing six poisoner's kits\n• Wooden crate containing eight sets of thieves' tools\n• Wooden crate containing two spyglasses (1,000 gp each) packed in beds of straw\n• Dirty wooden coffin containing the moldy corpse of a human priest wearing a copper holy symbol shaped like the sun (25 gp), a sun-shaped death mask made of gold (250 gp), and a necklace of prayer beads"
  },
  {
    "color": "#f59e0b",
    "boxedText": "This office contains a plain wooden desk, a simple chair, and a fireplace. A door in the south corner sports a plaque that says, \"Private! Enter at your own risk.\"",
    "pdfSection": "Guild House - 2nd Floor",
    "sceneId": "scene-muimqdr3",
    "dmNotes": "A bandit stands guard outside the door to Guildmaster Dusk's quarters (area G26). The bandit's job is to shout at the first sign of trouble, thus alerting the guildmaster.\n\nDesk. If the characters search the desk at night, they find a leather-bound ledger in an unlocked drawer, along with a writing quill and a jar of ink. The ledger provides an account of stolen goods acquired by the Agile Hand, but Constantori's Portrait is not among the items listed.",
    "label": "g24 - Elix's Office",
    "id": "zone_1792021866488_8evv9",
    "roomNumber": "g24",
    "hiddenMonsterNames": [],
    "polygonPoints": [
      30.662811201066674,
      52.011242078455446,
      22.8029855644,
      60.53017805190589,
      19.226764899716663,
      48.02531790739147,
      27.12588966456667,
      39.506381933941014
    ],
    "campaignId": "camp-mtouse1g",
    "monsters": [
      "1x Bandit"
    ],
    "roomName": "Elix's Office",
    "bounds": {
      "y": 39.506381933941014,
      "width": 11.43604630135001,
      "x": 19.226764899716663,
      "height": 21.023796117964878
    }
  },
  {
    "roomNumber": "g24",
    "dmNotes": "A bandit stands guard outside the door to Guildmaster Dusk's quarters (area G26). The bandit's job is to shout at the first sign of trouble, thus alerting the guildmaster.\n\nDesk. If the characters search the desk at night, they find a leather-bound ledger in an unlocked drawer, along with a writing quill and a jar of ink. The ledger provides an account of stolen goods acquired by the Agile Hand, but Constantori's Portrait is not among the items listed.",
    "boxedText": "This office contains a plain wooden desk, a simple chair, and a fireplace. A door in the south corner sports a plaque that says, \"Private! Enter at your own risk.\"",
    "hiddenMonsterNames": [],
    "id": "zone_1792021878692_yb75g",
    "polygonPoints": [
      31.016503354716672,
      53.80881572422938,
      23.667566384433332,
      62.249596321776636,
      27.086590536383337,
      75.77047635303285,
      34.55342489121667,
      65.84474361332452
    ],
    "campaignId": "camp-mtouse1g",
    "sceneId": "scene-muimqdr3",
    "color": "#f59e0b",
    "pdfSection": "Guild House - 2nd Floor",
    "monsters": [
      "1x Bandit"
    ],
    "roomName": "Elix's Office",
    "label": "g24 - Elix's Office",
    "bounds": {
      "y": 53.80881572422938,
      "x": 23.667566384433332,
      "height": 21.961660628803465,
      "width": 10.88585850678334
    }
  },
  {
    "roomNumber": "g22",
    "campaignId": "camp-mtouse1g",
    "boxedText": "A wooden railing encloses this balcony. Mounted on one corner of the railing is a copper spyglass.",
    "polygonPoints": [
      39.54441417050001,
      63.03115008080877,
      27.47958181821667,
      77.95882687832287,
      28.972948689183337,
      84.6801892059994,
      41.352174066933344,
      68.97095864945314
    ],
    "pdfSection": "Guild House - 2nd Floor",
    "sceneId": "scene-muimqdr3",
    "color": "#f59e0b",
    "id": "zone_1792021888546_frqyy",
    "hiddenMonsterNames": [],
    "dmNotes": "A bandit stationed atop this balcony watches for trouble coming from the south and east. If she sees anything suspicious or threatening, she shouts loud enough to put the rest of the guildhouse on high alert. This bandit carries keys that unlock the doors to areas G23, G24, and G25.\n\nSpyglass. The spyglass, which is damaged but functional, is worth 250 gp.",
    "monsters": [
      "1x Bandit"
    ],
    "roomName": "South Balcony",
    "label": "g22 - South Balcony",
    "bounds": {
      "width": 13.872592248716675,
      "x": 27.47958181821667,
      "height": 21.649039125190626,
      "y": 63.03115008080877
    }
  },
  {
    "label": "g26 - Dusk's Quarters",
    "dmNotes": "Unless she has been lured elsewhere, Guildmaster Dusk (lawful evil, half-elf assassin) is asleep in bed with her lover, a politically influential noble named Dartinal Livereth (lawful evil, human noble). Neither is wearing armor, but they keep their weapons within reach.\n\nIf the guildhouse is on high alert, Dusk leaves the room to find out what's happening. Meanwhile, Dartinal smokes a pipe in bed and waits for Dusk to return.\n\nFireplace. Resting on the fireplace mantel are a wedge of soap, a brush, a clay pipe, and an ivory tobacco jar carved in the shape of a skull. Buried in the ashes of the hearth is a spare shortsword covered with soot.\n\nLeather Trunk. This trunk holds a spare, loaded light crossbow under some linens, bedding, and neatly folded outfits.\n\nMaster Key. Guildmaster Dusk keeps a master key on a nightstand next to her bed, and she takes it with her when she leaves the room. The key unlocks all doors in the guildhouse complex.",
    "id": "zone_1792021904392_nwi8y",
    "campaignId": "camp-mtouse1g",
    "boxedText": "This circular room contains a canopied bed with a leather trunk at the foot of it and a fireplace. Wooden staircases hug the walls—one leading up, the other down. The scent of tobacco hangs in the air.",
    "sceneId": "scene-muimqdr3",
    "color": "#f59e0b",
    "polygonPoints": [
      24.021258538083334,
      70.377755415711,
      19.934149207016663,
      66.31367586874381,
      16.98671459326666,
      69.36173552896922,
      14.943159927733326,
      73.66028120364604,
      14.471570389533325,
      80.53795428312898,
      16.12213377323333,
      86.94669510719264,
      18.755175361516667,
      89.4476671360955,
      22.48859253893333,
      87.80640424212798,
      24.9251384863,
      83.27339243974153,
      25.632522793600003,
      76.9428069915811
    ],
    "roomNumber": "g26",
    "roomName": "Dusk's Quarters",
    "monsters": [
      "1x Assassin (Guildmaster Dusk)",
      "1x Noble (Dartinal Livereth)"
    ],
    "hiddenMonsterNames": [],
    "bounds": {
      "x": 14.471570389533325,
      "height": 23.13399126735169,
      "y": 66.31367586874381,
      "width": 11.160952404066679
    },
    "pdfSection": "Guild House - 2nd Floor"
  },
  {
    "color": "#f59e0b",
    "campaignId": "camp-mtouse1g",
    "sceneId": "scene-muimqdr3",
    "bounds": {
      "x": 20.562935257949995,
      "height": 7.424760710805458,
      "width": 4.873091894733339,
      "y": 83.1952370638383
    },
    "roomNumber": "up to g27",
    "dmNotes": "The north door leading to area G19 is locked; the other doors are unlocked.",
    "id": "zone_1792021917185_a449o",
    "label": "up to g27 - Upstairs Foyer",
    "boxedText": "This rectangular room has a door on every wall. A plaque on the west door says, \"Private Rooms.\"",
    "monsters": [],
    "roomName": "Upstairs Foyer",
    "polygonPoints": [
      23.9819594099,
      83.1952370638383,
      20.562935257949995,
      87.65009349032157,
      21.859806488,
      90.61999777464376,
      25.436027152683334,
      84.28941232648332
    ],
    "pdfSection": "Guild House - 2nd Floor",
    "pdfPage": 1,
    "hiddenMonsterNames": []
  },
  {
    "id": "zone_1792021930364_uicb9",
    "monsters": [
      "1x Thug"
    ],
    "roomName": "Tower Rotunda",
    "dmNotes": "A thug sits near the bottom of the stairs, engrossed in a saucy novella. If this guard detects intruders, he tries to run up the stairs to wake Guildmaster Dusk in area G26.",
    "bounds": {
      "y": 69.12726940125957,
      "height": 12.583015520417646,
      "width": 2.868836357383337,
      "x": 13.960681723149992
    },
    "sceneId": "scene-muimqdr3",
    "pdfSection": "The Guild House - Main Level",
    "hiddenMonsterNames": [],
    "campaignId": "camp-mtouse1g",
    "color": "#f59e0b",
    "polygonPoints": [
      16.82951808053333,
      70.9248430470335,
      15.218253825016658,
      69.12726940125957,
      13.960681723149992,
      81.71028492167721,
      15.886339004133326,
      81.24135266625792
    ],
    "boxedText": "A lit fireplace warms this mostly empty tower chamber. A wooden staircase hugs the west wall.",
    "label": "down to g13 - Tower Rotunda",
    "roomNumber": "down to g13"
  },
  {
    "polygonPoints": [
      56.60023580206669,
      65.45396673380844,
      51.80574216370002,
      68.89280327354993,
      50.43027267728335,
      74.83261184219427,
      50.23377703636669,
      82.41368330480616,
      52.27733170190002,
      88.74426875296658,
      56.63953493025002,
      90.69815315054697,
      60.09785821038336,
      87.49378273851515,
      63.438284105966694,
      78.42775913374217,
      62.49510502956669,
      72.9568828205171,
      59.86206344128336,
      67.48600650729205
    ],
    "campaignId": "camp-mtouse1g",
    "id": "zone_1792021959579_kqfkp",
    "boxedText": "This tower chamber is lit by a pewter chandelier suspended from beams that support a conical roof. A cluttered writing desk and a padded chair are positioned opposite the descending staircase. A gold-framed painting of a beautiful, well-dressed man hangs in a shallow alcove near the top of the stairs.",
    "monsters": [
      "Constantori's Portrait (Guardian Portrait)"
    ],
    "roomName": "Tower Peak",
    "roomNumber": "g27",
    "color": "#f59e0b",
    "dmNotes": "This room is situated at the top of the tower and is off limits to everyone except Guildmaster Dusk, who comes here to reflect, doodle in her diary, and gaze upon her latest acquisition: Constantori's Portrait.\n\nCharacters who search the guildmaster's cluttered desk find sketches and descriptions of deadly mechanical traps, including a rough sketch of the trap in this room (see \"Trap\" below).\n\nConstantori's Portrait. The painting that hangs in the alcove is Constantori's Portrait (described at the end of the adventure). Guildmaster Dusk is attuned to the painting and has commanded it to defend itself against all creatures except her. As an action, a character can throw a sheet over the painting, making it unable to cast spells.\n\nThe Cognoscenti Esoterica was wrong about one thing: Guildmaster Dusk has no intention of selling the painting. By learning its secrets, she hopes to become as notorious and wealthy as the late Daiyani Grysthorn, the crime lord who commissioned the painting in the first place.\n\nTrap. Canisters of poisonous gas are hidden in the wall behind the painting. Removing the painting from its hooks without first disabling the trap causes the gas to spew from tiny holes previously concealed by the painting. Each creature in the room when the gas is released must make a DC 14 Constitution saving throw, taking 36 (8d8) poison damage on a failed save, or half as much damage on a successful one.\n\nA character who searches the alcove for traps spots the holes behind the painting with a successful DC 12 Wisdom (Perception) check. This check is made with advantage if the character saw the trap's sketch in Dusk's diary. Once the trap is detected, a character can spend 1 minute trying to disable it, either by plugging the holes or by placing counterweights on the hooks as someone else carefully lifts the painting. The character trying to disable the trap must make a DC 15 Dexterity (Sleight of Hand) check, disabling the trap on a success and triggering the trap on a failure.",
    "bounds": {
      "width": 13.204507069600005,
      "height": 25.24418641673853,
      "x": 50.23377703636669,
      "y": 65.45396673380844
    },
    "hiddenMonsterNames": [],
    "label": "g27 - Tower Peak",
    "sceneId": "scene-muimqdr3",
    "pdfSection": "Guild House - 2nd Floor"
  }
];

export const DEMO_GV_SCENE_2ND_FLOOR: Scene = {
  sceneId: "scene-muimqdr3",
  sceneTitle: "Guild House - 2nd Floor",
  mapUrl: guildhouse2ndFloorImg,
  mapThumbnailUrl: guildhouse2ndFloorImg,
  mapWidth: 6000,
  mapHeight: 3017,
  dmNotes: "ADVENTURE: Masterpiece Imbroglio (Keys from the Golden Vault)\nLOCATION: Guildhouse Upper Level - Guest quarters, common rooms, loot processing, offices, Dusk's private quarters, and high tower peak with Constantori's Portrait.",
  tokens: [],
  gridSize: 50,
  gridOpacity: 0.3,
  isFogVisible: true,
  walls: DEMO_GV_WALLS_2ND_FLOOR,
  visionConfig: {
    enabled: true,
    explorationMemory: true,
    darknessOpacity: 0.85,
    dimVisionOpacity: 0.4,
    ambientLight: false,
    dmPreviewMode: true,
    showDoorBadges: true
  },
  roomAnnotations: DEMO_GV_ROOM_ZONES_2ND_FLOOR
};

export const DEMO_GV_CHAPTER: Chapter = {
  chapterId: "chap-mtoussuc",
  chapterTitle: "Masterpiece Imbroglio",
  orderIndex: 0,
  pdfFilename: 'Keys_from_the_Golden_Vault_Masterpiece_Imbroglio.pdf',
  pdfDigest: DEMO_GV_PDF_DIGEST,
  scenes: [DEMO_GV_SCENE, DEMO_GV_SCENE_2ND_FLOOR]
};

export const DEMO_GV_CAMPAIGN: Campaign = {
  campaignId: "camp-mtouse1g",
  campaignTitle: "Keys to the Golden Vault",
  description: "Keys from the Golden Vault: Masterpiece Imbroglio. Operatives infiltrate the Agile Hand thieves guildhouse to recover Constantori's occult sentient portrait.",
  createdAt: 1700000000000,
  chapters: [DEMO_GV_CHAPTER]
};
