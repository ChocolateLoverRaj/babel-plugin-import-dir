import plugin = require('../index')
import never = require('never')
import { transformFileSync } from '@babel/core'
import { join } from 'path'

const resDir = join(__dirname, './res')

const snapshotFile = (file: string): void => {
  const { code } = transformFileSync(join(resDir, file), {
    plugins: [plugin]
  }) ?? never()
  expect(code).toMatchSnapshot()
}

test('named imports', () => snapshotFile('namedImports.js'))

test('default import', () => snapshotFile('defaultImport.js'))

test('import file', () => snapshotFile('importFile.js'))
