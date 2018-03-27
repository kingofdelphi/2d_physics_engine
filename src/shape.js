import { centroid, distance, vec, sub, add, normalize, dot, intersect, getDistance, scale } from './math';

class Ball {
    constructor(x, y, r) {
        this.center = vec(x, y);
        this.r = r;
        this.vel = vec(0, 0);
    }

    project(axis) {
        const mid = dot(axis, this.center);
        return {
            min: mid - this.r,
            max: mid + this.r,
        };
    }
}

class Poly {
    constructor(points, imass) {
        this.points = points;
        this.vel = vec(0, 0);
        this.imass = imass;
    }

    project(axis) {
        let l = 10000000;
        let r = -10000000;
        this.points.forEach((d) => {
            const p = dot(axis, d);
            l = Math.min(l, p);
            r = Math.max(r, p);
        });
        return {
            min: l,
            max: r,
        };
    }
}



class Rect extends Poly {
    constructor(a, b, c, d, imass) {
        super([a, b, c, d], imass);
    }
}

export { Poly, Rect, Ball };