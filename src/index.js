
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
    ctx.closePath();
    ctx.fill();
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

let down, cur;
document.addEventListener('mousedown', e => {
    cur = down = vec(e.pageX, e.pageY);
});

document.addEventListener('mouseup', e => {
    const up = vec(e.pageX, e.pageY);
    const rc = getRc(down.x, down.y, 40, 40);
    const r = () => Math.floor(Math.random() * 255);
    rc.color = `rgba(${r()}, ${r()}, ${r()}, 0.5)`;
    rc.vel = scale(sub(down, up), 0.05);
    objects.push(rc);
    down = false;
});

document.addEventListener('mousemove', e => {
    if (down) {
        cur = vec(e.pageX, e.pageY);
    }
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
    const v = normalize(sub(centroid(rectA.points), centroid(rectB.points)));
    [rectA, rectB].forEach(p => {
        const pts = p.points;
        for (let i = 0; i < pts.length; i += 1) {
            const n = (i + 1) % pts.length;
            const a = normalize(sub(pts[i], pts[n]));
            let normal = vec(a.y, -a.x);
            if (dot(normal, v) < 0) {
                normal = scale(normal, -1);
            }
            axes.push({ axis: normal });
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
            d.vel = scale(d.vel, 0.99);
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
                            b.points = resolve(b.points, axis.axis, -sgn * penetration * s);
                            const dt = dot(b.vel, axis.axis);
                            if (dt < 0) {
                                b.vel = add(b.vel, scale(axis.axis, -1.5 * dt));
                            }
                        } else {
                            a.vel = scale(a.vel, -0.5);
                            a.points = resolve(a.points, axis.axis, -sgn * penetration * s);
                        }
                    } else {
                        let mA = distance(a.vel, vec(0, 0));
                        let mB = distance(b.vel, vec(0, 0));
                        let tot = mA + mB;
                        if (true || tot === 0) {
                            mA = 0.5;
                            mB = 0.5;
                        } else {
                            mA = mA / tot;
                            mB = mB / tot;
                        }
                        const adt = dot(a.vel, axis.axis);
                        const bdt = dot(b.vel, axis.axis);
                        // swap the normal component of the velocities of a and b (since masses are equal)
                        a.vel = add(a.vel, scale(axis.axis, -adt + bdt));
                        b.vel = add(b.vel, scale(axis.axis, -bdt + adt));
                        a.points = resolve(a.points, axis.axis, -mA * penetration * s);
                        b.points = resolve(b.points, axis.axis, mB * penetration * s);
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
        if (down) {
            drawLine(down, cur, 'green', 3);
        }
    },
    20,
);
