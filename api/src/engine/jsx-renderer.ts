import { renderComponent } from '@/jsx.js';
import { Component } from '@/types.js';

export function render(
	root: Component
): ListWidget
{
	if (root.tag != 'widget') throw new Error('Root node must be widget component');
	return renderComponent(null, root) as ListWidget;
}