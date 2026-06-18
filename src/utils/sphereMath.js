import * as THREE from 'three';

export const SPHERE_RADIUS = 5;

export function projectToSphere(vector, radius = SPHERE_RADIUS) {
  return vector.clone().normalize().multiplyScalar(radius);
}

export function tangentFromDirection(direction, normal) {
  const tangent = direction.clone().sub(normal.clone().multiplyScalar(direction.dot(normal)));

  if (tangent.lengthSq() < 0.000001) {
    tangent.crossVectors(normal, new THREE.Vector3(0, 1, 0));

    if (tangent.lengthSq() < 0.000001) {
      tangent.crossVectors(normal, new THREE.Vector3(1, 0, 0));
    }
  }

  return tangent.normalize();
}

export function turnTangent(forward, normal, angleRadians) {
  const rotation = new THREE.Quaternion().setFromAxisAngle(normal, angleRadians);
  return tangentFromDirection(forward.clone().applyQuaternion(rotation), normal);
}

export function moveAlongSphere(position, forward, distance, radius = SPHERE_RADIUS) {
  const normal = position.clone().normalize();
  const tangentForward = tangentFromDirection(forward, normal);
  const rotationAxis = new THREE.Vector3().crossVectors(normal, tangentForward).normalize();
  const rotation = new THREE.Quaternion().setFromAxisAngle(rotationAxis, distance / radius);
  const nextPosition = projectToSphere(position.clone().applyQuaternion(rotation), radius);
  const nextNormal = nextPosition.clone().normalize();
  const nextForward = tangentFromDirection(tangentForward.applyQuaternion(rotation), nextNormal);

  return {
    position: nextPosition,
    forward: nextForward,
  };
}

export function surfaceDistance(a, b, radius = SPHERE_RADIUS) {
  const angle = a.clone().normalize().angleTo(b.clone().normalize());
  return angle * radius;
}

export function randomPointOnSphere(radius = SPHERE_RADIUS) {
  const u = Math.random();
  const v = Math.random();
  const theta = Math.PI * 2 * u;
  const z = 2 * v - 1;
  const ring = Math.sqrt(1 - z * z);

  return new THREE.Vector3(
    ring * Math.cos(theta),
    z,
    ring * Math.sin(theta),
  ).multiplyScalar(radius);
}

export function makeInitialSnake(length = 8, radius = SPHERE_RADIUS, spacing = 0.32) {
  const head = new THREE.Vector3(0, radius, 0);
  const forward = new THREE.Vector3(1, 0, 0);
  const body = [head];
  let cursor = head;
  let backward = forward.clone().multiplyScalar(-1);

  for (let i = 1; i < length; i += 1) {
    const moved = moveAlongSphere(cursor, backward, spacing, radius);
    body.push(moved.position);
    cursor = moved.position;
    backward = moved.forward;
  }

  return {
    body,
    forward,
  };
}
