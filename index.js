// CONSTANTS
const PRESET_COLORS = [
  '#29397B', // Ultramarine Blue ;), cry me a river
  '#FFF700',
  '#63B521',
  '#FFF685',
  '#005221',
  '#630808',
  '#00506F',
  '#8BB9DD',
  '#CCCC33',
  '#CE8C42',
  '#EB2E28',
  '#DAA520',
  '#A5D610',
  '#8D736C',
  '#EF9CB5'
] 


// types
class ColorLayer {
  constructor(layerId, color, name, canvas) {
    this.layerId = layerId
    this.color = color
    this.name= name
    this.canvas = canvas
    this.oldColors = [color]
  }
}

// global variables
let imageWidth = 0
let imageHeight = 0
let isImageSet = false
let currentlyEditedLayer = ''
let brushSize = 10
let layers = []
let lastLayerId = -1
let paintOver = false
let isErasing = false
let colorsOpacityInHex = '80'
let colorsOpacityInHexOld = ''
let hideUI = false
let greyscale = false
let activeLandscape = undefined

// global control elements
const brush = document.getElementById('brush')
const hideUiButton = document.getElementById('hide-ui-button')
const greyscaleCheckbox = document.getElementById('greyscale')
const paintOverCheckbox = document.getElementById('paint-over')
const eraser = document.getElementById('layer-color-eraser')
const brushSizeSlider = document.getElementById('brush-size-slider')
const brushSizeSliderLabel = document.getElementById('brush-size-slider-label')
const colorOpacitySlider = document.getElementById('color-opacity-slider')
const colorOpacitySliderLabel = document.getElementById('color-opacity-slider-label')
const addNewLayerButton = document.getElementById('add-new-layer')
const colorLayers = document.getElementById('color-layers')
const board = document.getElementById('board')

// tabs
const colorControlsTab = document.getElementById('color-controls-tab')
const colorControlsTabActivator = document.getElementById('color-controls-tab-activator')
const landscaleTab = document.getElementById('landscape-tab')
const landscaleTabActivator = document.getElementById('landscape-tab-activator')

function setActiveTab (tab) {
  if (tab === 'painting') {
    colorControlsTab.style.display = 'flex'
    colorControlsTabActivator.classList.add('active-color')
    landscaleTab.style.display = 'none'
    landscaleTabActivator.classList.remove('active-color')
  } else if (tab === 'landscape') {
    landscaleTab.style.display = 'flex'
    landscaleTabActivator.classList.add('active-color')
    colorControlsTab.style.display = 'none'
    colorControlsTabActivator.classList.remove('active-color')
  }
}

colorControlsTabActivator.addEventListener('click', () => setActiveTab('painting'))
landscaleTabActivator.addEventListener('click', () => setActiveTab('landscape'))
setActiveTab('painting')

// canvases
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
setBrushSize(brushSize)

// colors
function setActiveColor (layerId) {
  currentlyEditedLayer = layerId
  document.getElementsByClassName('active-layer')[0]?.classList.remove('active-layer')

  if (!layerId) return
  if (layerId === 'eraser') {
    isErasing = true
    eraser.classList.add('active-layer')
    clearBrushColor()
    return
  }

  isErasing = false
  document.getElementById(`layer-drawer-${layerId}`).classList.add('active-layer')
  setBrushColor()
}

function getNewPresetColor() {
  return PRESET_COLORS[lastLayerId% PRESET_COLORS.length];
}

// layers
function resetLayerControls() {
  colorLayers.innerHTML = ''
}

