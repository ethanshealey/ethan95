/**
 * Compresses an image file using DCT-based quantization.
 * @param file the image file
 * @param quality compression quality 1–100 (lower = more compression)
 * @param scale resize factor 0–1 applied after compression (compounds each press)
 * @param targetSize original dimensions to upscale back to after downscaling
 */
export const compressImage = async (
  file: File,
  quality: number,
  scale = 1,
  targetSize?: { width: number; height: number }
): Promise<File> => {

  const quant: number[] = buildQuantMatrix(quality)
  const imageData: ImageData | undefined = await fileToImageData(file)

  if (!imageData) throw new Error('Failed to read image data')

  const { width, height, data } = imageData
  const out = new Uint8ClampedArray(data.length)

  // Copy alpha channel unchanged
  for (let i = 3; i < data.length; i += 4) out[i] = data[i]

  for (let channel = 0; channel < 3; channel++) {
    for (let by = 0; by < height; by += BLOCK_SIZE) {
      for (let bx = 0; bx < width; bx += BLOCK_SIZE) {

        // Extract block with edge clamping, level-shift to [-128, 127]
        const block: number[][] = Array.from({ length: BLOCK_SIZE }, (_, dy) =>
          Array.from({ length: BLOCK_SIZE }, (_, dx) => {
            const px = Math.min(bx + dx, width - 1)
            const py = Math.min(by + dy, height - 1)
            return data[(py * width + px) * 4 + channel] - 128
          })
        )

        // Forward DCT
        const freq = dct2d(block)

        // Quantize then dequantize (this is where information is lost)
        for (let i = 0; i < BLOCK_SIZE; i++)
          for (let j = 0; j < BLOCK_SIZE; j++)
            freq[i][j] = Math.round(freq[i][j] / quant[i * BLOCK_SIZE + j]) * quant[i * BLOCK_SIZE + j]

        // Inverse DCT
        const rec = idct2d(freq)

        // Write back with level shift and clamp
        for (let dy = 0; dy < BLOCK_SIZE; dy++) {
          for (let dx = 0; dx < BLOCK_SIZE; dx++) {
            const px = bx + dx
            const py = by + dy
            if (px < width && py < height)
              out[(py * width + px) * 4 + channel] = Math.max(0, Math.min(255, Math.round(rec[dy][dx] + 128)))
          }
        }

      }
    }
  }

  const result = await imageDataToFile(new ImageData(out, width, height), file.name, scale, targetSize, file.type)
  return result

}

const fileToImageData = async (file: File): Promise<ImageData | undefined> => {
  const bitmap: ImageBitmap = await createImageBitmap(file)

  const canvas = document.createElement("canvas")
  canvas.width = bitmap.width
  canvas.height = bitmap.height

  const ctx: CanvasRenderingContext2D | null  = canvas.getContext("2d")
  ctx?.drawImage(bitmap, 0, 0)

  bitmap.close()

  return ctx?.getImageData(0, 0, canvas.width, canvas.height)
}

const imageDataToFile = async (
  imageData: ImageData,
  filename: string,
  scale = 1,
  targetSize?: { width: number; height: number },
  type = 'image/jpeg'
): Promise<File> => {
  const smallW = Math.max(1, Math.round(imageData.width * scale))
  const smallH = Math.max(1, Math.round(imageData.height * scale))
  const outW = targetSize?.width ?? smallW
  const outH = targetSize?.height ?? smallH

  // Draw ImageData onto a source canvas
  const src = document.createElement("canvas")
  src.width = imageData.width
  src.height = imageData.height
  src.getContext("2d")!.putImageData(imageData, 0, 0)

  // Downscale onto a small intermediate canvas
  const small = document.createElement("canvas")
  small.width = smallW
  small.height = smallH
  const smallCtx = small.getContext("2d")!
  smallCtx.imageSmoothingEnabled = false
  smallCtx.drawImage(src, 0, 0, smallW, smallH)

  // Upscale back to target size (nearest-neighbor for blocky effect)
  const canvas = document.createElement("canvas")
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext("2d")!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(small, 0, 0, outW, outH)

  const blob = await new Promise<Blob>(resolve => 
    canvas.toBlob(b => resolve(b!), type, .95)
  )

  return new File([blob], filename, { type })
}

