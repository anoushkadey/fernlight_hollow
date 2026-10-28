# Fernlight Hollow

A cozy pixel-art forest game that runs in the browser.

**The story.** Grandma Hazel used to tell you about the fernlight, a flower deep in the Hollow that only opens in the dark. Then her letter comes: her garden has gone grey, and so has she. You walk into the woods with a basket. Make her soup, carry her letter to the witch in the Dark Wood (who turns out to be her sister, forty years estranged), brew a Moonlantern, find the fernlight in the Old Glade after dark, and bring the colour back. After the epilogue the forest stays open: forage, run errands, brew, for as long as you like.

## Play

Open `index.html` in a browser. No build step and no install. Everything (sprites, map, music) is generated in code. The game saves itself in the browser as you play.

To serve it locally instead:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Controls

| Key | Action |
| --- | --- |
| WASD / arrow keys | Walk (hold Shift to run) |
| E / Space | Pick up, harvest, talk, read |
| Q | Character ability |
| B / J | Basket (holds 15 things) / Journal |
| Esc | Pause |

On touch screens, an on-screen stick and buttons appear.

## The three wanderers

| | Ability (Q) | Passive |
| --- | --- | --- |
| **Draco**, the bookish one | *Apothecary's Eye*: names the potion you need right now and what you're missing to get it | Sees what a Murky Brew really does and can preview the cauldron |
| **Sage**, the wanderer | *Leafsense*: pings every forageable thing nearby; poisonous ones ping purple | Always tells poisonous lookalikes from the real thing |
| **Willow**, the charmer | *Lucky Find*: shakes the nearest bush or tree for a free item | The witch takes one ingredient less per trade, and Grandma gives an extra vegetable |

## How the forest works

- **Hearts.** You have three. Brambles, wisps, poison and starving each cost one. Lose all three and you start over.
- **Stamina** drains as you walk, faster when you run or are in the Dark Wood. At zero you slow down and start losing hearts.
- **Forage.** The meadow has strawberries, bilberries, crab apples, chanterelles and fiddleheads. The Dark Wood has nightberries, glowcaps and moonleaf. Three of these have poisonous twins (jack-o'-lanterns, baneberries, gloomberries).
- **Grandma Hazel** (east) grows vegetables, gives one gift and one nap a day, and hands out errands that pay in pie.
- **Belladonna** (west, in the Dark Wood) trades potions for food, poison included, has her own errands, and lets you use her cauldron. Three ingredients in, one bottle out.
- **Day and night** cycle every eight minutes. More wisps come out at night.

## Art credits

The portraits of Draco, Sage and Willow in `assets/portraits/` are reduced from reference art supplied for this project by its owner. They are not original to this repository; replace them, or get the artists' permission, before publishing the game publicly. Everything else (Hazel and Belladonna, the world, items, UI frames, cutscene panels and music) is drawn or synthesised in code.

## Code

Plain JavaScript, no dependencies:

- `js/sprites.js`: hand-placed pixel art (portraits, characters, items, icons) and the HD upscaling/shading passes
- `js/art.js`: procedural pixel art (trees, cottage, den, standing stones, the fernlight)
- `js/frames.js`: the UI kit: wood-and-gold frames, plaques, paper and wood textures, vines and ribbons
- `js/story.js`: story steps, beats and the comic-panel cutscenes
- `js/cauldron.js`: the brewing-table scene
- `js/world.js`: map layout, collision and ground baking
- `js/game.js`: simulation, abilities and rendering, including lighting
- `js/ui.js`: HUD, dialogue, basket, witch's shop and cauldron, menus
- `js/audio.js`: synthesised lo-fi music and sound effects
- `js/data.js`: characters, items, recipes, errands and dialogue
