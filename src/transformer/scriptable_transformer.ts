import ts, { factory as fct } from "C:/Users/Marcus/AppData/Roaming/npm/node_modules/typescript";
import tsp from "C:/Users/Marcus/AppData/Roaming/npm/node_modules/ts-patch";

/// Imports - transform

function createScriptableImport(binds: ts.BindingElement[], module: ts.Expression): ts.Node
{
	return fct.createVariableStatement(undefined, fct.createVariableDeclarationList(
		[fct.createVariableDeclaration(
			fct.createObjectBindingPattern(binds),
			undefined, undefined,
			fct.createCallExpression(
				fct.createIdentifier("importModule"), undefined, [module]
			)
		)], ts.NodeFlags.Const
	));
}

function transformImportDeclaration(node: ts.ImportDeclaration): ts.Node[]
{
	if (!node.importClause) {
		return [];
	}

	let binds = [] as ts.BindingElement[];
	if (node.importClause.name) {
		binds.push(fct.createBindingElement(
			undefined, fct.createIdentifier("__default__"), node.importClause.name, undefined
		));
	}
	if (node.importClause.namedBindings) {
		if (ts.isNamespaceImport(node.importClause.namedBindings)) {
			binds.push(fct.createBindingElement(
				fct.createToken(ts.SyntaxKind.DotDotDotToken), undefined, node.importClause.namedBindings.name, undefined
			));
		}
		else if (ts.isNamedImports(node.importClause.namedBindings)) {
			node.importClause.namedBindings.elements.forEach(s => {
				binds.push(fct.createBindingElement(
					undefined,  s.propertyName, s.name, undefined
				));
			});
		}
	}

	return [createScriptableImport(binds, node.moduleSpecifier)];
}

/// Exports - transform

let defaultExport: ts.Expression | null;
let namedExports: { name: ts.ModuleExportName, propertyName?: ts.ModuleExportName }[];

function transformExportDeclaration(node: ts.ExportDeclaration): ts.Node[]
{
	if (node.moduleSpecifier || !node.exportClause || !ts.isNamedExports(node.exportClause)) {
		return [];
	}

	for (let s of node.exportClause.elements) {
		if (s.propertyName && ts.isIdentifier(s.name) && s.name.text == "default") {
			defaultExport = s.propertyName;
		} else {
			namedExports.push({ name: s.name, propertyName: s.propertyName });
		}
	}

	return [];
}

function transformExportAssignment(node: ts.ExportAssignment): ts.Node[]
{
	defaultExport = node.expression;
	return [];
}

type ExportableStatement = ts.VariableStatement | ts.FunctionDeclaration | ts.ClassDeclaration;
function isExportableStatement(node: ts.Node): node is ExportableStatement
{
	return ts.isVariableStatement(node) || ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node);
}

function noExportModifiers(node: ExportableStatement): ts.ModifierLike[]
{
	return (node.modifiers || []).filter(m => 
		m.kind != ts.SyntaxKind.ExportKeyword &&
		m.kind != ts.SyntaxKind.DefaultKeyword
	);
}

function noDecoratorsOrExportModifiers(node: ExportableStatement): ts.Modifier[]
{
	return (node.modifiers || []).filter(m => 
		m.kind != ts.SyntaxKind.ExportKeyword &&
		m.kind != ts.SyntaxKind.DefaultKeyword &&
		m.kind != ts.SyntaxKind.Decorator
	) as ts.Modifier[];
}

function transformExportedStatement(node: ExportableStatement): ts.Node[]
{
	if (ts.isVariableStatement(node)) {
		for (let d of node.declarationList.declarations) {
			// Simply can't be bothered to handle this
			if (ts.isArrayBindingPattern(d.name) || ts.isObjectBindingPattern(d.name)) continue;

			namedExports.push({ name: d.name });
		}
		return [fct.createVariableStatement(noExportModifiers(node), node.declarationList)];
	}
	else {
		let isDefault = node.modifiers?.some(m => m.kind == ts.SyntaxKind.DefaultKeyword);
		if (isDefault) {
			if (ts.isFunctionDeclaration(node)) {
				defaultExport = fct.createFunctionExpression(
					noDecoratorsOrExportModifiers(node), 
					node.asteriskToken, undefined, node.typeParameters, node.parameters, node.type,
					node.body || fct.createBlock([])
				);
			}
			else if (ts.isClassDeclaration(node)) {
				defaultExport = fct.createClassExpression(
					noDecoratorsOrExportModifiers(node), 
					undefined, node.typeParameters, node.heritageClauses, node.members
				);
			}
		} else {
			namedExports.push({ name: node.name! });
		}

		if (node.name) {
			if (ts.isFunctionDeclaration(node)) {
				return [fct.createFunctionDeclaration(
					noExportModifiers(node), 
					node.asteriskToken, node.name, node.typeParameters, node.parameters, node.type, node.body
				)];
			}
			else if (ts.isClassDeclaration(node)) {
				return [fct.createClassDeclaration(
					noExportModifiers(node), 
					node.name, node.typeParameters, node.heritageClauses, node.members
				)];
			}
			else {
				return null as never;
			}
		} else {
			return [];
		}
	}
}

//> Exports - append

function createScriptableDefaultExport(): ts.Statement[]
{
	if (!defaultExport) return [];

	return [fct.createExpressionStatement(fct.createBinaryExpression(
		fct.createElementAccessExpression(
			fct.createPropertyAccessExpression(
				fct.createIdentifier("module"), fct.createIdentifier("exports")
			),
			fct.createStringLiteral("__default__")
		),
		fct.createToken(ts.SyntaxKind.EqualsToken),
		defaultExport
	))];
}

function createScriptableNamedExports(): ts.Statement[]
{
	if (namedExports.length == 0) return [];

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

/// Transformer

function cloneLeadingComments(source: ts.SourceFile, fromNode: ts.Node, toNode: ts.Node)
{
	if (fromNode.pos == -1) return;

	let comments = ts.getLeadingCommentRanges(fromNode.getFullText(source), fromNode.pos);
	if (!comments) return;

	for (let c of comments) {
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

function transformNode(source: ts.SourceFile, node: ts.Node): ts.Node[]
{
	let newNodes = [] as ts.Node[];
	if (ts.isImportDeclaration(node)) {
		newNodes.push(...transformImportDeclaration(node));
	}
	else if (ts.isExportDeclaration(node)) {
		newNodes.push(...transformExportDeclaration(node));
	}
	else if (ts.isExportAssignment(node)) {
		newNodes.push(...transformExportAssignment(node));
	}
	else if (
		isExportableStatement(node) && 
		node.modifiers?.some(m => m.kind == ts.SyntaxKind.ExportKeyword)
	) {
		newNodes.push(...transformExportedStatement(node));
	}
	
	if (newNodes.length > 0) {
		cloneLeadingComments(source, node, newNodes[0]);
		return newNodes;
	} else {
		return [node];
	}
}

function appendStatements(source: ts.SourceFile): ts.SourceFile
{
	return fct.updateSourceFile(source, [
		...source.statements,
		...createScriptableDefaultExport(),
		...createScriptableNamedExports()
	]);
}

export default (program: ts.Program, config: tsp.PluginConfig, extras: tsp.TransformerExtras) => {
	return (context: ts.TransformationContext) => {
		return (source: ts.SourceFile) => {
			defaultExport = null;
			namedExports = [];

			source = ts.visitEachChild(source, (node) => transformNode(source, node), context);
			source = appendStatements(source); 
			return source;
		}
	}
};