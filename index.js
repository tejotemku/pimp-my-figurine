// CONSTANTS
const DEFAULT_COLOR = '#29397B' // Ultramarine Blue ), cry me a river


// types
class ColorLayer {
  constructor(layerId, color, name, canvas) {
    this.layerId = layerId
    this.color = color
    this.name= name
    this.canvas = canvas
  }
}

// global variables
let imageWidth = 0
let imageHeight = 0
let isImageSet = false
let currentlyEditedLayer = ''
let brushSize = 5
let layers = []
let lastLayerId = -1
let overwritePixels = false
let isErasing = false
let colorsOpacityInHex = '80'
let colorsOpacityInHexOld = ''
let hideUI = false
let greyscale = false


// global elements
//    controls
const brush = document.getElementById('brush')
const hideUiButton = document.getElementById('hide-ui-button')
const greyscaleCheckbox = document.getElementById('greyscale')

//    canvases
const canvas = document.getElementById('mini-painter-board-background')
const canvasContext = canvas.getContext('2d')

const canvasGreyscale = document.getElementById('mini-painter-board-background-greyscale')
const canvasContextGreyscale = canvasGreyscale.getContext('2d')
canvasGreyscale.style.visibility = 'hidden'

const paintingCanvas = document.getElementById('mini-canvas')
const paintingCanvasContext = paintingCanvas.getContext('2d', { willreadfrequently: true })

// helpers
function debouncer(callback, delay) {
  let timerId

  return function (...args) {
    clearTimeout(timerId)

    timerId = setTimeout(() => {
      callback.apply(this, args)
    }, delay)
  }
}

// brush controls
window.addEventListener("mousemove", (event) => {
  brush.style.left = (event.clientX - brushSize)+ 'px'
  brush.style.top = (event.clientY - brushSize) + 'px'
})

function changeBrushElementSize(size) {
  brush.style.width = (2 * size - 1) + 'px'
  brush.style.height = (2 * size - 1) + 'px'
} 

function setBrushColor() {
  brush.style.backgroundColor = getCurrentColor()
}

function clearBrushColor() {
  brush.style.backgroundColor = '#00000080'
}

// layers
function resetLayerControls() {
  const colorLayers = document.getElementById('color-layers')
  if (!colorLayers) return
  colorLayers.innerHTML = ''
}

function setActiveColor (layerId) {
  currentlyEditedLayer  = layerId
  isErasing = false
  document.getElementById('layer-color-eraser').classList.remove('active-layer')

  const colorInputs = Array.from(document.getElementsByClassName('layer-color-input'))

  colorInputs.forEach(layerInput => {
    layerInput.classList.remove('active-layer')
  })
  document.getElementById(`layer-color-${layerId}`).classList.add('active-layer')
  setBrushColor()
}

function setLayerControls() {
  function createLayerElement(layer) {
    function createIcon(iconName, callback) {
      const icon = document.createElement('span')
      icon.classList.add('material-symbols-outlined')
      icon.innerHTML = iconName
      icon.setAttribute('id', `layer-${iconName}-${layer.layerId}`)
      icon.addEventListener("click", e => callback(e))
      return icon
    }

    // wrapper
    const layerWrapper = document.createElement('div')
    layerWrapper.setAttribute('id', `layer-wrapper-${layer.layerId}`)
    layerWrapper.classList.add('layer')


      // color input
      const colorInput = document.createElement('input')
      colorInput.setAttribute('id', `layer-color-${layer.layerId}`)
      colorInput.setAttribute('name', `layer-color-${layer.layerId}`)
      colorInput.setAttribute('value', layer.color)
      colorInput.setAttribute('type', 'color')
      colorInput.classList.add("layer-color-input")
      colorInput.addEventListener('input', (event) => changeLayerColor(layer.layerId, event.target.value))

      // layer display name wrapper
      const layerDisplayNameWrapper = document.createElement('div')
      layerDisplayNameWrapper.classList.add('layer-display-name')
        // layer name
        const layerDisplayName = document.createElement('label')
        layerDisplayName.setAttribute('id', `layer-name-${layer.layerId}`)
        layerDisplayName.setAttribute('for', `layer-color-${layer.layerId}`)
        layerDisplayName.innerHTML = layer.name
        layerDisplayName.addEventListener('click', () => setActiveColor(layer.layerId))

        // layer start edit icon
        const layerStartEditIcon = createIcon('edit', () => {
          layerWrapper.getElementsByClassName('layer-display-name')[0].style = "display: none;"
          layerWrapper.getElementsByClassName('layer-edit-name')[0].style = "display: flex;"
        })
      layerDisplayNameWrapper.appendChild(layerDisplayName)
      layerDisplayNameWrapper.appendChild(layerStartEditIcon)

      // layer display name wrapper
      const layerEditNameWrapper = document.createElement('div')
      layerEditNameWrapper.classList.add('layer-edit-name')
      layerEditNameWrapper.style = "display: none;"
        // layer name
        const layerEditNameInput = document.createElement('input')

        function saveLayerName() {
          layerWrapper.getElementsByClassName('layer-edit-name')[0].style = "display: none;"
          layerWrapper.getElementsByClassName('layer-display-name')[0].style = "display: flex;"
          changeLayerName(layer.layerId, layerEditNameInput.value)
          resetLayerControls()
          setLayerControls()
        }

        layerEditNameInput.setAttribute('id', `layer-name-input-${layer.layerId}`)
        layerEditNameInput.setAttribute('type', 'text')
        layerEditNameInput.setAttribute('value', layer.name)
        layerEditNameInput.addEventListener('keypress',  (event) => (event.key === 'Enter') && saveLayerName())

        // layer start edit icon
        const layerStopEditIcon = createIcon('check', saveLayerName)
        layerEditNameWrapper.appendChild(layerEditNameInput)
        layerEditNameWrapper.appendChild(layerStopEditIcon)

      // remove layer icon
      const layerRemoveIcon = createIcon('close', () => removeLayerById(layer.layerId))

    // append elements
    layerWrapper.appendChild(colorInput)
    layerWrapper.appendChild(layerDisplayNameWrapper)
    layerWrapper.appendChild(layerEditNameWrapper)
    layerWrapper.appendChild(layerRemoveIcon)

    return layerWrapper
  }

  const colorLayers = document.getElementById('color-layers')
  if (!colorLayers) return

  layers.forEach(layer => colorLayers.appendChild(createLayerElement(layer)))


}

