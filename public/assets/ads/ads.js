/* Rep & Ration — marketing/landing ad system (data + render + motion). No deps. */
(function(){
  "use strict";
  var P = "assets/ads/img/", V = "assets/ads/video/";

  /* true pixel ratios of the source creative — used so every frame matches its image exactly (no cropping/zooming) */
  var RATIO = {
    "ad-01.jpg":"16/9","ad-02.jpg":"9/16","ad-03.jpg":"9/16","ad-04.jpg":"9/16","ad-05.jpg":"9/16",
    "ad-06.jpg":"9/16","ad-07.jpg":"9/16","ad-08.jpg":"9/16","ad-09.jpg":"1/1","ad-10.jpg":"1/1",
    "ad-11.jpg":"1/1","ad-12.jpg":"1/1","ad-13.jpg":"16/9","ad-15.jpg":"16/9","ad-16.jpg":"16/9"
  };

  var GALLERY = [
    {img:"ad-02.jpg", ratio:"r916", tag:"Today", h:"Session saved", p:"New best: push-ups, 18 reps"},
    {img:"ad-03.jpg", ratio:"r916", tag:"Calisthenics", h:"Your plan fits your living room", p:"Bodyweight, bands, jump rope, kettlebell"},
    {img:"ad-04.jpg", ratio:"r916", tag:"Workout log", h:"Swing heavy. Eat smart.", p:"KB swing 3×15 @ 35 lb · Protein 142/186g"},
    {img:"ad-05.jpg", ratio:"r916", tag:"Set 3 of 3", h:"60 seconds, logged", p:"Jump rope interval, saved automatically"},
    {img:"ad-06.jpg", ratio:"r916", tag:"Progress", h:"The scale gives one number", p:"Rep & Ration tracks the rest"},
    {img:"ad-07.jpg", ratio:"r916", tag:"Meal prep", h:"Sunday: 6 meals", p:"Weekday mornings: done"},
    {img:"ad-08.jpg", ratio:"r916", tag:"Nutrition", h:"We read your plate", p:"So you don't have to guess the macros"},
    {img:"ad-09.jpg", ratio:"r11", tag:"Buddies", h:"Your crew keeps you going", p:"Your plan keeps you honest"},
    {img:"ad-10.jpg", ratio:"r11", tag:"Meal prep", h:"Sunday: 6 meals, weekday done", p:"510–530 kcal per container"},
    {img:"ad-11.jpg", ratio:"r11", tag:"Progress", h:"One number isn't the story", p:"Kcal, protein, reps & BMI together"},
    {img:"ad-12.jpg", ratio:"r11", tag:"Nutrition", h:"We read your plate", p:"609 kcal · 36P · 81C · 16F, labeled"},
    {img:"ad-13.jpg", ratio:"r169", wide:true, tag:"Calisthenics", h:"Your living room is the gym", p:"53 calisthenic moves, low to high impact"},
    {img:"ad-15.jpg", ratio:"r169", wide:true, tag:"Recap", h:"3×15 reps logged · 620 kcal on the plate", p:"One app, both scores"},
    {img:"ad-16.jpg", ratio:"r169", wide:true, tag:"Daily recap", h:"Every rep. Every bite. On the board.", p:"186 reps · 1,740/2,330 kcal · 12-day streak"}
  ];

  /* Built fresh from the same real photos and real app numbers — new compositions, nothing fabricated. */
  var NEW_ADS = [
    {img:"ad-07.jpg", ratio:"r916", tag:"New", h:"Menus for every diet. Zero guesswork.", p:"MyPlate, DASH, Mediterranean & diabetes-plate"},
    {img:"ad-04.jpg", ratio:"r916", tag:"New", h:"1,700+ exercises. Any equipment.", p:"Bodyweight to kettlebells, rep & set logging"},
    {img:"ad-08.jpg", ratio:"r916", tag:"New", h:"Millions of foods, full macros.", p:"Log a meal in one tap"},
    {img:"ad-13.jpg", ratio:"r169", wide:true, tag:"New", h:"Free to start. No card needed.", p:"Upgrade to Premium any time, 7 days free."}
  ];

  /* Each collage is grouped by what the photo actually shows, not by slot-filling — e.g. the
     scale pair under Progress is two progress shots, not a food photo borrowed from Nutrition. */
  var FEATURES = [
    {
      eyebrow:"Plans", h:"Plans built for you", p:"BMI, calories and macros pulled from your own stats, with a 7-day menu and workout week aimed at fat loss, muscle or maintenance.",
      list:["Personal calorie & macro targets","7-day meal plan + workout week","Rebuilds automatically as you log"],
      imgs:[{img:"ad-15.jpg",tag:"Recap"},{img:"ad-16.jpg",tag:"Daily board"},{img:"ad-02.jpg",tag:"Today"}]
    },
    {
      eyebrow:"Nutrition", h:"Menus your way", p:"Meal plans built to MyPlate, DASH, Mediterranean, heart-healthy and diabetes-plate guidance. Leave out shellfish, pork, dairy, gluten and more.",
      list:["Meal plans across multiple eating styles","Full allergen & ingredient leave-outs","Sunday prep, weekday done"],
      imgs:[{img:"ad-07.jpg",tag:"Meal prep"},{img:"ad-08.jpg",tag:"Read your plate"}]
    },
    {
      eyebrow:"Training", h:"1,700+ exercises, every rep logged", p:"Low to high impact, bodyweight to kettlebells, with rep and set logging and personal bests tracked automatically.",
      list:["Bodyweight, bands, jump rope, kettlebell, dumbbells","Rep/set logging with live personal bests","Workouts sized to the equipment you own"],
      imgs:[{img:"ad-03.jpg",tag:"Living room"},{img:"ad-04.jpg",tag:"Kettlebell"},{img:"ad-05.jpg",tag:"Jump rope"},{img:"ad-13.jpg",tag:"Living room"}]
    },
    {
      eyebrow:"Progress", h:"Millions of foods, progress you can see", p:"Log meals in a tap and see protein, carbs, fat and sugar against your targets, plus where your weight and reps are trending.",
      list:["Millions of foods with full macro breakdowns","Weight, reps and streaks in one view","Trends, not just today's number"],
      imgs:[{img:"ad-06.jpg",tag:"Progress"},{img:"ad-11.jpg",tag:"Progress trend"}]
    }
  ];
  /* Community/Buddies gets its own quote treatment in social() below, right after this list —
     deliberately not a sixth feature row, so the one real buddies photo isn't shown twice in a row. */

  /* Tag/caption assigned only after watching each clip's actual poster frame — grouped under the
     same five categories as the feature rows below (Plans, Nutrition, Training, Progress, Buddies)
     so nothing here is guessed or mismatched to the wrong footage. */
  var VIDEOS = [
    {clip:"01", tag:"Training", h:"Every body can train."},
    {clip:"07", tag:"Training", h:"Bad knees? Start low."},
    {clip:"08", tag:"Training", h:"No gym? No problem."},
    {clip:"04", tag:"Training", h:"Motivation gets you started."},
    {clip:"12", tag:"Training", h:"Your workouts live in one app."},
    {clip:"02", tag:"Nutrition", h:"Eat food you actually like."},
    {clip:"09", tag:"Nutrition", h:"Sunday. One hour."},
    {clip:"10", tag:"Nutrition", h:"Protein. Carbs. Fat. Sugar."},
    {clip:"05", tag:"Plans", h:"Stop juggling 3 apps."},
    {clip:"11", tag:"Plans", h:"How many calories should you eat?"},
    {clip:"06", tag:"Progress", h:"The scale: one number."},
    {clip:"03", tag:"Buddies", h:"Workouts are easier with backup."}
  ];

  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }

  function lt3(tag, h, p){
    return '<div class="lt3"><span class="lt3-tag">'+esc(tag)+'</span><h4>'+esc(h)+'</h4>'+(p?'<p>'+esc(p)+'</p>':'')+'</div>';
  }

  function heroBlock(){
    return '' +
    '<div class="ahero">' +
      '<div class="rv rv-l">' +
        '<span class="ahero-eyebrow"><span class="dot"></span>Live on the app right now</span>' +
        '<h1>Train it. Eat it. <em>Track both.</em></h1>' +
        '<p class="lead">Rep &amp; Ration builds your meals and workouts around your goal, tracks every rep and every plate, and keeps your crew in it with you.</p>' +
        '<div class="ahero-cta"><button class="btn primary" data-gmode="signup">Start your 7-day free trial</button><button class="btn" data-gmode="login">Log in</button></div>' +
        '<div class="ahero-chips"><span>BMI &amp; targets</span><span>7-day meal prep</span><span>Macro tracker</span><span>Workout log</span></div>' +
      '</div>' +
      '<div class="rv rv-r ahero-visual">' +
        '<img src="'+P+'ad-01.jpg" alt="Rep &amp; Ration dashboard: today\'s calories left, macro bars, finished workout circuit with a new personal best, and a logged dinner of salmon, sweet potato and green beans" loading="eager">' +
      '</div>' +
    '</div>';
  }

  function marquee(){
    var items = [["1,700+","exercise demos"],["$0","to start, no card"],["7","day Premium trial"],["millions","of foods, USDA & more"]];
    var one = items.map(function(it){ return '<div class="amarq-item"><b>'+it[0]+'</b><span>'+it[1]+'</span></div><span class="amarq-sep">·</span>'; }).join("");
    return '<div class="amarq rv"><div class="amarq-track">'+one+one+'</div></div>';
  }

  function featureRow(f, i){
    var imgs = f.imgs.map(function(im){
      var r = RATIO[im.img] || "1/1";
      return '<div class="afeat-ph" style="aspect-ratio:'+r+'"><img src="'+P+im.img+'" alt="'+esc(im.tag)+'" loading="lazy">' +
        '<span class="afeat-tag">'+esc(im.tag)+'</span></div>';
    }).join("");
    var rev = (i % 2 === 1) ? " rev" : "";
    return '' +
    '<div class="afeat'+rev+'">' +
      '<div class="rv afeat-text"><span class="eyebrow">'+esc(f.eyebrow)+'</span><h3>'+esc(f.h)+'</h3><p>'+esc(f.p)+'</p>' +
        '<ul class="afeat-list">'+f.list.map(function(l){ return "<li>"+esc(l)+"</li>"; }).join("")+'</ul>' +
      '</div>' +
      '<div class="rv afeat-collage">'+imgs+'</div>' +
    '</div>';
  }

  /* The supplied creative already carries its own headline/caption — we only add a small corner
     tag for wayfinding, never a second duplicate headline on top of someone else's finished ad. */
  function adCard(a, cls){
    cls = cls || "";
    return '<div class="acard '+a.ratio+(a.wide?" wide":"")+' '+cls+' rv">' +
      '<div class="acard-frame">' +
        '<img src="'+P+a.img+'" alt="'+esc(a.h)+'" loading="lazy">' +
        '<span class="acard-tag">'+esc(a.tag)+'</span>' +
      '</div>' +
    '</div>';
  }

  function gallery(){
    var cards = GALLERY.map(function(a){ return adCard(a); }).join("");
    return '' +
    '<div>' +
      '<div class="agallery-head rv"><div><h2>Pulled straight from the app</h2><p>Real screens, real sessions, real plates — the same ones you\'ll see once you\'re in.</p></div></div>' +
      '<div class="arail">'+cards+'</div>' +
    '</div>';
  }

  function newAdCard(a){
    return '<div class="acard '+a.ratio+(a.wide?" wide":"")+' new rv">' +
      '<div class="acard-frame lt3-wrap">' +
        '<img src="'+P+a.img+'" alt="'+esc(a.h)+'" loading="lazy">' +
        lt3(a.tag, a.h, a.p) +
      '</div>' +
    '</div>';
  }

  function moreAds(){
    var cards = NEW_ADS.map(newAdCard).join("");
    return '' +
    '<div>' +
      '<div class="agallery-head rv"><div><h2>More from the same campaign</h2><p>Same real photos, new cuts — built around the numbers the app actually tracks.</p></div></div>' +
      '<div class="arail">'+cards+'</div>' +
    '</div>';
  }

  function videoRail(){
    var cards = VIDEOS.map(function(v){
      return '<div class="advc rv">' +
        '<div class="advphone paused" data-clip="'+v.clip+'">' +
          '<video muted loop playsinline preload="none" poster="'+V+'poster-'+v.clip+'.jpg" src="'+V+'clip-'+v.clip+'.mp4"></video>' +
          '<span class="acard-tag">'+esc(v.tag)+'</span>' +
          '<div class="advmute" aria-hidden="true">🔇</div>' +
          '<div class="advplay"><span>▶</span></div>' +
        '</div>' +
        '<p class="advcaption">'+esc(v.h)+'</p>' +
      '</div>';
    }).join("");
    return '' +
    '<div>' +
      '<div class="agallery-head rv"><div><h2>Watch it in action</h2><p>Short, muted loops, straight from the app — tap any card for sound.</p></div></div>' +
      '<div class="advrail">'+cards+'</div>' +
    '</div>';
  }

  function social(){
    return '' +
    '<div class="asocial">' +
      '<div class="rv rv-l asocial-img"><img src="'+P+'ad-09.jpg" alt="A group of friends high-fiving after a workout in the park"></div>' +
      '<div class="rv rv-r"><span class="eyebrow">Buddies</span><h3>Bring the people who keep you honest</h3>' +
        '<p>Add friends, family or your coach so your workouts and your plate stay a team sport, not a solo chore.</p>' +
        '<ul class="afeat-list" style="margin-top:16px"><li>Invite by text or email</li><li>Shared workouts, group streaks</li><li>Coach plans for trainers</li></ul>' +
      '</div>' +
    '</div>';
  }

  function priceBlock(){
    return '' +
    '<div class="aprice rv">' +
      '<div><span class="aprice-eyebrow">Membership</span>' +
        '<h2>Everything above, for one price.</h2>' +
        '<p class="sub">No separate tiers to compare — meal plans, workouts, macro tracking and buddies are all included from day one.</p>' +
        '<ul class="aprice-list"><li>Personal calorie, macro &amp; meal plan</li><li>Workout week with rep &amp; set logging</li><li>Buddies groups for friends, family &amp; your coach</li><li>Cancel any time, no questions asked</li></ul>' +
      '</div>' +
      '<div class="aprice-card"><div class="amt">$30<span>/month</span></div><span class="trial">7 days free first</span>' +
        '<div class="fine">Card required up front, $0 charged today. Billed $30 on day 8, then monthly, until you cancel.</div>' +
        '<button class="btn primary" data-gmode="signup">Start free trial</button></div>' +
    '</div>';
  }

  function lowerThirdBar(){
    return '' +
    '<div class="rr-lt3bar" id="rrLt3Bar">' +
      '<div class="rr-lt3bar-inner">' +
        '<span class="rr-lt3bar-tag">Lower third</span>' +
        '<div class="rr-lt3bar-txt"><b>Free to start, no card.</b><span>Premium from $10/month billed yearly, 7 days free.</span></div>' +
        '<button class="btn primary sm" data-gfree>Start free</button>' +
        '<button class="rr-lt3bar-x" type="button" aria-label="Dismiss">✕</button>' +
      '</div>' +
    '</div>';
  }

  function render(){
    return '' +
      marquee() +
      FEATURES.map(featureRow).join('<div class="rv" style="height:1px"></div>') +
      gallery() +
      videoRail() +
      moreAds() +
      social() +
      lowerThirdBar();
  }

  /* ---------- motion: reveal + lower-third + in-view video playback ---------- */
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function init(root){
    root = root || document;
    if (reduced){
      root.querySelectorAll(".rv").forEach(function(el){ el.classList.add("in"); });
      root.querySelectorAll(".lt3-wrap").forEach(function(el){ el.classList.add("lt3-on"); });
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, {threshold:.14, rootMargin:"0px 0px -6% 0px"});
    root.querySelectorAll(".rv").forEach(function(el){ io.observe(el); });

    var io2 = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (en.isIntersecting) en.target.classList.add("lt3-on");
      });
    }, {threshold:.35});
    root.querySelectorAll(".lt3-wrap").forEach(function(el){ io2.observe(el); });

    var vio = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        var ph = en.target, v = ph.querySelector("video");
        if (!v) return;
        if (en.isIntersecting && en.intersectionRatio > .6){
          v.play().then(function(){ ph.classList.remove("paused"); }).catch(function(){ ph.classList.add("paused"); });
        } else {
          v.pause(); ph.classList.add("paused");
        }
      });
    }, {threshold:[0,.6]});
    root.querySelectorAll(".advphone").forEach(function(el){ vio.observe(el); });

    root.querySelectorAll(".advphone").forEach(function(ph){
      ph.addEventListener("click", function(){
        var v = ph.querySelector("video");
        if (!v) return;
        if (v.paused){ v.play().catch(function(){}); ph.classList.remove("paused"); }
        else { v.pause(); ph.classList.add("paused"); }
      });
    });

    var bar = root.querySelector("#rrLt3Bar"), hero = root.querySelector(".ghero") || root.querySelector(".ahero");
    if (bar && hero && !dismissed){
      var hio = new IntersectionObserver(function(entries){
        entries.forEach(function(en){ bar.classList.toggle("show", !en.isIntersecting && !dismissed); });
      }, {threshold:0});
      hio.observe(hero);
      var x = bar.querySelector(".rr-lt3bar-x");
      if (x) x.addEventListener("click", function(){ dismissed = true; bar.classList.remove("show"); });
    }
  }
  var dismissed = false;

  window.RR_ADS = {render: render, init: init};
})();
