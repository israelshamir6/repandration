/* ======================================================================
   Recipe library, part 3: the World Kitchen. Home-style takes on dishes from around the world,
   renamed for Rep & Ration and balanced for training: lean protein, whole grains, plenty of
   vegetables, sensible sodium. Nutrition comes from the food table (USDA values) and portions
   scale to each member's targets. Every recipe shows its health benefits on the meal card.
   ====================================================================== */
F("kimchi","Kimchi","1/2 cup","produce",12,1,2,0.4,1,0,[]);
F("miso","Miso paste","1 tbsp","pantry",34,2,4,1,1,0,["soy"]);
F("gochujang","Gochujang (red pepper paste)","1 tbsp","pantry",30,1,7,0.2,4,3,["soy","gluten"]);
F("currypaste","Curry paste","1 tbsp","pantry",20,0.5,3,1,1,0,[]);
F("fishsauce","Fish sauce","1 tbsp","pantry",6,1,0.7,0,0.7,0,["fish"]);
F("naan","Naan, whole wheat","1 piece","grains",260,9,45,5,3,1,["gluten","dairy"]);
F("lime","Lime","1 lime","produce",20,0.5,7,0.1,1.1,0,[]);
F("ricepaper","Rice paper wrappers","4 sheets","grains",80,1,19,0.1,0,0,[]);
F("sobanoodles","Soba noodles, cooked","1 cup","grains",113,6,24,0.1,0.7,0,["gluten"]);
F("chorizo","Chicken chorizo","2 oz","protein",110,12,2,6,0.5,0,["chicken"]);
F("tzatziki","Tzatziki","2 tbsp","dairy",30,1.5,1.5,2,1,0,["dairy"]);
F("polenta","Polenta, cooked","1 cup","grains",140,3,30,1,0.5,0,[]);
F("bulgur","Bulgur, cooked","1 cup","grains",151,6,34,0.4,0.2,0,["gluten"]);
F("injera","Injera (teff flatbread)","1 piece","grains",165,6,33,1,0.5,0,[]);
F("yuca","Cassava (yuca), boiled","1 cup","produce",200,2,48,0.4,2,0,[]);
F("okra","Okra","1 cup","produce",33,2,7,0.2,1.5,0,[]);
F("eggplant","Eggplant","1 cup","produce",20,0.8,5,0.1,3,0,[]);
F("jackfruit","Young jackfruit, canned in brine","1/2 cup","produce",40,1,9,0,1,0,[]);
SOURCES.world = {name:"Rep & Ration World Kitchen", short:"World Kitchen", url:"/support.html#menus", why:"Home-style takes on dishes from around the world, balanced for training: lean protein, whole grains, lots of vegetables and sensible sodium. Nutrition from USDA data.", badge:"World Kitchen"};
const W = (id, slot, cuisine, name, items, steps) => { const t = T(id, slot, "world", name, items, steps); t.cuisine = cuisine; TEMPLATES.push(t); };

