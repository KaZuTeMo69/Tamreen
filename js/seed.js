/* his first three sessions, restored from the CSV export */
const S=(w,r,r2)=>({w:w===null?"":String(w),r:String(r),r2:r2===undefined?"":String(r2),warm:false});
const SEED_SESSIONS=[
 {date:"2026-08-23",workout:"A",entries:{
   a1:[S(60,10),S(80,10),S(100,10)], a2:[S(10,12),S(12,10),S(14,10)],
   a3:[S(25,12),S(35,10),S(45,10)], a4:[S(12,10),S(14,10),S(16,10)],
   a5:[S(5,10,10),S(7.5,10,10),S(10,6,5)], a6:[S(null,20),S(null,10),S(null,10)]},
  names:{a3:"Chest Cable Row"}},
 {date:"2026-08-24",workout:"B",entries:{
   b1:[S(null,2),S(null,2),S(null,0),S(null,0)],
   b2:[S(2.5,10,10),S(5,10,10),S(10,10,10)], b3:[S(8,10,10),S(12,10,10),S(14,10,10)],
   b4:[S(25,12),S(35,11),S(50,8)], b5:[S(7,12,12),S(9,11,11),S(12,7,7)],
   b6:[S(null,38),S(null,32),S(null,30)]}},
 {date:"2026-08-27",workout:"C",entries:{
   c1:[S(null,10),S(null,9),S(null,7),S(null,6)], c2:[S(20,8),S(30,7),S(40,5)],
   c3:[S(12,12,12),S(14,10,10),S(18,10,10)], c4b:[S(40,12),S(45,11),S(50,10)],
   c5:[S(12.5,12),S(15,15),S(20,12)], c6:[S(10,15),S(20,13),S(20,10),S(30,10)]},
  names:{c4b:"Seated Leg Curl",c6:"Seated Calf Raise"}}];
