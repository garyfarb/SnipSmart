function cropImage(dataUrl, rect) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = rect.width
      canvas.height = rect.height
      const ctx = canvas.getContext("2d")
      ctx.drawImage(
        img,
        rect.x, rect.y, rect.width, rect.height,
        0, 0, rect.width, rect.height
      )
      resolve(canvas.toDataURL("image/png"))
    }
    img.src = dataUrl
  })
}

function preprocessImage(dataUrl, minWidth = 400, minHeight = 400) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let width = img.width, height = img.height

      const scaleW = width < minWidth ? minWidth / width : 1
      const scaleH = height < minHeight ? minHeight / height : 1
      const scale = Math.max(scaleW, scaleH)

      width = Math.round(width * scale)
      height = Math.round(height * scale)

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")

      ctx.drawImage(img, 0, 0, width, height)

      // Grayscale
      const imageData = ctx.getImageData(0, 0, width, height)
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
        data[i] = data[i + 1] = data[i + 2] = avg
      }
      ctx.putImageData(imageData, 0, 0)

      resolve(canvas.toDataURL("image/png"))
    }
    img.src = dataUrl
  })
}

export {
    cropImage,
    preprocessImage
}