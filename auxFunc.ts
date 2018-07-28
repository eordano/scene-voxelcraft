import { Coordinate } from './types'

import { LIMIT_Z, LIMIT_Y, LIMIT_X, DELTA } from './const'

import { size } from './const'

export function getElementPositionFromString(elementName: string): Coordinate {
  const [x, y, z] = elementName.split(',').map((x: string) => parseInt(x, 10))
  return { x, y, z }
}

export function getElementPositionFromId(elementName: string): Coordinate {
  if (elementName.startsWith('placeholder')) {
    return getElementPositionFromString(elementName.substr('placeholder_'.length))
  }
  if (elementName.startsWith('finalized')) {
    return getElementPositionFromString(elementName.substr('finalized_'.length))
  }
  throw new Error('Invalid elementName')
}

export function scalePosition(position: Coordinate): Coordinate {
  return {
    x: position.x * size,
    y: position.y * size,
    z: position.z * size
  }
}

export function exists(x: any): boolean {
  return !!x
}

export function nineNeighbors(position: Coordinate): Array<Coordinate> {
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

export function positionPlaceholder(position: Coordinate) {
  return `placeholder_${positionToString(position)}`
}

export function positionFinal(position: Coordinate) {
  return `final_${positionToString(position)}`
}

export function positionToString(position: Coordinate) {
  return `${position.x},${position.y},${position.z}`
}
