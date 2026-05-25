import { FragmentTag } from '@/jsx.js';

export type ScriptableElement = ListWidget | WidgetStack | WidgetSpacer | WidgetImage | WidgetText | WidgetDate;
export type ContainerScriptableElement = ListWidget | WidgetStack;

export type Padding = {
	top: number, leading: number, bottom: number, trailing: number
};
export type Direction = 'horizontal' | 'vertical';
export type HorizontalAlignment = 'left' | 'center' | 'right';
export type VerticalAlignment = 'top' | 'center' | 'bottom';
export type ImageContentMode = 'fitting' | 'filling';
export type DateStyle = 'time' | 'date' | 'relative' | 'offset' | 'timer';

export type BaseComponentProps = {
	onMount?: (element: ScriptableElement) => ScriptableElement | void
};

export type WidgetComponent = {
	tag: 'widget',
	props: BaseComponentProps & Partial<Pick<ListWidget,
		| 'backgroundColor'
		| 'backgroundImage'
		| 'backgroundGradient'
		| 'addAccessoryWidgetBackground'
		| 'spacing'
		| 'url'
		| 'refreshAfterDate'
	>> & {
		padding?: Padding
	},
	children: NonWidgetComponent[]
};

export type StackComponent = {
	tag: 'stack';
	props: BaseComponentProps & Partial<Pick<WidgetStack,
		| 'backgroundColor'
		| 'backgroundImage'
		| 'backgroundGradient'
		| 'spacing'
		| 'size'
		| 'cornerRadius'
		| 'borderWidth'
		| 'borderColor'
		| 'url'
	>> & {
		padding?: Padding,
		layoutDirection?: Direction,
		alignContent?: VerticalAlignment
	},
	children: NonWidgetComponent[]
};

export type TextComponent = {
	tag: 'text',
	props: BaseComponentProps & Partial<Pick<WidgetText,
		| 'textColor'
		| 'font'
		| 'textOpacity'
		| 'lineLimit'
		| 'minimumScaleFactor'
		| 'shadowColor'
		| 'shadowRadius'
		| 'shadowOffset'
		| 'url'
	>> & {
		alignText?: HorizontalAlignment
	},
	content: string
};

export type ImageComponent = {
	tag: 'image',
	props: BaseComponentProps & Partial<Pick<WidgetImage,
		| 'resizable'
		| 'imageSize'
		| 'imageOpacity'
		| 'cornerRadius'
		| 'borderWidth'
		| 'borderColor'
		| 'containerRelativeShape'
		| 'tintColor'
		| 'url'
	>> & {
		image: Image,
		alignImage?: HorizontalAlignment,
		contentMode?: ImageContentMode
	}
};

export type DateComponent = {
	tag: 'date',
	props: BaseComponentProps & Partial<Pick<WidgetDate,
		| 'textColor'
		| 'font'
		| 'textOpacity'
		| 'lineLimit'
		| 'minimumScaleFactor'
		| 'shadowColor'
		| 'shadowRadius'
		| 'shadowOffset'
		| 'url'
	>> & {
		date: Date,
		alignText?: HorizontalAlignment,
		style?: DateStyle
	}
};

export type SpacerComponent = {
	tag: 'spacer',
	props: BaseComponentProps & {
		length?: number | null
	}
};

export type FragmentComponent = {
	tag: FragmentTag,
	children: NonWidgetComponent[]
};

export type NonWidgetComponent = StackComponent | TextComponent | ImageComponent | DateComponent | SpacerComponent | FragmentComponent;
export type Component = WidgetComponent | NonWidgetComponent;

export type ComponentTag = Component['tag'];