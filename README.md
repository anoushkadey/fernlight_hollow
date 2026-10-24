# Fernlight Hollow

A small, cozy pixel-art forest game that runs in the browser. There's no ending. You forage, keep your three hearts and your stamina up, run errands for Grandma Hazel, and trade food for potions with Belladonna the witch, for as long as you like.

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
| B | Basket (holds 15 things) |
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

## Code

Plain JavaScript, no dependencies:

- `js/sprites.js`: hand-placed pixel art (portraits, characters, items, icons)
- `js/art.js`: procedural pixel art (trees, cottage, den, props)
- `js/world.js`: map layout, collision and ground baking
- `js/game.js`: simulation, abilities and rendering, including lighting
- `js/ui.js`: HUD, dialogue, basket, witch's shop and cauldron, menus
- `js/audio.js`: synthesised lo-fi music and sound effects
- `js/data.js`: characters, items, recipes, errands and dialogue
