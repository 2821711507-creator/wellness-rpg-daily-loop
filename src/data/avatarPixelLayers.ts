export type PixelFill =
  | 'skinLight'|'skin'|'skinShade'|'skinDeep'
  | 'hairLight'|'hair'|'hairShade'|'hairDeep'
  | 'fabricLight'|'fabric'|'fabricShade'|'fabricDeep'
  | 'shoeLight'|'shoe'|'shoeShade'|'outline'|'eye'|'eyeLight'|'mouth'|'innerTop'|'innerBottom'

export interface PixelRect { x:number; y:number; width:number; height:number; fill:PixelFill }
export type AvatarPixelLayer = Record<string, PixelRect[]>

export const AVATAR_FACE_FEATURES = ['brows', 'eyes', 'nose', 'mouth', 'underlayer'] as const
export type AvatarFaceFeature = typeof AVATAR_FACE_FEATURES[number]

const r = (x:number, y:number, width:number, height:number, fill:PixelFill):PixelRect => ({ x, y, width, height, fill })

const faceShell = [
  // A stepped oval keeps the head soft without anti-aliasing.
  r(29,8,38,3,'skinDeep'), r(25,11,46,7,'skinDeep'), r(22,18,52,27,'skinDeep'),
  r(24,45,48,9,'skinDeep'), r(29,54,38,6,'skinDeep'),
  r(29,10,37,4,'skin'), r(26,14,43,7,'skin'), r(24,21,47,24,'skin'),
  r(27,45,42,8,'skin'), r(32,53,32,5,'skin'),
  // Ears remain readable with every hairstyle.
  r(19,31,6,14,'skinDeep'), r(20,33,5,9,'skin'), r(71,30,6,14,'skinDeep'), r(71,32,5,9,'skin'),
  r(21,35,3,4,'skinLight'), r(72,34,2,4,'skinShade'),
  // Light comes from the upper left; the opposite jaw has two shadow steps.
  r(30,15,17,3,'skinLight'), r(27,22,4,13,'skinLight'), r(29,39,5,3,'skinLight'),
  r(67,21,4,24,'skinShade'), r(64,45,5,8,'skinShade'), r(60,53,4,4,'skinShade'),
  r(24,40,3,5,'skinShade'), r(28,49,4,4,'skinShade'), r(34,56,6,2,'skinLight'),
  r(27,42,5,2,'mouth'), r(66,42,4,2,'mouth'),
  r(38,57,20,4,'skinDeep'),
]

const maleBody = [
  // Neck and broad, relaxed shoulders.
  r(38,55,21,15,'skinDeep'), r(41,56,15,12,'skin'), r(53,57,4,10,'skinShade'), r(42,57,5,3,'skinLight'),
  r(17,63,62,8,'skinDeep'), r(22,68,53,31,'skinDeep'), r(27,96,44,9,'skinDeep'),
  r(20,65,56,7,'skin'), r(25,70,47,27,'skin'), r(29,96,40,7,'skin'),
  r(25,70,4,22,'skinLight'), r(67,70,5,27,'skinShade'),
  // Separated arms create clean sleeve and accessory anchors.
  r(15,66,13,31,'skinDeep'), r(12,91,14,16,'skinDeep'),
  r(17,67,9,28,'skin'), r(14,92,10,12,'skin'), r(17,69,3,19,'skinLight'), r(22,89,4,13,'skinShade'),
  r(69,66,13,31,'skinDeep'), r(75,91,11,16,'skinDeep'),
  r(71,68,9,27,'skin'), r(77,92,7,12,'skin'), r(76,69,4,21,'skinShade'), r(78,93,3,8,'skinLight'),
  // The right leg advances two pixels lower than the left.
  r(28,98,42,10,'skinDeep'), r(30,104,18,29,'skinDeep'), r(49,102,20,34,'skinDeep'),
  r(31,100,36,7,'skin'), r(33,105,14,27,'skin'), r(51,104,16,31,'skin'),
  r(34,106,4,20,'skinLight'), r(43,106,4,25,'skinShade'), r(62,106,5,28,'skinShade'),
  // Bare feet: rear baseline 136, forward baseline 139.
  r(29,128,19,9,'skinDeep'), r(31,127,16,8,'skin'), r(32,128,7,3,'skinLight'), r(42,132,5,3,'skinShade'),
  r(48,131,24,10,'skinDeep'), r(50,130,18,9,'skin'), r(51,131,8,3,'skinLight'), r(64,135,6,4,'skinShade'),
]

