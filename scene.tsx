import * as DCL from 'metaverse-api'

import { Coordinate, CoordinateToPosition } from './types'

import { offset, transparency, size } from './const'

import {
  getElementPositionFromId,
  scalePosition,
  nineNeighbors,
  exists,
  positionToString,
  positionPlaceholder,
  positionFinal
} from './auxFunc'

export default class SampleScene extends DCL.ScriptableScene {
  state: {
    currentBox: Coordinate | null
    finalBoxes: CoordinateToPosition
    placeholderBoxes: CoordinateToPosition
  } = { finalBoxes: {}, currentBox: null, placeholderBoxes: {} }

  lastPosition: Coordinate | null = null
  lastRotation: Coordinate | null = null

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
      currentBox: null,
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
      currentBox: null,
      finalBoxes: {}
    }
  }

  async sceneDidMount() {
    this.eventSubscriber.on(`click`, (ev) => {
      if (ev.data.elementId.startsWith('placeholder')) {
        this.finalizeBox(getElementPositionFromId(ev.data.elementId))
      }
    })
    this.eventSubscriber.on('positionChanged', (ev) => {
      this.lastPosition = ev.data.cameraPosition
      this.updateCurrent()
    })
    this.eventSubscriber.on('rotationChanged', (ev) => {
      this.lastRotation = normalize(ev.data.quaternion)
      this.updateCurrent()
    })
  }

  updateCurrent() {
    if (this.lastRotation && this.lastPosition) {
      const box = raycast(this.lastPosition, this.lastRotation, 20, {
x: 30, y: 30, z: 30 }, (coor: Coordinate, face: Coordinate) => {

        console.log(`testing ${JSON.stringify(coor)} returns ${!!this.state.placeholderBoxes[positionToString(coor)]}`)
        return !!this.state.placeholderBoxes[positionToString(coor)]
      })
      if (box) {
        this.setState({ ...this.state,
          currentBox: box
        })
      }
    }
  }

  drawFinalizedBoxes() {
    return <entity position={{ x: offset, z: offset, y: offset }}>
      { Object.values(this.state.finalBoxes)
          .filter(exists)
          .map((position: Coordinate) => {
            return <box 
              scale={{ x: size, y: size, z: size }}
              id={positionFinal(position)}
              position={scalePosition(position)} 
              withCollisions={true}
              color={'#FFFFFF'}
            />
          })    
        }
    </entity>
  }

  drawTransparentBoxes() {
    return <entity position={{ x: offset, z: offset, y: offset }}>
      { Object.values(this.state.placeholderBoxes)
          .filter(exists)
          .map((position: Coordinate) => {
            return <box 
              scale={{ x: size, y: size, z: size }}
              id={positionPlaceholder(position)}
              position={scalePosition(position)} 
              material={'#transparent'}
            />
          })    
      }
    </entity>
  }

  drawCurrentBox() {
    if (!this.state.currentBox) return null
    return <box id={'currentBox'} position={this.state.currentBox} scale={{ x: size, y: size, z: size }} material={'#transparent'} />
  }

  async render() {
    return (
      <scene>
        <material id='transparent' ambientColor={'#FFFFFF'} alpha={transparency} />
        { this.drawCurrentBox() }
        { this.drawFinalizedBoxes() }
      </scene>
    )
  }
}
