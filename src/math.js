/**
 * Created by uttam on 3/18/18.
 */

export const intersect = (a1, a2, b1, b2) => {
    const pq = sub(a1, b1);
    const r = sub(a1, a2);
    const s = sub(b1, b2);
    const d = r.x * s.y - r.y * s.x;
    if (d === 0) return -1;
    const u =  (pq.x * r.y - pq.y * r.x) / d;
    if (u < 0 || u > 1) return -1;
    const t =  (pq.x * s.y - pq.y * s.x) / d;
    return Math.abs(t) < 1e-4 ? 0 : t;
};

export const distance = (p1, p2) => {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
};

export const add = (p1, p2) => {
    return vec(p1.x + p2.x, p1.y + p2.y);
};

export const sub = (p1, p2) => {
    return vec(p2.x - p1.x, p2.y - p1.y);
};

export const dot = (p1, p2) => {
    return p1.x * p2.x + p1.y * p2.y;
};

export const normalize = (p) => {
    let h = Math.hypot(p.x, p.y);
    if (h === 0) h = 1;
    return vec(p.x / h, p.y / h);
};

export const perpendicular = (p1, p2, p) => {
    const dist = distance(p1, p2);
    let v = sub(p1, p2);
    v = vec(v.x / dist, v.y / dist);
    let normal = vec(v.y, -v.x);
    const l = sub(p1, p);
    // if (dot(normal, l) < 0) {
    //     normal = { x: -normal.x, y: -normal.y };
    // }
    const dist2 = Math.abs(dot(l, normal));
    const proj = dot(v, l);
    const point = add(scale(v, proj), p1);
    return {
        distance: dist2,
        point,
        outOfBounds: proj < 0 || proj > dist,
    };
};

export const getDistance = (p1, p2, pt) => {
    let mind = distance(p1, pt);
    let np = p1;
    let d = distance(p2, pt);
    if (d < mind) {
        mind = d;
        np = p2;
    }
    d = perpendicular(p1, p2, pt);
    if (!d.outOfBounds && d.distance < mind) {
        mind = d.distance;
        np = d.point;
    }
    return {
        distance: mind,
        line: {
            p1: np,
            p2: pt,
        },
    };
};

export const centroid = (points) => {
    let x = 0;
    let y = 0;
    points.forEach(d => {
        x += d.x;
        y += d.y;
    });
    return vec(x / points.length, y / points.length);
};

export const scale = (v, f) => {
    return vec(v.x * f, v.y * f);
};

export const vec = (x, y) => ({ x, y });

export const rotateZ = (pt, angle) => {
	const cs = Math.cos(angle);
	const si = Math.sin(angle);
	return vec(pt.x * cs - pt.y * si, pt.x * si + pt.y * cs);
};
