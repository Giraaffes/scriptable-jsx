import { render } from 'scriptable-jsx';

function Root() {
	return (
		<widget backgroundColor={new Color("#ff0000")}>
			<text>Hi!</text>
		</widget>
	)
}

const widget = render(Root());
Script.setWidget(widget);
Script.complete();