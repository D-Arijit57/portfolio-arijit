import * as THREE from 'three';
import { PAGE_WIDTH, PAGE_HEIGHT, PAGE_THICKNESS, BOW_SAG } from './stageConfig';

/**
 * Sprint 18 (spec §5.1): the sheet.
 *
 * Built as an extruded rounded rectangle rather than a box, because three
 * of the spec's realism levers live in the silhouette and a BoxGeometry has
 * none of them:
 *
 *   - a corner micro-radius (~0.3mm equivalent) that catches a specular
 *     highlight along the outline and prevents the corner aliasing a hard
 *     box produces. Real paper corners are sharp but not mathematically
 *     sharp.
 *   - a single-segment bevel at the same scale, so the cut edge picks up
 *     the key light instead of going to a black line.
 *   - apparent thickness, so the sheet reads as a document rather than a
 *     texture on a plane.
 *
 * ExtrudeGeometry emits two material groups — group 0 is the front/back
 * faces, group 1 is the bevel and side wall — which is what lets the cut
 * edge take its own warmer, slightly darker material (spec §5.1).
 */

const CURVE_SEGMENTS = 6;

function roundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const w = width / 2;
  const h = height / 2;
  const r = Math.min(radius, w, h);

  const shape = new THREE.Shape();
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);
  return shape;
}

/**
 * Spec §5.1's cylindrical bow — 0.5% sag across the long axis, applied as a
 * parabolic profile about the sheet's vertical centre line, so the left and
 * right edges sit a touch further from the viewer than the middle does.
 *
 * The important half of this is the *normals*, not the displacement. The
 * spec's stated payoff is a specular highlight that sweeps as the object
 * parallaxes, and specular response is a function of the surface normal —
 * a 0.5% deflection is sub-pixel at our framing and would be invisible on
 * its own. So rather than tessellating the faces finely enough for
 * computeVertexNormals() to discover the curvature (which would mean
 * rebuilding the extrusion's earcut triangulation), the normal is derived
 * analytically from the profile's own derivative and written per vertex.
 * The rasteriser interpolates it across the face, which is exactly the
 * smooth gradient a subdivided mesh would have produced.
 *
 * Profile:      z(x) = -sag * (x / halfWidth)^2
 * Derivative:  dz/dx = -2 * sag * x / halfWidth^2
 * Front normal: normalize(-dz/dx, 0, 1)
 */
function applyBow(geometry: THREE.BufferGeometry, sag: number) {
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const normal = geometry.attributes.normal as THREE.BufferAttribute;
  const halfWidth = PAGE_WIDTH / 2;

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const t = THREE.MathUtils.clamp(x / halfWidth, -1, 1);

    position.setZ(i, position.getZ(i) - sag * t * t);

    // Only reorient normals that actually face front or back; the bevel and
    // side-wall normals point outward in XY and must keep doing so, or the
    // edge highlight the bevel exists for would be destroyed.
    const nz = normal.getZ(i);
    if (Math.abs(nz) > 0.5) {
      const slope = (-2 * sag * x) / (halfWidth * halfWidth);
      const facing = Math.sign(nz);
      const n = new THREE.Vector3(-slope * facing, 0, facing).normalize();
      normal.setXYZ(i, n.x, n.y, n.z);
    }
  }

  position.needsUpdate = true;
  normal.needsUpdate = true;
}

export interface PaperGeometry {
  geometry: THREE.BufferGeometry;
  dispose: () => void;
}

export function createPaperGeometry(cornerRadius: number): PaperGeometry {
  const shape = roundedRectShape(PAGE_WIDTH, PAGE_HEIGHT, cornerRadius);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: PAGE_THICKNESS,
    bevelEnabled: true,
    // Spec §5.1: chamfer at the same scale as the corner radius. Larger and
    // the chamfer face becomes readable, which turns paper into plastic.
    bevelThickness: cornerRadius,
    bevelSize: cornerRadius,
    bevelSegments: 1,
    curveSegments: CURVE_SEGMENTS,
    steps: 1,
  });

  // ExtrudeGeometry builds forward from z=0; recentre so the mesh origin is
  // the page's own centre and every rotation in stageConfig means what it
  // says.
  geometry.translate(0, 0, -PAGE_THICKNESS / 2);
  geometry.computeVertexNormals();
  applyBow(geometry, BOW_SAG);

  // The extruded face UVs are in world-ish shape space, not the 0..1 the
  // page texture needs. Rewrite them from the bounding box so the rasterised
  // PDF maps corner-to-corner on the front face.
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const uv = geometry.attributes.uv as THREE.BufferAttribute;
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const width = box.max.x - box.min.x;
  const height = box.max.y - box.min.y;
  for (let i = 0; i < uv.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    uv.setXY(i, (x - box.min.x) / width, (y - box.min.y) / height);
  }
  uv.needsUpdate = true;

  geometry.computeBoundingSphere();

  return {
    geometry,
    dispose: () => geometry.dispose(),
  };
}
