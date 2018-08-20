import { Coordinate } from './types'

export function normalize(qt: { alpha: number, beta: number }): Coordinate {
  const res = {
      z: Math.cos(qt.alpha * Math.PI / 180)*Math.cos(qt.beta * Math.PI / 180),
      y: Math.sin(qt.beta * Math.PI / 180),
      x: -Math.sin(qt.alpha * Math.PI / 180)*Math.cos(qt.beta * Math.PI / 180),
  }
  return res
}

/**
 * Call the callback with (x,y,z,value,face) of all blocks along the line
 * segment from point 'origin' in vector direction 'direction' of length
 * 'radius'. 'radius' may be infinite.
 * 
 * 'face' is the normal vector of the face of that block that was entered.
 * It should not be used after the callback returns.
 * 
 * If the callback returns a true value, the traversal will be stopped.
 */
export function raycast(
  origin: Coordinate,
  direction: Coordinate,
  radius: number,
  maxSize: Coordinate, // Asumes world starts at (0,0,0) and ends here
  callback: (coor: Coordinate, face: Coordinate) => boolean
) {
  // From "A Fast Voxel Traversal Algorithm for Ray Tracing"
  // by John Amanatides and Andrew Woo, 1987
  // <http://www.cse.yorku.ca/~amana/research/grid.pdf>
  // <http://citeseer.ist.psu.edu/viewdoc/summary?doi=10.1.1.42.3443>
  // Extensions to the described algorithm:
  //   • Imposed a distance limit.
  //   • The face passed through to reach the current cube is provided to
  //     the callback.

  // The foundation of this algorithm is a parameterized representation of
  // the provided ray,
  //                    origin + t * direction,
  // except that t is not actually stored; rather, at any given point in the
  // traversal, we keep track of the *greater* t values which we would have
  // if we took a step sufficient to cross a cube boundary along that axis
  // (i.e. change the integer part of the coordinate) in the variables
  // tMaxX, tMaxY, and tMaxZ.

  // Cube containing origin point.
  let x = Math.floor(origin.x)
  let y = Math.floor(origin.y)
  let z = Math.floor(origin.z)
  // Break out direction vector.
  const dx = direction.x
  const dy = direction.y
  const dz = direction.z
  // Direction to increment x,y,z when stepping.
  const stepX = signum(dx)
  const stepY = signum(dy)
  const stepZ = signum(dz)
  // See description above. The initial values depend on the fractional
  // part of the origin.
  let tMaxX = intbound(origin.x, dx)
  let tMaxY = intbound(origin.y, dy)
  let tMaxZ = intbound(origin.z, dz)
  // The change in t when taking a step (always positive).
  const tDeltaX = stepX/dx
  const tDeltaY = stepY/dy
  const tDeltaZ = stepZ/dz
  // Buffer for reporting faces to the callback.
  var face = { x: 0, y: 0, z: 0 }

  // Avoids an infinite loop.
  if (dx === 0 && dy === 0 && dz === 0)
    throw new RangeError("Raycast in zero direction!")

  // Rescale from units of 1 cube-edge to units of 'direction' so we can
  // compare with 't'.
  radius /= Math.sqrt(dx*dx+dy*dy+dz*dz)
  let found = false

  while (/* ray has not gone past bounds of world */
         (stepX >= 0 ? x < maxSize.x : x >= 0) &&
         (stepY >= 0 ? y < maxSize.y : y >= 0) &&
         (stepZ >= 0 ? z < maxSize.z : z >= 0)) {

    // Invoke the callback, unless we are not *yet* within the bounds of the
    // world.
    if (!(x < 0 || y < 0 || z < 0 || x >= maxSize.x || y >= maxSize.y || z >= maxSize.z))
      if (callback({ x, y, z }, face)) {
        found = true
        break
      }

    // tMaxX stores the t-value at which we cross a cube boundary along the
    // X axis, and similarly for Y and Z. Therefore, choosing the least tMax
    // chooses the closest cube boundary. Only the first case of the four
    // has been commented in detail.
    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        if (tMaxX > radius) break
        // Update which cube we are now in.
        x += stepX
        // Adjust tMaxX to the next X-oriented boundary crossing.
        tMaxX += tDeltaX
        // Record the normal vector of the cube face we entered.
        face.x = -stepX
        face.y = 0
        face.z = 0
      } else {
        if (tMaxZ > radius) break
        z += stepZ
        tMaxZ += tDeltaZ
        face.x = 0
        face.y = 0
        face.z = -stepZ
      }
    } else {
      if (tMaxY < tMaxZ) {
        if (tMaxY > radius) break
        y += stepY
        tMaxY += tDeltaY
        face.x = 0
        face.y = -stepY
        face.z = 0
      } else {
        // Identical to the second case, repeated for simplicity in
        // the conditionals.
        if (tMaxZ > radius) break
        z += stepZ
        tMaxZ += tDeltaZ
        face.x = 0
        face.y = 0
        face.z = -stepZ
      }
    }
  }
  return found ? { x, y, z } : null
}

function intbound(s: number, ds: number): number {
  // Find the smallest positive t such that s+t*ds is an integer.
  if (ds < 0) {
    return intbound(-s, -ds)
  } else {
    s = mod(s, 1)
    // problem is now s+t*ds = 1
    return (1-s)/ds
  }
}

function square(w: number): number {
  return w * w
}

export function distance(c: Coordinate, d: Coordinate): number {
  return square(c.x - d.x + 0.5) + square(c.y - d.y + 0.5) + square(c.z - d.z + 0.5)
}

function signum(x: number) {
  return x > 0 ? 1 : x < 0 ? -1 : 0
}

function mod(value: number, modulus: number) {
  return (value % modulus + modulus) % modulus
}
