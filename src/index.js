
import keys from './keys';
import Rect from './shape';

import { centroid, distance, vec, sub, add, normalize, dot, intersect, getDistance, scale } from './math';

import './styles.css';

const root = document.getElementById('root');
const w = root.clientWidth;
const h = root.clientHeight;
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = w;
canvas.height = h;

const drawLine = (a, b, color = 'black', width = 1) => {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
};

const drawRect = (rect, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    const [a, b, c, d] = rect.points;
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.lineTo(a.x, a.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
};

const drawCircle = (c, color) => {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.ellipse(c.center.x, c.center.y, c.radius, c.radius, 0, 0, 2 * Math.PI);
    ctx.fill();
};

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

class Rect {
    constructor(a, b, c, d, fixed) {
        this.points = [a, b, c, d];
        this.vel = vec(0, 0);
        this.fixed = fixed;
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

const getRc = (sx, sy, W, H, fixed = false) => {
    const a = vec(sx - W / 2, sy - H / 2);
    const b = vec(sx + W / 2, sy - H / 2);
    const c = vec(sx + W / 2, sy + H / 2);
    const d = vec(sx - W / 2, sy + H / 2);
    return new Rect(a, b, c, d, fixed);
};

const fh = 30;
const objects = [
    getRc(w / 2, h - fh / 2, w, fh, true),
];

document.addEventListener('mousedown', e => {
    const rc = getRc(e.pageX, e.pageY, 80, 80);
    rc.color = 'black';
    objects.push(rc);
});

const penetration = (axis, bodyA, bodyB) => {
    const a = bodyA.project(axis);
    const b = bodyB.project(axis);
    const l = Math.max(a.min, b.min);
    const r = Math.min(a.max, b.max);
    return l <= r ? r - l : 0;
};

const checkCollision = (bodyA, bodyB, axes) => {
    if (axes.length === 0) return false;
    let minp = 9999999;
    let paxis;
    let coll = true;
    axes.forEach(axis => {
        const p = penetration(axis.axis, bodyA, bodyB);
        if (p === 0) {
            coll = false;
        }
        if (p < minp) {
            minp = p;
            paxis = axis;
        }
    });
    if (!coll) return false;
    return { axis: paxis, penetration: minp };
};

const collision = (rectA, rectB) => {
    const axes = [];
    [rectA, rectB].forEach((p, i) => {
        const pts = p.points;
        for (let i = 0; i < pts.length; i += 1) {
            const n = (i + 1) % pts.length;
            const a = normalize(sub(pts[i], pts[n]));
            axes.push({ axis: vec(a.y, -a.x), id: i });
        }
    });
    return checkCollision(rectA, rectB, axes);
};

const resolve = (points, axis, penetration) => {
    return points.map(d => {
        return add(d, scale(axis, penetration));
    });
};

setInterval(
    () => {
        // if (keys['ArrowLeft']) {
        //     rc.vel.x -= 0.2;
        // }
        // if (keys['ArrowRight']) {
        //     rc.vel.x += 0.2;
        // }
        // if (keys[' ']) {
        //     if (lcoll) {
        //         rc.vel.y -= 8;
        //     }
        // }
        // if (keys['ArrowUp']) {
        //     rc.vel.y -= 0.2;
        // }
        // if (keys['ArrowDown']) {
        //     rc.vel.y += 0.2;
        // }
        // rc.vel.y += 0.1;
        // rc.vel = scale(rc.vel, 0.99);
        objects.forEach(d => {
            if (d.fixed) return;
            d.vel = add(d.vel, scale(vec(0, 1), 0.08));
            d.points = resolve(d.points, d.vel, 1);
        });
        for (let i = 0; i < objects.length; i += 1) {
            for (let j = i + 1; j < objects.length; j += 1) {
                const a = objects[i];
                const b = objects[j];
                const c = collision(a, b);
                if (c) {
                    const { axis, penetration } = c;
                    const s = 1;
                    if (a.fixed || b.fixed) {
                        const sgn = c.id === 0 ? 1 : -1;
                        if (a.fixed) {
                            console.log('a', axis);
                            b.points = resolve(b.points, axis.axis, -sgn * penetration * s);
                            b.vel = scale(b.vel, -0.5);
                        } else {
                            console.log('b', axis);
                            a.vel = scale(a.vel, -0.5);
                            a.points = resolve(a.points, axis.axis, -sgn * penetration * s);
                        }
                    } else if (axis.id === 0) {
                        b.points = resolve(b.points, axis.axis, penetration * s);
                    } else {
                        a.points = resolve(a.points, axis.axis, -penetration * s);
                    }
                }
            }
        }

        // render
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, w, h);
        objects.forEach(d => {
            drawRect(d, d.color);
        });
    },
    20,
);
