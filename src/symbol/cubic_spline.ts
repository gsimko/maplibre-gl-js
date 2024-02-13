
// from https://en.wikipedia.org/wiki/Spline_(mathematics)
export function fitNaturalCubicSpline(x: number[], y:number[]) {
	const n = x.length - 1;
	const a : number[] = [...y];
	const h : number[] = [];
	const alpha : number[] = [0];
	for (let i = 0; i < n; i++) {
        h.push(x[i + 1] - x[i]);
    }
	for (let i = 1; i < n; i++) {
		alpha.push(3 / h[i] * (a[i + 1] - a[i]) - 3 / h[i - 1] * (a[i] - a[i - 1]));
	}
    const mu : number[] = [0];
    const z : number[] = [0];
	for (let i = 1; i < n; i++) {
		const l = 2 * (x[i + 1] - x[i - 1]) - h[i - 1] * mu[i - 1];
		mu.push(h[i] / l);
		z.push((alpha[i] - h[i - 1] * z[i - 1]) / l);
	}
	const b = Array<number>(n);
    const c = Array<number>(n + 1);
    const d = Array<number>(n);
    c[n] = 0;
	for (let j = n - 1; j >= 0; j--) {
		c[j] = z[j] - mu[j] * c[j + 1];
		b[j] = (a[j + 1] - a[j]) / h[j] - (h[j] * (c[j + 1] + 2 * c[j])) / 3;
		d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
	}
    return { a, b, c:c.slice(0, n), d, x };
}

export function interpolateSpline(xs: number[], spline: {a:number[],b:number[],c:number[],d:number[],x:number[]}) {
    let i = 0;
    let y : number[] = [];
    let dy : number[] = [];  // derivatives
    for (const x of xs) {
        while (i + 1 < spline.x.length && spline.x[i+1] < x) i++;
        const xd = x - spline.x[i];
        const xd2 = xd*xd;
        y.push(spline.a[i] + spline.b[i] * xd + spline.c[i] * xd2 + spline.d[i] * xd * xd2);
        dy.push(spline.b[i] + spline.c[i] * 2 * xd + spline.d[i] * 3 * xd2);
    }
    return {y, dy};
}