/* ---------- breakfast ---------- */
W("wk1","Breakfast","Mexican","Sunrise Huevos Rancheros",[["egg",2],["corntort",2],["blackbeans",0.5],["salsa",2],["avocado",0.5]],["Warm the tortillas and beans.","Fry or poach the eggs.","Stack tortillas, beans and eggs; top with salsa and avocado."]);
W("wk2","Breakfast","Israeli & North African","Red Pepper Shakshuka Skillet",[["egg",2],["tomato",1.5],["pepper",1],["onion",0.5],["oil",0.5],["pita",1]],["Soften onion and pepper in the oil; add chopped tomato with cumin and paprika and simmer 8 minutes.","Make two wells, crack in the eggs, cover and cook until the whites set.","Serve with warm pita."]);
W("wk3","Breakfast","Japanese","Tokyo Morning Tray",[["salmon",0.75],["whiterice",0.75],["miso",1],["spinach",1],["egg",1]],["Broil the salmon 6–8 minutes.","Whisk miso into 1 cup hot water with the spinach for a quick soup.","Serve with rice and a soft-boiled egg."]);
W("wk4","Breakfast","Turkish","Istanbul Breakfast Plate",[["egg",2],["feta",1],["cucumber",1],["tomato",1],["olives",0.5],["pita",1]],["Boil the eggs 8 minutes.","Slice cucumber and tomato; arrange with feta, olives and pita."]);
W("wk5","Breakfast","Indian","Masala Morning Scramble",[["egg",3],["onion",0.25],["tomato",0.5],["spinach",1],["oil",0.5],["roti",1]],["Cook onion in the oil with turmeric, cumin and a pinch of chili.","Add tomato and spinach, then the beaten eggs; scramble soft.","Serve with roti."]);
W("wk6","Breakfast","Scandinavian","Nordic Skyr Bowl",[["skyr",1],["blueberries",0.5],["oats",0.5],["flax",1],["honey",0.5]],["Toast the oats in a dry pan for 3 minutes.","Top skyr with berries, oats, flax and a drizzle of honey."]);
W("wk7","Breakfast","Colombian","Bogotá Arepa-Style Egg Stack",[["corntort",2],["egg",2],["cheddar",0.5],["avocado",0.5],["tomato",0.5]],["Crisp the corn tortillas in a dry pan.","Scramble eggs with tomato; pile onto the tortillas with cheese and avocado."]);
W("wk8","Breakfast","Chinese","Ginger Congee Comfort Bowl",[["whiterice",1],["chickthigh",0.75],["bonebroth",1],["spinach",1],["egg",1],["soysauce",0.5]],["Simmer the rice in broth and 1 cup water with sliced ginger for 20 minutes, stirring, until creamy.","Stir in shredded chicken and spinach.","Top with a soft-boiled egg and a splash of soy sauce."]);
W("wk9","Breakfast","Ethiopian","Addis Spiced Lentil Breakfast",[["lentils",1],["egg",1],["tomato",0.5],["onion",0.25],["oil",0.5],["injera",1]],["Cook onion in oil with berbere or paprika and cumin.","Add lentils and tomato; simmer 5 minutes.","Serve with a boiled egg and injera."]);
W("wk10","Breakfast","Brazilian","Rio Açaí-Style Power Bowl",[["frozberries",1],["banana",0.5],["yogurt",0.5],["granola",0.5],["chia",1]],["Blend the frozen berries, half the banana and the yogurt until thick.","Top with granola, chia and the remaining banana."]);

