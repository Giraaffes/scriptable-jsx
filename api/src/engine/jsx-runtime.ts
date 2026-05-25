import { createComponent, fragmentTagSymbol } from "@/jsx";
import { Component, ComponentProps, DateComponentProps, ImageComponentProps } from "@/types";

export const jsx = (tag: any, allProps: any) => {
  const { children, ...props } = allProps ?? {};
  return createComponent(tag, props, children);
};
export const jsxs = jsx;
export const Fragment = fragmentTagSymbol;

export namespace JSX {
  export type Element = Component;

  export interface IntrinsicElements {
    widget: ComponentProps & {
      children?: Element | Element[];
    };
    stack: ComponentProps & {
      children?: Element | Element[];
    };
    spacer: ComponentProps;
    image: ImageComponentProps;
    text: ComponentProps & {
      children?: string | number | (string | number)[];
    };
    date: DateComponentProps;
  }
}