function renderLayerControls() {
  function createLayerElement(layer) {
    const layerId = layer.layerId

    function createIcon(iconName, callback) {
      const icon = document.createElement('span')
      icon.classList.add('material-symbols-outlined')
      icon.innerHTML = iconName
      icon.setAttribute('id', `layer-${iconName}-${layerId}`)
      icon.addEventListener("click", e => {
        e.stopPropagation()
        callback(e)
      })
      return icon
    }

    function createOldColorTile(color, colorInput) {
      const colorTile = document.createElement('div')
      colorTile.classList.add('old-color')
      colorTile.style.backgroundColor = color
      colorTile.addEventListener("click", () => {
        colorInput.setAttribute('value', color)
        changeLayerColor(layerId, color)
      })
      return colorTile
    }

    // wrapper
    const layerWrapper = document.createElement('div')
    layerWrapper.addEventListener('click', () => setActiveColor(layerId))
    
    // layer
    const layerControls = document.createElement('div')
    layerControls.classList.add('layer')


      // color input
      const colorInput = document.createElement('input')
      colorInput.setAttribute('id', `layer-color-${layerId}`)
      colorInput.setAttribute('name', `layer-color-${layerId}`)
      colorInput.setAttribute('value', layer.color)
      colorInput.setAttribute('type', 'color')
      colorInput.classList.add("layer-color-input")
      colorInput.addEventListener('input', (event) => changeLayerColor(layerId, event.target.value))
      colorInput.addEventListener('change', () => saveUsedColor(layerId))

      // layer display name wrapper
      const layerDisplayNameWrapper = document.createElement('div')
      layerDisplayNameWrapper.classList.add('layer-display-name')
        // layer name
        const layerDisplayName = document.createElement('label')
        layerDisplayName.setAttribute('id', `layer-name-${layerId}`)
        layerDisplayName.setAttribute('for', `layer-color-${layerId}`)
        layerDisplayName.classList.add('layer-name')
        layerDisplayName.innerHTML = layer.name
        layerDisplayName.addEventListener('click', () => setActiveColor(layerId))

        // layer start edit icon
        const layerStartEditIcon = createIcon('edit', () => {
          layerControls.getElementsByClassName('layer-display-name')[0].style = "display: none;"
          layerControls.getElementsByClassName('layer-edit-name')[0].style = "display: flex;"
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
          layerControls.getElementsByClassName('layer-edit-name')[0].style = "display: none;"
          layerControls.getElementsByClassName('layer-display-name')[0].style = "display: flex;"
          changeLayerName(layerId, layerEditNameInput.value)
          renderLayerControls()
        }

        layerEditNameInput.setAttribute('id', `layer-name-input-${layerId}`)
        layerEditNameInput.setAttribute('type', 'text')
        layerEditNameInput.setAttribute('value', layer.name)
        layerEditNameInput.classList.add('layer-name')
        layerEditNameInput.classList.add('layer-name-editor')
        layerEditNameInput.addEventListener('keypress',  (event) => (event.key === 'Enter') && saveLayerName())

        // layer start edit icon
        const layerStopEditIcon = createIcon('check', saveLayerName)
        layerEditNameWrapper.appendChild(layerEditNameInput)
        layerEditNameWrapper.appendChild(layerStopEditIcon)

      // remove layer icon
      const layerRemoveIcon = createIcon('close', () => removeLayerById(layerId))
    
    // layer drawer for old colors
    const layerDrawer = document.createElement('div')
    layerDrawer.classList.add('layer-drawer')
    layerDrawer.setAttribute('id', `layer-drawer-${layerId}`)
    layer.oldColors.forEach(color => layerDrawer.appendChild(createOldColorTile(color, colorInput)))

    // append elements
    layerControls.appendChild(colorInput)
    layerControls.appendChild(layerDisplayNameWrapper)
    layerControls.appendChild(layerEditNameWrapper)
    layerControls.appendChild(layerRemoveIcon)
    layerWrapper.appendChild(layerControls)
    layerWrapper.appendChild(layerDrawer)

    return layerWrapper
  }

  resetLayerControls()

  layers.forEach(layer => colorLayers.appendChild(createLayerElement(layer)))
  setActiveColor(currentlyEditedLayer)
}



function changeLayerName(layerId, name) {
  const layer = layers.find(layer => layer.layerId === layerId)
  if (!layer) return
  layer.name = name
}

function removeLayerById(layerId) {
  if (!confirm('Are you sure you want to remove this color? This action cannot be undone, you will loose all you progress')) return
  const colorToRemove = layers.find(layer => layer.layerId === layerId)?.color
  layers = layers.filter(layer => layer.layerId !== layerId)
  changeCanvasColor(colorToRemove)
  setActiveColor('eraser')
  clearBrushColor()
  renderLayerControls()
}


function setBrushSize(size) {
  brushSize = size
  brushSizeSliderLabel.innerText = `Brush size: ${size}`
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

function createNewLayer() {
  lastLayerId++
  layers.push( new ColorLayer(`layer-${lastLayerId}`, getNewPresetColor(), `Paint ${lastLayerId}`, null))
  renderLayerControls()
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
  const replacementColor = newColor ? getColorPrimitives(newColor, colorsOpacityInHex) : [0, 0, 0, 0]
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

function saveUsedColor(layerId) {
  const layer = layers.find(layer => layer.layerId === layerId)
  if (!layer) return
  const oldColors = [...layer.oldColors]
  oldColors.unshift(layer.color)
  layer.oldColors = oldColors.slice(0, 12)
  renderLayerControls()
}

function changeLayerColorFunc(layerId, color) {
  const layer = layers.find(layer => layer.layerId === layerId)
  if (!layer) return
  changeCanvasColor(layer.color, color)
  layer.color = color
  setBrushColor()
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
  return layers.find(layer => layer.layerId === layerId)?.color ?? '#000000'
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
        if (isErasing || paintOver || paintingCanvasContext.getImageData(x, y, 1, 1).data.every(a => a === 0)) {
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

  board.appendChild(paintingCanvas)
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
  hideUiButton.innerText = hideUI ? 'text_ad' : 'text_ad_off'
}


// watchers
hideUiButton.addEventListener('click', toggleUIVisibility)

greyscaleCheckbox.addEventListener('change', () => {
  greyscale = !greyscale
  canvasGreyscale.style.visibility = greyscale ? 'visible' : 'hidden'
})

paintOverCheckbox.addEventListener('change', () => paintOver = !paintOver)

eraser.addEventListener('click', () => {
  setActiveColor('eraser')
  clearBrushColor()
})
brushSizeSlider.addEventListener('input', e => setBrushSize(e.target.value))
colorOpacitySlider.addEventListener('input', (e) => {
  colorOpacitySliderLabel.innerText = `Color opacity : ${e.target.value}%`
  setColorOpacity(e.target.value)
})

addNewLayerButton.addEventListener('click', createNewLayer)

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
        
        renderLayerControls()
        setupCanvas()
        convertCanvasToGreyscale()
        clearBrushColor()
        Array.from(document.getElementsByClassName('disabled')).forEach(elem => elem.classList.remove('disabled'))
        document.getElementById('no-image-loaded')?.remove()
      }

      img.src = String(event.target?.result)
      isImageSet = true
    }

    reader.readAsDataURL(file)

  })
})