/* THE MATH (ARE YOU HAPPY NATE?) */

// Constants
const BLOCK_SIZE: 8 = 8
const COS_TABLE: number[][] = Array.from({ length: 8 }, (_, k) => Array.from({ length: 8 }, (_, n) => Math.cos((Math.PI / 8) * k * (n + 0.5))))
const SCALE = Array.from({ length: 8 }, (_, k) => k === 0 ? Math.sqrt(1 / 8) : Math.sqrt(2 / 8));
const QUANT_BASE: number[] = [
  16, 11, 10, 16,  24,  40,  51,  61,
  12, 12, 14, 19,  26,  58,  60,  55,
  14, 13, 16, 24,  40,  57,  69,  56,
  14, 17, 22, 29,  51,  87,  80,  62,
  18, 22, 37, 56,  68, 109, 103,  77,
  24, 35, 55, 64,  81, 104, 113,  92,
  49, 64, 78, 87, 103, 121, 120, 101,
  72, 92, 95, 98, 112, 100, 103,  99,
]

/**
 * Builds a quantization matrix based on the desired quality.
 * 
 * @param quality the desired quality of the image
 * @returns the quant matrix
 */
const buildQuantMatrix = (quality: number) => {
  const scale: number = quality < 50 ? 5_000 / quality : 200 - (2 * quality)
  return QUANT_BASE.map((val: number) => Math.max(1, Math.min(Math.round(val * scale / 100), 255)))
}

/**
 * Performs DCT (Discrete Cosine Transform) on a 1D array.
 * 
 * @param input array to manipulate
 * @returns the transformed array
 */
const dct1d = (input: number[]) => {
  const output: number[] = []

  for (let k = 0; k < BLOCK_SIZE; k++) {
    let sum = 0
    for (let n = 0; n < BLOCK_SIZE; n++) {
      sum += input[n] * COS_TABLE[k][n]
    }
    output.push(sum * SCALE[k])
  }
  return output
}

/**
 * Performs IDCT (Inverse Discrete Cosine Transform) on a 1D array.
 * @param input array to manipulate
 * @returns the transformed array
 */
const idct1d = (input: number[]) => {
  const output: number[] = []

  for (let n = 0; n < BLOCK_SIZE; n++) {
    let sum = 0
    for (let k = 0; k < BLOCK_SIZE; k++) {
      sum += SCALE[k] * input[k] * COS_TABLE[k][n]
    }
    output.push(sum)
  }
  return output
}

/**
 * Performs DCT (Discrete Cosine Transform) on a 2D array.
 * @param input the input block
 * @returns the transformed block
 */
const dct2d = (input: number[][]): number[][] => {

  // Step 1: Perform DCT on each row
  const temp = input.map((row: number[]) => dct1d(row))

  // Step 2: Performn DCT on each column
  const output: number[][] = Array.from({ length: BLOCK_SIZE }, () => new Array(BLOCK_SIZE))

  for(let col = 0; col < BLOCK_SIZE; col++) {
    const column = temp.map((row: number[]) => row[col])
    const dctColumn = dct1d(column)
    for(let row = 0; row < BLOCK_SIZE; row++) {
      output[row][col] = dctColumn[row]
    }
  }

  return output
}

/**
 * Performs IDCT (Inverse Discrete Cosine Transform) on a 2D array.
 * @param input the input block
 * @returns the transformed block
 */
const idct2d = (input: number[][]): number[][] => {
  
  // Step 1: Perform IDCT on each column first (reverse of dct2d)
  const temp: number[][] = Array.from({ length: BLOCK_SIZE }, () => new Array(BLOCK_SIZE))

  for(let col = 0; col < BLOCK_SIZE; col++) {
    const column = input.map(row => row[col])
    const idctColumn = idct1d(column)
    for(let row = 0; row < BLOCK_SIZE; row++) {
      temp[row][col] = idctColumn[row]
    }
  }

  // Step 2: Perform IDCT on each row
  return temp.map(row => idct1d(row))

}