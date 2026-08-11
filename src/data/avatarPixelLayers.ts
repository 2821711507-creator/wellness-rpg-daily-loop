export type PixelFill = 'skin'|'skinShade'|'hair'|'hairShade'|'fabric'|'fabricShade'|'shoe'|'ink'|'white'
export interface PixelRect { x:number; y:number; width:number; height:number; fill:PixelFill }
export type AvatarPixelLayer = Record<string, PixelRect[]>

const r = (x:number, y:number, width:number, height:number, fill:PixelFill):PixelRect => ({ x, y, width, height, fill })

export const AVATAR_PIXEL_LAYERS:AvatarPixelLayer = {
  'base-male':[
    r(11,7,10,2,'skinShade'), r(9,9,14,11,'skin'), r(8,12,1,5,'skinShade'), r(23,12,1,5,'skinShade'),
    r(12,13,2,2,'ink'), r(18,13,2,2,'ink'), r(15,17,3,1,'skinShade'), r(14,19,4,1,'ink'),
    r(12,20,8,3,'skin'), r(8,23,16,15,'skin'), r(6,25,3,12,'skin'), r(23,25,3,12,'skin'),
    r(10,38,5,8,'skin'), r(17,38,5,8,'skin'),
  ],
  'base-female':[
    r(11,7,10,2,'skinShade'), r(9,9,14,11,'skin'), r(8,12,1,5,'skinShade'), r(23,12,1,5,'skinShade'),
    r(12,13,2,2,'ink'), r(18,13,2,2,'ink'), r(15,17,3,1,'skinShade'), r(14,19,4,1,'ink'),
    r(12,20,8,3,'skin'), r(10,23,12,15,'skin'), r(7,25,3,12,'skin'), r(22,25,3,12,'skin'),
    r(11,38,4,8,'skin'), r(17,38,4,8,'skin'),
  ],
  'hair-short-back':[r(9,7,14,3,'hairShade'), r(8,10,2,7,'hairShade'), r(22,10,2,7,'hairShade')],
  'hair-short-front':[r(10,6,12,3,'hair'), r(8,8,16,4,'hair'), r(9,12,4,2,'hair'), r(19,11,4,2,'hairShade')],
  'hair-bob-back':[r(7,8,18,13,'hairShade'), r(6,12,3,13,'hairShade'), r(23,12,3,13,'hairShade')],
  'hair-bob-front':[r(9,6,14,4,'hair'), r(7,9,18,4,'hair'), r(8,12,5,5,'hair'), r(20,12,4,5,'hairShade')],
  'hair-wave-back':[r(7,8,18,14,'hairShade'), r(5,12,4,15,'hairShade'), r(23,12,4,15,'hairShade'), r(7,24,4,3,'hair')],
  'hair-wave-front':[r(9,6,14,3,'hair'), r(7,9,18,4,'hair'), r(8,12,4,5,'hair'), r(20,11,5,6,'hairShade'), r(11,9,4,2,'hairShade')],
  'hair-tied-back':[r(8,8,16,11,'hairShade'), r(23,10,4,5,'hair'), r(25,13,3,6,'hairShade')],
  'hair-tied-front':[r(10,6,12,3,'hair'), r(8,9,16,4,'hair'), r(9,12,4,4,'hair'), r(19,11,5,3,'hairShade')],
  'top-runner':[r(8,23,16,4,'white'), r(8,27,16,11,'fabric'), r(6,25,3,9,'fabric'), r(23,25,3,9,'fabric'), r(14,23,4,5,'fabricShade')],
  'top-gym':[r(9,23,14,15,'fabricShade'), r(7,24,3,11,'fabricShade'), r(22,24,3,11,'fabricShade'), r(11,24,10,3,'fabric'), r(15,27,2,9,'white')],
  'top-walk':[r(8,23,16,15,'fabric'), r(6,25,3,10,'fabric'), r(23,25,3,10,'fabric'), r(9,24,14,3,'white'), r(12,29,8,2,'fabricShade'), r(15,23,2,15,'fabricShade')],
  'bottom-pants':[r(9,37,14,4,'ink'), r(10,41,5,6,'ink'), r(17,41,5,6,'ink'), r(15,39,2,5,'fabricShade')],
  'bottom-shorts':[r(9,37,14,5,'fabricShade'), r(10,42,5,2,'fabricShade'), r(17,42,5,2,'fabricShade'), r(15,38,2,5,'ink')],
  'shoes-trainers':[r(8,45,7,3,'white'), r(17,45,7,3,'white'), r(8,47,8,1,'shoe'), r(16,47,8,1,'shoe'), r(10,45,4,1,'fabric')],
  'shoes-walk':[r(8,45,7,3,'shoe'), r(17,45,7,3,'shoe'), r(8,47,8,1,'ink'), r(16,47,8,1,'ink'), r(9,45,5,1,'white')],
}
