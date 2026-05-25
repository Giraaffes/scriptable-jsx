import { fragmentTagSymbol } from 'jsx';

export type ScriptableElement = ListWidget | WidgetStack | WidgetSpacer | WidgetImage | WidgetText | WidgetDate;
export type ContainerScriptableElement = ListWidget | WidgetStack;

export type ComponentTag = 'widget' | 'stack' | 'spacer' | 'image' | 'text' | 'date';
export type ComponentProps = Record<string, any> & {
	onMount?: (element: ScriptableElement) => ScriptableElement | void
};
export type ImageComponentProps = ComponentProps & { image: Image };
export type DateComponentProps = ComponentProps & { date: Date };

export type RootComponent = {
	tag: 'widget',
	props: ComponentProps,
	children: NonRootComponent[]
};
export type NonRootComponent = {
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
	tag: typeof fragmentTagSymbol,
	children: NonRootComponent[]
};
export type Component = RootComponent | NonRootComponent;

export type ComponentFunction = (args: { children: (string | Component)[] }) => Component;