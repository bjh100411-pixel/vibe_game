import { STAGES } from '../config.js';
export const BOSS_ROOMS = {8:'bloodKnight',16:'furnaceBeast',20:'abyssSovereign'};
export function stageForRoom(room){ return STAGES[Math.min(4,Math.floor((room-1)/4))]; }
export function roomType(room){ if(BOSS_ROOMS[room]) return 'boss'; if(room===4||room===12) return 'elite'; return 'normal'; }
