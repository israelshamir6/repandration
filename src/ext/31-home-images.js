/* Demo images for the original home & calisthenics moves, matched to the same movement in free-exercise-db (public domain). */
const HOME_IMG = {"squat":"Bodyweight_Squat","glute-bridge":"Single_Leg_Glute_Bridge","reverse-lunge":"Crossover_Reverse_Lunge","calf-raise":"Standing_Calf_Raises","step-up":"Dumbbell_Step_Ups",
 "incline-pushup":"Incline_Push-Up","pushup":"Pushups","chair-dip":"Bench_Dips","superman":"Superman","plank":"Plank","side-plank":"Push_Up_to_Side_Plank","dead-bug":"Dead_Bug",
 "mountain-climber":"Mountain_Climbers","jump-squat":"Weighted_Jump_Squat","tuck-jump":"Knee_Tuck_Jump","pullup":"Pullups","hang-knee":"Hanging_Leg_Raise",
 "band-pullapart":"Band_Pull_Apart","band-walk":"Monster_Walk","kb-swing":"One-Arm_Kettlebell_Swings","goblet-squat":"Goblet_Squat",
 "kb-clean-press":"Clean_and_Press","kb-snatch":"One-Arm_Kettlebell_Snatch","db-floor-press":"Dumbbell_Floor_Press","db-rdl":"Romanian_Deadlift","db-press":"Dumbbell_Shoulder_Press",
 "db-thruster":"Kettlebell_Thruster","renegade-row":"Alternating_Renegade_Row","split-squat":"Split_Squats",
 "sl-bridge":"Single_Leg_Glute_Bridge","walking-lunge":"Bodyweight_Walking_Lunge","decline-pushup":"Decline_Push-Up","archer-pushup":"Single-Arm_Push-Up","wide-pushup":"Push-Up_Wide",
 "inverted-row":"Inverted_Row","chinup":"Chin-Up","neg-pullup":"Band_Assisted_Pull-Up","scap-pullup":"Scapular_Pull-Up","crunch":"Crunches","bicycle":"Oblique_Crunches",
 "reverse-crunch":"Reverse_Crunch","russian-twist":"Russian_Twist","flutter-kick":"Flutter_Kicks","situp":"Sit-Up","toe-touch":"Toe_Touchers","hang-leg-raise":"Hanging_Leg_Raise",
 "pallof":"Pallof_Press","band-chop":"Standing_Cable_Wood_Chop","kb-windmill":"Kettlebell_Windmill","butt-kick":"Single_Leg_Butt_Kick","star-jump":"Star_Jump","inchworm":"Inchworm","band-squat":"Squat_with_Bands","band-goodmorning":"Band_Good_Morning","band-pushdown":"Triceps_Pushdown","band-facepull":"Face_Pull","kb-halo":"Kettlebell_Halo","kb-row":"One-Arm_Kettlebell_Row","farmer-carry":"Farmers_Walk","kb-highpull":"Kettlebell_Sumo_High_Pull",
 "db-lateral":"Side_Lateral_Raise","db-triext":"Kettlebell_Overhead_Triceps_Extension","db-hammer":"Hammer_Curls","db-stepup":"Dumbbell_Step_Ups","wall-pushup":"Incline_Push-Up","sl-rdl":"Kettlebell_One-Legged_Deadlift",
 "skater":"Lateral_Cone_Hops"};
for (const [id, img] of Object.entries(HOME_IMG)) if (EX[id]) EX[id].img = img;
