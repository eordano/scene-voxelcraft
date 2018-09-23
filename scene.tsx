import * as DCL from 'decentraland-api'

import { Coordinate, CoordinateToPosition } from './types'

import { LIMIT_X, LIMIT_Y, LIMIT_Z, offset, transparency, size } from './const'

import { distance, normalize, raycast } from './raycast'

import * as socketIo from 'socket.io-client'

import {
  scalePosition,
  nineNeighbors,
  exists,
  getElementPositionFromId,
  getElementPositionFromString,
  positionToString,
  positionPlaceholder,
  positionFinal
} from './auxFunc'

const server = 'https://voxelcraft-server.now.sh'

export default class SampleScene extends DCL.ScriptableScene {
  state: {
    currentBox: Coordinate | null
    finalBoxes: CoordinateToPosition
    placeholderBoxes: CoordinateToPosition
  } = { finalBoxes: {}, currentBox: null, placeholderBoxes: {} }

  socket: any = socketIo(server)

  async setupListener() {
      this.socket.on('message', (data: any) => {
          if (data.a === 'build') this.finalizeBox(getElementPositionFromString(data.c))
          if (data.a === 'destroy') this.deleteBox(getElementPositionFromString(data.c))
      })
  }

  async sendBuild(coor: string) {
    this.socket.emit('message', `{"a": "build", "c": "${coor}"}`)
  }
  async sendDestroy(coor: string) {
    this.socket.emit('message', `{"a": "destroy", "c": "${coor}"}`)
  }

  async syncWithServer() {
      try {
          const data = await (fetch(`${server}/all`).then(res => res.json()))
          const finalBoxes: CoordinateToPosition = {}
          const placeholderBoxes: CoordinateToPosition = {}
          for (let item of data) {
              finalBoxes[item] = getElementPositionFromString(item) 
              const nine = nineNeighbors(finalBoxes[item])
              for (let neighbor of nine) {
                const pos = positionToString(neighbor)
                if (placeholderBoxes[pos] === undefined) {
                  placeholderBoxes[pos] = neighbor
                }
              }
          }
          for (let i = 1; i < LIMIT_X; i++) {
            for (let j = 1; j < LIMIT_Z; j++) {
              const pos = { x: i, z: j, y: 0 }
              const st = positionToString(pos)
              if (!finalBoxes[st]) placeholderBoxes[st] = pos
            }
          }
          this.setState({
            placeholderBoxes,
            currentBox: null,
            finalBoxes
          })
      } catch (e) {
          this.setupLocal()
      }
  }

  lastPosition: Coordinate | null = null
  lastRotation: Coordinate | null = null

  deleteBox(position: Coordinate, send?: true) {
    const str = positionToString(position)
    if (send) this.sendDestroy(str)
    this.setState({
      placeholderBoxes: {
        ...this.state.placeholderBoxes,
        [str]: position
      },
      currentBox: null,
      finalBoxes: {
        ...this.state.finalBoxes,
        [str]: null
      }
    })
  }

  finalizeBox(position: Coordinate, send?: true) {
    const str = positionToString(position)
    if (send) this.sendBuild(str)
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
        [str]: null
      },
      currentBox: null,
      finalBoxes: {
        ...this.state.finalBoxes,
        [str]: position
      }
    })
  }

  setupLocal() {
    const placeholderBoxes: CoordinateToPosition = {}
    for (let i = 1; i < LIMIT_X; i++) {
      for (let j = 1; j < LIMIT_Z; j++) {
        const pos = { x: i, z: j, y: 0 }
        placeholderBoxes[positionToString(pos)] = pos
      }
    }
    this.setState({
      placeholderBoxes,
      currentBox: null,
      finalBoxes: {}
    })
  }

  constructor(t: any) {
    super(t)
    this.state = {
      placeholderBoxes: {},
      currentBox: null,
      finalBoxes: {}
    }
    this.syncWithServer()
    this.setupListener()
  }

  async sceneDidMount() {
    this.eventSubscriber.on(`click`, (ev) => {
      if (ev.data.elementId.startsWith('currentBox')) {
        this.finalizeBox(this.state.currentBox!, true)
      }
      if (ev.data.elementId.startsWith('final')) {
        this.deleteBox(getElementPositionFromId(ev.data.elementId), true)
      }
    })
    this.eventSubscriber.on('positionChanged', (ev) => {
      this.lastPosition = ev.data.cameraPosition
      this.updateCurrent()
    })
    this.eventSubscriber.on('rotationChanged', (ev) => {
      this.lastRotation = normalize({
        alpha: -ev.data.rotation.y,
        beta: -ev.data.rotation.x
      })
      this.updateCurrent()
    })
  }

  updateCurrent() {
    if (this.lastRotation && this.lastPosition) {
      const box = raycast(this.lastPosition, this.lastRotation, 20, {
x: LIMIT_X, y: LIMIT_Y, z: LIMIT_Z }, (coor: Coordinate, face: Coordinate) => {
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
