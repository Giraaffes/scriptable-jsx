import { createComponent, fragmentSymbol } from "jsx";

export const jsx = (tag: any, allProps: any) => {
  const { children, ...props } = allProps ?? {};
  return createComponent(tag, props, children);
};

export const jsxs = jsx;

export const Fragment = fragmentSymbol;