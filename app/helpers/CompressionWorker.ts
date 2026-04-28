// Runs in a Web Worker — strip-based DCT compression using pre-allocated typed arrays

const BLOCK = 8

// Flat cosine table: COS[k*8+n] = cos(π/8 * k * (n + 0.5))
const COS = new Float64Array(64)
for (let k = 0; k < 8; k++)
  for (let n = 0; n < 8; n++)
    COS[k * 8 + n] = Math.cos((Math.PI / 8) * k * (n + 0.5))

const SCALE = new Float64Array(8)
for (let k = 0; k < 8; k++) SCALE[k] = k === 0 ? Math.sqrt(1 / 8) : Math.sqrt(2 / 8)

const QUANT_BASE = new Uint8Array([
  16, 11, 10, 16,  24,  40,  51,  61,
  12, 12, 14, 19,  26,  58,  60,  55,
  14, 13, 16, 24,  40,  57,  69,  56,
  14, 17, 22, 29,  51,  87,  80,  62,
  18, 22, 37, 56,  68, 109, 103,  77,
  24, 35, 55, 64,  81, 104, 113,  92,
  49, 64, 78, 87, 103, 121, 120, 101,
  72, 92, 95, 98, 112, 100, 103,  99,
])

const buildQuant = (quality: number): Uint8Array => {
  const s = quality < 50 ? 5_000 / quality : 200 - 2 * quality
  const q = new Uint8Array(64)
  for (let i = 0; i < 64; i++) q[i] = Math.max(1, Math.min(Math.round(QUANT_BASE[i] * s / 100), 255))
  return q
}

// Pre-allocated scratch buffers — safe because each worker is single-threaded
const BLK = new Float64Array(64) // level-shifted pixel block
const FRQ = new Float64Array(64) // DCT frequency coefficients
const REC = new Float64Array(64) // reconstructed pixel block
const TMP = new Float64Array(64) // intermediate pass

/** Forward 2D DCT: reads BLK, writes FRQ */
const dct2d = () => {
  // Row pass: DCT each row of BLK → TMP
  for (let r = 0; r < 8; r++) {
    const ro = r * 8
    for (let k = 0; k < 8; k++) {
      let s = 0
      const ko = k * 8
      for (let n = 0; n < 8; n++) s += BLK[ro + n] * COS[ko + n]
      TMP[ro + k] = s * SCALE[k]
    }
  }
  // Column pass: DCT each column of TMP → FRQ
  for (let c = 0; c < 8; c++) {
    for (let k = 0; k < 8; k++) {
      let s = 0
      const ko = k * 8
      for (let n = 0; n < 8; n++) s += TMP[n * 8 + c] * COS[ko + n]
      FRQ[k * 8 + c] = s * SCALE[k]
    }
  }
}

/** Inverse 2D DCT: reads FRQ, writes REC */
const idct2d = () => {
  // Column pass: IDCT each column of FRQ → TMP
  for (let c = 0; c < 8; c++) {
    for (let n = 0; n < 8; n++) {
      let s = 0
      for (let k = 0; k < 8; k++) s += SCALE[k] * FRQ[k * 8 + c] * COS[k * 8 + n]
      TMP[n * 8 + c] = s
    }
  }
  // Row pass: IDCT each row of TMP → REC
  for (let r = 0; r < 8; r++) {
    const ro = r * 8
    for (let n = 0; n < 8; n++) {
      let s = 0
      for (let k = 0; k < 8; k++) s += SCALE[k] * TMP[ro + k] * COS[k * 8 + n]
      REC[ro + n] = s
    }
  }
}

const processStrip = (data: Uint8ClampedArray, width: number, height: number, quant: Uint8Array): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(data.length)

  // Copy alpha channel unchanged
  for (let i = 3; i < data.length; i += 4) out[i] = data[i]

  for (let ch = 0; ch < 3; ch++) {
    for (let by = 0; by < height; by += BLOCK) {
      for (let bx = 0; bx < width; bx += BLOCK) {

        for (let dy = 0; dy < BLOCK; dy++) {
          const py = Math.min(by + dy, height - 1)
          for (let dx = 0; dx < BLOCK; dx++) {
            const px = Math.min(bx + dx, width - 1)
            BLK[dy * BLOCK + dx] = data[(py * width + px) * 4 + ch] - 128
          }
        }

        dct2d()

        for (let i = 0; i < 64; i++) {
          const q = quant[i]
          FRQ[i] = Math.round(FRQ[i] / q) * q
        }

        idct2d()

        for (let dy = 0; dy < BLOCK; dy++) {
          const py = by + dy
          if (py >= height) break
          for (let dx = 0; dx < BLOCK; dx++) {
            const px = bx + dx
            if (px >= width) break
            out[(py * width + px) * 4 + ch] = Math.max(0, Math.min(255, Math.round(REC[dy * BLOCK + dx] + 128)))
          }
        }

      }
    }
  }

  return out
}

addEventListener('message', (e: MessageEvent) => {
  const { pixels, width, height, quality } = e.data as {
    pixels: ArrayBuffer
    width: number
    height: number
    quality: number
  }
  const result = processStrip(new Uint8ClampedArray(pixels), width, height, buildQuant(quality))
  postMessage({ pixels: result.buffer }, [result.buffer])
})
