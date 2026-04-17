import { fragmentSymbol } from 'jsx';

export type ScriptableElement = ListWidget | WidgetStack | WidgetSpacer | WidgetImage | WidgetText | WidgetDate;
export type ContainerScriptableElement = ListWidget | WidgetStack;

export type ComponentTag = 'widget' | 'stack' | 'spacer' | 'image' | 'text' | 'date';

export type ComponentProps = Record<string, any> & {
	onMount?: (element: ScriptableElement) => ScriptableElement | void
};
export type ImageComponentProps = ComponentProps & { image: Image };
export type DateComponentProps = ComponentProps & { date: Date };

export type Component = {
	tag: 'widget',
	props: ComponentProps,
	children: NonRootComponent[]
} | {
	tag: 'stack'
	props: ComponentProps,
	children: NonRootComponent[]
} | {
	tag: 'spacer',
	props: ComponentProps
} | {
	tag: 'image',
	props: ImageComponentProps
} | {
	tag: 'text',
	props: ComponentProps,
	content: string
} | {
	tag: 'date',
	props: DateComponentProps
} | {
	tag: typeof fragmentSymbol,
	children: NonRootComponent[]
};
export type RootComponent = Component & { tag: 'widget' };
export type NonRootComponent = Exclude<Component, { tag: 'widget' }>;

export type FunctionComponent = (args: { children: (string | Component)[] }) => Component;