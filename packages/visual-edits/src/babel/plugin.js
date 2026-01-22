/**
 * Babel plugin that adds unique IDs and metadata to all JSX elements during build.
 * This enables visual element selection and editing in development mode.
 *
 * The plugin:
 * - Only runs in development mode and for web platform
 * - Generates comprehensive element IDs in format: ComponentName:extension:line:column:nestingLevel
 * - Adds debug data attributes: data-file, data-component, data-line, data-column
 * - Uses AST traversal to find React component names (functions, arrow functions, classes)
 *
 * @param {object} babel - Babel API
 * @param {object} babel.types - Babel types helper
 * @returns {object} Babel plugin visitor
 */
module.exports = function ({ types: t }) {
  function getNestingLevel(path) {
    let level = 0
    let current = path
    while (current.parentPath) {
      if (t.isJSXElement(current.parentPath.node)) {
        level++
      }
      current = current.parentPath
    }
    return level
  }

  function getFileInfo(path) {
    const filePath = path.hub.file.opts.filename || 'Unknown'
    const fileName = filePath.split('/').pop() || 'Unknown'
    const [baseName, extension = 'tsx'] = fileName.split('.')
    const relativePath = filePath.replace(process.cwd(), '').replace(/^\//, '')

    return {
      filePath,
      fileName,
      baseName,
      extension,
      relativePath,
    }
  }

  // Enhanced component detection using traverse to walk the AST
  function findComponentName(scope) {
    let componentName = null

    // First check the current scope and parent scopes
    let currentScope = scope
    while (currentScope && !componentName) {
      // Look for function/class declarations that look like components
      for (const [name, binding] of Object.entries(
        currentScope.bindings || {},
      )) {
        const bindingPath = binding.path

        // Skip if name doesn't look like a component (should start with uppercase)
        if (name[0] !== name[0].toUpperCase()) {
          continue
        }

        // Check function declarations
        if (bindingPath.isFunctionDeclaration()) {
          if (hasJSXReturn(bindingPath.node)) {
            componentName = name
            break
          }
        }

        // Check variable declarations with function expressions/arrow functions
        if (bindingPath.isVariableDeclarator()) {
          const init = bindingPath.node.init
          if (
            (t.isArrowFunctionExpression(init) ||
              t.isFunctionExpression(init)) &&
            hasJSXReturn(init)
          ) {
            componentName = name
            break
          }

          // Check class expressions
          if (t.isClassExpression(init) && hasRenderMethod(init)) {
            componentName = name
            break
          }
        }

        // Check class declarations
        if (bindingPath.isClassDeclaration()) {
          if (hasRenderMethod(bindingPath.node)) {
            componentName = name
            break
          }
        }
      }

      // Move to parent scope
      currentScope = currentScope.parent
    }

    return componentName
  }

  function hasJSXReturn(node) {
    if (!node) return false

    // For arrow functions with direct JSX return
    if (t.isArrowFunctionExpression(node)) {
      if (t.isJSXElement(node.body) || t.isJSXFragment(node.body)) {
        return true
      }
    }

    // For functions with block statement body
    if (
      t.isFunctionDeclaration(node) ||
      t.isFunctionExpression(node) ||
      t.isArrowFunctionExpression(node)
    ) {
      const body = node.body
      if (t.isBlockStatement(body)) {
        return body.body.some(
          (stmt) =>
            t.isReturnStatement(stmt) &&
            stmt.argument &&
            (t.isJSXElement(stmt.argument) || t.isJSXFragment(stmt.argument)),
        )
      }
    }

    return false
  }

  function hasRenderMethod(node) {
    if (!t.isClassDeclaration(node) && !t.isClassExpression(node)) {
      return false
    }

    return node.body.body.some(
      (method) =>
        t.isClassMethod(method) &&
        t.isIdentifier(method.key) &&
        method.key.name === 'render' &&
        t.isBlockStatement(method.body) &&
        method.body.body.some(
          (stmt) =>
            t.isReturnStatement(stmt) &&
            stmt.argument &&
            (t.isJSXElement(stmt.argument) || t.isJSXFragment(stmt.argument)),
        ),
    )
  }

  function getParentComponentName(path) {
    // Use Tamagui's approach: find component name through scope analysis
    const componentName = findComponentName(path.scope)

    if (componentName) {
      return componentName
    }

    // Fallback: traverse up the AST looking for component patterns
    let currentPath = path
    while (currentPath && currentPath.parentPath) {
      const parent = currentPath.parentPath.node

      // Function declarations and expressions
      if (
        (t.isFunctionDeclaration(parent) ||
          t.isFunctionExpression(parent) ||
          t.isArrowFunctionExpression(parent)) &&
        parent.id &&
        parent.id.name &&
        hasJSXReturn(parent)
      ) {
        return parent.id.name
      }

      // Class declarations and expressions
      if (
        (t.isClassDeclaration(parent) || t.isClassExpression(parent)) &&
        parent.id &&
        parent.id.name &&
        hasRenderMethod(parent)
      ) {
        return parent.id.name
      }

      // Variable declarators (const Component = () => ...)
      if (t.isVariableDeclarator(parent)) {
        if (
          parent.init &&
          (t.isArrowFunctionExpression(parent.init) ||
            t.isFunctionExpression(parent.init)) &&
          parent.id &&
          t.isIdentifier(parent.id) &&
          parent.id.name &&
          hasJSXReturn(parent.init)
        ) {
          return parent.id.name
        }

        if (
          parent.init &&
          t.isClassExpression(parent.init) &&
          parent.id &&
          t.isIdentifier(parent.id) &&
          parent.id.name &&
          hasRenderMethod(parent.init)
        ) {
          return parent.id.name
        }
      }

      // Export declarations
      if (
        t.isExportDefaultDeclaration(parent) ||
        t.isExportNamedDeclaration(parent)
      ) {
        if (
          parent.declaration &&
          (t.isFunctionDeclaration(parent.declaration) ||
            t.isClassDeclaration(parent.declaration)) &&
          parent.declaration.id &&
          parent.declaration.id.name
        ) {
          const isComponent = t.isFunctionDeclaration(parent.declaration)
            ? hasJSXReturn(parent.declaration)
            : hasRenderMethod(parent.declaration)

          if (isComponent) {
            return parent.declaration.id.name
          }
        }

        if (
          t.isExportDefaultDeclaration(parent) &&
          parent.declaration &&
          (t.isArrowFunctionExpression(parent.declaration) ||
            t.isFunctionExpression(parent.declaration)) &&
          hasJSXReturn(parent.declaration)
        ) {
          // Try to find the component name from variable declaration
          const scope = currentPath.scope
          const bindings = scope.getAllBindings()

          // Look for the variable that was assigned this arrow function
          for (const [name, binding] of Object.entries(bindings)) {
            if (
              binding.path.isVariableDeclarator() &&
              binding.path.node.init === parent.declaration
            ) {
              return name
            }
          }

          // Fallback to file name
          const fileInfo = getFileInfo(path)
          return fileInfo.baseName
        }
      }

      currentPath = currentPath.parentPath
    }

    // Final fallback to filename
    const fileInfo = getFileInfo(path)
    return fileInfo.baseName || 'Unknown'
  }

  return {
    visitor: {
      JSXOpeningElement(path, state) {
        if (
          process.env.NODE_ENV !== 'development' ||
          state.opts.platform !== 'web'
        ) {
          return
        }

        const fileInfo = getFileInfo(path)
        const lineNumber = path.node.loc ? path.node.loc.start.line : 'unknown'
        const columnNumber = path.node.loc
          ? path.node.loc.start.column
          : 'unknown'
        const nestingLevel = getNestingLevel(path)
        const parentComponentName = getParentComponentName(path)

        // Generate comprehensive ID following Tamagui's approach
        const idValue = `${parentComponentName}:${fileInfo.extension}:${lineNumber}:${columnNumber}:${nestingLevel}`

        const hasId = path.node.attributes.some(
          (attr) => t.isJSXAttribute(attr) && attr.name.name === 'id',
        )

        if (!hasId) {
          path.node.attributes.push(
            t.jsxAttribute(t.jsxIdentifier('id'), t.stringLiteral(idValue)),
          )

          // Add additional debug attributes in development (following Tamagui's pattern)
          if (process.env.NODE_ENV === 'development') {
            // Add data attributes for debugging
            path.node.attributes.push(
              t.jsxAttribute(
                t.jsxIdentifier('data-file'),
                t.stringLiteral(fileInfo.relativePath),
              ),
              t.jsxAttribute(
                t.jsxIdentifier('data-component'),
                t.stringLiteral(parentComponentName),
              ),
              t.jsxAttribute(
                t.jsxIdentifier('data-line'),
                t.stringLiteral(lineNumber.toString()),
              ),
              t.jsxAttribute(
                t.jsxIdentifier('data-column'),
                t.stringLiteral(columnNumber.toString()),
              ),
            )
          }
        }
      },
    },
  }
}