/* ---------- lunch ---------- */
W("wk11","Lunch","Korean","Seoul Bowl",[["beef95",1],["brownrice",1],["spinach",1],["carrots",0.5],["egg",1],["kimchi",1],["gochujang",0.5]],["Brown the beef with garlic and a splash of soy.","Sauté spinach and carrots separately.","Arrange over rice; top with a fried egg, kimchi and gochujang."]);
W("wk12","Lunch","Vietnamese","Saigon Summer Rolls",[["shrimp",1],["ricepaper",1],["ricenoodles",0.5],["cucumber",1],["carrots",0.5],["pb",0.5],["lime",0.5]],["Dip each rice paper in warm water for a few seconds.","Fill with shrimp, noodles, cucumber, carrots and herbs; roll tight.","Dip in peanut butter thinned with lime juice and warm water."]);
W("wk13","Lunch","Greek","Athens Chicken Gyro Bowl",[["chicken",1],["brownrice",0.75],["cucumber",1],["tomato",1],["tzatziki",2],["feta",0.5]],["Season chicken with oregano, lemon and garlic; grill and slice.","Build bowls with rice, cucumber and tomato.","Top with tzatziki and feta."]);
W("wk14","Lunch","Lebanese","Beirut Bulgur Tabbouleh Plate",[["bulgur",1],["chickpeas",0.5],["tomato",1],["cucumber",1],["oil",0.75],["hummus",2]],["Toss bulgur with chopped tomato, cucumber, lots of parsley and mint, lemon and the oil.","Serve with chickpeas and hummus."]);
W("wk15","Lunch","Thai","Bangkok Larb Lettuce Cups",[["groundchicken",1],["romaine",1],["whiterice",0.5],["lime",1],["fishsauce",0.5],["onion",0.25]],["Cook the chicken, breaking it up, with sliced shallot or onion.","Off heat, add lime juice, fish sauce, chili and mint.","Spoon into lettuce leaves; serve with rice."]);
W("wk16","Lunch","Peruvian","Lima Quinoa Chicken Salad",[["chicken",1],["quinoa",1],["corn",0.5],["pepper",0.5],["avocado",0.5],["lime",1]],["Toss quinoa with corn, pepper, lime juice and cilantro.","Top with sliced chicken and avocado."]);
W("wk17","Lunch","Japanese","Kyoto Soba Salad",[["sobanoodles",1.5],["edamame",0.5],["cucumber",1],["carrots",0.5],["soysauce",1],["tofu",0.5]],["Cook and rinse the soba under cold water.","Toss with edamame, cucumber, carrots, tofu, soy sauce and a little rice vinegar."]);
W("wk18","Lunch","Italian","Tuscan Bean & Tuna Toss",[["tuna",1],["kidneybeans",0.5],["cherrytom",1],["greens",1],["oil",0.75],["sourdough",1]],["Toss tuna, beans, tomatoes and greens with the oil, lemon and black pepper.","Serve with toasted sourdough."]);
W("wk19","Lunch","Indian","Mumbai Chana Wrap",[["chickpeas",1],["roti",1],["yogurt",0.5],["cucumber",0.5],["onion",0.25],["spinach",1]],["Warm chickpeas with garam masala, cumin and a little onion; mash lightly.","Fill the roti with chickpeas and spinach.","Add yogurt mixed with grated cucumber and mint."]);
W("wk20","Lunch","Mexican","Oaxaca Chicken Tinga Tacos",[["chicken",1],["corntort",3],["tomato",1],["onion",0.25],["cabbage",1],["lime",0.5]],["Simmer shredded chicken with tomato, onion and chipotle 10 minutes.","Serve in warm tortillas with shredded cabbage and lime."]);
W("wk21","Lunch","Moroccan","Marrakesh Couscous Power Bowl",[["couscous",1],["chickpeas",0.5],["chicken",0.75],["carrots",0.5],["raisins",0.5],["oil",0.5]],["Roast carrots and chickpeas with cumin, cinnamon and the oil.","Toss with couscous, raisins and sliced chicken."]);
W("wk22","Lunch","Hawaiian","Island Ahi Poke Bowl",[["tuna",1],["brownrice",1],["edamame",0.5],["cucumber",1],["avocado",0.5],["soysauce",1]],["Cube sushi-grade tuna and toss with soy sauce, sesame and green onion. (Or use canned tuna.)","Serve over rice with edamame, cucumber and avocado."]);
W("wk23","Lunch","Spanish","Valencia Shrimp & Rice Skillet",[["shrimp",1],["brownrice",1],["peas",0.5],["pepper",0.5],["tomato",0.5],["oil",0.5]],["Cook pepper and tomato in the oil with paprika and a pinch of saffron or turmeric.","Stir in rice and peas, then nestle the shrimp on top; cover 5 minutes."]);
W("wk24","Lunch","Filipino","Manila Chicken Adobo Bowl",[["chickthigh",1],["whiterice",1],["greenbeans",1],["soysauce",1]],["Simmer chicken in soy sauce, vinegar, garlic, bay leaf and pepper 20 minutes.","Serve over rice with steamed green beans."]);
W("wk25","Lunch","Jamaican","Kingston Jerk Chicken Plate",[["chicken",1],["brownrice",0.75],["kidneybeans",0.5],["cabbage",1],["pineapple",0.5]],["Rub chicken with jerk seasoning (allspice, thyme, chili, garlic) and grill.","Serve with rice and beans, slaw and pineapple."]);

