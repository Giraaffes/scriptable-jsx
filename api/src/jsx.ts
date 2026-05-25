import { ContainerScriptableElement, DateComponentProps, ComponentFunction, ImageComponentProps, NonRootComponent, RootComponent, Component, ComponentProps, ComponentTag, ScriptableElement } from '@/types';

export const fragmentTagSymbol = Symbol.for('fragment');
export type FragmentTag = typeof fragmentTagSymbol;

export function createComponent(
	fnOrTag: ComponentFunction | ComponentTag | FragmentTag, 
	props: ComponentProps, 
	children: (string | Component)[]
): Component
{
	if (typeof fnOrTag === 'function') {
		return fnOrTag({
			...props,
			children: children
		});
	}
	else if (fnOrTag == 'widget' || fnOrTag == 'stack' || fnOrTag === fragmentTagSymbol) {
		let componentChildren: NonRootComponent[] = [];
		for (let child of children) {
			if (typeof child === 'string') {
				componentChildren.push({
					tag: 'text',
					props: {},
					content: child
				});
			} else if (child.tag == 'widget') {
				throw new Error('Widget component may only be placed at root level');
			} else {
				componentChildren.push(child);
			}
		}

		if (fnOrTag === fragmentTagSymbol) {
			return {
				tag: fnOrTag,
				children: componentChildren
			};
		} else {
			return {
				tag: fnOrTag,
				props: props,
				children: componentChildren
			};
		}
	}
	else if (fnOrTag == 'text') {
		const stringChildren = children.filter((child): child is string => (typeof child === 'string'));
		const content = stringChildren.join('');
		return {
			tag: fnOrTag,
			props: props,
			content: content
		};
	}
	else if (fnOrTag == 'image') {
		if (!('image' in props)) throw new Error('Must specify `image` prop on image component');
		return {
			tag: fnOrTag,
			props: props as ImageComponentProps
		};
	}
	else if (fnOrTag == 'date') {
		if (!('date' in props)) throw new Error('Must specify `date` prop on date component');
		return {
			tag: fnOrTag,
			props: props as DateComponentProps
		};
	}
	else if (fnOrTag == 'spacer') {
		return {
			tag: fnOrTag,
			props: props
		};
	}

	return null as never;
}

function createElementFromComponent(
	parent: ContainerScriptableElement | null,
	component: Component
): ScriptableElement
{
	if (component.tag == 'widget') {
		return new ListWidget();
	}
	if (!parent) return null as never;

	if (component.tag === fragmentTagSymbol) {
		return parent;
	} else if (component.tag == 'stack') {
		return parent.addStack();
	} else if (component.tag == 'text') {
		return parent.addText(component.content);
	} else if (component.tag == 'image') {
		return parent.addImage(component.props.image);
	} else if (component.tag == 'date') {
		return parent.addDate(component.props.date);
	} else if (component.tag == 'spacer') {
		return parent.addSpacer();
	}
	return null as never;
}

export function renderComponent(
	parent: ContainerScriptableElement | null,
	component: Component
): ScriptableElement
{
	let element = createElementFromComponent(parent, component);

	// todo props

	if (component.tag == 'widget' || component.tag == 'stack' || component.tag === fragmentTagSymbol) {
		for (let child of component.children) {
			renderComponent(element as ContainerScriptableElement, child);
		}
	}

	if ('props' in component && component.props.onMount) {
		component.props.onMount(element);
	}

	return element;
}

export function renderRoot(root: RootComponent) {
	if (root.tag != 'widget') throw new Error('Root node must be widget component');
	return renderComponent(null, root);
}