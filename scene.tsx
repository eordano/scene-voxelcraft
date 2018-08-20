import * as DCL from 'metaverse-api'

import { Coordinate, CoordinateToPosition } from './types'

import { LIMIT_X, LIMIT_Y, LIMIT_Z, offset, transparency, size } from './const'

import { distance, normalize, raycast } from './raycast'

import {
  scalePosition,
  nineNeighbors,
  exists,
  getElementPositionFromId,
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

  deleteBox(position: Coordinate) {
    this.setState({
      placeholderBoxes: {
        ...this.state.placeholderBoxes,
        [positionToString(position)]: position
      },
      currentBox: null,
      finalBoxes: {
        ...this.state.finalBoxes,
        [positionToString(position)]: null
      }
    })
  }

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
    for (let i = 1; i < LIMIT_X; i++) {
      for (let j = 1; j < LIMIT_Z; j++) {
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
      if (ev.data.elementId.startsWith('currentBox')) {
        this.finalizeBox(this.state.currentBox!)
      }
      if (ev.data.elementId.startsWith('final')) {
          console.log(ev.data)
        this.deleteBox(getElementPositionFromId(ev.data.elementId))
      }
    })
    this.eventSubscriber.on('positionChanged', (ev) => {
      this.lastPosition = ev.data.cameraPosition
      this.updateCurrent()
    })
    this.eventSubscriber.on('rotationChanged', (ev) => {
    console.log(ev.data.rotation)
      this.lastRotation = normalize({
        alpha: -ev.data.rotation.y,
        beta: -ev.data.rotation.x
      })
      this.updateCurrent()
    })
  }

  updateCurrent() {
    if (this.lastRotation && this.lastPosition) {
      let count = 0
      const box = raycast(this.lastPosition, this.lastRotation, 20, {
x: LIMIT_X, y: LIMIT_Y, z: LIMIT_Z }, (coor: Coordinate, face: Coordinate) => {
        count++;
        console.log(`testing ${count} ${JSON.stringify(coor)} returns ${!!this.state.placeholderBoxes[positionToString(coor)]}`)
        if (distance(coor, this.lastPosition!) < 2.5) return false

        return !!this.state.placeholderBoxes[positionToString(coor)] || !!this.state.finalBoxes[positionToString(coor)]
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
    return <box id={'currentBox'} position={{
      x: this.state.currentBox.x + offset,
      y: this.state.currentBox.y + offset,
      z: this.state.currentBox.z + offset,
    }}
      scale={{ x: size, y: size, z: size }} material={'#transparent'} />
  }

  async render() {
    return (
      <scene>
        <material id='transparent' ambientColor={'#FFFFFF'} alpha={transparency} />
        <box scale={{ x: 39.99, y: 0.01, z: 39.99 }} position={{ x: 20, y: 0.001, z: 20 }} color='#2f2f2f' />
        { this.drawCurrentBox() }
        { this.drawFinalizedBoxes() }
      </scene>
    )
  }
}