/* ---------- dinner ---------- */
W("wk26","Dinner","Indian","Delhi Butter-Light Chicken",[["chicken",1],["yogurt",0.5],["tomato",1],["basmati",1],["spinach",1],["butter",0.5]],["Marinate chicken in half the yogurt with garam masala, ginger and garlic.","Sear, then simmer in tomato with the butter and remaining yogurt.","Serve with basmati and wilted spinach."]);
W("wk27","Dinner","Thai","Bangkok Green Curry",[["chicken",1],["coconutmilk",1],["currypaste",1],["greenbeans",1],["pepper",0.5],["basmati",1]],["Fry the curry paste 1 minute; add light coconut milk.","Simmer chicken, green beans and pepper 10 minutes; finish with lime and basil.","Serve with rice."]);
W("wk28","Dinner","Japanese","Miso-Glazed Salmon Night",[["salmon",1],["brownrice",1],["bokchoy",1],["miso",1],["honey",0.25]],["Brush salmon with miso mixed with honey; broil 8 minutes.","Steam the bok choy; serve with rice."]);
W("wk29","Dinner","Italian","Nonna's Lean Bolognese",[["beef95",1],["spaghetti",1],["marinara",1],["carrots",0.5],["mushrooms",1],["parmesan",0.5]],["Brown beef with chopped carrot and mushrooms.","Add marinara and simmer 15 minutes.","Toss with spaghetti and parmesan."]);
W("wk30","Dinner","Mexican","Pueblo Chicken Fajita Sheet Pan",[["chicken",1],["pepper",1.5],["onion",0.5],["flourtort",2],["salsa",2],["oil",0.5]],["Toss sliced chicken, peppers and onion with the oil, cumin, chili and lime.","Roast at 425°F for 18 minutes.","Serve in warm tortillas with salsa."]);
W("wk31","Dinner","Greek","Santorini Lemon Fish & Greens",[["cod",1.25],["potato",1],["greenbeans",1],["oil",0.75],["lime",0.5]],["Roast potatoes 20 minutes; add cod and green beans with oil, lemon and oregano.","Roast 12 more minutes."]);
W("wk32","Dinner","Korean","Bulgogi-Style Beef & Broccoli",[["sirloin",1],["brownrice",1],["broccoli",1],["soysauce",1],["pear",0.25]],["Marinate thin-sliced beef in soy sauce, grated pear, garlic and ginger 15 minutes.","Sear fast in a hot pan; steam broccoli.","Serve over rice."]);
W("wk33","Dinner","Chinese","Sichuan Tofu Stir-Fry",[["tofu",1],["brownrice",1],["broccoli",1],["pepper",0.5],["soysauce",1],["oil",0.5]],["Press and cube the tofu; brown in the oil.","Add vegetables, soy sauce, garlic, ginger and chili flakes or Sichuan pepper.","Serve over rice."]);
W("wk34","Dinner","Vietnamese","Hanoi Chicken Noodle Bowl",[["chicken",1],["ricenoodles",1],["bonebroth",2],["bokchoy",1],["lime",0.5],["fishsauce",0.5]],["Simmer broth with ginger, star anise and cinnamon 10 minutes.","Add sliced chicken and bok choy.","Pour over noodles; finish with lime, herbs and fish sauce."]);
W("wk35","Dinner","Moroccan","Atlas Chicken & Chickpea Tagine",[["chickthigh",1],["chickpeas",0.5],["carrots",1],["tomato",1],["couscous",0.75],["oil",0.5]],["Brown chicken in the oil with cumin, cinnamon, ginger and paprika.","Add tomato, carrots and chickpeas; cover and simmer 25 minutes.","Serve over couscous."]);
W("wk36","Dinner","Ethiopian","Addis Red Lentil Stew",[["lentils",1.5],["tomato",1],["onion",0.5],["oil",0.5],["injera",1],["greens",1]],["Cook onion in the oil with berbere (or paprika, cayenne and cumin).","Add lentils, tomato and 2 cups water; simmer 25 minutes until thick.","Serve with injera and sautéed greens."]);
W("wk37","Dinner","Peruvian","Andes Lomo Saltado-Style Stir-Fry",[["sirloin",1],["potato",1],["tomato",1],["onion",0.5],["brownrice",0.5],["soysauce",0.5]],["Roast potato wedges until crisp.","Stir-fry beef strips hot and fast, then onion and tomato with soy sauce and vinegar.","Serve with the potatoes and rice."]);
W("wk38","Dinner","Brazilian","Bahia Fish Stew",[["tilapia",1.25],["coconutmilk",1],["pepper",1],["tomato",1],["brownrice",1],["lime",0.5]],["Simmer peppers and tomato in light coconut milk with garlic and paprika.","Add the fish; cook 8 minutes. Finish with lime and cilantro.","Serve with rice."]);
W("wk39","Dinner","Caribbean","Port of Spain Curry Chickpeas & Greens",[["chickpeas",1.5],["coconutmilk",0.5],["spinach",2],["potato",0.5],["roti",1]],["Toast curry powder in a little water; add potato and chickpeas.","Simmer with light coconut milk 15 minutes; stir in spinach.","Serve with roti."]);
W("wk40","Dinner","Spanish","Madrid Chicken & White Bean Pot",[["chickthigh",1],["kidneybeans",0.5],["tomato",1],["pepper",0.5],["chorizo",0.5],["sourdough",1]],["Brown chicken and chorizo; add pepper, tomato and smoked paprika.","Add beans and simmer 15 minutes; serve with bread."]);
W("wk41","Dinner","Turkish","Anatolian Lamb Kofta Plate",[["lamb",0.75],["bulgur",1],["cucumber",1],["tomato",1],["yogurt",0.5]],["Mix lamb with onion, cumin and parsley; shape onto skewers and grill.","Serve with bulgur, chopped salad and garlic yogurt."]);
W("wk42","Dinner","Filipino","Cebu Sinigang-Style Shrimp Soup",[["shrimp",1],["bokchoy",1],["tomato",1],["greenbeans",1],["whiterice",0.75],["lime",1]],["Simmer tomato and onion in 3 cups water with tamarind or lime.","Add green beans, then shrimp and bok choy for 3 minutes.","Serve with rice."]);
W("wk43","Dinner","West African","Lagos Peanut Chicken Stew",[["chicken",1],["pb",1],["tomato",1],["sweetpotato",1],["collards",1]],["Simmer tomato with ginger, garlic and chili; whisk in peanut butter and 1 cup water.","Add sweet potato and chicken; cook 20 minutes; stir in greens."]);
W("wk44","Dinner","Southern US","Creole Shrimp & Grits Lite",[["shrimp",1],["polenta",1],["pepper",0.5],["tomato",0.5],["cheddar",0.5]],["Cook polenta (grits) with the cheese.","Sauté shrimp with pepper, tomato and Cajun seasoning; spoon over."]);
W("wk45","Dinner","Japanese","Sapporo Chicken Teriyaki Plate",[["chicken",1],["brownrice",1],["broccoli",1],["teriyaki",1]],["Sear chicken; glaze with teriyaki for the last 2 minutes.","Serve with rice and broccoli."]);
W("wk46","Dinner","Indian","Goa Coconut Fish Curry",[["cod",1.25],["coconutmilk",1],["tomato",1],["basmati",1],["spinach",1]],["Cook tomato with turmeric, chili, ginger and garlic.","Add light coconut milk and the fish; simmer 8 minutes.","Serve with basmati and spinach."]);
W("wk47","Dinner","Italian","Sicilian Eggplant & Chickpea Pasta",[["chickpeapasta",1],["eggplant",1.5],["marinara",1],["ricotta",0.5],["oil",0.5]],["Roast cubed eggplant in the oil 20 minutes.","Toss with pasta, marinara and spoonfuls of ricotta."]);
W("wk48","Dinner","Mexican","Yucatán Citrus Pork Bowl",[["porktender",1],["brownrice",1],["blackbeans",0.5],["onion",0.25],["orange",1],["cabbage",1]],["Marinate pork in orange and lime juice with achiote or paprika and oregano.","Roast and shred; serve over rice and beans with pickled onion and cabbage."]);
W("wk49","Dinner","Southeast Asian","Jakarta Jackfruit Rendang Bowl",[["jackfruit",2],["tempeh",0.5],["coconutmilk",0.5],["currypaste",1],["brownrice",1],["greenbeans",1]],["Fry curry paste; add shredded jackfruit, tempeh and light coconut milk.","Simmer until thick, 15 minutes. Serve with rice and green beans."]);
W("wk50","Dinner","Middle Eastern","Levant Chicken Shawarma Plate",[["chicken",1],["pita",1],["hummus",2],["tomato",1],["cucumber",1],["tzatziki",1]],["Season chicken with cumin, coriander, paprika, cinnamon and lemon; roast and slice.","Serve with pita, hummus, salad and tzatziki."]);
W("wk51","Dinner","Cuban","Havana Black Bean & Chicken Bowl",[["chicken",1],["blackbeans",1],["whiterice",0.75],["plantain",0.5],["onion",0.25]],["Simmer black beans with onion, cumin and oregano.","Serve with rice, sliced chicken and baked plantain."]);
W("wk52","Dinner","Southern US","Gumbo-Style Chicken & Okra",[["chicken",1],["okra",1],["pepper",0.5],["celery",0.5],["tomato",1],["brownrice",0.75]],["Cook pepper, celery and onion with Cajun spice.","Add tomato, okra, chicken and 2 cups broth; simmer 25 minutes.","Serve over rice."]);
W("wk53","Dinner","Latin American","Andean Yuca & Chicken Sancocho",[["chicken",1],["yuca",0.75],["corn",0.5],["carrots",0.5],["bonebroth",2]],["Simmer chicken, yuca, corn and carrot in broth with garlic, cilantro and cumin 30 minutes."]);

