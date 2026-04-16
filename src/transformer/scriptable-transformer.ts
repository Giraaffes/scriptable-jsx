import ts, { factory as fct } from "typescript";
import tsp from "ts-patch";

//** Types/helpers **//

type NamedExportData = { name: ts.ModuleExportName, propertyName?: ts.ModuleExportName };

type TransformerContext = {
	defaultExport: ts.Expression | null,
	namedExports: NamedExportData[]
};

type ExportableStatement = ts.VariableStatement | ts.FunctionDeclaration | ts.ClassDeclaration;
function isExportableStatement(node: ts.Node): node is ExportableStatement
{
	return ts.isVariableStatement(node) || ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node);
}

// Strips `export`, `default` and any @decorators
function stripUnwantedModifiers(modifiers: ts.NodeArray<ts.ModifierLike> | undefined): ts.Modifier[]
{
	if (!modifiers) return [];

	return modifiers.filter((m) => (
		m.kind != ts.SyntaxKind.ExportKeyword &&
		m.kind != ts.SyntaxKind.DefaultKeyword &&
		m.kind != ts.SyntaxKind.Decorator
	));
}

//** Scriptable emitters **//

function createScriptableImport(binds: ts.BindingElement[], moduleSpecifier: ts.Expression): ts.Statement
{
	return fct.createVariableStatement(undefined, fct.createVariableDeclarationList(
		[fct.createVariableDeclaration(
			fct.createObjectBindingPattern(binds),
			undefined, undefined,
			fct.createCallExpression(
				fct.createIdentifier("importModule"), undefined, [moduleSpecifier]
			)
		)], ts.NodeFlags.Const
	));
}

function createScriptableDefaultExport(expression: ts.Expression): ts.Statement
{
	return fct.createExpressionStatement(fct.createBinaryExpression(
		fct.createElementAccessExpression(
			fct.createPropertyAccessExpression(
				fct.createIdentifier("module"), fct.createIdentifier("exports")
			),
			fct.createStringLiteral("__default__")
		),
		fct.createToken(ts.SyntaxKind.EqualsToken),
		expression
	));
}

function createScriptableNamedExports(namedExports: NamedExportData[]): ts.Statement[]
{
	return [fct.createExpressionStatement(fct.createBinaryExpression(
		fct.createPropertyAccessExpression(
			fct.createIdentifier("module"), fct.createIdentifier("exports")
		),
		fct.createToken(ts.SyntaxKind.EqualsToken),
		fct.createObjectLiteralExpression(namedExports.map(
			({ name, propertyName }) => (
				(!propertyName && ts.isIdentifier(name)) ? 
				fct.createShorthandPropertyAssignment(name) : 
				fct.createPropertyAssignment(name, propertyName || name)
			)
		))
	))];
}

//** Transformation **//

// Strips side-effect-only imports and transforms default imports (`import foo ...`),
// namespace imports (`import * as foo ...`) and named imports (`import { foo } ...`)
function transformImportDeclaration(ctx: TransformerContext, node: ts.ImportDeclaration): ts.Node[]
{
	if (!node.importClause) return [];

	let binds = [] as ts.BindingElement[];

	if (node.importClause.name) {
		binds.push(fct.createBindingElement(
			undefined, fct.createIdentifier("__default__"), node.importClause.name, undefined
		));
	}

	if (node.importClause.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings)) {
		binds.push(fct.createBindingElement(
			fct.createToken(ts.SyntaxKind.DotDotDotToken), undefined, node.importClause.namedBindings.name, undefined
		));
	}
	else if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
		node.importClause.namedBindings.elements.forEach((s) => {
			binds.push(fct.createBindingElement(
				undefined, s.propertyName, s.name, undefined
			));
		});
	}

	return [createScriptableImport(binds, node.moduleSpecifier)];
}

// Strips and handles default exports (`export default ...`)
function transformExportAssignment(ctx: TransformerContext, node: ts.ExportAssignment): ts.Node[]
{
	ctx.defaultExport = node.expression;

	return [];
}

// Strips all non-default exports (`export ...`)
// and handles non-module exports (`export { ... }` but not `export ... from "..."`)
function transformExportDeclaration(ctx: TransformerContext, node: ts.ExportDeclaration): ts.Node[]
{
	const isModuleReexport = (node.moduleSpecifier || !node.exportClause || !ts.isNamedExports(node.exportClause));
	if (isModuleReexport) return [];

	for (const specifier of node.exportClause.elements) {
		if (specifier.propertyName && ts.isIdentifier(specifier.name) && specifier.name.text == "default") {
			ctx.defaultExport = specifier.propertyName;
		} else {
			ctx.namedExports.push({ name: specifier.name, propertyName: specifier.propertyName });
		}
	}

	return [];
}

