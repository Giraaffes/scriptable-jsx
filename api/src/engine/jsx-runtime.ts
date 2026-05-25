import { createComponent, fragmentTagSymbol, JSXChildren } from "@/jsx.js";
import { Component, DateComponent, ImageComponent, SpacerComponent, StackComponent, TextComponent, WidgetComponent } from "@/types.js";

export const jsx = (tag: any, allProps: any) => {
  const { children, ...props } = allProps ?? {};
  return createComponent(tag, props, children);
};
export const jsxs = jsx;
export const Fragment = fragmentTagSymbol;

export namespace JSX {
  export type Element = Component;

  export interface IntrinsicElements {
    widget: WidgetComponent['props'] & {
      children?: JSXChildren
    };
    stack: StackComponent['props'] & {
      children?: JSXChildren
    };
    text: TextComponent['props'] & {
      children?: string | number | (string | number)[];
    };
    image: ImageComponent['props'];
    date: DateComponent['props'];
    spacer: SpacerComponent['props'];
  }
}