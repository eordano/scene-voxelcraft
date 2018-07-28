export interface Coordinate {
  x: number
  y: number
  z: number
}

export interface CoordinateToPosition {
  [key: string]: Coordinate
}