const femaleBody = [
  // The same pose and stature, with subtly softer shoulder and waist steps.
  r(38,55,21,15,'skinDeep'), r(41,56,15,12,'skin'), r(53,57,4,10,'skinShade'), r(42,57,5,3,'skinLight'),
  r(19,63,59,8,'skinDeep'), r(24,68,49,30,'skinDeep'), r(27,94,44,12,'skinDeep'),
  r(21,65,55,7,'skin'), r(27,70,43,25,'skin'), r(29,94,40,10,'skin'),
  r(27,70,4,20,'skinLight'), r(65,70,5,25,'skinShade'),
  r(16,66,12,31,'skinDeep'), r(13,91,13,16,'skinDeep'),
  r(18,67,8,28,'skin'), r(15,92,9,12,'skin'), r(18,69,3,19,'skinLight'), r(22,89,4,13,'skinShade'),
  r(68,66,13,31,'skinDeep'), r(74,91,11,16,'skinDeep'),
  r(70,68,9,27,'skin'), r(76,92,7,12,'skin'), r(75,69,4,21,'skinShade'), r(77,93,3,8,'skinLight'),
  r(27,97,43,11,'skinDeep'), r(30,104,18,29,'skinDeep'), r(49,102,20,34,'skinDeep'),
  r(30,99,38,8,'skin'), r(33,105,14,27,'skin'), r(51,104,16,31,'skin'),
  r(34,106,4,20,'skinLight'), r(43,106,4,25,'skinShade'), r(62,106,5,28,'skinShade'),
  r(29,128,19,9,'skinDeep'), r(31,127,16,8,'skin'), r(32,128,7,3,'skinLight'), r(42,132,5,3,'skinShade'),
  r(48,131,24,10,'skinDeep'), r(50,130,18,9,'skin'), r(51,131,8,3,'skinLight'), r(64,135,6,4,'skinShade'),
]

const brows = [
  r(31,29,13,3,'hairDeep'), r(33,28,10,2,'hairShade'), r(54,28,13,3,'hairDeep'), r(55,27,10,2,'hairShade'),
  r(32,29,5,1,'hairLight'), r(55,28,5,1,'hairLight'),
]

const eyes = [
  // Large whites, dark upper lashes, deep irises, and asymmetric catchlights.
  r(30,34,15,6,'outline'), r(32,35,12,5,'eyeLight'), r(36,35,6,5,'eye'),
  r(38,35,2,2,'eyeLight'), r(36,39,3,1,'outline'), r(42,36,3,3,'outline'),
  r(53,34,15,6,'outline'), r(54,35,12,5,'eyeLight'), r(56,35,6,5,'eye'),
  r(57,35,2,2,'eyeLight'), r(59,39,3,1,'outline'), r(53,36,3,3,'outline'),
]

const nose = [
  r(47,40,3,7,'skinShade'), r(50,44,3,4,'skinDeep'), r(46,47,7,2,'skinShade'),
  r(46,41,2,4,'skinLight'), r(48,47,3,1,'skinLight'),
]

const mouth = [
  r(42,48,3,2,'skinDeep'), r(45,49,10,3,'skinDeep'), r(55,48,3,2,'skinDeep'),
  r(45,49,10,2,'mouth'), r(47,49,6,1,'eyeLight'), r(47,51,6,1,'mouth'),
]