function changeLayerColorFunc(layerId, color) {
  const layer = layers.find(layer => layer.layerId === layerId)
  if (!layer) return
  changeCanvasColor(layer.color, color)
  layer.color = color
  setBrushColor()
}

function changeLayerName(layerId, name) {
  const layer = layers.find(layer => layer.layerId === layerId)
  if (!layer) return
  layer.name = name
}

function removeLayerById(layerId) {
  if (!confirm('Are you sure you want to remove this color? This action cannot be undone, you will loose all you progress')) return
  layers = layers.filter(layer => layer.layerId !== layerId)
  resetLayerControls()
  setLayerControls()
}


function setBrushSize(size) {
  brushSize = size
  document.getElementById('brush-size-slider-label').innerText = `Brush size: ${size}`
  changeBrushElementSize(size)
}

function repaintCanvas() {
  layers.forEach(layer => changeCanvasColor(layer.color, layer.color, true))
}


function setColorOpacityFunc(opacity) {
  let opacity256 = Number(opacity) * 255 / 100
  opacity256 = opacity256 | 0
  colorsOpacityInHexOld = colorsOpacityInHex
  colorsOpacityInHex = opacity256.toString(16).toUpperCase()
  if (colorsOpacityInHex.length === 1) colorsOpacityInHex = '0' + colorsOpacityInHex
  repaintCanvas()
  setBrushColor()
}

const setColorOpacity = debouncer(setColorOpacityFunc, 250)

function getBoard() {
  return document.getElementById('board')
}

function createNewLayer() {
  lastLayerId++
  layers.push( new ColorLayer(`layer-${lastLayerId}`, DEFAULT_COLOR, `Color ${lastLayerId}`, null))
  resetLayerControls()
  setLayerControls()
  setActiveColor(`layer-${lastLayerId}`)
}

function changeCanvasColor(oldColor, newColor, opacityChange) {
  function getColorPrimitives (color, opacity) {
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = 1
    tempCanvas.height = 1
    const tempCtx = tempCanvas.getContext('2d', { willreadfrequently: true })
    tempCtx.fillStyle = color  + opacity
    tempCtx.fillRect(0, 0, 1, 1)
    return tempCtx.getImageData(0, 0, 1, 1).data 
  }

  const targetColor = getColorPrimitives(oldColor, opacityChange ? colorsOpacityInHexOld: colorsOpacityInHex)
  const replacementColor = getColorPrimitives(newColor, colorsOpacityInHex)
  const imageData = paintingCanvasContext.getImageData(0, 0, imageWidth, imageHeight)
  const data = imageData.data 

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]

    if (
      r === targetColor[0] &&
      g === targetColor[1] &&
      b === targetColor[2] &&
      a === targetColor[3]
    ) {
      data[i]     = replacementColor[0]
      data[i + 1] = replacementColor[1]
      data[i + 2] = replacementColor[2]
      data[i + 3] = replacementColor[3]
    }
  }

  paintingCanvasContext?.putImageData(imageData, 0, 0)
}

const changeLayerColor = debouncer(changeLayerColorFunc, 250)

function getBrushedArea() {
  const coordinates = []
  if (brushSize < 0) return coordinates
  const rSquared = brushSize * brushSize


  for (let x = -brushSize; x <= brushSize; x++) {
    for (let y = -brushSize; y <= brushSize; y++) {
      if (x * x + y * y <= rSquared) {
        coordinates.push({ x, y })
      }
    }
  }
  return coordinates
}

