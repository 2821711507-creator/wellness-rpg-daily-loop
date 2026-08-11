export type PixelFill = 'skin'|'skinShade'|'hair'|'hairShade'|'fabric'|'fabricShade'|'shoe'|'ink'|'white'
export interface PixelRect { x:number; y:number; width:number; height:number; fill:PixelFill }
export type AvatarPixelLayer = Record<string, PixelRect[]>

const r = (x:number, y:number, width:number, height:number, fill:PixelFill):PixelRect => ({ x, y, width, height, fill })

const face = [
  r(18,14,28,24,'skin'), r(16,20,3,11,'skinShade'), r(45,20,3,11,'skinShade'), r(21,37,22,4,'skinShade'),
  r(22,21,7,2,'hairShade'), r(35,21,7,2,'hairShade'),
  r(22,24,7,7,'white'), r(35,24,7,7,'white'), r(24,24,5,7,'ink'), r(35,24,5,7,'ink'),
  r(25,24,2,2,'white'), r(36,24,2,2,'white'), r(20,32,5,2,'skinShade'), r(39,32,5,2,'skinShade'),
  r(31,29,2,4,'skinShade'), r(29,35,6,2,'ink'), r(30,35,4,1,'white'),
]

export const AVATAR_PIXEL_LAYERS:AvatarPixelLayer = {
  'base-male':[
    ...face, r(27,40,10,8,'skin'), r(15,48,34,27,'skin'), r(9,51,8,24,'skin'), r(47,51,8,24,'skin'),
    r(10,72,7,8,'skin'), r(47,72,7,8,'skin'), r(19,73,11,19,'skin'), r(34,73,11,19,'skin'),
  ],
  'base-female':[
    ...face, r(27,40,10,8,'skin'), r(18,48,28,27,'skin'), r(11,51,7,24,'skin'), r(46,51,7,24,'skin'),
    r(11,72,7,8,'skin'), r(46,72,7,8,'skin'), r(20,73,10,19,'skin'), r(34,73,10,19,'skin'),
  ],
  'hair-short-back':[r(17,10,30,10,'hairShade'), r(14,17,6,18,'hairShade'), r(44,16,6,18,'hairShade'), r(20,8,24,5,'hair')],
  'hair-short-front':[r(19,7,25,5,'hair'), r(16,11,32,8,'hair'), r(15,17,8,9,'hair'), r(21,16,7,5,'hairShade'), r(28,14,8,6,'hair'), r(36,12,10,8,'hairShade'), r(43,18,5,7,'hair')],
  'hair-bob-back':[r(15,9,34,13,'hairShade'), r(12,17,8,30,'hairShade'), r(44,17,8,30,'hairShade'), r(16,38,8,12,'hair'), r(40,38,8,12,'hairShade')],
  'hair-bob-front':[r(19,7,26,5,'hair'), r(15,11,34,8,'hair'), r(14,17,9,14,'hair'), r(21,14,9,7,'hairShade'), r(29,12,9,8,'hair'), r(37,11,11,10,'hairShade'), r(43,19,6,12,'hair')],
  'hair-wave-back':[r(14,8,36,15,'hairShade'), r(10,17,10,37,'hairShade'), r(44,17,10,37,'hairShade'), r(8,34,8,19,'hair'), r(48,35,8,20,'hairShade'), r(13,50,9,6,'hair'), r(42,49,9,7,'hairShade')],
  'hair-wave-front':[r(19,6,26,6,'hair'), r(14,11,36,9,'hair'), r(13,18,10,15,'hair'), r(21,14,8,8,'hairShade'), r(28,11,9,9,'hair'), r(37,10,12,11,'hairShade'), r(43,19,7,14,'hair'), r(16,30,5,7,'hairShade')],
  'hair-tied-back':[r(15,9,34,15,'hairShade'), r(13,18,8,25,'hairShade'), r(43,17,8,23,'hairShade'), r(47,9,9,11,'hair'), r(52,16,7,15,'hairShade'), r(50,27,6,12,'hair')],
  'hair-tied-front':[r(19,7,27,5,'hair'), r(15,11,35,9,'hair'), r(14,18,9,13,'hair'), r(22,14,8,8,'hairShade'), r(30,12,8,8,'hair'), r(38,11,11,10,'hairShade'), r(44,19,6,11,'hair')],
  'top-runner':[
    r(16,47,32,7,'white'), r(14,53,36,22,'fabric'), r(9,51,8,23,'fabric'), r(47,51,8,23,'fabric'),
    r(11,54,4,17,'fabricShade'), r(49,54,4,17,'fabricShade'), r(25,50,14,4,'fabricShade'), r(31,53,2,22,'white'),
    r(18,57,8,2,'fabricShade'), r(38,57,8,2,'fabricShade'), r(17,72,14,3,'fabricShade'), r(33,72,14,3,'fabricShade'),
  ],
  'top-gym':[
    r(19,47,26,5,'white'), r(17,51,30,24,'fabricShade'), r(12,52,7,21,'fabricShade'), r(45,52,7,21,'fabricShade'),
    r(20,52,24,6,'fabric'), r(22,58,20,15,'fabricShade'), r(30,51,4,24,'white'), r(14,70,6,4,'fabric'), r(44,70,6,4,'fabric'),
  ],
  'top-walk':[
    r(16,47,32,6,'white'), r(14,52,36,23,'fabric'), r(9,51,8,23,'fabric'), r(47,51,8,23,'fabric'),
    r(11,54,4,17,'fabricShade'), r(49,54,4,17,'fabricShade'), r(18,54,28,4,'white'), r(31,53,2,22,'fabricShade'),
    r(21,61,9,7,'fabricShade'), r(34,61,9,7,'fabricShade'), r(18,72,12,3,'fabricShade'), r(34,72,12,3,'fabricShade'),
  ],
  'bottom-pants':[
    r(16,73,32,8,'ink'), r(18,80,13,13,'ink'), r(33,80,13,13,'ink'), r(30,78,4,11,'fabricShade'),
    r(20,81,8,2,'fabricShade'), r(36,81,8,2,'fabricShade'), r(18,90,13,4,'fabricShade'), r(33,90,13,4,'fabricShade'),
  ],
  'bottom-shorts':[
    r(16,73,32,8,'fabricShade'), r(18,80,13,8,'fabricShade'), r(33,80,13,8,'fabricShade'), r(30,77,4,11,'ink'),
    r(20,80,8,2,'fabric'), r(36,80,8,2,'fabric'), r(18,86,13,3,'ink'), r(33,86,13,3,'ink'),
  ],
  'shoes-trainers':[
    r(15,89,16,6,'white'), r(33,89,16,6,'white'), r(13,93,18,3,'shoe'), r(33,93,18,3,'shoe'),
    r(18,90,9,2,'fabric'), r(36,90,9,2,'fabric'), r(15,94,8,1,'white'), r(41,94,8,1,'white'),
  ],
  'shoes-walk':[
    r(14,89,17,6,'shoe'), r(33,89,17,6,'shoe'), r(12,93,19,3,'ink'), r(33,93,19,3,'ink'),
    r(17,90,10,2,'white'), r(36,90,10,2,'white'), r(14,94,8,1,'fabric'), r(43,94,8,1,'fabric'),
  ],
}