const maleUnderlayer = [
  // Fixed ivory performance tank.
  r(27,62,16,7,'outline'), r(54,62,17,7,'outline'), r(29,68,41,31,'outline'),
  r(29,63,13,8,'innerTop'), r(56,63,13,8,'innerTop'), r(31,69,37,27,'innerTop'),
  r(39,62,19,5,'skin'), r(42,64,13,4,'skinShade'),
  r(32,71,3,20,'eyeLight'), r(64,72,3,20,'fabricShade'), r(31,94,37,3,'fabricShade'),
  // Fixed fitted shorts are intentionally distinct from collectible bottoms.
  r(27,96,43,17,'outline'), r(29,98,39,12,'innerBottom'), r(29,109,18,6,'innerBottom'), r(50,109,18,7,'innerBottom'),
  r(32,99,31,2,'fabricLight'), r(47,100,4,14,'outline'), r(30,112,17,3,'fabricShade'), r(51,113,17,3,'fabricShade'),
]

const femaleUnderlayer = [
  r(28,62,15,7,'outline'), r(54,62,16,7,'outline'), r(30,68,39,29,'outline'),
  r(30,63,12,8,'innerTop'), r(56,63,12,8,'innerTop'), r(32,69,35,25,'innerTop'),
  r(39,62,19,5,'skin'), r(42,64,13,4,'skinShade'),
  r(33,71,3,19,'eyeLight'), r(63,72,3,18,'fabricShade'), r(32,92,35,3,'fabricShade'),
  r(27,94,43,19,'outline'), r(29,96,39,14,'innerBottom'), r(29,109,18,6,'innerBottom'), r(50,109,18,7,'innerBottom'),
  r(32,97,31,2,'fabricLight'), r(47,98,4,16,'outline'), r(30,112,17,3,'fabricShade'), r(51,113,17,3,'fabricShade'),
]

