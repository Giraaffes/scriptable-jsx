import { BaseComponentProps, Component, ComponentTag, ContainerScriptableElement, DateComponent, FragmentComponent, ImageComponent, NonWidgetComponent, ScriptableElement, SpacerComponent, WidgetComponent } from "@/types.js";
import { assignProps } from "@/utils.js";

export const fragmentTagSymbol = Symbol.for('fragment');
export type FragmentTag = typeof fragmentTagSymbol;

export type JSXChildren = string | number | Component | (string | number | Component)[];
export type JSXComponentFunction = (args: { children: JSXChildren }) => Component;

export function createComponent(
	fnOrTag: JSXComponentFunction | ComponentTag, 
	props: BaseComponentProps,
	children: JSXChildren
): Component
{

	if (typeof fnOrTag === 'function') {
		return fnOrTag({
			...props,
			children: children
		});
	}
	else if (fnOrTag == 'widget' || fnOrTag == 'stack' || fnOrTag === fragmentTagSymbol) {
		const childrenList = Array.isArray(children) ? children : [children];

		let componentChildren: NonWidgetComponent[] = [];
		for (let child of childrenList) {
			if (typeof child === 'string' || typeof child == 'number') {
				componentChildren.push({
					tag: 'text',
					props: {},
					content: String(child)
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
		let content: string;
		if (Array.isArray(children)) {
			const stringChildren = children
				.filter((child) => (typeof child === 'string' || typeof child == 'number'))
				.map((child) => String(child));
			content = stringChildren.join('');
		} else if (typeof children === 'string' || typeof children == 'number') {
			content = String(children);
		} else {
			content = '';
		}
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
			props: props as ImageComponent['props']
		};
	}
	else if (fnOrTag == 'date') {
		if (!('date' in props)) throw new Error('Must specify `date` prop on date component');
		return {
			tag: fnOrTag,
			props: props as DateComponent['props']
		};
	}
	else if (fnOrTag == 'spacer') {
		return {
			tag: fnOrTag,
			props: props as SpacerComponent['props']
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
		return parent.addSpacer(component.props.length);
	}
	return null as never;
}

function applyComponentPropsToElement(
	element: ScriptableElement,
	component: Exclude<Component, FragmentComponent>
): void
{
	if (component.tag == 'widget') {
		const el = element as ListWidget;
		assignProps(el, component.props, [
			'backgroundColor',
			'backgroundImage',
			'backgroundGradient',
			'addAccessoryWidgetBackground',
			'spacing',
			'url',
			'refreshAfterDate'
		]);

		const { padding } = component.props;
		if (padding != null) {
			const { top, leading, bottom, trailing } = padding;
			el.setPadding(top, leading, bottom, trailing);
		}
	}
	else if (component.tag == 'stack') {
		const el = element as WidgetStack;
		assignProps(el, component.props, [
			'backgroundColor',
			'backgroundImage',
			'backgroundGradient',
			'spacing',
			'size',
			'cornerRadius',
			'borderWidth',
			'borderColor',
			'url'
		]);

		const { padding, layoutDirection, alignContent } = component.props;
		if (padding != null) {
			const { top, leading, bottom, trailing } = padding;
			el.setPadding(top, leading, bottom, trailing);
		}
		if (layoutDirection == 'horizontal') {
			el.layoutHorizontally();
		} else if (layoutDirection == 'vertical') {
			el.layoutVertically();
		}
		if (alignContent == 'bottom') {
			el.bottomAlignContent();
		} else if (alignContent == 'center') {
			el.centerAlignContent();
		} else if (alignContent == 'top') {
			el.topAlignContent();
		}
	}
	else if (component.tag == 'text') {
		const el = element as WidgetText;
		assignProps(el, component.props, [
			'textColor',
			'font',
			'textOpacity',
			'lineLimit',
			'minimumScaleFactor',
			'shadowColor',
			'shadowRadius',
			'shadowOffset',
			'url',
		]);

		const { alignText } = component.props;
		if (alignText == 'left') {
			el.leftAlignText();
		} else if (alignText == 'center') {
			el.centerAlignText();
		} else if (alignText == 'right') {
			el.rightAlignText();
		}
	}
	else if (component.tag == 'image') {
		const el = element as WidgetImage;
		assignProps(el, component.props, [
			'resizable',
			'imageSize',
			'imageOpacity',
			'cornerRadius',
			'borderWidth',
			'borderColor',
			'containerRelativeShape',
			'tintColor',
			'url',
		]);

		const { alignImage, contentMode } = component.props;
		if (alignImage == 'left') {
			el.leftAlignImage();
		} else if (alignImage == 'center') {
			el.centerAlignImage();
		} else if (alignImage == 'right') {
			el.rightAlignImage();
		}
		if (contentMode == 'fitting') {
			el.applyFittingContentMode();
		} else if (contentMode == 'filling') {
			el.applyFillingContentMode();
		}
	}
	else if (component.tag == 'date') {
		const el = element as WidgetDate;
		assignProps(el, component.props, [
			'textColor',
			'font',
			'textOpacity',
			'lineLimit',
			'minimumScaleFactor',
			'shadowColor',
			'shadowRadius',
			'shadowOffset',
			'url',
		]);

		const { alignText, style } = component.props;
		if (alignText == 'left') {
			el.leftAlignText();
		} else if (alignText == 'center') {
			el.centerAlignText();
		} else if (alignText == 'right') {
			el.rightAlignText();
		}
		if (style == 'time') {
			el.applyTimeStyle();
		} else if (style == 'date') {
			el.applyDateStyle();
		} else if (style == 'relative') {
			el.applyRelativeStyle();
		} else if (style == 'offset') {
			el.applyOffsetStyle();
		} else if (style == 'timer') {
			el.applyTimerStyle();
		}
	}
	else if (component.tag == 'spacer') {
		// No props to apply
	}
}

export function renderComponent(
	parent: ContainerScriptableElement | null,
	component: Component
): ScriptableElement
{
	let element = createElementFromComponent(parent, component);

	if (component.tag !== fragmentTagSymbol) {
		applyComponentPropsToElement(element, component);
	}

	if (component.tag == 'widget' || component.tag == 'stack' || component.tag === fragmentTagSymbol) {
		for (let child of component.children) {
			renderComponent(element as ContainerScriptableElement, child);
		}
	}

	if (component.tag !== fragmentTagSymbol && component.props.onMount) {
		component.props.onMount(element);
	}

	return element;
}