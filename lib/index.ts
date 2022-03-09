import { readdirSync, Dirent } from 'fs'
import { join, dirname } from 'path'
import type { PluginObj, types } from '@babel/core'
import type { Identifier } from '@babel/types'
import never = require('never')

const extensions = [
  '.js',
  '.ts',
  '.mjs',
  '.jsx',
  '.tsx',
  '.cjs'
]

export = ({
  types: {
    importDefaultSpecifier,
    importDeclaration,
    stringLiteral,
    isImportSpecifier,
    variableDeclaration,
    variableDeclarator,
    objectExpression,
    objectProperty
  }
}: { types: typeof types }): PluginObj => ({
  visitor: {
    ImportDeclaration: path => {
      const fileName = (path.hub as any).file.opts.filename as string
      const importPath = path.node.source.value
      if (!importPath.startsWith('.')) return
      const fsPath = join(dirname(fileName), importPath)
      const nodes = path.node.specifiers.flatMap(node => {
        if (!isImportSpecifier(node)) {
          let files: Dirent[]
          try {
            files = readdirSync(fsPath, { withFileTypes: true })
          } catch (e) {
            if (e.code === 'ENOENT') return [path.node]
            else if (e.code === 'ENOTDIR') return [path.node]
            throw e
          }
          const importedFiles = files
            .map(file => ({
              file,
              extension: file.isFile()
                ? extensions.find(extension => file.name.endsWith(extension))
                : undefined
            }))
            .filter(({ file, extension }) => file.isDirectory() || extension !== undefined)
            .map(({ file, extension }) => {
              const key = file.name.slice(
                0,
                -(extension ?? never()).length
              )
              const identifier = path.scope.generateUidIdentifier(
                node.local.name +
                    '/' +
                    key
              )
              return {
                objectProperty: objectProperty(
                  stringLiteral(key),
                  identifier
                ),
                importDeclaration: importDeclaration(
                  [importDefaultSpecifier(
                    identifier
                  )],
                  stringLiteral(`${importPath}/${file.name}`)
                )
              }
            })
          return [
            ...importedFiles.map(({ importDeclaration }) => importDeclaration),
            variableDeclaration(
              'const',
              [
                variableDeclarator(
                  node.local,
                  objectExpression(importedFiles.map(({ objectProperty }) => objectProperty)))
              ])
          ]
        }

        return [
          importDeclaration(
            [importDefaultSpecifier(node.local)],
            stringLiteral(`${importPath}/${(node.imported as Identifier).name}`))
        ]
      })
      path.replaceWithMultiple(nodes)
    }
  }
})
