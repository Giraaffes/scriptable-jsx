import { ContainerScriptableElement, DateComponentProps, FunctionComponent, ImageComponentProps, NonRootComponent, RootComponent, Component, ComponentProps, ComponentTag, ScriptableElement } from 'types';

export const fragmentSymbol = Symbol.for('fragment');

export function createComponent(
	tag: FunctionComponent | ComponentTag | typeof fragmentSymbol, 
	props: ComponentProps, 
	children: (string | Component)[]
): Component
{
	if (typeof tag === 'function') {
		return tag({
			...props,
			children: children
		});
	}
	else if (tag == 'widget' || tag == 'stack' || tag === fragmentSymbol) {
		let componentChildren: NonRootComponent[] = [];
		for (let child of children) {
			if (typeof child === 'string') {
				componentChildren.push({
					tag: 'text',
					props: {},
					content: child
				});
			}
			else if (child.tag == 'widget') {
				throw new Error('Widget component may only be the root node');
			}
			else {
				componentChildren.push(child);
			}
		}

		return (tag === fragmentSymbol) ? {
			tag: tag,
			children: componentChildren
		} : {
			tag: tag,
			props: props,
			children: componentChildren
		};
	}
	else if (tag == 'text') {
		const stringChildren = children.filter((child): child is string => (typeof child === 'string'));
		const content = stringChildren.join('');
		return {
			tag: tag,
			props: props,
			content: content
		};
	}
	else if (tag == 'image') {
		if (!('image' in props)) throw new Error('Must specify `image` prop on image component');
		return {
			tag: tag,
			props: props as ImageComponentProps
		};
	}
	else if (tag == 'date') {
		if (!('date' in props)) throw new Error('Must specify `date` prop on date component');
		return {
			tag: tag,
			props: props as DateComponentProps
		};
	}
	else if (tag == 'spacer') {
		return {
			tag: tag,
			props: props
		};
	}

	return null as never;
}

function renderComponent(
	parent: ContainerScriptableElement | null,
	component: Component
): ScriptableElement
{
	let element: ScriptableElement | null = null;

	if (component.tag == 'widget') {
		element = new ListWidget();
	} else if (!parent) {
		return null as never;
	} else if (component.tag === fragmentSymbol) {
		element = parent;
	} else if (component.tag == 'stack') {
		element = parent.addStack();
	} else if (component.tag == 'text') {
		element = parent.addText(component.content);
	} else if (component.tag == 'image') {
		element = parent.addImage(component.props.image);
	} else if (component.tag == 'date') {
		element = parent.addDate(component.props.date);
	} else if (component.tag == 'spacer') {
		element = parent.addSpacer();
	}
	if (!element) return null as never;

	// todo props

	if (component.tag == 'widget' || component.tag == 'stack' || component.tag === fragmentSymbol) {
		for (let child of component.children) {
			renderComponent(element as ContainerScriptableElement, child);
		}
	}

	if ('props' in component && component.props.onMount) {
		component.props.onMount(element);
	}

	return element;
}

export function render(root: RootComponent) {
	if (root.tag != 'widget') throw new Error('Root node must be widget component');
	return renderComponent(null, root);
}