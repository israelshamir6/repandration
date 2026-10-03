#!/usr/bin/env python3
"""Map the public-domain free-exercise-db (github.com/yuhonas/free-exercise-db, Unlicense) into Rep & Ration's exercise format."""
import json, pathlib, re
root = pathlib.Path(__file__).resolve().parents[2]
d = json.load(open(root / "src/tools/free-exercise-db.json"))
EQ = {"barbell":"barbell","dumbbell":"dumbbells","kettlebells":"kettlebell","cable":"cable","machine":"machine","e-z curl bar":"ezbar",
      "medicine ball":"medball","exercise ball":"ball","foam roll":"foam","bands":"bands","body only":None,"other":"other",None:"other"}
LOWER = {"quadriceps","hamstrings","glutes","calves","adductors","abductors"}
PULLM = {"lats","middle back","biceps","traps","forearms","lower back"}
PUSHM = {"chest","triceps","shoulders"}
cap = lambda s: s[:1].upper() + s[1:]
out = []
for x in d:
    if not x.get("images"): continue
    prim = x["primaryMuscles"]; cat = x["category"]; eq = EQ.get(x.get("equipment"), "other")
    p0 = prim[0] if prim else ""
    if cat in ("cardio",): pattern = "cardio"
    elif cat == "plyometrics": pattern = "cardio" if p0 in LOWER or not prim else ("push" if p0 in PUSHM else "core" if p0 == "abdominals" else "pull")
    elif p0 in LOWER: pattern = "lower"
    elif p0 == "abdominals": pattern = "core"
    elif p0 in PULLM or (p0 == "shoulders" and x.get("force") == "pull"): pattern = "pull"
    elif p0 in PUSHM or p0 == "neck": pattern = "push"
    else: pattern = "core"
    impact = 3 if cat in ("plyometrics", "olympic weightlifting") else 2 if cat in ("cardio", "strongman") or x["level"] == "expert" else 1
    metric = "time" if cat in ("stretching", "cardio") or (x.get("force") == "static" and cat != "strength") else "reps"
    loaded = eq in ("barbell","dumbbells","kettlebell","cable","machine","ezbar","medball")
    dose = 30 if cat == "stretching" else 300 if cat == "cardio" else (8 if x.get("mechanic") == "compound" and loaded else 12 if loaded else 10)
    if x.get("force") == "static" and metric == "reps" and pattern == "core": metric, dose = "time", 30
    instr = [re.sub(r"\s+", " ", s).strip() for s in x["instructions"] if s.strip()]
    cue = instr[0] if instr else ""
    if len(cue) > 160: cue = cue[:157].rsplit(" ", 1)[0] + "…"
    gen = cat in ("strength", "powerlifting", "plyometrics", "cardio") and x["level"] != "expert" and eq != "other" and cat != "strongman"
    muscles = " · ".join(cap(m) for m in (prim + x["secondaryMuscles"])[:3])
    out.append({"id": "fx-" + x["id"], "n": x["name"], "i": impact, "p": pattern, "e": [eq] if eq else [], "m": metric, "l": int(loaded),
                "mu": muscles, "d": dose, "c": cue, "lv": x["level"][0], "cat": cat, "img": x["id"], "ins": instr, "g": int(gen), "k": int(x.get("mechanic") == "compound"), "pm": prim})
(root / "public/data").mkdir(parents=True, exist_ok=True)
(root / "public/data/exercises.json").write_text(json.dumps(out, separators=(",", ":"), ensure_ascii=False))
print(len(out), "exercises", sum(o["g"] for o in out), "for the generator")
