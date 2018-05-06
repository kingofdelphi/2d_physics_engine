
import keys from './keys';
import { Poly, Rect } from './shape';

import { rotateZ, centroid, distance, vec, sub, add, normalize, dot, intersect, getDistance, scale } from './math';

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
	let rc;
	const imass = isFixed() ? 0.0 : 10;
	if (sel === 'rect') {
		rc = getRect(downPos.x, downPos.y, polyRadius, polyRadius, imass);
	} else {
		rc = getPoly(downPos.x, downPos.y, polyRadius, imass);
	}
	rc.color = `rgba(${randomColor()}, ${randomColor()}, ${randomColor()}, 0.5)`;
	rc.vel = scale(sub(downPos, up), 0.05);
	//rc.angularVel = Math.random() * 2;
	objects.push(rc);
});

main.addEventListener('mousemove', function (e) {
	cur = vec(e.clientX - this.offsetLeft, e.clientY - this.offsetTop);
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
		if (!coll) return;
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

// axis is the minimum penetration axis, makes finding contact points easiser
const getContactPoints = (bodyA, bodyB, axis) => {
	// find the contacts between a and b
	const projA = bodyA.points.map(d => dot(d, axis));
	const projB = bodyB.points.map(d => dot(d, axis));
	const aInfo = { min: Math.min(...projA), max: Math.max(...projA) };
	const bInfo = { min: Math.min(...projB), max: Math.max(...projB) };
	// a is on the left as per convention as axis points from A's centroid to B's centroid
	const pA = projA.map((d, i) => ({ d, i }))
		.filter(d => Math.abs(d.d - aInfo.max) < 1e-3);
	const pB = projB.map((d, i) => ({ d, i }))
		.filter(d => Math.abs(d.d - bInfo.min) < 1e-3);

	const contactPoints = [];
	// here we find if there was a point contact or an edge contact
	if (pA.length !== 2 || pB.length !== 2) {
		contactPoints.push(pA.length < pB.length ? bodyA.points[pA[0].i] : bodyB.points[pB[0].i]);
	} else {
		const per = vec(-axis.y, axis.x);
		const F = (obj, pts) => obj.map(d => ({ pt: pts[d.i], dot: dot(pts[d.i], per) })).sort((a, b) => a.dot - b.dot);
		let edgeA = F(pA, bodyA.points);
		let edgeB = F(pB, bodyB.points);
		if (edgeB[0].dot < edgeA[0].dot) {
			[edgeA, edgeB] = [edgeB, edgeA];
		}
		const start = edgeB[0].pt;
		const end = edgeA[1].dot < edgeB[1].dot ? edgeA[1].pt : edgeB[1].pt; 
		contactPoints.push(start);
		contactPoints.push(end);
	}
	return contactPoints;
};

const applyAngularImpulse = (body, contactPoints, impulseVector) => {
	if (body.imass === 0) return;
	const center = centroid(body.points);
	// TODO: distribute impulse uniformly across contact points
	contactPoints.map(contactPoint => {
		const r = sub(center, contactPoint);
		// T = r * F = iW
		const dw = (r.x * impulseVector.y - r.y * impulseVector.x) / dot(r, r);
		body.angularVel += dw;
	});
};

const applyImpulse = (body, contactPoints, impulse, impulseDir) => {
	const paxis = vec(impulseDir.y, -impulseDir.x);
	applyAngularImpulse(body, contactPoints, scale(impulseDir, impulse));
	// dynamic friction
	body.vel = add(body.vel, scale(impulseDir, dot(body.vel, paxis) * (0.98 - 1)));
	// add impulse
	body.vel = add(body.vel, scale(impulseDir, impulse * body.imass));
};

const getLinearImpulse = (bodyA, bodyB, contactPoints, axis) => {
	const adt = dot(bodyA.vel, axis);
	const bdt = dot(bodyB.vel, axis);
	const vab = adt - bdt;
	if (vab <= 0) return 0; // objects are already separating
	const R = v => vec(v.y, -v.x);
	const p = contactPoints.length === 1 ? contactPoints[0] : scale(add(...contactPoints), 0.5);
	const centerA = centroid(bodyA.points);
	const centerB = centroid(bodyB.points);
	const ra = sub(centerA, p);
	const rb = sub(centerB, p);
	const da = dot(R(ra), axis);
	const db = dot(R(rb), axis);
	const den = bodyA.imass + bodyB.imass + da * da / dot(ra, ra) + db * db / dot(rb, rb);
	const e = 0.55;
	const impulse = -(1 + e) * vab / den;
	return impulse;
};

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
		d.angularVel *= 0.99;
		d.vel = scale(d.vel, 0.99);
		d.points = resolve(d.points, add(d.vel, del), 1);
		const cent = centroid(d.points);
		d.points = d.points.map(p => add(rotateZ(sub(cent, p), d.angularVel), cent));
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
				a.points = resolve(a.points, axis.axis, -magA * penetration * s);
			}
			if (b.imass > 0) {
				const magB = b.imass === 0 ? 0 : (a.fixed ? 1 : 0.5);
				b.points = resolve(b.points, axis.axis, magB * penetration * s);
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
		drawRect(d, d.color);
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
