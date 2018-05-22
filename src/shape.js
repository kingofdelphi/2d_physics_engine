import { centroid, distance, vec, sub, add, normalize, dot, intersect, getDistance, scale } from './math';

class Ball {
    constructor(x, y, radius, imass) {
		this.circle = true;
        this.center = vec(x, y);
        this.radius = radius;
		this.imass = imass;
		this.angularVel = 0;
        this.vel = vec(0, 0);
    }

    project(axis) {
        const mid = dot(axis, this.center);
        return {
            min: mid - this.radius,
            max: mid + this.radius,
        };
    }
	translate(axis) {
		this.center = add(this.center, axis);
	}
	getCenter() {
		return this.center;
	}
}

class Poly {
    constructor(points, imass) {
        this.points = points;
        this.vel = vec(0, 0);
		this.angularVel = 0;
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
	translate(axis) {
		this.points = this.points.map(pt => add(pt, axis));
	}
	getCenter() {
		return centroid(this.points);
	}
}



class Rect extends Poly {
    constructor(a, b, c, d, imass) {
        super([a, b, c, d], imass);
    }
}

export { Poly, Rect, Ball };
