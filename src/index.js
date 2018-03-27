
import keys from './keys';
import { Poly, Rect } from './shape';

import { centroid, distance, vec, sub, add, normalize, dot, intersect, getDistance, scale } from './math';

import './styles.css';

let ctr = 4;
const incr = () => {
    ctr += 1;
};

const decr = () => {
    ctr = Math.max(3, ctr - 1);
};

document.getElementById('incr').addEventListener('click', incr);
document.getElementById('decr').addEventListener('click', decr);

let polyRadius = 50;

const rsel = document.getElementById('radius');
rsel.value = polyRadius;
rsel.addEventListener('change', e => {
    polyRadius = +e.target.value;
});

const createRegularPolygon = (origin, n, r = 30) => {
    const ang = 2 * Math.PI / n;
    const pts = [];
    for (let i = 0; i < n; i += 1) {
        const d = i * ang;
        const c = 0;
        pts.push(add(origin, scale(vec(Math.cos(d - c), Math.sin(d - c)), r)));
    }
    return pts;
};

const root = document.getElementById('rem');
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
    const pts = rect.points;
    for (let i = 0; i <= pts.length; i += 1) {
        const d = pts[i % pts.length];
        if (i === 0) {
            ctx.moveTo(d.x, d.y);
        } else {
            ctx.lineTo(d.x, d.y);
        }
    }
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

const getRect = (sx, sy, W, H, imass = 30) => {
    const a = vec(sx - W / 2, sy - H / 2);
    const b = vec(sx + W / 2, sy - H / 2);
    const c = vec(sx + W / 2, sy + H / 2);
    const d = vec(sx - W / 2, sy + H / 2);
    return new Rect(a, b, c, d, imass);
};

const getRc = (sx, sy, imass = 30) => {
    return new Poly(createRegularPolygon(vec(sx, sy), ctr, polyRadius), imass);
};

const fh = 30;
const objects = [
    getRect(w / 2, h - fh / 2, w, fh, 0),
];

const main = document.getElementById('rem');
let down, cur;
main.addEventListener('mousedown', e => {
    cur = down = vec(e.clientX, e.clientY);
});

main.addEventListener('mouseup', e => {
    const up = vec(e.clientX, e.clientY);
    console.log(polyRadius);
    const rc = getRc(down.x, down.y, polyRadius);
    const r = () => Math.floor(Math.random() * 255);
    rc.color = `rgba(${r()}, ${r()}, ${r()}, 0.5)`;
    rc.vel = scale(sub(down, up), 0.05);
    objects.push(rc);
    down = false;
});

document.addEventListener('mousemove', e => {
    if (down) {
        cur = vec(e.clientX, e.clientY);
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

const update = () => {
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
        if (d.imass === 0) return;
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
                const magA = a.imass === 0 ? 0 : (b.fixed ? 1 : 0.5);
                const magB = b.imass === 0 ? 0 : (a.fixed ? 1 : 0.5);
                const adt = dot(a.vel, axis.axis);
                const bdt = dot(b.vel, axis.axis);
                const vab = adt - bdt;
                const den = a.imass + b.imass;
                const e = 0.5;
                const Impulse = -(1 + e) * vab / den;
                if (a.imass > 0) {
                    a.points = resolve(a.points, axis.axis, -magA * penetration * s);
                    if (vab > 0) {
                        a.vel = add(a.vel, scale(axis.axis, Impulse * a.imass));
                    }
                }
                if (b.imass > 0) {
                    b.points = resolve(b.points, axis.axis, magB * penetration * s);
                    if (vab > 0) {
                        b.vel = add(b.vel, scale(axis.axis, -Impulse * b.imass));
                    }
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
};

const callback = () => {
    update();
    window.requestAnimationFrame(callback);
}

callback();
