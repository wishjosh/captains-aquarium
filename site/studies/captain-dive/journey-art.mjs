const palettes = {
  H: "#d8d6d0", M: "#b6b5b0", S: "#8d908d", D: "#717876",
  o: "#163f4b",
  a: "#e9c577",
  b: "#bd905b",
  c: "#f4e7b3",
  e: "#fcf3da",
  d: "#173d49",
  t: "#679a87",
  r: "#ea9470",
  q: "#bb6f62",
  g: "#a8c9a1",
  u: "#3e796f",
  h: "#f1dfb0",
};
const sprites = [
  [
    ".....aaa......",
    "...aaacaa.....",
    ".bbacccccaaa..",
    "bbaccccccceaa.",
    ".bbacccccedaa.",
    "...aaccccaaa..",
    ".....bbbb.....",
    "......bb......",
  ],
  [
    "....b...b....",
    "...bcccb.....",
    ".bbccccccbb..",
    "..cccccccce..",
    "bccccccccedb.",
    "..ccccccccc..",
    ".bbccccccbb..",
    "...bbccbb....",
    "....b..b.....",
  ],
  [
    "......rrrr......",
    "...rrrgggrrr....",
    ".rrggrrrgggrr...",
    "rrrggrrrgggreer.",
    ".rrggrrrgggrdr..",
    "...rrrgggrrr....",
    "......qqqq......",
  ],
  [
    "....HMM....",
    "...HHMMS...",
    "...HMMMS...",
    "....MSS....",
    ".....M.....",
    "...HMMMS...",
    "..HMHMMSD..",
    "..M.MMM.S..",
    ".HM.MMS.SD.",
    ".MS.MMS.SD.",
    "....MMS....",
    "....M.S....",
    "....M.S....",
    "....M.S....",
    "....S.D....",
  ],
];
function sprite(c, index, x, y, scale = 3, flip = false, alpha = 1) {
  const grid = sprites[index];
  c.save();
  c.globalAlpha = alpha;
  c.translate(Math.round(x), Math.round(y));
  if (flip) c.scale(-1, 1);
  const width = grid[0].length,
    height = grid.length;
  for (let row = 0; row < height; row++)
    for (let col = 0; col < grid[row].length; col++) {
      const color = palettes[grid[row][col]];
      if (color) {
        c.fillStyle = color;
        c.fillRect(
          Math.round((col - width / 2) * scale),
          Math.round((row - height / 2) * scale),
          Math.ceil(scale),
          Math.ceil(scale),
        );
      }
    }
  c.restore();
}

export { sprite };
