// Game data: characters, forage, potions, recipes, errands and every line of dialogue.
(function (FH) {
  'use strict';

  FH.CHARACTERS = {
    draco: {
      name: 'Draco',
      title: 'the Bookish One',
      blurb: 'Reads the labels. Reads the footnotes. Reads the footnotes on the labels.',
      maxStam: 100, speed: 1.0,
      ability: { name: "Apothecary's Eye", key: 'Q', cooldown: 8,
        text: 'Sizes you up and names the potion you need right now, plus what you are still missing to get it.' },
      passive: { name: 'Well-Read',
        text: 'Knows every brew on sight. Sees what a Murky Brew will really do, and can read the cauldron before you commit.' },
      color: '#e8b65a',
    },
    sage: {
      name: 'Sage',
      title: 'the Wanderer',
      blurb: 'Grew up eating things off the forest floor. Is still alive, which says a lot.',
      maxStam: 120, speed: 0.95,
      ability: { name: 'Leafsense', key: 'Q', cooldown: 14,
        text: 'Listens to the undergrowth. Every forageable thing nearby pings, and the poisonous ones ping purple.' },
      passive: { name: 'Green Thumb',
        text: 'Can always tell a poisonous lookalike from the real thing. Toxic forage wears a little skull.' },
      color: '#86d651',
    },
    willow: {
      name: 'Willow',
      title: 'the Charmer',
      blurb: 'Has made friends with a mailbox, two crows and a very suspicious goat.',
      maxStam: 100, speed: 1.1,
      ability: { name: 'Lucky Find', key: 'Q', cooldown: 20,
        text: 'Gives the nearest bush or tree a good shake. Something usually falls out. Usually something nice.' },
      passive: { name: 'Sweet Talk',
        text: 'The witch knocks one ingredient off every trade, and Grandma slips an extra vegetable in the bag.' },
      color: '#9d70d4',
    },
  };

  // kind: what shelf it sits on. tags: what recipes and errands ask for.
  FH.ITEMS = {
    strawberry: { name: 'Wild Strawberry', kind: 'Fruit', tags: ['fruit', 'berry'], stam: 12, hp: 0,
      desc: 'Small, sun-warm, gone in one bite.' },
    blueberry: { name: 'Bilberries', kind: 'Fruit', tags: ['fruit', 'berry'], stam: 10, hp: 0,
      desc: 'Turns your fingers blue for the rest of the afternoon.' },
    apple: { name: 'Crab Apple', kind: 'Fruit', tags: ['fruit'], stam: 18, hp: 0,
      desc: 'Sour enough to make you blink twice. Filling, though.' },
    nightberry: { name: 'Nightberries', kind: 'Fruit', tags: ['fruit', 'berry'], stam: 24, hp: 0,
      desc: 'Only ripen in the dark woods. Taste like plums that know a secret.' },
    chanterelle: { name: 'Chanterelle', kind: 'Mushroom', tags: ['mushroom'], stam: 16, hp: 0,
      desc: 'Smells faintly of apricots. The gills run down the stem.' },
    glowcap: { name: 'Glowcap', kind: 'Mushroom', tags: ['mushroom', 'glow'], stam: 6, hp: 0, glow: '#7fe6f0',
      desc: 'Hums with a pale blue light. Better brewed than eaten.' },
    fiddlehead: { name: 'Fiddlehead', kind: 'Herb', tags: ['herb'], stam: 8, hp: 0,
      desc: "A fern that hasn't decided to unroll yet." },
    moonleaf: { name: 'Moonleaf', kind: 'Herb', tags: ['herb'], stam: 5, hp: 0,
      desc: 'Silver underneath and cold to the touch. The witch is fond of it.' },
    carrot: { name: 'Carrot', kind: 'Vegetable', tags: ['veg'], stam: 20, hp: 0,
      desc: "From Grandma's garden. Still has dirt on it, which she says is the good part." },
    turnip: { name: 'Turnip', kind: 'Vegetable', tags: ['veg'], stam: 26, hp: 0,
      desc: 'Heavy, honest, and slightly peppery.' },
    radish: { name: 'Radish', kind: 'Vegetable', tags: ['veg'], stam: 14, hp: 0,
      desc: 'Crunchy. Bites back a little.' },
    pumpkin: { name: 'Sugar Pumpkin', kind: 'Vegetable', tags: ['veg'], stam: 40, hp: 0,
      desc: 'Small enough to carry. Big enough to feel smug about.' },
    pie: { name: "Grandma's Bramble Pie", kind: 'Treat', tags: ['treat'], stam: 70, hp: 1,
      desc: 'Still warm. Fixes most things, including one heart.' },

    // Lookalikes. They wear the face of the real thing until someone who knows looks.
    jack: { name: "Jack-o'-Lantern", look: 'chanterelle', toxic: true, kind: 'Mushroom', tags: ['mushroom'], stam: -15, hp: -1,
      desc: 'Same colour as a chanterelle. Real gills, though, and a real stomachache.' },
    baneberry: { name: 'Baneberries', look: 'blueberry', toxic: true, kind: 'Fruit', tags: ['fruit', 'berry'], stam: -10, hp: -1,
      desc: 'A shade too shiny. Most liars are.' },
    gloomberry: { name: 'Gloomberries', look: 'nightberry', toxic: true, kind: 'Fruit', tags: ['fruit', 'berry'], stam: -20, hp: -1,
      desc: 'Nightberries with a grudge.' },

    // Potions
    hearttonic: { name: 'Heart Tonic', kind: 'Potion', tags: ['potion'], stam: 0, hp: 1,
      desc: 'Rose-red and a little fizzy. Mends one heart.' },
    vigor: { name: 'Vigor Draught', kind: 'Potion', tags: ['potion'], stam: 999, hp: 0,
      desc: 'Tastes like a sunny morning and a slap. Fills your stamina to the top.' },
    swift: { name: "Hare's Step", kind: 'Potion', tags: ['potion'], stam: 10, hp: 0, buff: 'swift', dur: 60,
      desc: 'Your feet get ideas. Faster walking for a minute.' },
    owl: { name: "Owl's Eye", kind: 'Potion', tags: ['potion'], stam: 0, hp: 0, buff: 'owl', dur: 120,
      desc: 'See in the dark and see through lookalikes, for two minutes.' },
    thorn: { name: 'Thornward', kind: 'Potion', tags: ['potion'], stam: 0, hp: 0, buff: 'thorn', dur: 75,
      desc: 'Brambles and wisps slide right off you. Lasts a little over a minute.' },
    murky: { name: 'Murky Brew', kind: 'Potion', tags: ['potion'], stam: 0, hp: 0,
      desc: "Nobody, including the bottle, knows what this does." },
    hex: { name: 'Bitter Hex', kind: 'Potion', tags: ['potion'], stam: -25, hp: -1, toxic: true,
      desc: 'What happens when you brew poison on purpose. Please do not drink this.' },
  };

  FH.MURKY = {
    heal: { text: 'Mends a heart.', good: true },
    stam: { text: 'Fills your stamina.', good: true },
    swift: { text: 'Makes you quick for a minute.', good: true },
    hiccup: { text: 'Gives you bubble hiccups. Harmless. Embarrassing.', good: true },
    drain: { text: 'Knocks the wind out of you.', good: false },
    hurt: { text: 'Costs you a heart.', good: false },
  };

  // Witch's shop. Costs ask for tags, and the witch is not picky about poison.
  FH.TRADES = [
    { id: 'hearttonic', cost: [{ tag: 'berry', n: 3 }, { tag: 'herb', n: 1 }] },
    { id: 'vigor', cost: [{ tag: 'veg', n: 2 }, { tag: 'fruit', n: 2 }] },
    { id: 'swift', cost: [{ tag: 'veg', n: 2 }, { tag: 'herb', n: 2 }] },
    { id: 'owl', cost: [{ tag: 'mushroom', n: 2 }, { tag: 'berry', n: 2 }] },
    { id: 'thorn', cost: [{ tag: 'veg', n: 2 }, { tag: 'mushroom', n: 2 }] },
  ];
  FH.SINGULAR = { berry: 'berry', fruit: 'piece of fruit', veg: 'vegetable', herb: 'herb', mushroom: 'mushroom', glow: 'glowcap', treat: 'treat', potion: 'potion' };
  FH.TAG_NAMES = { berry: 'berries', fruit: 'fruit', veg: 'vegetables', herb: 'herbs', mushroom: 'mushrooms', glow: 'glowcaps', treat: 'treats', potion: 'potions' };

  // Cauldron: three in, one out. Order matters only for how you feel about it.
  FH.brewResult = function (items, roll) {
    const I = FH.ITEMS;
    let toxic = 0;
    const tag = {};
    const ids = {};
    items.forEach(it => {
      const d = I[it.id];
      if (d.toxic) toxic++;
      ids[d.look || it.id] = (ids[d.look || it.id] || 0) + 1;
      d.tags.forEach(t => { tag[t] = (tag[t] || 0) + 1; });
    });
    const murky = (bad) => {
      const good = ['heal', 'stam', 'swift', 'hiccup'], worse = ['drain', 'hurt'];
      const pool = bad ? worse.concat(['hiccup']) : good.concat(worse);
      return { id: 'murky', outcome: pool[Math.floor(roll * pool.length) % pool.length] };
    };
    if (items.length < 3) return null;
    if (toxic >= 2) return { id: 'hex' };
    let out = null;
    if (ids.glowcap && ids.moonleaf) out = 'owl';
    else if ((tag.berry || 0) >= 2 && tag.herb) out = 'hearttonic';
    else if (tag.veg && tag.fruit && tag.mushroom) out = 'vigor';
    else if ((tag.herb || 0) >= 2) out = 'swift';
    else if (tag.veg && tag.mushroom && tag.herb) out = 'thorn';
    if (tag.potion) out = null;
    if (!out) return murky(toxic > 0);
    if (toxic === 1 && roll < 0.6) return murky(true);
    return { id: out };
  };

  FH.RECIPE_HINTS = [
    ['owl', 'a glowcap and a moonleaf, plus anything'],
    ['hearttonic', 'two berries and a herb'],
    ['vigor', 'a vegetable, a fruit and a mushroom'],
    ['swift', 'two herbs and one more thing'],
    ['thorn', 'a vegetable, a mushroom and a herb'],
  ];

  // Errands. need entries: {tag}, {id} or {toxic:true}. Grandma never accepts poison.
  FH.ERRANDS = {
    grandma: [
      { need: [{ tag: 'berry', n: 3 }], reward: ['pie'],
        ask: "I'm making jam and I'm three handfuls of berries short. Any kind that won't kill me." },
      { need: [{ id: 'chanterelle', n: 2 }], reward: ['pie'],
        ask: 'Two chanterelles for the soup. Real ones, mind. Apricot smell, gills running down the stem.' },
      { need: [{ id: 'fiddlehead', n: 2 }], reward: ['pumpkin', 'carrot'],
        ask: "Bring me two fiddleheads? I fry them in butter and pretend I'm somewhere fancy." },
      { need: [{ id: 'apple', n: 2 }], reward: ['pie'],
        ask: "Two crab apples, love. They're for a crumble, and the crumble is for you, so it's selfish really." },
      { need: [{ id: 'moonleaf', n: 1 }, { tag: 'fruit', n: 1 }], reward: ['pie'],
        ask: "My knees want moonleaf. It grows in the dark part, so be careful. And one piece of fruit for the tea." },
      { need: [{ id: 'nightberry', n: 2 }], reward: ['pie', 'turnip'],
        ask: 'Nightberries make the best preserves, but I can\'t get to them anymore. Two would do.' },
    ],
    witch: [
      { need: [{ toxic: true, n: 2 }], reward: ['hearttonic', 'thorn'],
        ask: "Bring me two things that would flatten a lesser person. Mushrooms, berries, I'm not fussy." },
      { need: [{ id: 'glowcap', n: 2 }], reward: ['owl', 'vigor'],
        ask: "I'm out of glowcaps. Two, please. Don't eat them on the way, you'll see sounds." },
      { need: [{ tag: 'veg', n: 3 }], reward: ['vigor', 'hearttonic'],
        ask: "I can't grow anything that isn't angry. Three of Hazel's vegetables. Don't tell her they're for me." },
      { need: [{ id: 'moonleaf', n: 2 }], reward: ['swift', 'hearttonic'],
        ask: 'Two moonleaves. Silver side up when you carry them, or they sulk.' },
      { need: [{ id: 'jack', n: 1 }, { tag: 'herb', n: 1 }], reward: ['thorn', 'owl'],
        ask: "One jack-o'-lantern mushroom and any herb. If you can't tell a jack from a chanterelle, ask a friend with green hair." },
    ],
  };

  // ---------- dialogue ----------
  FH.LINES = {
    start: {
      draco: ["The map says there's a cottage to the east and something marked 'purple, inadvisable' to the west.", 'East first. Obviously.'],
      sage: ['Smells like rain and mushrooms in here.', "Good. I'll start with the mushrooms."],
      willow: ['New forest, new people.', 'Somebody around here definitely has gossip.'],
    },
    grandmaFirst: [
      ['happy', "Oh! You gave me a fright. Nobody comes up the east path unless they're lost or hungry."],
      ['open', 'You look like a bit of both. Come in out of the wind. Well, there is no in. Stand by the fence.'],
      ['happy', "I'm Hazel. Everybody calls me Grandma, even people older than me. There are two of those left."],
      ['open', "The garden's mine but the vegetables don't know that. Take whatever's ripe."],
      ['open', 'And keep out of the purple part of the woods after dark. Or before dark, ideally.'],
      ['happy', "The witch out there is nice enough. It's the woods that aren't."],
    ],
    grandmaChat: [
      "My husband planted that big oak. Said it'd outlive us both. Half right, the old show-off.",
      "If you hear singing in the dark woods, it isn't singing. Keep walking.",
      'Bilberries and baneberries grow side by side. The baneberries are shinier. Most liars are.',
      'I put honey in everything. Tea, porridge, arguments.',
      "The witch and I trade now and then. She gets carrots, I get something for my knees. Don't tell her I said she's nice.",
      "Rain later, maybe. My left elbow is never wrong. My right one's a fibber.",
      "You can't hurry a pumpkin. You can't hurry me either. We both get there.",
      "Jack-o'-lantern mushrooms glow a little at night. Chanterelles don't. Worth remembering, that.",
      'When I was your age I walked to the far lake and back in a day. When I was your age I also lied a lot.',
    ],
    grandmaVeg: [
      "Here, from the cold box. Don't argue, I've more than I can chew. Literally. These teeth.",
      "Take these. The garden's been showing off this week.",
    ],
    grandmaVegDone: "I've given you today's, love. Come back tomorrow. The garden's not a shop.",
    grandmaRest: 'You doze off by the stove. Grandma hums something with no real tune. It is lovely anyway.',
    grandmaRestDone: "You've had your nap, dear. Go on, the day's not finished with you yet.",
    grandmaPoison: "Oh, love. These ones are lookalikes. Pretty colour, terrible stomachache. Into the compost.",
    grandmaThanks: ["Look at you. Useful AND polite.", "Perfect. Sit down a second. No, take this, I insist.", "That's exactly what I needed. Here, for your trouble."],

    witchFirst: [
      ['lidded', 'Wipe your feet. Not on the moss. The moss was here first.'],
      ['open', "So. You found the Den. People who come here want one of three things: a cure, a curse, or directions home."],
      ['lidded', "I do the first two. You'll figure out the third."],
      ['open', "I'm Belladonna. I don't take coin. Coin doesn't grow. Bring me food — berries, roots, things with spots."],
      ['happy', "Or use the cauldron yourself. Three things in, one bottle out. What comes out is between you and it."],
    ],
    witchChat: [
      "Glowcaps are only blue because they're embarrassed. Don't ask about what.",
      "The wisps aren't wicked. They're just lonely and very, very cold. Don't let them hug you.",
      'The brambles out there have opinions. Mostly about your ankles.',
      "Hazel thinks I don't know she calls me 'the nice one'. I know. I'm choosing to allow it.",
      'A Murky Brew is what you get when you ignore the recipe. Like most of my twenties.',
      'Never eat a mushroom that is prettier than you are.',
      'Poison? Darling, poison is just an ingredient that hasn\'t found the right job yet.',
      'The cauldron likes a herb in everything. So do I. We have that in common, the cauldron and I.',
    ],
    witchThanks: ['Lovely. Horrible. Exactly right.', 'Oh, these are nasty. Thank you.', 'You have a gift for this. Take the bottles before I change my mind.'],
    witchPoor: "You can't afford that, sweetheart. Pockets first, then potions.",

    // little speech bubbles above the player
    barks: {
      full: { draco: 'Basket is full. Physics wins again.', sage: "No room. Basket's had enough.", willow: 'Full! Okay, okay, I will stop.' },
      hungry: { draco: 'I should eat something before I fall over.', sage: 'Getting light-headed. Food.', willow: 'Snack. Now. Please.' },
      starving: { draco: "Can't... keep... walking like this.", sage: 'My legs are giving up on me.', willow: 'Everything is wobbly.' },
      darkwood: { draco: 'Temperature just dropped four degrees. That is not normal.', sage: 'The trees are whispering. Not to me, thankfully.', willow: 'Ooh, this is spooky. I love it. I hate it.' },
      night: { draco: 'Getting dark. Statistically, this is when things go wrong.', sage: 'Night. The forest is louder now.', willow: 'Is it just me or did it get dark really fast?' },
      ouch: { draco: 'Ow. Noted.', sage: 'Ow!', willow: 'Ouch, ouch, rude!' },
      poisoned: { draco: '...that tasted like a mistake.', sage: 'I knew that one was wrong. Why did I eat it?', willow: 'Bleh. Bad berry. Bad!' },
      toxicSpotted: { sage: "Lookalike. I'll keep it for the witch." },
      nothingToShake: { willow: 'Nothing around here to shake.' },
    },
  };
})(window.FH);
