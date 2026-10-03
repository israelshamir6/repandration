/* Calisthenics skill progressions and on-the-road moves, written for Rep & Ration.
   [id, name, impact, pattern, equip, metric, dose, muscles, level, steps, road?] */
const CX = [
 ["cx-wall-handstand","Wall handstand hold",2,"push",[],"time",20,"Shoulders · Core","i",["Place hands a hand's width from the wall, shoulder-width apart.","Kick up one leg at a time until your heels rest on the wall.","Push the floor away, squeeze your glutes and keep ribs tucked.","Come down one leg at a time."]],
 ["cx-chest-wall-handstand","Chest-to-wall handstand",2,"push",[],"time",20,"Shoulders · Core","i",["Start in a push-up position with feet against the wall.","Walk your feet up the wall while walking hands toward it.","Stop with your chest a few inches from the wall and body straight.","Walk back down slowly."]],
 ["cx-hspu-pike-box","Elevated pike push-up",2,"push",["chair"],"reps",8,"Shoulders · Triceps","i",["Put your feet on a chair and hands on the floor so hips stack over shoulders.","Bend the elbows to lower the top of your head toward the floor.","Press back up until the arms are straight."]],
 ["cx-wall-hspu","Wall handstand push-up",3,"push",[],"reps",5,"Shoulders · Triceps","e",["Kick up into a wall handstand with hands just outside shoulder width.","Lower under control until your head lightly touches a folded towel.","Press back up to straight arms. Use a partial range until you're strong enough."]],
 ["cx-pseudo-planche","Pseudo-planche push-up",2,"push",[],"reps",8,"Chest · Shoulders · Core","i",["Set up a push-up with hands turned out and placed by your lower ribs.","Lean your shoulders forward past your hands.","Keep the lean as you lower and press."]],
 ["cx-planche-lean","Planche lean",2,"push",[],"time",20,"Shoulders · Core","i",["From a straight-arm push-up position, lean your shoulders forward of your hands.","Keep arms locked and shoulders pushed away from the floor.","Hold, breathing steadily."]],
 ["cx-tuck-planche","Tuck planche hold",3,"push",[],"time",10,"Shoulders · Core","e",["Squat down, hands flat beside your feet, fingers turned out.","Lean forward and lift the feet, knees tucked to the chest.","Hold with arms straight; start with a few seconds."]],
 ["cx-one-arm-pushup-incline","Incline one-arm push-up",2,"push",["chair"],"reps",5,"Chest · Triceps · Core","i",["Place one hand on a sturdy chair, feet wide.","Lower your chest to the edge with the elbow close to your side.","Press back up without twisting. Reps per side."]],
 ["cx-one-arm-pushup","One-arm push-up",3,"push",[],"reps",3,"Chest · Triceps · Core","e",["Feet wide, one hand under your chest, other hand behind your back.","Lower with control, keeping hips level.","Press up. Reps per side."]],
 ["cx-typewriter-pushup","Typewriter push-up",2,"push",[],"reps",6,"Chest · Triceps","i",["Hands very wide in a push-up position.","Lower toward one hand, slide across to the other at the bottom, then press up.","Alternate sides each rep."]],
 ["cx-pseudo-dip","Bench dip with feet raised",2,"push",["chair"],"reps",10,"Triceps · Chest","i",["Hands on one chair behind you, heels on another in front.","Lower until elbows reach 90 degrees.","Press up and keep shoulders down."]],
 ["cx-straight-bar-dip","Parallel-bar dip",2,"push",["bar"],"reps",8,"Chest · Triceps","i",["Support yourself on parallel bars or sturdy counter corners.","Lean slightly forward and lower until shoulders are just below elbows.","Press back to straight arms."]],
 ["cx-australian-row","Australian pull-up",1,"pull",["bar"],"reps",10,"Back · Biceps","b",["Hang under a low bar with your body straight and heels on the floor.","Pull your chest to the bar, squeezing your shoulder blades.","Lower slowly. Bend the knees to make it easier."]],
 ["cx-jump-pullup","Jumping pull-up with slow lower",2,"pull",["bar"],"reps",5,"Back · Biceps","b",["Stand under the bar and jump to get your chin over it.","Lower yourself as slowly as you can, 3–5 seconds.","Reset and repeat."]],
 ["cx-flexed-hang","Flexed-arm hang",1,"pull",["bar"],"time",20,"Back · Biceps · Grip","b",["Jump or step up so your chin is over the bar.","Hold the top position with shoulders pulled down.","Lower slowly when you can't hold any longer."]],
 ["cx-archer-pullup","Archer pull-up",3,"pull",["bar"],"reps",4,"Back · Biceps","e",["Grip the bar very wide.","Pull toward one hand while the other arm straightens along the bar.","Lower and alternate sides."]],
 ["cx-l-pullup","L-sit pull-up",3,"pull",["bar"],"reps",5,"Back · Core","e",["Hang and raise straight legs to hip height.","Pull up while keeping the legs up.","Lower with control."]],
 ["cx-muscle-up-neg","Muscle-up negative",3,"pull",["bar"],"reps",3,"Back · Chest · Triceps","e",["Jump to the top of a straight-bar dip.","Lower slowly through the transition into a hang, keeping the bar close.","Take 4–5 seconds on the way down."]],
 ["cx-muscle-up","Bar muscle-up",3,"pull",["bar"],"reps",3,"Back · Chest · Triceps","e",["Start with a slight swing and a false grip if you can.","Pull explosively to your lower chest and lean over the bar.","Press out to a straight-arm support, then lower under control."]],
 ["cx-skin-the-cat","Skin the cat",2,"pull",["bar"],"reps",4,"Shoulders · Core","i",["Hang from the bar and tuck your knees.","Bring knees through your arms and rotate back as far as comfortable.","Return slowly the way you came."]],
 ["cx-tuck-front-lever","Tuck front lever",3,"pull",["bar"],"time",10,"Lats · Core","e",["Hang, then pull straight arms down so your body tips back.","Tuck knees to chest with your back flat and parallel to the floor.","Hold with arms straight."]],
 ["cx-towel-row","Towel door row",1,"pull",[],"reps",12,"Back · Biceps","b",["Loop a towel around a sturdy door handle and close the door on it.","Hold both ends, lean back with straight arms and feet near the door.","Pull your chest to your hands and lower slowly."],1],
 ["cx-pistol-assist","Assisted pistol squat",2,"lower",[],"reps",6,"Quads · Glutes","i",["Hold a door frame or post, one leg out in front.","Sit down on the standing leg as deep as you can control.","Stand back up using as little hand help as possible. Reps per leg."]],
 ["cx-pistol","Pistol squat",3,"lower",[],"reps",5,"Quads · Glutes · Balance","e",["Stand on one leg with the other straight in front.","Reach your arms forward and sit all the way down.","Stand up without letting the free foot touch. Reps per leg."]],
 ["cx-shrimp-squat","Shrimp squat",2,"lower",[],"reps",6,"Quads · Glutes","i",["Stand on one leg and hold the other foot behind you.","Lower until the back knee touches the floor softly.","Drive back up. Reps per leg."]],
 ["cx-sissy-squat","Sissy squat",2,"lower",[],"reps",10,"Quads","i",["Hold a support, rise onto your toes.","Push knees forward and lean back, keeping hips straight.","Lower as far as comfortable and return."]],
 ["cx-nordic-curl","Nordic hamstring curl",2,"lower",[],"reps",5,"Hamstrings","i",["Kneel with heels anchored under a couch or by a partner.","Keep a straight line from knees to head and lower forward slowly.","Catch yourself with your hands and push back up."]],
 ["cx-sl-calf","Single-leg calf raise off a step",1,"lower",["chair"],"reps",15,"Calves","b",["Stand on one foot on a step with the heel hanging off.","Lower the heel for a stretch, then rise all the way up.","Pause at the top. Reps per leg."],1],
 ["cx-hollow-body","Hollow body hold",1,"core",[],"time",30,"Abs","b",["Lie on your back, press the low back into the floor.","Lift shoulders and legs, arms overhead.","Bend the knees to make it easier."]],
 ["cx-arch-hold","Arch body hold",1,"core",[],"time",30,"Lower back · Glutes","b",["Lie face down with arms overhead.","Lift arms, chest and legs off the floor.","Hold with the neck long."]],
 ["cx-l-sit-floor","Floor L-sit",2,"core",[],"time",10,"Abs · Hip flexors · Triceps","i",["Sit with legs straight and hands by your hips.","Press down to lift your hips and legs off the floor.","Tuck one or both knees if needed."]],
 ["cx-dragon-flag-neg","Dragon flag negative",3,"core",["chair"],"reps",4,"Abs","e",["Lie on a bench and hold it behind your head.","Raise your body to vertical on your upper back.","Lower as one straight line as slowly as possible."]],
 ["cx-toes-to-bar","Toes-to-bar",2,"core",["bar"],"reps",8,"Abs · Grip","i",["Hang from the bar.","Lift your toes to touch the bar while keeping arms straight.","Lower under control without swinging."]],
 ["cx-windshield","Hanging windshield wipers",3,"core",["bar"],"reps",6,"Obliques · Abs","e",["Hang and lift your feet toward the bar.","Rotate your legs side to side like a windshield wiper.","Each side counts as one rep."]],
 ["cx-crow","Crow pose",1,"core",[],"time",15,"Wrists · Core · Balance","b",["Squat with hands flat on the floor, shoulder-width.","Place knees on the backs of your upper arms.","Lean forward until your feet float. Look slightly ahead."]],
 ["cx-bridge","Wheel bridge",2,"core",[],"time",15,"Back · Shoulders","i",["Lie on your back with hands by your ears and feet flat.","Press up through hands and feet into an arch.","Hold, then lower slowly to your upper back."]],
 ["cx-burpee-pullup","Burpee pull-up",3,"cardio",["bar"],"reps",8,"Full body","i",["Do a burpee under a pull-up bar.","Jump up from the burpee, grab the bar and do a pull-up.","Drop down and repeat."]],
 ["cx-cab-pushup","Truck-step incline push-up",1,"push",[],"reps",12,"Chest · Triceps","b",["Put your hands on the truck step, bumper or a bench.","Walk your feet back so your body is straight.","Lower your chest to the edge and press up."],1],
 ["cx-cab-stepup","Truck-step step-up",1,"lower",[],"reps",12,"Quads · Glutes","b",["Face the bottom truck step or a sturdy curb.","Step up with your whole foot and stand tall, then step down.","Switch the leading leg each set. Reps per leg."],1],
 ["cx-handle-row","Grab-handle row",1,"pull",[],"reps",12,"Back · Biceps","b",["Hold a sturdy grab handle or post with one hand.","Lean back with your arm straight, feet close.","Row your chest toward the handle. Reps per arm."],1],
 ["cx-seat-dip","Seat-edge dip",1,"push",[],"reps",12,"Triceps","b",["Sit on the edge of your seat or bunk, hands next to your hips.","Slide forward and lower your hips with elbows pointing back.","Press back up."],1],
 ["cx-seated-knee","Seated knee tuck",1,"core",[],"reps",15,"Abs","b",["Sit on the edge of your seat, hands on the sides.","Lean back slightly and bring your knees to your chest.","Extend the legs without touching the floor."],1],
 ["cx-lot-walk","Brisk lot walk",1,"cardio",[],"time",600,"Full body · Heart","b",["Walk laps around the lot at a pace where talking takes effort.","Swing your arms and stand tall.","Ten minutes is about 1,000 steps."],1],
 ["cx-wall-sit-trailer","Trailer wall sit",1,"lower",[],"time",45,"Quads","b",["Lean your back against the trailer or a wall.","Slide down until your thighs are close to parallel.","Hold, breathing steadily."],1],
 ["cx-hotel-circuit-squat","Squat to calf raise",1,"lower",[],"reps",15,"Quads · Glutes · Calves","b",["Do a bodyweight squat.","As you stand, rise onto your toes.","Lower your heels and go straight into the next squat."],1],
 ["cx-neck-shoulder","Neck & shoulder release",1,"core",[],"time",60,"Neck · Upper back","b",["Sit tall and drop one ear toward your shoulder; hold 15 seconds each side.","Roll your shoulders back slowly 10 times.","Interlace hands and reach forward to stretch the upper back."],1],
 ["cx-hip-flexor","Kneeling hip-flexor stretch",1,"core",[],"time",40,"Hip flexors","b",["Kneel on one knee with the other foot in front.","Tuck your hips under and shift forward gently.","Hold, then switch. Great after long drives or shifts."],1]
];
for (const [id,name,impact,pattern,equip,metric,dose,muscles,level,ins,road] of CX){
  const e = {id, name, impact, pattern, equip, metric, loaded:false, muscles, dose, cue:ins[0], level, cat: road ? "road" : "calisthenics", ins, gen: true, compound: true, road: !!road};
  EXS.push(e); EX[id] = e;
}
// original moves that work in a cab, truck stop or hotel room
for (const id of "squat glute-bridge reverse-lunge wall-sit calf-raise incline-pushup pushup chair-dip superman plank side-plank dead-bug bird-dog step-jacks march band-row band-pullapart band-press band-curl band-walk band-squat band-pushdown band-facepull pallof".split(" ")) if (EX[id]) EX[id].road = true;
const COLLECTIONS = [
  ["all","All exercises", () => true],
  ["home","Home", e => !e.equip.some(q => ["barbell","cable","machine","ezbar","other","medball","ball"].includes(q)) && e.cat !== "stretching"],
  ["calisthenics","Calisthenics", e => e.equip.every(q => ["bar","chair"].includes(q)) && ["home","calisthenics","strength","plyometrics"].includes(e.cat || "home") && e.pattern !== "cardio" || e.cat === "calisthenics"],
  ["heavy","Heavy weights", e => e.equip.some(q => ["barbell","ezbar"].includes(q)) || ["powerlifting","olympic weightlifting","strongman"].includes(e.cat)],
  ["dumbbell","Dumbbell", e => e.equip.includes("dumbbells")],
  ["kettlebell","Kettlebell", e => e.equip.includes("kettlebell")],
  ["bands","Bands", e => e.equip.includes("bands")],
  ["machines","Machines & cables", e => e.equip.some(q => ["cable","machine"].includes(q))],
  ["stretch","Stretch & mobility", e => e.cat === "stretching" || e.equip.includes("foam")],
  ["cardio","Cardio & plyo", e => e.pattern === "cardio" || ["cardio","plyometrics"].includes(e.cat)],
  ["balls","Med ball & stability ball", e => e.equip.some(q => ["medball","ball"].includes(q))],
  ["road","On the road", e => !!e.road]
];
