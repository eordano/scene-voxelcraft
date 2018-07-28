import * as DCL from 'metaverse-api'

interface Coordinate {
  x: number
  y: number
  z: number
}

const LIMIT_X = 19
const LIMIT_Y = 19
const LIMIT_Z = 19
const DELTA = [ -1, 0, 1 ]

function getElementPositionFromString(elementName: string): Coordinate {
  const [x, y, z] = elementName.split(',').map((x: string) => parseInt(x, 10))
  return { x, y, z }
}

function getElementPositionFromId(elementName: string): Coordinate {
  if (elementName.startsWith('placeholder')) {
    return getElementPositionFromString(elementName.substr('placeholder_'.length))
  }
  if (elementName.startsWith('finalized')) {
    return getElementPositionFromString(elementName.substr('finalized_'.length))
  }
  throw new Error('Invalid elementName')
}

const offset = 0.4
const transparency = 0.1
const size = 0.4

function scalePosition(position: Coordinate): Coordinate {
  return { x: position.x * size, y: position.y * size, z: position.z * size }
}

function exists(x: any) {
  return !!x
}

function nineNeighbors(position: Coordinate): Array<Coordinate> {
  const res = []
  for (let dx of DELTA) {
      const x = position.x + dx
      if (x >= 0 && x <= LIMIT_X)
      for (let dy of DELTA) {
          const y = position.y + dy
          if (y >= 0 && y <= LIMIT_Y)
          for (let dz of DELTA) {
              const z = position.z + dz
              if (z >= 0 && z <= LIMIT_Z)
              res.push({ x: position.x + dx, y: position.y + dy, z: position.z + dz })
          }
      }
  }
  return res
}

function positionPlaceholder(position: Coordinate) {
  return `placeholder_${positionToString(position)}`
}

function positionFinal(position: Coordinate) {
  return `final_${positionToString(position)}`
}

function positionToString(position: Coordinate) {
  return `${position.x},${position.y},${position.z}`
}

interface CoordinateToPosition {
  [key: string]: Coordinate
}

export default class SampleScene extends DCL.ScriptableScene {
  state: {
    finalBoxes: CoordinateToPosition
    placeholderBoxes: CoordinateToPosition
  } = { finalBoxes: {}, placeholderBoxes: {} }

  finalizeBox(position: Coordinate) {
    const newPlaceHolders: CoordinateToPosition = {}
    for (let neighbor of nineNeighbors(position)) {
      const pos = positionToString(neighbor)
      if (newPlaceHolders[pos] === undefined) {
        newPlaceHolders[pos] = neighbor
      }
    }
    this.setState({
      placeholderBoxes: {
        ...this.state.placeholderBoxes,
        ...newPlaceHolders,
        [positionToString(position)]: null
      },
      finalBoxes: {
        ...this.state.finalBoxes,
        [positionToString(position)]: position
      }
    })
  }

  constructor(t: any) {
    super(t)
    const placeholderBoxes: CoordinateToPosition = {}
    for (let i = 0; i < 19; i++) {
      for (let j = 0; j < 19; j++) {
        const pos = { x: i, z: j, y: 0 }
        placeholderBoxes[positionToString(pos)] = pos
      }
    }
    this.state = {
      placeholderBoxes,
      finalBoxes: {}
    }
  }

  async sceneDidMount() {
    this.eventSubscriber.on(`click`, (ev) => {
      if (ev.data.elementId.startsWith('placeholder')) {
        this.finalizeBox(getElementPositionFromId(ev.data.elementId))
      }
    })
  }

  drawFinalizedBoxes() {
    return <entity position={{ x: offset, z: offset, y: offset }}>
      { Object.values(this.state.finalBoxes).filter(exists).map((position: Coordinate) => {
        return <box scale={{ x: size, y: size, z: size }} id={positionFinal(position)} position={scalePosition(position)} withCollisions={true} color={'#FFFFFF'} />
      }) }
    </entity>
  }

  drawTransparentBoxes() {
    return <entity position={{ x: offset, z: offset, y: offset }}>
      { Object.values(this.state.placeholderBoxes).filter(exists).map((position: Coordinate) => {
        return <box id={positionPlaceholder(position)} scale={{ x: size, y: size, z: size }} position={scalePosition(position)} material={'#transparent'} />
      })}
    </entity>
  }

  async render() {
    return (
      <scene>
        <material id='transparent' ambientColor={'#FFFFFF'} alpha={transparency} />
        { this.drawTransparentBoxes() }
        { this.drawFinalizedBoxes() }
      </scene>
    )
  }
}
