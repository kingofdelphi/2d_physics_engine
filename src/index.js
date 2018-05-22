
import keys from './keys';
import { Ball, Poly, Rect } from './shape';

import { rotateZ, vec, sub, add, normalize, dot, intersect, getDistance, scale } from './math';
import { applyImpulse, getContactPoints, getLinearImpulse, collision } from './collision';

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

let polyRadius = 30;

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
        const c = Math.PI / 2;
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

const getRect = (sx, sy, W, H, imass) => {
    const a = vec(sx - W / 2, sy - H / 2);
    const b = vec(sx + W / 2, sy - H / 2);
    const c = vec(sx + W / 2, sy + H / 2);
    const d = vec(sx - W / 2, sy + H / 2);
	const rc = new Rect(a, b, c, d, imass);
	rc.color = 'rgba(0, 0, 0, 0.3)';
    return rc;
};

const getPoly = (sx, sy, radius, imass) => {
    return new Poly(createRegularPolygon(vec(sx, sy), ctr, radius), imass);
};

const fh = 30;
const objects = [
    getRect(w / 2, h - fh / 2, w, fh, 0),
];

const main = document.getElementById('rem');
let down, cur;
main.addEventListener('mousedown', function (e) {
    cur = down = vec(e.clientX - this.offsetLeft, e.clientY - this.offsetTop);
});

const getSelectedRadio = () =>
	document.querySelector('input[name="a"]:checked').value;

const isFixed = () =>
	document.getElementById('fixed').checked;

let freeform = [];
const randomColor = () => Math.floor(Math.random() * 255);
main.addEventListener('mouseup', function (e) {
	const downPos = down;
	down = false;
	const up = vec(e.clientX - this.offsetLeft, e.clientY - this.offsetTop);
	const sel = getSelectedRadio();
	if (sel === 'freeform') {
		freeform.push(up);
		return;
	}
	let body;
	const imass = isFixed() ? 0.0 : 10;
	if (sel === 'circle') {
		body = new Ball(downPos.x, downPos.y, polyRadius, imass);
	} else if (sel === 'rect') {
		body = getRect(downPos.x, downPos.y, polyRadius, polyRadius, imass);
	} else {
		body = getPoly(downPos.x, downPos.y, polyRadius, imass);
	}
	body.color = `rgba(${randomColor()}, ${randomColor()}, ${randomColor()}, 0.5)`;
	body.vel = scale(sub(downPos, up), 0.05);
	//body.angularVel = Math.random() * 2;
	objects.push(body);
});

main.addEventListener('mousemove', function (e) {
	cur = vec(e.clientX - this.offsetLeft, e.clientY - this.offsetTop);
});

const update = () => {
	const [____, rc] = objects;
	let dx = 0, dy = 0;
	const k = 1;
	if (keys['p']) {
		if (freeform.length >= 3) {
			const obj = new Poly(freeform, isFixed() ? 0 : 10);
			obj.color = `rgba(${randomColor()}, ${randomColor()}, ${randomColor()}, 0.5)`;
			objects.push(obj);
		}
		freeform = [];
	}
	if (keys['P']) {
		freeform = [];
	}
	if (keys['ArrowLeft']) {
		dx -= k;
	}
	if (keys['ArrowRight']) {
		dx += k;
	}
	if (keys['ArrowUp']) {
		dy -= k;
	}
	if (keys['ArrowDown']) {
		dy += k;
	}
	objects.forEach(d => {
		if (d.imass === 0) return;
		const del = d === rc ? vec(dx, dy) : vec(0, 0);
		d.vel = add(d.vel, scale(vec(0, 1), 0.08));
		d.vel = scale(d.vel, 0.99);
		d.angularVel *= 0.99;
		d.translate(add(d.vel, del));
		if (!d.circle) {
			const cent = d.getCenter();
			d.points = d.points.map(p => add(rotateZ(sub(cent, p), d.angularVel), cent));
		}
	});
	const touches = [];
	for (let i = 0; i < objects.length; i += 1) {
		for (let j = i + 1; j < objects.length; j += 1) {
			const a = objects[i];
			const b = objects[j];
			const collisionInfo = collision(a, b);
			if (!collisionInfo) continue;
			const { axis, penetration } = collisionInfo;
			// make the colliding objects just touching or remove penetration
			const s = 1;
			if (a.imass > 0) {
				const magA = a.imass === 0 ? 0 : (b.fixed ? 1 : 0.5);
				a.translate(scale(axis.axis, -magA * penetration * s));
			}
			if (b.imass > 0) {
				const magB = b.imass === 0 ? 0 : (a.fixed ? 1 : 0.5);
				b.translate(scale(axis.axis, magB * penetration * s));
			}
			const contactPoints = getContactPoints(a, b, axis.axis);
			const impulse = getLinearImpulse(a, b, contactPoints, axis.axis);
			if (impulse < 0) {
				if (a.imass > 0) {
					applyImpulse(a, contactPoints, impulse, axis.axis);
				}
				if (b.imass > 0) {
					applyImpulse(b, contactPoints, impulse, scale(axis.axis, -1));
				}

				// ***for drawing***
				touches.push(contactPoints);
			}
		}
	}

	// render
	ctx.fillStyle = 'white';
	ctx.fillRect(0, 0, w, h);
	objects.forEach(d => {
		if (d.circle) {
			drawCircle(d, d.color);
		} else {
			drawRect(d, d.color);
		}
	});
	if (down) {
		drawLine(down, cur, 'green', 3);
	}
	if (freeform.length > 0) {
		for (let i = 1; i <= freeform.length; i += 1) {
			const d = i === freeform.length ? cur : freeform[i];
			drawLine(freeform[i - 1], d, i < freeform.length ? 'green' : 'red', 3);
		}
	}
	touches.forEach(touch => {
		if (touch.length === 1) {
			drawCircle({ center: touch[0], radius: 2 }, 'blue');
		} else {
			drawLine(touch[0], touch[1], 'rgba(0, 0, 0, 0.5)', 4);
		}
	});
};

const callback = () => {
	update();
	window.requestAnimationFrame(callback);
}

callback();
