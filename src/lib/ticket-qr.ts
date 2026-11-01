// Compact, dependency-free QR Model 2 encoder for short signed Eventickets codes.
// Version 3-L carries up to 53 UTF-8 bytes and includes 7 modules of quiet zone.
const VERSION = 3;
const SIZE = VERSION * 4 + 17;
const DATA_CODEWORDS = 55;
const ECC_CODEWORDS = 15;

function multiply(a: number, b: number): number {
  let product = 0;
  for (let i = 7; i >= 0; i--) {
    product = (product << 1) ^ ((product >>> 7) * 0x11d);
    product ^= ((b >>> i) & 1) * a;
  }
  return product;
}

function generatorPolynomial(degree: number): number[] {
  let polynomial = [1];
  let root = 1;
  for (let i = 0; i < degree; i++) {
    const next = new Array(polynomial.length + 1).fill(0);
    for (let j = 0; j < polynomial.length; j++) {
      next[j] ^= polynomial[j];
      next[j + 1] ^= multiply(polynomial[j], root);
    }
    polynomial = next;
    root = multiply(root, 2);
  }
  return polynomial;
}

function errorCorrection(data: number[], count: number): number[] {
  const generator = generatorPolynomial(count);
  const work = [...data, ...new Array(count).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const factor = work[i];
    if (factor === 0) continue;
    for (let j = 0; j < generator.length; j++) work[i + j] ^= multiply(generator[j], factor);
  }
  return work.slice(data.length);
}

function formatBits(mask: number): number {
  const data = (0b01 << 3) | mask; // Error correction level L, followed by mask number.
  let remainder = data << 10;
  for (let bit = 14; bit >= 10; bit--) {
    if ((remainder >>> bit) & 1) remainder ^= 0x537 << (bit - 10);
  }
  return ((data << 10) | remainder) ^ 0x5412;
}

function createMatrix(value: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(value));
  if (bytes.length > 53) throw new Error("Ticket QR value is too long");

  const bits: number[] = [];
  const append = (number: number, count: number) => {
    for (let i = count - 1; i >= 0; i--) bits.push((number >>> i) & 1);
  };
  append(0b0100, 4); // Byte mode.
  append(bytes.length, 8);
  for (const byte of bytes) append(byte, 8);
  for (let i = 0; i < Math.min(4, DATA_CODEWORDS * 8 - bits.length); i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const data = bits.reduce<number[]>((words, bit, index) => {
    words[Math.floor(index / 8)] = ((words[Math.floor(index / 8)] || 0) << 1) | bit;
    return words;
  }, []);
  for (let pad = 0; data.length < DATA_CODEWORDS; pad++) data.push(pad % 2 === 0 ? 0xec : 0x11);
  const codewords = [...data, ...errorCorrection(data, ECC_CODEWORDS)];
  const stream = codewords.flatMap((word) => Array.from({ length: 8 }, (_, i) => (word >>> (7 - i)) & 1));

  const modules: (boolean | null)[][] = Array.from({ length: SIZE }, () => new Array(SIZE).fill(null));
  const setFunction = (x: number, y: number, dark: boolean) => {
    if (x >= 0 && y >= 0 && x < SIZE && y < SIZE) modules[y][x] = dark;
  };

  const finder = (centerX: number, centerY: number) => {
    for (let dy = -1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 7; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        const inside = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
        const ring = dx === 0 || dx === 6 || dy === 0 || dy === 6;
        const center = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        setFunction(x, y, inside && (ring || center));
      }
    }
  };
  finder(0, 0);
  finder(SIZE - 7, 0);
  finder(0, SIZE - 7);

  // Version 3 has one 5x5 alignment target, centred at module 22,22.
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) setFunction(22 + dx, 22 + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  for (let i = 8; i < SIZE - 8; i++) {
    if (modules[6][i] === null) setFunction(i, 6, i % 2 === 0);
    if (modules[i][6] === null) setFunction(6, i, i % 2 === 0);
  }

  // Reserve format-information modules before data placement.
  for (let i = 0; i <= 5; i++) setFunction(8, i, false);
  setFunction(8, 7, false);
  setFunction(8, 8, false);
  setFunction(7, 8, false);
  for (let i = 9; i < 15; i++) setFunction(14 - i, 8, false);
  for (let i = 0; i < 8; i++) setFunction(SIZE - 1 - i, 8, false);
  for (let i = 8; i < 15; i++) setFunction(8, SIZE - 15 + i, false);
  setFunction(8, SIZE - 8, true);

  let bitIndex = 0;
  let upward = true;
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right--;
    for (let vert = 0; vert < SIZE; vert++) {
      const y = upward ? SIZE - 1 - vert : vert;
      for (let offset = 0; offset < 2; offset++) {
        const x = right - offset;
        if (modules[y][x] !== null) continue;
        const raw = bitIndex < stream.length ? stream[bitIndex] === 1 : false;
        const masked = ((x + y) % 2 === 0) ? !raw : raw;
        modules[y][x] = masked;
        bitIndex++;
      }
    }
    upward = !upward;
  }

  const format = formatBits(0);
  for (let i = 0; i <= 5; i++) modules[i][8] = ((format >>> i) & 1) !== 0;
  modules[7][8] = ((format >>> 6) & 1) !== 0;
  modules[8][8] = ((format >>> 7) & 1) !== 0;
  modules[8][7] = ((format >>> 8) & 1) !== 0;
  for (let i = 9; i < 15; i++) modules[8][14 - i] = ((format >>> i) & 1) !== 0;
  for (let i = 0; i < 8; i++) modules[8][SIZE - 1 - i] = ((format >>> i) & 1) !== 0;
  for (let i = 8; i < 15; i++) modules[SIZE - 15 + i][8] = ((format >>> i) & 1) !== 0;
  modules[SIZE - 8][8] = true;

  return modules.map((row) => row.map(Boolean));
}

export function ticketQrSvg(value: string): string {
  const modules = createMatrix(value);
  const quiet = 4;
  const size = SIZE + quiet * 2;
  const paths: string[] = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (modules[y][x]) paths.push(`M${x + quiet},${y + quiet}h1v1h-1z`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="Ticket QR code"><rect width="100%" height="100%" fill="#fff"/><path d="${paths.join("")}" fill="#171715"/></svg>`;
}