function getColorByLayerId(layerId) {
  return layers.find(layer => layer.layerId === layerId)?.color ?? DEFAULT_COLOR
}

function getCurrentColor() {
  return getColorByLayerId(currentlyEditedLayer) + colorsOpacityInHex
}

function setupCanvas() {
  paintingCanvas.width = imageWidth
  paintingCanvas.height = imageHeight
  let isPainting = false

  const paintPixel = (event) => {
    const rect = paintingCanvas.getBoundingClientRect()
    const baseX = Math.floor(event.clientX - rect.left)
    const baseY = Math.floor(event.clientY - rect.top)

    const color = getCurrentColor()
    paintingCanvasContext.fillStyle = color

    
    const area = getBrushedArea()
    area.forEach(coord => {
      const x = coord.x + baseX
      const y = coord.y + baseY

      if (paintingCanvasContext && x >= 0 && x < imageWidth && y >= 0 && y < imageHeight) {
        if (isErasing || overwritePixels || paintingCanvasContext.getImageData(x, y, 1, 1).data.every(a => a === 0)) {
          paintingCanvasContext.fillStyle = color
          paintingCanvasContext.clearRect(x, y, 1, 1)
          if (!isErasing) paintingCanvasContext.fillRect(x, y, 1, 1)
        }
      }
    })
    
  }


  paintingCanvas.addEventListener('mousedown', (event) => {
    if (!currentlyEditedLayer) return
    isPainting = true
    paintPixel(event)
  })

  paintingCanvas.addEventListener('mousemove', (event) => {
    if (isPainting) {
      paintPixel(event)
    }
  })

  window.addEventListener('mouseup', () => {
    isPainting = false
  })

  getBoard()?.appendChild(paintingCanvas)
  return paintingCanvas
}

function convertCanvasToGreyscale() {
  canvasGreyscale.width = imageWidth
  canvasGreyscale.height = imageHeight
  const imageData = canvasContext.getImageData(0, 0, imageWidth, imageHeight)
  const data = imageData.data; 


  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    const grey = (r * 0.299) + (g * 0.587) + (b * 0.114)

    data[i]     = grey
    data[i + 1] = grey
    data[i + 2] = grey
  }

  canvasContextGreyscale.putImageData(imageData, 0, 0);
}

function toggleUIVisibility() {
  hideUI = !hideUI
  Array.from(document.getElementsByClassName('ui-controls')).forEach(elem => {
    elem.classList.toggle('hide')
  })
  hideUiButton.innerText = hideUI ? 'Show UI' : 'Hide UI'
}


// watchers
hideUiButton.addEventListener('click', toggleUIVisibility)

greyscaleCheckbox.addEventListener('change', event => {
  greyscale = !greyscale
  canvasGreyscale.style.visibility = greyscale ? 'visible' : 'hidden'
})

document.getElementById('overwrite-pixels').addEventListener('change', () => overwritePixels = !overwritePixels)

document.getElementById('layer-color-eraser').addEventListener('click', () => {
  setActiveColor('eraser')
  clearBrushColor()
  isErasing = true
})
document.getElementById('brush-size-slider').addEventListener('input', e => setBrushSize(e.target.value))
document.getElementById('color-opacity-slider').addEventListener('input', (e) => {
  document.getElementById('color-opacity-slider-label').innerText = `Color opacity : ${e.target.value}%`
  setColorOpacity(e.target.value)
})

document.getElementById('add-new-layer').addEventListener('click', createNewLayer)

document.addEventListener("DOMContentLoaded", () => {
  const miniImageImportFile = document.getElementById("mini-image-upload")
  const miniPainterBoardBackground = document.getElementById("mini-painter-board-background")
  if (!miniImageImportFile || !miniPainterBoardBackground) return

  const canvasContext = miniPainterBoardBackground.getContext("2d", { willreadfrequently: true })
  if (!canvasContext) return


  miniImageImportFile.addEventListener("change", (event) => {
    if (!event.target) return
    const file = event.target.files[0]
    if (!file) return

    if (isImageSet && !confirm('Are you sure you want to open a new image? Current works will be lost.')) return

    const reader = new FileReader()

    reader.onload = (event) => {
      const img = new Image()
      
      img.onload = () => {
        imageWidth = img.width
        imageHeight = img.height
        miniPainterBoardBackground.width = imageWidth
        miniPainterBoardBackground.height = imageHeight
        canvasContext.drawImage(img, 0, 0)
        currentlyEditedLayer = ''
        resetLayerControls()
        setLayerControls()
        setupCanvas()
        convertCanvasToGreyscale()
      }

      img.src = String(event.target?.result)
      isImageSet = true
    }

    reader.readAsDataURL(file)

  })
})