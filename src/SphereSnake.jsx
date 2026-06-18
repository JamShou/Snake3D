import React from 'react';
import { SPHERE_RADIUS } from './utils/sphereMath.js';

export default function SphereSnake({ body, headColor, bodyColor }) {
  return (
    <group>
      {body.map((point, index) => {
        const normal = point.clone().normalize();
        const position = normal.multiplyScalar(SPHERE_RADIUS + 0.12);
        const scale = index === 0 ? 0.24 : 0.2;

        return (
          <mesh key={`${index}-${point.x.toFixed(3)}-${point.y.toFixed(3)}-${point.z.toFixed(3)}`} position={position}>
            <sphereGeometry args={[scale, 18, 18]} />
            <meshStandardMaterial
              color={index === 0 ? headColor : bodyColor}
              roughness={index === 0 ? 0.55 : 0.65}
              metalness={index === 0 ? 0.05 : 0.03}
            />
          </mesh>
        );
      })}
    </group>
  );
}
