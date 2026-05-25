export function assignProps<
	T extends { [prop: string]: any },
	P extends string
>(
	target: { [K in keyof Pick<T, P>]: T[K] },
	source: Partial<Pick<T, P>>,
	props: P[]
)
{
	for (let prop of props) {
		if (source[prop] !== undefined) {
			target[prop] = source[prop];
		}
	}
}