// Transforms and handles statements with export modifiers, including
// variable statements (`export const foo ...`), function declarations (`export function foo() { ... }`),
// and class declarations (`export class { ... }`)
function transformExportedStatement(ctx: TransformerContext, node: ExportableStatement): ts.Node[]
{
	if (ts.isVariableStatement(node)) {
		for (const d of node.declarationList.declarations) {
			// todo: handle this case sometime in the future
			// (e.g. `export const { foo, bar } = { foo: 2, bar: 3 };`)
			if (ts.isArrayBindingPattern(d.name) || ts.isObjectBindingPattern(d.name)) continue;

			ctx.namedExports.push({ name: d.name });
		}
		
		const transformedStatement = fct.createVariableStatement(
			stripUnwantedModifiers(node.modifiers),
			node.declarationList
		);
		return [transformedStatement];
	}
	else if (ts.isFunctionDeclaration(node)) {
		const isDefault = node.modifiers?.some(m => m.kind == ts.SyntaxKind.DefaultKeyword);
		if (isDefault) {
			ctx.defaultExport = fct.createFunctionExpression(
				stripUnwantedModifiers(node.modifiers),
				node.asteriskToken, undefined, node.typeParameters, node.parameters, node.type,
				node.body ?? fct.createBlock([])
			);
		} else {
			ctx.namedExports.push({ name: node.name! });
		}

		if (node.name) {
			return [fct.createFunctionDeclaration(
				stripUnwantedModifiers(node.modifiers), 
				node.asteriskToken, node.name, node.typeParameters, node.parameters, node.type, node.body
			)];
		} else {
			return [];
		}
	}
	else if (ts.isClassDeclaration(node)) {
		const isDefault = node.modifiers?.some(m => m.kind == ts.SyntaxKind.DefaultKeyword);
		if (isDefault) {
			ctx.defaultExport = fct.createClassExpression(
				stripUnwantedModifiers(node.modifiers), 
				undefined, node.typeParameters, node.heritageClauses, node.members
			);
		} else {
			ctx.namedExports.push({ name: node.name! });
		}

		if (node.name) {
			return [fct.createClassDeclaration(
				stripUnwantedModifiers(node.modifiers), 
				node.name, node.typeParameters, node.heritageClauses, node.members
			)];
		} else {
			return [];
		}
	}
	else {
		return null as never;
	}
}

//** Transformer logic **//

function cloneLeadingComments(source: ts.SourceFile, fromNode: ts.Node, toNode: ts.Node)
{
	if (fromNode.pos == -1) return;

	const comments = ts.getLeadingCommentRanges(fromNode.getFullText(source), fromNode.pos);
	if (!comments) return;

	for (const c of comments) {
		let text = source.text.slice(c.pos, c.end);
		if (c.kind == ts.SyntaxKind.SingleLineCommentTrivia) {
			text = text.slice(2);
		}
		else if (c.kind == ts.SyntaxKind.MultiLineCommentTrivia) {
			text = text.slice(2, -2);
		}
		ts.addSyntheticLeadingComment(toNode, c.kind, text, c.hasTrailingNewLine);
	}
}

function transformNode(ctx: TransformerContext, source: ts.SourceFile, node: ts.Node): ts.Node[]
{
	let newNodes = [] as ts.Node[];
	
	if (ts.isImportDeclaration(node)) {
		newNodes.push(...transformImportDeclaration(ctx, node));
	}
	else if (ts.isExportDeclaration(node)) {
		newNodes.push(...transformExportDeclaration(ctx, node));
	}
	else if (ts.isExportAssignment(node)) {
		newNodes.push(...transformExportAssignment(ctx, node));
	}
	else if (
		isExportableStatement(node) && 
		node.modifiers?.some(m => m.kind == ts.SyntaxKind.ExportKeyword)
	) {
		newNodes.push(...transformExportedStatement(ctx, node));
	}
	
	if (newNodes.length > 0) {
		cloneLeadingComments(source, node, newNodes[0]);
		return newNodes;
	} else {
		return [node];
	}
}

function transformStatements(ctx: TransformerContext, source: ts.SourceFile): ts.SourceFile
{
	let statements: ts.Statement[] = [
		...source.statements
	];

	if (ctx.defaultExport) {
		statements.push(createScriptableDefaultExport(ctx.defaultExport));
	}

	if (ctx.namedExports.length > 0) {
		statements.push(...createScriptableNamedExports(ctx.namedExports));
	}

	return fct.updateSourceFile(source, statements);
}

function transformSource(tsCtx: ts.TransformationContext, source: ts.SourceFile): ts.SourceFile {
	const ctx: TransformerContext = {
		defaultExport: null,
		namedExports: []
	};

	source = ts.visitEachChild(source, (node) => transformNode(ctx, source, node), tsCtx);
	source = transformStatements(ctx, source);

	return source;
}

//** Transformer hook **//

export default (program: ts.Program, config: tsp.PluginConfig, extras: tsp.TransformerExtras) => {
	return (context: ts.TransformationContext) => {
		return (source: ts.SourceFile) => {
			return transformSource(context, source);
		}
	}
};