/* ---------- snacks ---------- */
W("wk54","Snack","Japanese","Edamame & Sea Salt Snack",[["edamame",1],["clementine",1]],["Steam the edamame; sprinkle with a pinch of salt."]);
W("wk55","Snack","Middle Eastern","Mezze Snack Box",[["hummus",2],["cucumber",1],["carrots",0.5],["pita",0.5]],["Slice the vegetables; serve with hummus and pita."]);
W("wk56","Snack","Indian","Mango Lassi Shake",[["yogurt",1],["mango",0.5],["milk",0.5]],["Blend with ice and a pinch of cardamom."]);
W("wk57","Snack","Korean","Kimchi Egg Cup",[["egg",2],["kimchi",0.5]],["Boil the eggs; serve with kimchi."]);
W("wk58","Snack","Mediterranean","Olive & Feta Plate",[["olives",1],["feta",0.5],["cherrytom",1],["crackers",0.5]],["Arrange and serve."]);
W("wk59","Snack","Mexican","Lime-Chili Fruit Cup",[["mango",0.5],["watermelon",0.5],["cucumber",0.5],["lime",0.5],["string",1]],["Toss fruit and cucumber with lime and chili-lime seasoning; serve with string cheese."]);
W("wk60","Snack","Scandinavian","Rye Crisp & Salmon Bite",[["cansalmon",0.5],["crackers",0.5],["cucumber",0.5],["yogurt",0.25]],["Top crackers with salmon, cucumber and a spoon of yogurt with dill."]);