export const AVATAR_PIXEL_LAYERS:AvatarPixelLayer = {
  'base-male':[...faceShell, ...maleBody],
  'base-female':[...faceShell, ...femaleBody],
  'base-male-brows':[...brows], 'base-female-brows':[...brows],
  'base-male-eyes':[...eyes], 'base-female-eyes':[...eyes],
  'base-male-nose':[...nose], 'base-female-nose':[...nose],
  'base-male-mouth':[...mouth], 'base-female-mouth':[...mouth],
  'base-male-underlayer':maleUnderlayer, 'base-female-underlayer':femaleUnderlayer,

  // Short: an airy side part with a neat tapered nape.
  'hair-short-back':[
    r(23,7,49,18,'hairDeep'), r(20,18,8,28,'hairDeep'), r(68,18,8,29,'hairDeep'), r(31,50,34,13,'hairDeep'),
    r(25,8,44,15,'hairShade'), r(22,20,7,22,'hairShade'), r(67,20,7,23,'hair'), r(34,51,29,9,'hairShade'),
    r(28,9,19,4,'hair'), r(30,9,12,3,'hairLight'),
  ],
  'hair-short-front':[
    r(25,5,43,6,'hairDeep'), r(21,10,53,12,'hairDeep'), r(20,18,12,19,'hairDeep'), r(67,17,8,24,'hairDeep'),
    r(27,6,38,5,'hair'), r(23,11,48,9,'hair'), r(22,18,10,15,'hairShade'), r(66,18,7,20,'hairShade'),
    r(25,17,18,10,'hair'), r(40,14,16,11,'hairShade'), r(54,12,16,12,'hair'),
    r(29,8,17,3,'hairLight'), r(27,13,11,3,'hairLight'), r(46,16,7,3,'hairLight'),
    r(23,29,7,8,'hairDeep'), r(68,35,5,7,'hairDeep'),
  ],

  // Bob: graphic chin-length panels with a glossy rounded crown.
  'hair-bob-back':[
    r(21,6,53,13,'hairDeep'), r(17,17,62,33,'hairDeep'), r(19,46,18,20,'hairDeep'), r(60,46,17,21,'hairDeep'),
    r(23,8,49,13,'hairShade'), r(19,19,12,31,'hairShade'), r(66,19,11,33,'hairDeep'),
    r(21,44,15,19,'hair'), r(61,44,13,20,'hairShade'),
    r(25,9,18,5,'hair'), r(28,9,13,3,'hairLight'), r(22,51,7,8,'hairLight'),
  ],
  'hair-bob-front':[
    r(24,5,45,6,'hairDeep'), r(20,10,55,12,'hairDeep'), r(19,18,12,29,'hairDeep'), r(67,18,9,31,'hairDeep'),
    r(26,6,40,5,'hair'), r(22,11,50,9,'hair'), r(21,19,9,25,'hairShade'), r(66,19,8,27,'hairShade'),
    r(26,16,17,12,'hair'), r(40,14,16,10,'hairShade'), r(54,12,17,13,'hair'),
    r(29,8,18,3,'hairLight'), r(25,13,11,3,'hairLight'), r(56,15,8,3,'hairLight'),
    r(20,41,9,13,'hair'), r(68,42,7,13,'hairDeep'), r(21,49,6,7,'hairLight'),
  ],

  // Wave: long S-curves assembled from offset square clusters.
  'hair-wave-back':[
    r(20,6,56,16,'hairDeep'), r(15,18,17,48,'hairDeep'), r(65,17,17,50,'hairDeep'),
    r(12,45,17,27,'hairDeep'), r(68,47,17,29,'hairDeep'), r(17,68,15,12,'hairDeep'), r(62,69,18,13,'hairDeep'),
    r(22,8,51,14,'hairShade'), r(17,20,13,31,'hairShade'), r(67,20,13,31,'hair'),
    r(14,48,13,20,'hair'), r(70,50,12,21,'hairShade'), r(19,66,11,10,'hairShade'), r(64,68,15,10,'hair'),
    r(25,9,20,5,'hair'), r(28,9,14,3,'hairLight'), r(16,38,6,12,'hairLight'), r(70,28,5,14,'hairLight'),
    r(15,59,6,7,'hairLight'), r(72,61,6,7,'hair'),
  ],
  'hair-wave-front':[
    r(24,4,46,7,'hairDeep'), r(19,10,57,13,'hairDeep'), r(18,19,13,25,'hairDeep'), r(67,18,10,27,'hairDeep'),
    r(26,5,41,6,'hair'), r(21,11,52,10,'hair'), r(20,20,10,21,'hairShade'), r(66,20,9,21,'hairShade'),
    r(25,17,17,12,'hair'), r(40,14,17,11,'hairShade'), r(55,11,17,15,'hair'),
    r(29,7,18,3,'hairLight'), r(24,13,10,3,'hairLight'), r(56,15,9,3,'hairLight'),
    r(18,38,9,12,'hair'), r(69,38,7,13,'hairDeep'), r(19,42,5,6,'hairLight'),
  ],

  // Tied: a swept crown and high segmented ponytail create the sportiest silhouette.
  'hair-tied-back':[
    r(22,6,52,18,'hairDeep'), r(19,18,11,32,'hairDeep'), r(67,18,10,32,'hairDeep'),
    r(70,12,13,13,'hairDeep'), r(78,20,11,18,'hairDeep'), r(75,34,12,20,'hairDeep'), r(72,50,11,14,'hairDeep'),
    r(24,8,48,15,'hairShade'), r(21,20,8,27,'hairShade'), r(67,20,8,26,'hair'),
    r(72,14,9,9,'hair'), r(79,22,8,13,'hairShade'), r(76,36,9,15,'hair'), r(73,52,8,9,'hairShade'),
    r(27,9,18,5,'hair'), r(30,9,12,3,'hairLight'), r(75,15,4,5,'hairLight'), r(78,38,4,8,'hairLight'),
  ],
  'hair-tied-front':[
    r(24,4,45,7,'hairDeep'), r(20,10,55,13,'hairDeep'), r(19,19,12,25,'hairDeep'), r(67,18,9,27,'hairDeep'),
    r(26,5,40,6,'hair'), r(22,11,50,10,'hair'), r(21,20,9,21,'hairShade'), r(66,20,8,21,'hairShade'),
    r(25,17,16,12,'hair'), r(39,14,19,11,'hairShade'), r(56,11,16,15,'hair'),
    r(29,7,18,3,'hairLight'), r(25,13,10,3,'hairLight'), r(57,15,8,3,'hairLight'),
    r(21,38,7,9,'hairDeep'), r(69,38,6,10,'hairDeep'),
  ],

  // Powder-blue zip runner vest.
  'top-runner':[
    r(26,62,17,7,'fabricDeep'), r(54,62,18,7,'fabricDeep'), r(28,68,43,31,'fabricDeep'),
    r(28,64,14,8,'fabric'), r(56,64,14,8,'fabricShade'), r(30,70,39,26,'fabric'),
    r(39,63,19,5,'skin'), r(42,65,13,4,'innerTop'),
    r(31,71,4,20,'fabricLight'), r(64,71,5,22,'fabricShade'), r(66,76,3,17,'fabricDeep'),
    r(47,69,4,28,'fabricDeep'), r(48,70,2,25,'fabricLight'), r(34,76,11,3,'fabricLight'),
    r(30,95,39,4,'fabricShade'), r(42,83,4,4,'fabricDeep'),
  ],

  // Muted-coral gym tee with compact sleeves and a curved chest yoke.
  'top-gym':[
    r(20,63,22,12,'fabricDeep'), r(55,63,22,12,'fabricDeep'), r(27,67,44,31,'fabricDeep'),
    r(22,65,18,8,'fabric'), r(57,65,18,8,'fabricShade'), r(29,68,40,27,'fabric'),
    r(39,64,19,5,'skin'), r(42,66,13,4,'innerTop'),
    r(30,70,5,18,'fabricLight'), r(64,70,5,22,'fabricShade'), r(66,76,3,16,'fabricDeep'),
    r(34,72,29,4,'fabricLight'), r(36,76,27,3,'fabricShade'), r(47,76,4,19,'fabricDeep'),
    r(29,94,40,4,'fabricShade'), r(22,71,7,3,'fabricLight'), r(68,71,7,3,'fabricDeep'),
  ],

  // Sage walking jacket covers the arms but keeps both hands visible.
  'top-walk':[
    r(19,63,24,10,'fabricDeep'), r(54,63,24,10,'fabricDeep'), r(26,68,46,31,'fabricDeep'),
    r(16,69,13,27,'fabricDeep'), r(68,69,13,27,'fabricDeep'),
    r(21,65,19,7,'fabric'), r(56,65,19,7,'fabricShade'), r(28,70,42,26,'fabric'),
    r(18,71,10,22,'fabric'), r(70,71,9,22,'fabricShade'),
    r(39,64,19,5,'skin'), r(42,66,13,4,'innerTop'),
    r(29,71,5,20,'fabricLight'), r(65,71,5,21,'fabricShade'), r(76,73,3,18,'fabricDeep'),
    r(47,69,4,28,'fabricDeep'), r(48,70,2,25,'fabricLight'),
    r(18,92,11,4,'fabricShade'), r(69,92,11,4,'fabricDeep'), r(28,95,42,4,'fabricShade'),
    r(34,78,10,3,'fabricLight'), r(53,80,11,3,'fabricShade'),
  ],

  // Charcoal tapered training pants follow the shared hip and staggered ankle anchors.
  'bottom-pants':[
    r(27,96,43,12,'fabricDeep'), r(29,105,19,29,'fabricDeep'), r(49,103,21,34,'fabricDeep'),
    r(29,98,39,8,'fabric'), r(31,106,16,25,'fabric'), r(51,105,17,29,'fabricShade'),
    r(31,99,30,3,'fabricLight'), r(33,107,4,20,'fabricLight'), r(44,107,3,23,'fabricShade'),
    r(64,107,4,25,'fabricDeep'), r(47,102,5,29,'fabricDeep'),
    r(31,129,17,5,'fabricShade'), r(50,132,19,5,'fabricDeep'), r(33,112,10,3,'fabricLight'),
  ],

  // Navy running shorts leave the long leg silhouette and bare feet visible.
  'bottom-shorts':[
    r(27,96,43,18,'fabricDeep'), r(28,98,42,13,'fabric'), r(29,109,19,8,'fabricDeep'), r(49,108,21,10,'fabricDeep'),
    r(30,99,32,3,'fabricLight'), r(31,102,4,9,'fabricLight'), r(64,101,5,10,'fabricShade'),
    r(47,99,5,17,'fabricDeep'), r(30,111,17,4,'fabricShade'), r(51,112,18,4,'fabricDeep'),
    r(36,104,8,3,'fabricLight'), r(55,105,8,3,'fabricShade'),
  ],

  // Ivory trainers with powder-blue midsoles.
  'shoes-trainers':[
    r(28,126,21,12,'outline'), r(47,129,26,13,'outline'),
    r(30,127,17,8,'shoe'), r(49,130,20,8,'shoe'), r(32,127,9,3,'shoeLight'), r(51,130,10,3,'shoeLight'),
    r(42,131,5,4,'shoeShade'), r(64,134,6,4,'shoeShade'),
    r(29,135,20,3,'shoeShade'), r(48,138,25,3,'shoeShade'), r(31,136,17,2,'shoeLight'), r(50,139,21,2,'shoeLight'),
    r(34,131,10,2,'outline'), r(53,134,11,2,'outline'), r(36,130,2,2,'shoeLight'), r(55,133,2,2,'shoeLight'),
  ],

  // Stone walking shoes have deeper toe guards and a practical tread.
  'shoes-walk':[
    r(27,125,22,13,'outline'), r(47,128,27,14,'outline'),
    r(29,126,18,9,'shoe'), r(49,129,21,9,'shoe'), r(31,126,9,3,'shoeLight'), r(51,129,9,3,'shoeLight'),
    r(41,129,6,6,'shoeShade'), r(64,132,7,6,'shoeShade'),
    r(28,135,21,3,'shoeShade'), r(48,138,26,3,'shoeShade'), r(30,136,18,2,'shoeLight'), r(50,139,22,2,'shoeLight'),
    r(33,131,11,2,'outline'), r(53,134,12,2,'outline'), r(36,130,2,2,'shoeLight'), r(56,133,2,2,'shoeLight'),
  ],

  // A low-profile wellness cap preserves the eye line and reads at card scale.
  'hat-wellness-cap':[
    r(25,3,43,7,'fabricDeep'), r(21,8,53,9,'fabricDeep'), r(63,14,19,5,'fabricDeep'),
    r(27,4,39,6,'fabric'), r(23,9,48,6,'fabric'), r(64,15,16,3,'fabric'),
    r(29,5,18,3,'fabricLight'), r(25,10,13,3,'fabricLight'), r(66,15,9,2,'fabricLight'),
    r(57,9,14,6,'fabricShade'), r(69,12,5,5,'fabricDeep'), r(46,5,4,5,'fabricDeep'),
    r(47,6,2,2,'fabricLight'),
  ],

  // Cross-body strap, compact pouch, and bottle form one readable accessory silhouette.
  'accessory-bottle-pouch':[
    r(31,65,6,7,'fabricDeep'), r(35,70,6,10,'fabricDeep'), r(39,78,6,10,'fabricDeep'),
    r(43,86,6,11,'fabricDeep'), r(47,95,7,11,'fabricDeep'),
    r(33,66,3,6,'fabric'), r(37,72,3,7,'fabricShade'), r(41,80,3,7,'fabric'),
    r(45,88,3,8,'fabricShade'), r(49,97,3,8,'fabricLight'),
    r(57,92,18,18,'fabricDeep'), r(59,94,14,14,'fabric'), r(60,95,5,5,'fabricLight'),
    r(68,95,5,11,'fabricShade'), r(59,105,14,3,'fabricShade'), r(63,91,7,4,'fabricDeep'),
    r(77,83,8,22,'fabricDeep'), r(78,85,6,18,'fabric'), r(79,86,3,7,'fabricLight'),
    r(78,99,6,5,'fabricShade'), r(79,80,4,5,'fabricDeep'), r(80,79,2,3,'fabricLight'),
  ],
}
