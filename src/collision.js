import { vec, sub, add, normalize, dot, intersect, scale } from './math';

export const penetration = (axis, bodyA, bodyB) => {
	const a = bodyA.project(axis);
	const b = bodyB.project(axis);
	const l = Math.max(a.min, b.min);
	const r = Math.min(a.max, b.max);
	return l <= r ? r - l : 0;
};

export const checkCollision = (bodyA, bodyB, axes) => {
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

export const getPolyAxes = (body, v) => {
	const pts = body.points;
	const axes = [];
	for (let i = 0; i < pts.length; i += 1) {
		const n = (i + 1) % pts.length;
		const a = normalize(sub(pts[i], pts[n]));
		let normal = vec(a.y, -a.x);
		if (dot(normal, v) < 0) {
			normal = scale(normal, -1);
		}
		axes.push({ axis: normal });
	}
	return axes;
};

export const collision = (bodyA, bodyB) => {
	const axes = [];
	if (bodyA.circle || bodyB.circle) {
		if (bodyA.circle && bodyB.circle) {
			const axis = normalize(sub(bodyA.getCenter(), bodyB.getCenter()));
			axes.push({ axis });
		} else {
			const [nonCircle, circle] = bodyA.circle ? [bodyB, bodyA] : [bodyA, bodyB];
			const naxes = nonCircle.points.map(pt => {
				return { axis : scale(normalize(sub(circle.getCenter(), pt)), bodyA.circle ? 1 : -1) };
			});
			axes.push(...naxes);
			const v = normalize(sub(bodyA.getCenter(), bodyB.getCenter()));
			axes.push(...getPolyAxes(nonCircle, v));
		}
	} else {
		const v = normalize(sub(bodyA.getCenter(), bodyB.getCenter()));
		axes.push(...getPolyAxes(bodyA, v));
		axes.push(...getPolyAxes(bodyB, v));
	}
	return checkCollision(bodyA, bodyB, axes);
};

// axis is the minimum penetration axis, makes finding contact points easier
export const getContactPoints = (bodyA, bodyB, axis) => {
	if (bodyA.circle || bodyB.circle) {
		if (bodyA.circle) {
			return [add(bodyA.getCenter(), scale(axis, bodyA.radius))];
		}
		return [add(bodyB.getCenter(), scale(axis, -bodyB.radius))];
	}
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

export const applyAngularImpulse = (body, contactPoints, impulseVector) => {
	if (body.imass === 0) return;
	const center = body.getCenter();
	// TODO: distribute impulse uniformly across contact points
	contactPoints.map(contactPoint => {
		const r = sub(center, contactPoint);
		// T = r * F = iW
		const dw = (r.x * impulseVector.y - r.y * impulseVector.x) / dot(r, r);
		body.angularVel += dw;
	});
};

export const applyImpulse = (body, contactPoints, impulse, impulseDir) => {
	const paxis = vec(impulseDir.y, -impulseDir.x);
	applyAngularImpulse(body, contactPoints, scale(impulseDir, impulse));
	// dynamic friction
	const dt = dot(body.vel, paxis);
	const small = Math.abs(dt) < 1e-3;
	body.vel = add(body.vel, scale(paxis, -dt + dt * (small ? 0 : 0.98)));
	// add impulse
	body.vel = add(body.vel, scale(impulseDir, impulse * body.imass));
};

export const getLinearImpulse = (bodyA, bodyB, contactPoints, axis) => {
	if (contactPoints.length === 0) return 0;
	const adt = dot(bodyA.vel, axis);
	const bdt = dot(bodyB.vel, axis);
	const vab = adt - bdt;
	if (vab <= 0) return 0; // objects are already separating
	const R = v => vec(v.y, -v.x);
	const p = contactPoints.length === 1 ? contactPoints[0] : scale(add(...contactPoints), 0.5);
	const centerA = bodyA.getCenter();
	const centerB = bodyB.getCenter();
	const ra = sub(centerA, p);
	const rb = sub(centerB, p);
	const da = dot(R(ra), axis);
	const db = dot(R(rb), axis);
	const den = bodyA.imass + bodyB.imass + da * da / dot(ra, ra) + db * db / dot(rb, rb);
	const e = 0.55;
	const impulse = -(1 + e) * vab / den;
	return impulse;
};
